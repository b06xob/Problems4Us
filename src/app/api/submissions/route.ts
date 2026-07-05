import { NextRequest, NextResponse } from "next/server";
import {
  listUserSubmissions,
  createUserSubmissionDb,
} from "@/lib/db-service";
import { SUBMISSION_CATEGORIES } from "@/lib/user-submissions";
import type { CreateSubmissionInput, SubmissionUrgency } from "@/lib/types";

const VALID_URGENCIES: SubmissionUrgency[] = ['low', 'medium', 'high', 'critical'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const data = await listUserSubmissions({
      category: searchParams.get("category") ?? undefined,
      urgency: searchParams.get("urgency") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateSubmissionInput>;

    const title = body.title?.trim();
    const description = body.description?.trim();
    const category = body.category?.trim();
    const urgency = body.urgency;

    if (!title || title.length < 10) {
      return NextResponse.json(
        { error: "Title must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (!description || description.length < 30) {
      return NextResponse.json(
        { error: "Description must be at least 30 characters" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    if (!SUBMISSION_CATEGORIES.includes(category as (typeof SUBMISSION_CATEGORIES)[number])) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    if (!urgency || !VALID_URGENCIES.includes(urgency)) {
      return NextResponse.json(
        { error: "Valid urgency level is required" },
        { status: 400 }
      );
    }

    const email = body.submitterEmail?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const submission = await createUserSubmissionDb({
      title,
      description,
      category,
      urgency,
      submitterName: body.submitterName,
      submitterEmail: email,
    });

    return NextResponse.json({ data: submission }, { status: 201 });
  } catch (error) {
    console.error("Failed to create submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
