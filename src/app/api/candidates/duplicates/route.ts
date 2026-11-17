import { NextResponse } from "next/server";
import { findDuplicates } from "@/lib/queries";
import { currentUserOrNull } from "@/lib/session";

// Live duplicate check used while a recruiter types a phone number / email.
export async function GET(req: Request) {
  if (!(await currentUserOrNull())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone") ?? "";
  const email = url.searchParams.get("email") ?? "";
  return NextResponse.json({ duplicates: findDuplicates(phone, email) });
}
