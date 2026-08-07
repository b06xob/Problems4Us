/**
 * @jest-environment node
 */
import {
  assertDeliverableRecipient,
  isNondeliverableRecipient,
  MAIL_RECIPIENT_POLICY,
} from "@/lib/mail-recipient-policy";
import { isHardMailFailure } from "@/lib/email-verification";
import { deliveryLooksHard, MAIL_BOUNCE_POLICY } from "@/lib/mail-bounce";

describe("mail recipient policy (stop fake probes)", () => {
  const prev = process.env.MAIL_ALLOW_NONDELIVERABLE_RECIPIENTS;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.MAIL_ALLOW_NONDELIVERABLE_RECIPIENTS;
    } else {
      process.env.MAIL_ALLOW_NONDELIVERABLE_RECIPIENTS = prev;
    }
  });

  it("blocks RFC reserved example.com and probe local-parts", () => {
    delete process.env.MAIL_ALLOW_NONDELIVERABLE_RECIPIENTS;
    expect(
      isNondeliverableRecipient("p4u.verify.probe+20260806222340@example.com")
    ).toBe(true);
    expect(isNondeliverableRecipient("anyone@example.org")).toBe(true);
    expect(isNondeliverableRecipient("user@invalid")).toBe(true);
    expect(isNondeliverableRecipient("b06xob@bellsouth.net")).toBe(false);
  });

  it("assertDeliverableRecipient hard-fails reserved addresses", () => {
    delete process.env.MAIL_ALLOW_NONDELIVERABLE_RECIPIENTS;
    const blocked = assertDeliverableRecipient("probe@example.com");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.hardFailure).toBe(true);
      expect(blocked.reason).toContain(MAIL_RECIPIENT_POLICY.reasonCode);
      expect(isHardMailFailure(blocked.reason)).toBe(true);
    }
  });

  it("override env allows nondeliverable only when explicitly set", () => {
    process.env.MAIL_ALLOW_NONDELIVERABLE_RECIPIENTS = "1";
    expect(assertDeliverableRecipient("x@example.com").ok).toBe(true);
  });
});

describe("hard bounce detection", () => {
  it("treats SMTP 550 and MAILER-DAEMON as hard", () => {
    expect(isHardMailFailure("smtp_error:550 user unknown")).toBe(true);
    expect(isHardMailFailure("async_hard_bounce:MAILER-DAEMON")).toBe(true);
    expect(isHardMailFailure("smtp_error:421 try later")).toBe(false);
  });

  it("deliveryLooksHard respects hardFailure flag", () => {
    expect(
      deliveryLooksHard({
        channel: "none",
        sent: false,
        reason: "temporary",
        hardFailure: true,
      })
    ).toBe(true);
    expect(
      deliveryLooksHard({
        channel: "none",
        sent: false,
        reason: "smtp_error:421 try later",
      })
    ).toBe(false);
  });

  it("documents bounce policy for ops", () => {
    expect(MAIL_BOUNCE_POLICY.suppressRetryDays).toBe(30);
    expect(MAIL_BOUNCE_POLICY.moderationAction).toBe("email_hard_bounce");
    expect(MAIL_BOUNCE_POLICY.purposes.asyncBounce).toBe("async_bounce");
  });
});
