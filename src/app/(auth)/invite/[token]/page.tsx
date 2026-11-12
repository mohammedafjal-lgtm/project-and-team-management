import Link from "next/link";
import { AuthScreen } from "@/components/auth/auth-screen";
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
      <AuthScreen>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Invitation unavailable</h1>
          <p className="text-sm text-muted-foreground">
            This invite link is invalid or has expired. Ask your workspace owner to send a new one.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm underline underline-offset-4 hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AcceptInviteForm
        token={invitation.token}
        email={invitation.email}
        role={invitation.role}
        workspaceName={invitation.tenant.name}
      />
    </AuthScreen>
  );
}
