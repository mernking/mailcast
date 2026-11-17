"use client";

import { useMemo } from "react";
import type { FormField } from "./types";

interface FormPreviewProps {
  fields: FormField[];
  buttonText: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  successMessage?: string;
  /** When true, render in "submitted" state showing the success message. */
  submitted?: boolean;
}

/**
 * A live, non-submitting preview of an embedded form, styled entirely with
 * inline styles so it mirrors what the embed snippet will render on an
 * external site (which does not have access to Tailwind).
 */
export function FormPreview({
  fields,
  buttonText,
  accentColor,
  backgroundColor,
  textColor,
  successMessage,
  submitted,
}: FormPreviewProps) {
  const inputs = useMemo(
    () =>
      fields.filter(
        (f) => f.name && f.name.trim() !== "" && f.label && f.label.trim() !== ""
      ),
    [fields]
  );

  const containerStyle: React.CSSProperties = {
    backgroundColor,
    color: textColor,
    padding: "20px",
    borderRadius: "12px",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    maxWidth: "380px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    border: "1px solid rgba(0,0,0,0.08)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "4px",
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 11px",
    fontSize: "14px",
    border: `1px solid ${accentColor}33`,
    borderRadius: "8px",
    backgroundColor: backgroundColor,
    color: textColor,
    outline: "none",
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: accentColor,
    color: backgroundColor,
    border: "none",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "4px",
  };

  const successStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: "#15803d",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "rgba(21,128,61,0.08)",
    textAlign: "center",
  };

  if (submitted && successMessage) {
    return (
      <div style={containerStyle} role="status">
        <div style={successStyle}>{successMessage}</div>
      </div>
    );
  }

  if (inputs.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: "13px", opacity: 0.6 }}>
          Add at least one field with a label to see the preview.
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} aria-label="Live form preview">
      {inputs.map((f) => (
        <div key={f.name}>
          <label style={labelStyle}>
            {f.label}
            {f.required ? " *" : ""}
          </label>
          <input
            type={f.type === "email" ? "email" : "text"}
            name={f.name}
            placeholder={f.placeholder || ""}
            required={f.required}
            style={inputStyle}
            tabIndex={-1}
            readOnly
            onFocus={(e) => e.currentTarget.blur()}
          />
        </div>
      ))}
      <button type="button" style={buttonStyle} tabIndex={-1} onClick={(e) => e.preventDefault()}>
        {buttonText || "Subscribe"}
      </button>
    </div>
  );
}
