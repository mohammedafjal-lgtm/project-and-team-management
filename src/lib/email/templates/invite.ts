export type InviteEmailInput = {
  workspaceName: string;
  inviterEmail: string;
  role: string;
  acceptUrl: string;
};

export function renderInviteEmail(input: InviteEmailInput) {
  const subject = `You're invited to ${input.workspaceName}`;
  const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="padding:40px 0">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden">
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#111">Join ${input.workspaceName}</h1>
          <p style="margin:0 0 16px 0;color:#333;font-size:14px">
            ${input.inviterEmail} invited you as <strong>${input.role}</strong>.
          </p>
          <a href="${input.acceptUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:500;margin-top:8px">Accept invitation</a>
          <p style="margin:24px 0 0 0;color:#666;font-size:13px">This link expires in 7 days.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

  return { subject, html };
}
