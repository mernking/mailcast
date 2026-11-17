import nodemailer, { type Transporter } from "nodemailer";
import { decrypt } from "./crypto";
import { renderEmailHtml, renderEmailText } from "./email-template";

export interface SenderLike {
  email: string;
  fromName: string;
  passwordEnc: string;
}

const cache = new Map<string, Transporter>();

function getTransport(sender: SenderLike): Transporter {
  const existing = cache.get(sender.email);
  if (existing) return existing;

  const password = decrypt(sender.passwordEnc);
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: sender.email,
      pass: password,
    },
    // Gmail SMTP: smtp.gmail.com:465 (SSL) / 587 (STARTTLS)
    pool: true,
    maxConnections: 1,
    rateLimit: 4, // stay well under Gmail limits (~20/s hard ceiling)
  });

  cache.set(sender.email, transport);
  return transport;
}

/** Verify the Gmail credentials work. Throws on failure. */
export async function verifySender(sender: SenderLike): Promise<void> {
  const transport = getTransport(sender);
  await transport.verify();
}

export interface SendResult {
  messageId?: string;
  ok: boolean;
  error?: string;
}

interface PersonalizationContext {
  email: string;
  name?: string | null;
}

function applyMerge(text: string, ctx: PersonalizationContext): string {
  const firstName = (ctx.name || "").split(" ")[0] || ctx.email.split("@")[0];
  return text
    .replaceAll("{{email}}", ctx.email)
    .replaceAll("{{name}}", ctx.name || ctx.email.split("@")[0])
    .replaceAll("{{first_name}}", firstName)
    .replaceAll("{{Email}}", ctx.email)
    .replaceAll("{{Name}}", ctx.name || ctx.email.split("@")[0]);
}

export interface SendCampaignArgs {
  sender: SenderLike;
  to: string;
  name?: string | null;
  subject: string;
  markdown: string;
  preheader?: string | null;
}

/** Send a single campaign email to one recipient with merge tags applied. */
export async function sendCampaignEmail(args: SendCampaignArgs): Promise<SendResult> {
  const ctx: PersonalizationContext = { email: args.to, name: args.name };
  const subject = applyMerge(args.subject, ctx);
  const bodyMd = applyMerge(args.markdown, ctx);
  const preheader = args.preheader ? applyMerge(args.preheader, ctx) : undefined;

  const html = renderEmailHtml(bodyMd, {
    preheader,
    unsubscribeEmail: args.sender.email,
  });
  const text = renderEmailText(bodyMd);

  try {
    const transport = getTransport(args.sender);
    const info = await transport.sendMail({
      from: `"${args.sender.fromName}" <${args.sender.email}>`,
      to: args.to,
      subject,
      text,
      html,
      // Encourage interactive clients to render the HTML version
      headers: {
        "List-Unsubscribe": `<mailto:${args.sender.email}?subject=Unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Mailer": "MailCast",
      },
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Drop the cached transport on auth errors so a re-added password is used.
    if (/auth|credentials|535/i.test(message)) {
      cache.delete(args.sender.email);
    }
    return { ok: false, error: message };
  }
}

/** Send a one-off test email to validate the sender setup. */
export async function sendTestEmail(sender: SenderLike, to: string): Promise<SendResult> {
  const html = renderEmailHtml(
    "## It works!\n\nThis is a test broadcast from **MailCast**. Your Gmail sender is connected and ready to send newsletters.",
    { preheader: "Your MailCast test email", unsubscribeEmail: sender.email }
  );
  try {
    const transport = getTransport(sender);
    const info = await transport.sendMail({
      from: `"${sender.fromName}" <${sender.email}>`,
      to,
      subject: "MailCast test email",
      html,
      text: "It works! This is a test broadcast from MailCast.",
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/auth|credentials|535/i.test(message)) cache.delete(sender.email);
    return { ok: false, error: message };
  }
}
