/**
 * Minimal SMTP AUTH LOGIN client (STARTTLS) for password-reset mail.
 * Avoids adding nodemailer — Linux App Service compatible.
 */

import net from "net";
import tls from "tls";
import { encodeEmailSubjectHeader, MAIL_PLAIN_TEXT_TYPE } from "./mail-encoding";
import { assertDeliverableRecipient } from "./mail-recipient-policy";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim() || "";
  const user = process.env.SMTP_USER?.trim() || "";
  const password = process.env.SMTP_PASSWORD?.trim() || "";
  const from =
    process.env.PASSWORD_RESET_FROM_EMAIL?.trim() ||
    process.env.SMTP_FROM_EMAIL?.trim() ||
    user;
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  if (!host || !user || !password || !from || !Number.isFinite(port)) {
    return null;
  }
  return { host, port, user, password, from };
}

function encodeBase64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

function readReply(
  socket: net.Socket,
  timeoutMs = 20000
): Promise<{ code: number; lines: string[] }> {
  return new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP read timeout"));
    }, timeoutMs);

    const onData = (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      const lines = buf.split(/\r?\n/).filter((l) => l.length > 0);
      if (!lines.length) return;
      const last = lines[lines.length - 1];
      // Multi-line replies use "250-..." until final "250 ..."
      if (/^\d{3}-/.test(last)) return;
      const m = last.match(/^(\d{3})[\s-]/);
      if (!m) return;
      cleanup();
      resolve({ code: Number(m[1]), lines });
    };

    const onErr = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onErr);
    };

    socket.on("data", onData);
    socket.on("error", onErr);
  });
}

async function expectCode(
  socket: net.Socket,
  expected: number | number[],
  command?: string
): Promise<void> {
  if (command) {
    socket.write(command.endsWith("\r\n") ? command : `${command}\r\n`);
  }
  const reply = await readReply(socket);
  const ok = Array.isArray(expected)
    ? expected.includes(reply.code)
    : reply.code === expected;
  if (!ok) {
    throw new Error(
      `SMTP unexpected ${reply.code} (want ${expected}): ${reply.lines.join(" | ")}`
    );
  }
}

/**
 * Send a plain-text email via SMTP STARTTLS + AUTH LOGIN.
 */
export async function sendSmtpPlainText(input: {
  to: string;
  subject: string;
  text: string;
  config?: SmtpConfig | null;
}): Promise<{ sent: true } | { sent: false; reason: string }> {
  const recipientGuard = assertDeliverableRecipient(input.to);
  if (!recipientGuard.ok) {
    console.error("SMTP send blocked (nondeliverable recipient):", input.to);
    return { sent: false, reason: recipientGuard.reason };
  }

  const config = input.config ?? getSmtpConfig();
  if (!config) {
    return { sent: false, reason: "SMTP_HOST/USER/PASSWORD not configured" };
  }

  let socket: net.Socket | null = null;
  let tlsSocket: tls.TLSSocket | null = null;

  try {
    socket = await new Promise<net.Socket>((resolve, reject) => {
      const s = net.connect({ host: config.host, port: config.port }, () =>
        resolve(s)
      );
      s.on("error", reject);
    });

    await expectCode(socket, 220);
    await expectCode(socket, 250, `EHLO problems4us`);
    await expectCode(socket, 220, `STARTTLS`);

    if (!socket) {
      return { sent: false, reason: "smtp_error:socket_missing_after_starttls" };
    }
    const plainSocket: net.Socket = socket;
    tlsSocket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const ts = tls.connect(
        {
          socket: plainSocket,
          host: config.host,
          servername: config.host,
        },
        () => resolve(ts)
      );
      ts.on("error", reject);
    });
    // Ownership transferred to TLS wrapper
    socket = null;

    await expectCode(tlsSocket, 250, `EHLO problems4us`);
    await expectCode(tlsSocket, 334, `AUTH LOGIN`);
    await expectCode(tlsSocket, 334, encodeBase64(config.user));
    await expectCode(tlsSocket, 235, encodeBase64(config.password));
    await expectCode(tlsSocket, 250, `MAIL FROM:<${config.from}>`);
    await expectCode(tlsSocket, 250, `RCPT TO:<${input.to}>`);
    await expectCode(tlsSocket, 354, `DATA`);

    const headers = [
      `From: Problems4Us <${config.from}>`,
      `To: <${input.to}>`,
      `Subject: ${encodeEmailSubjectHeader(input.subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${MAIL_PLAIN_TEXT_TYPE}`,
      ``,
      input.text.replace(/\r?\n/g, "\r\n"),
      `.`,
    ].join("\r\n");

    await expectCode(tlsSocket, 250, headers);
    await expectCode(tlsSocket, 221, `QUIT`);
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("SMTP send failed:", msg.slice(0, 300));
    return { sent: false, reason: `smtp_error:${msg.slice(0, 120)}` };
  } finally {
    try {
      tlsSocket?.destroy();
    } catch {
      /* ignore */
    }
    try {
      socket?.destroy();
    } catch {
      /* ignore */
    }
  }
}
