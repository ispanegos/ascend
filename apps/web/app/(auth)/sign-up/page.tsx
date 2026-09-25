import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <>
      <div className={styles.intro}>
        <h1 className="text-h1">Create your athlete profile</h1>
        <p className="text-muted">
          ASCEND measures what you can do, then shows you what to do next.
        </p>
      </div>
      <AuthForm mode="sign-up" />
    </>
  );
}
