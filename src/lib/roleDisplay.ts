import { ROLE_DISPLAY_LABEL, type ExerciseRole } from "../types";

const KNOWN = new Set<string>(Object.keys(ROLE_DISPLAY_LABEL));

/** Map stored role values to user-facing labels without renaming History data. */
export function roleDisplayLabel(role: ExerciseRole | string | undefined | null): string {
  if (!role) return "";
  if (KNOWN.has(role)) return ROLE_DISPLAY_LABEL[role as ExerciseRole];
  return role;
}

export function isPrimaryRole(role: ExerciseRole | string | undefined | null): boolean {
  return role === "primary";
}
