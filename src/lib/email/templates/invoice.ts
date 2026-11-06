export type InvoiceEmailInput = {
    clientName: string;
    invoiceNumber: string;
    totalCents: number;
    currency: string;
    dueDate: Date;
    pdfUrl: string;
  };
  
  function money(cents: number, currency: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  }
  
  export async function renderInvoiceEmail(input: InvoiceEmailInput) {
    const subject = `Invoice ${input.invoiceNumber} from us`;
    const total = money(input.totalCents, input.currency);
    const due = input.dueDate.toLocaleDateString("en-US", { dateStyle: "long" });
  
    const html = `
  <!DOCTYPE html>
  <html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr><td align="center" style="padding:40px 0">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden">
          <tr><td style="padding:32px">
            <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#111">Invoice ${input.invoiceNumber}</h1>
            <p style="margin:0 0 24px 0;color:#666;font-size:14px">Hi ${input.clientName},</p>
            <p style="margin:0 0 16px 0;color:#333;font-size:14px">Please find your invoice for <strong>${total}</strong>, due on <strong>${due}</strong>.</p>
            <a href="${input.pdfUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:500;margin-top:8px">View invoice PDF</a>
            <p style="margin:32px 0 0 0;color:#666;font-size:13px">Thanks for your business.</p>
          </td></tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:24px">You can reply to this email if you have questions.</p>
      </td></tr>
    </table>
  </body></html>`.trim();
  
    return { subject, html };
  }