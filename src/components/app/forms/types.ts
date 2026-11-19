export type FieldType = "text" | "email" | "name" | "phone" | "telegram";

/**
 * A short human-readable label for a field type, used in selects and labels.
 */
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  email: "Email",
  name: "Name",
  phone: "Phone",
  telegram: "Telegram",
};

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
}

/** Minimal group reference returned alongside a form that feeds a group. */
export interface LinkedGroup {
  id: string;
  name: string;
}

export interface FormSummary {
  id: string;
  name: string;
  buttonText: string;
  tagsToAdd: string;
  fields: FormField[];
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  linkedGroup: LinkedGroup | null;
  createdAt: string;
  submissionCount: number;
}

export interface FormFull {
  id: string;
  name: string;
  fields: FormField[];
  buttonText: string;
  successMessage: string;
  redirectUrl: string | null;
  tagsToAdd: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  linkedGroup: LinkedGroup | null;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
}

export interface FormSubmission {
  id: string;
  email: string;
  name: string | null;
  data: Record<string, unknown>;
  contactId: string | null;
  createdAt: string;
}

export interface FormSubmissionsResponse {
  items: FormSubmission[];
  total: number;
  page: number;
  limit: number;
}

/** Suggest a lowercase field name from a human label. */
export function suggestName(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "field";
}

export const DEFAULT_FIELDS: FormField[] = [
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "you@example.com",
  },
];

export const NEW_FORM_DEFAULTS: Omit<FormFull, "id" | "createdAt" | "updatedAt" | "submissionCount"> = {
  name: "",
  fields: DEFAULT_FIELDS,
  buttonText: "Subscribe",
  successMessage: "Thanks for subscribing!",
  redirectUrl: null,
  tagsToAdd: "",
  accentColor: "#1a1a1a",
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
};
