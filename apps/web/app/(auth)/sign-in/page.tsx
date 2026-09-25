import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      <div className={styles.intro}>
        <h1 className="text-h1">Sign in</h1>
        <p className="text-muted">Pick up where you left off.</p>
      </div>
      <AuthForm
        mode="sign-in"
        next={next}
        initialError={
          error === "confirmation" ? "That confirmation link is invalid or has expired." : undefined
        }
      />
    </>
  );
}
