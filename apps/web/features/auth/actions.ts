"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SIGN_IN_PATH, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { type AuthFormState, hasErrors, parseSignIn, parseSignUp } from "./validation";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const sleep = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());
const MAX_TOKEN_ATTEMPTS = 4;

function issuedAt(accessToken: string): number | null {
  try {
    const iat = Number(JSON.parse(Buffer.from(accessToken.split(".")[1] ?? "", "base64url").toString("utf8")).iat);
    return Number.isFinite(iat) ? iat : null;
  } catch {
    return null;
  }
}

/**
 * The data API can reject a just-issued token as "JWT issued at future" and
 * then keeps rejecting that same token, so retrying the request cannot
 * recover (ADR-030). Before redirecting: wait until the issuing second has
 * passed, confirm the data API accepts the token, and if it still does not,
 * refresh the session for a new token. Runs in a Server Action, so the
 * refreshed session is written to cookies. Bounded: at most a few seconds,
 * once per sign-in; any other error is left to the next page to handle.
 */
async function settleFreshToken(supabase: ServerClient, accessToken: string | undefined): Promise<void> {
  let token = accessToken;
  for (let attempt = 1; token && attempt <= MAX_TOKEN_ATTEMPTS; attempt++) {
    const iat = issuedAt(token);
    const waitMs = iat === null ? 0 : Math.min(1_500, (iat + 1) * 1000 - Date.now() + 50);
    await sleep(Math.max(waitMs, attempt > 1 ? 500 : 0));
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (!error || !/issued at future/i.test(error.message) || attempt === MAX_TOKEN_ATTEMPTS) return;
    const refreshed = await supabase.auth.refreshSession();
    token = refreshed.data.session?.access_token;
  }
}

export async function signIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const { email, password, fieldErrors } = parseSignIn(form);
  if (hasErrors(fieldErrors)) {
    return { status: "error", fieldErrors, values: { email } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      status: "error",
      // Same message for unknown email and wrong password.
      message:
        error.code === "email_not_confirmed"
          ? "Confirm your email address first. Check your inbox for the link."
          : "Email or password is incorrect.",
      values: { email },
    };
  }

  await settleFreshToken(supabase, data.session?.access_token);
  const next = form.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null));
}

export async function signUp(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const { email, password, displayName, fieldErrors } = parseSignUp(form);
  const values = { email, displayName };
  if (hasErrors(fieldErrors)) {
    return { status: "error", fieldErrors, values };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : {},
      ...(origin ? { emailRedirectTo: `${origin}/auth/confirm` } : {}),
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        error.code === "weak_password"
          ? "Choose a stronger password."
          : "We couldn't create your account. Try again.",
      values,
    };
  }

  // With email confirmation enabled there is no session yet.
  if (!data.session) {
    return {
      status: "check-email",
      message: `We sent a confirmation link to ${email}.`,
      values,
    };
  }

  await settleFreshToken(supabase, data.session.access_token);
  redirect(safeNextPath(null));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(SIGN_IN_PATH);
}
