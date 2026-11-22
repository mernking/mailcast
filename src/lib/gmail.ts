import nodemailer, { type Transporter } from "nodemailer";
import { decrypt } from "./crypto";
import { renderEmailHtml, renderEmailText, type EmailContentType } from "./email-template";
import { classifySendResult, type SendClassification } from "./send-result";
import { hostInlineImages } from "./email-media";
import { prepareTrackedHtml } from "./tracking-store";
import { db } from "./db";

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

  transport.on("error", (err) => {
    console.error(`[mail] SMTP transport error for ${sender.email}:`, err);
  });

  cache.set(sender.email, transport);
  return transport;
}

/** Verify the Gmail credentials work. Throws on failure. */
export async function verifySender(sender: SenderLike): Promise<void> {
  const transport = getTransport(sender);
  await transport.verify();
}

export type SendResult = SendClassification;

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

export interface SendContext {
  /** Public origin for hosted images and tracking links. */
  baseUrl: string;
  campaignId?: string;
  recipientId?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface SendCampaignArgs {
  context?: SendContext;
  sender: SenderLike;
  to: string;
  name?: string | null;
  subject: string;
  /** Markdown body (contentType=markdown) or raw HTML body (contentType=html) */
  content: string;
  contentType?: EmailContentType;
  preheader?: string | null;
}

/** Send a single campaign email to one recipient with merge tags applied. */
export async function sendCampaignEmail(args: SendCampaignArgs): Promise<SendResult> {
  const contentType: EmailContentType = args.contentType ?? "markdown";
  const ctx: PersonalizationContext = { email: args.to, name: args.name };
  const subject = applyMerge(args.subject, ctx);
  const body = applyMerge(args.content, ctx);
  const preheader = args.preheader ? applyMerge(args.preheader, ctx) : undefined;

  const html = renderEmailHtml(body, {
    contentType,
    preheader,
    unsubscribeEmail: args.sender.email,
  });
  const text = renderEmailText(body, contentType);

  let finalHtml = html;
  const context = args.context;
  if (context?.baseUrl) {
    finalHtml = await hostInlineImages(html, {
      host: async (bytes, mimeType) => {
        const stored = await db.storedFile.create({
          data: {
            name: "inline-image",
            mimeType,
            size: bytes.length,
            data: new Uint8Array(bytes),
          },
          select: { id: true },
        });
        return `${context.baseUrl}/api/files/${stored.id}`;
      },
    });

    if (
      context?.baseUrl &&
      context.campaignId &&
      context.recipientId &&
      (context.trackOpens || context.trackClicks)
    ) {
      finalHtml = await prepareTrackedHtml(finalHtml, {
        baseUrl: context.baseUrl,
        campaignId: context.campaignId,
        recipientId: context.recipientId,
        trackOpens: context.trackOpens,
        trackClicks: context.trackClicks,
      });
    }
  }

  try {
    const transport = getTransport(args.sender);
    const info = await transport.sendMail({
      from: `"${args.sender.fromName}" <${args.sender.email}>`,
      to: args.to,
      subject,
      text,
      html: finalHtml,
      // Encourage interactive clients to render the HTML version
      headers: {
        "List-Unsubscribe": `<mailto:${args.sender.email}?subject=Unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Mailer": "MailCast",
      },
    });
    return classifySendResult(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Drop the cached transport on auth errors so a re-added password is used.
    if (/auth|credentials|535/i.test(message)) {
      cache.delete(args.sender.email);
    }
    return { ok: false, accepted: [], rejected: [], pending: [], error: message };
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
    return classifySendResult(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/auth|credentials|535/i.test(message)) cache.delete(sender.email);
    return { ok: false, accepted: [], rejected: [], pending: [], error: message };
  }
}
