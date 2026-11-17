import { NextResponse } from "next/server";
import { findDuplicates } from "@/lib/queries";

// Live duplicate check used while a recruiter types a phone number / email.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone") ?? "";
  const email = url.searchParams.get("email") ?? "";
  return NextResponse.json({ duplicates: findDuplicates(phone, email) });
}
