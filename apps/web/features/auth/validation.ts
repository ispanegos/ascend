/** Auth form validation. Mirrors supabase/config.toml password rules. */

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_DISPLAY_NAME_LENGTH = 80;

export interface AuthFieldErrors {
  email?: string;
  password?: string;
  displayName?: string;
}

export interface AuthFormState {
  status: "idle" | "error" | "check-email";
  message?: string;
  fieldErrors?: AuthFieldErrors;
  /** Echoed back so the form keeps what the user typed (spec §26). */
  values?: { email: string; displayName?: string };
}

export const INITIAL_AUTH_STATE: AuthFormState = { status: "idle" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function parseSignIn(form: FormData) {
  const email = readString(form, "email").toLowerCase();
  // Passwords are not trimmed: whitespace can be intentional.
  const rawPassword = form.get("password");
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const fieldErrors: AuthFieldErrors = {};

  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (!password) fieldErrors.password = "Enter your password.";

  return { email, password, fieldErrors };
}

export function parseSignUp(form: FormData) {
  const { email, password, fieldErrors } = parseSignIn(form);
  const displayName = readString(form, "displayName");

  if (password && password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    fieldErrors.displayName = `Keep it under ${MAX_DISPLAY_NAME_LENGTH} characters.`;
  }

  return { email, password, displayName, fieldErrors };
}

export function hasErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
