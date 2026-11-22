/** Diff a contact's current group ids against the user's selection. */

export function reconcileGroupMemberships(
  current: string[],
  selected: string[]
): { toAdd: string[]; toRemove: string[] } {
  const wanted = new Set(selected);
  const existing = new Set(current);
  return {
    toAdd: selected.filter((id) => !existing.has(id)),
    toRemove: current.filter((id) => !wanted.has(id)),
  };
}
