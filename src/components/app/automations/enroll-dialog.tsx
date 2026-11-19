"use client";

/**
 * Minimal placeholder for the EnrollDialog component.
 *
 * NOTE (Task 2-c): The automations feature (`automations-section.tsx`) was
 * left incomplete by a previous agent — it imports `./enroll-dialog` which
 * was never created, breaking the whole app's compilation. This stub exists
 * solely to unblock the dev server so the campaign editor (the actual scope
 * of Task 2-c) can be tested. A future agent should implement the real
 * EnrollDialog.
 */
export function EnrollDialog({
  workflowId,
}: {
  workflowId: string | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  // No-op placeholder. When workflowId is null the parent hides it anyway.
  void workflowId;
  return null;
}
