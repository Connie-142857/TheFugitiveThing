// Username Validation Rules & Utilities for The Fugitive

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
export const FORBIDDEN_TERMS = ['admin', 'moderator', 'system', 'host', 'enric', 'fugitive'];

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (!trimmed) {
    return { valid: false, error: 'Username must not be empty.' };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters in length.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username cannot exceed 20 characters.' };
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Username may only contain letters, numbers, and underscores (no spaces or symbols).',
    };
  }
  const lower = trimmed.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower === term) {
      return { valid: false, error: `The moniker "${term}" is reserved by decree of the realm.` };
    }
  }
  return { valid: true };
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
