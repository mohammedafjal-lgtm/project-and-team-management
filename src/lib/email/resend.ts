import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const isDev = process.env.NODE_ENV === "development";

/**
 * In development, Resend enforces test mode until you verify a domain:
 *   - the `from` address must be `onboarding@resend.dev`
 *   - the `to` address must be the email on your Resend account
 * Anything else returns a 403 before the email enters the system, so it
 * never shows up in the dashboard.
 *
 * In production, use the domain you verified in Resend.
 */
const FROM_DEV = "onboarding@resend.dev";
const FROM_PROD = process.env.RESEND_FROM_EMAIL ?? "invoices@example.com";
const fromEmail = isDev ? FROM_DEV : FROM_PROD;

const resend = apiKey ? new Resend(apiKey) : null;

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  /** Shown in logs when the recipient is rewritten in development. */
  originalPurpose?: string;
}) {
  if (!resend) {
    console.warn(
      "[resend] RESEND_API_KEY is not set. Skipping send. " +
        "Add RESEND_API_KEY to .env and restart the dev server."
    );
    return;
  }

  const originalTo = input.to;
  let to = originalTo;

  if (isDev) {
    const testRecipient = process.env.RESEND_TEST_RECIPIENT?.trim();
    if (testRecipient) {
      to = testRecipient;
    } else {
      console.warn(
        "[resend:dev] RESEND_TEST_RECIPIENT is not set. Falling back to the original recipient. " +
          "This will only succeed if it matches the email on your Resend account. " +
          "Set RESEND_TEST_RECIPIENT in .env to your Resend account email to avoid 403s."
      );
    }
  }

  if (!to) {
    throw new Error("Recipient email is required");
  }

  if (isDev) {
    const purpose = input.originalPurpose ?? "original";
    console.log(
      `[resend:dev] sending from=${fromEmail} to=${to}` +
        (originalTo !== to ? ` (${purpose} originally to ${originalTo})` : "")
    );
  }

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    if (isDev) {
      console.error(`[resend:dev] failed: ${error.name}: ${error.message}`);
      if (error.name === "validation_error") {
        console.error(
          "[resend:dev] If the message mentions 'testing emails', set RESEND_TEST_RECIPIENT " +
            "to the email on your Resend account, or verify a domain at https://resend.com/domains."
        );
      }
    }
    throw new Error(error.message);
  }

  if (isDev && data?.id) {
    console.log(`[resend:dev] sent id=${data.id} → https://resend.com/emails/${data.id}`);
  }

  return data;
}

export async function sendInvoiceEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  return sendEmail({ ...input, originalPurpose: "invoice" });
}
