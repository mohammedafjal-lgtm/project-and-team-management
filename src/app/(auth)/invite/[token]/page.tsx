import Link from "next/link";
import { getInvitationByToken } from "@/domains/team/team.service";
import { AcceptInviteForm } from "@/components/team/accept-invite-form";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Invitation unavailable</h1>
        <p className="text-sm text-neutral-500">
          This invite link is invalid or has expired. Ask your workspace owner to send a new one.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm underline underline-offset-4 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <AcceptInviteForm
      token={invitation.token}
      email={invitation.email}
      role={invitation.role}
      workspaceName={invitation.tenant.name}
    />
  );
}
