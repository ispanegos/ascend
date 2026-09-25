"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { TextField } from "@/components/ui/TextField";
import styles from "@/app/(auth)/auth.module.css";
import { signIn, signUp } from "./actions";
import { INITIAL_AUTH_STATE, MIN_PASSWORD_LENGTH } from "./validation";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  next?: string | undefined;
  /** Message carried in from a redirect, e.g. a failed email confirmation. */
  initialError?: string | undefined;
}

export function AuthForm({ mode, next, initialError }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  const [state, formAction, pending] = useActionState(
    isSignUp ? signUp : signIn,
    INITIAL_AUTH_STATE,
  );
  const errors = state.fieldErrors ?? {};
  const formError = state.status === "error" ? state.message : initialError;

  if (state.status === "check-email") {
    return (
      <div className={styles.form}>
        <div className={styles.notice} role="status">
          <p>
            <strong>Check your inbox.</strong> {state.message} Open it on this device to
            finish creating your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}

      {isSignUp ? (
        <TextField
          label="Name"
          name="displayName"
          autoComplete="nickname"
          hint="Optional. How ASCEND addresses you."
          defaultValue={state.values?.displayName ?? ""}
          error={errors.displayName}
        />
      ) : null}

      <TextField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={state.values?.email ?? ""}
        error={errors.email}
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete={isSignUp ? "new-password" : "current-password"}
        required
        minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
        hint={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
        error={errors.password}
      />

      <MobileActionBar>
        <Button type="submit" loading={pending}>
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
        <p className={styles.switch}>
          {isSignUp ? "Already have an account?" : "New to ASCEND?"}
          <Link href={isSignUp ? "/sign-in" : "/sign-up"}>
            {isSignUp ? "Sign in" : "Create account"}
          </Link>
        </p>
      </MobileActionBar>
    </form>
  );
}
