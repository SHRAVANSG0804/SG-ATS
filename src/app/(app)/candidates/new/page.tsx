import { redirect } from "next/navigation";
import { readDb } from "@/lib/store";
import { currentUser, canEdit } from "@/lib/session";
import { clientName } from "@/lib/queries";
import { CandidateForm } from "@/components/CandidateForm";
import { PageHeader } from "@/components/ui";

export default async function NewCandidatePage({ searchParams }: { searchParams: Promise<{ jobId?: string }> }) {
  if (!canEdit(await currentUser())) redirect("/candidates");
  const { jobId } = await searchParams;
  const jobs = readDb()
    .jobs.filter((j) => j.status === "Open")
    .map((j) => ({ id: j.id, label: `${j.code} · ${j.title} · ${clientName(j.clientId)}` }));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Add candidate" subtitle="Phone and email are checked against existing records as you type." />
      <CandidateForm jobs={jobs} jobId={jobId} />
    </div>
  );
}
