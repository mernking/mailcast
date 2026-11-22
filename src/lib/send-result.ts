/** Normalize nodemailer's sendMail result into an explicit success/failure. */

export interface SmtpInfo {
  messageId?: string;
  accepted?: unknown;
  rejected?: unknown;
  pending?: unknown;
}

export interface SendClassification {
  ok: boolean;
  accepted: string[];
  rejected: string[];
  pending: string[];
  messageId?: string;
  error?: string;
}

function toAddresses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && "address" in entry) {
        return String((entry as { address: unknown }).address);
      }
      return "";
    })
    .filter(Boolean);
}

export function classifySendResult(info: SmtpInfo): SendClassification {
  const accepted = toAddresses(info.accepted);
  const rejected = toAddresses(info.rejected);
  const pending = toAddresses(info.pending);
  const ok = accepted.length > 0 && rejected.length === 0 && pending.length === 0;

  let error: string | undefined;
  if (!ok) {
    const parts: string[] = [];
    if (rejected.length) parts.push(`rejected: ${rejected.join(", ")}`);
    if (pending.length) parts.push(`pending: ${pending.join(", ")}`);
    if (!parts.length && !accepted.length) parts.push("SMTP accepted no recipients");
    if (!parts.length) parts.push("SMTP did not accept the message");
    error = parts.join("; ");
  }

  return {
    ok,
    accepted,
    rejected,
    pending,
    ...(info.messageId ? { messageId: info.messageId } : {}),
    ...(error ? { error } : {}),
  };
}
