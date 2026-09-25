import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";
import { signOut } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, preferred_units")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <PageHeader title="Profile" />

      <div className="stack stack--lg">
        {error ? (
          <ErrorState title="Your profile didn't load">
            <p>Check your connection and reload the page.</p>
          </ErrorState>
        ) : (
          <Card as="section" aria-labelledby="account-heading">
            <h2 id="account-heading" className="text-label text-muted">
              Account
            </h2>
            <dl className={styles.list}>
              <div className={styles.row}>
                <dt>Name</dt>
                <dd>{profile?.display_name ?? <span className="text-muted">Not set</span>}</dd>
              </div>
              <div className={styles.row}>
                <dt>Email</dt>
                <dd>{user.email ?? <span className="text-muted">Not available</span>}</dd>
              </div>
              <div className={styles.row}>
                <dt>Units</dt>
                <dd>{profile?.preferred_units === "imperial" ? "Imperial" : "Metric"}</dd>
              </div>
            </dl>
          </Card>
        )}

        <p className="text-muted">
          Body, equipment, availability and data sources are set up during onboarding.
        </p>

        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}
