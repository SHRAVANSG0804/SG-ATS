import { redirect } from "next/navigation";
import { readDb } from "@/lib/store";
import { currentUser, canEdit } from "@/lib/session";
import { JobForm } from "@/components/JobForm";
import { PageHeader } from "@/components/ui";

export default async function NewJobPage() {
  if (!canEdit(await currentUser())) redirect("/jobs");
  const db = readDb();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New job requisition" subtitle="A requisition code (REQ-xxxx) is generated automatically." />
      <JobForm
        clients={db.clients}
        recruiters={db.users.filter((u) => u.role === "recruiter")}
        managers={db.users.filter((u) => u.role === "hiring_manager")}
      />
    </div>
  );
}
