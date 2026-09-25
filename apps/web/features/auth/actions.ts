"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SIGN_IN_PATH, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { type AuthFormState, hasErrors, parseSignIn, parseSignUp } from "./validation";

export async function signIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const { email, password, fieldErrors } = parseSignIn(form);
  if (hasErrors(fieldErrors)) {
    return { status: "error", fieldErrors, values: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
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

  redirect(safeNextPath(null));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(SIGN_IN_PATH);
}
