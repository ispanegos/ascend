import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from "@ascend/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/shell/BrandMark";
import { QuestCard } from "@/components/game/QuestCard";
import { SAMPLE_QUESTS } from "@/features/screens/samples";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge, type DisplayStatus } from "@/components/ui/StatusBadge";

export const metadata: Metadata = { title: "Design System V2" };

const STATUSES: DisplayStatus[] = [
  "unranked",
  "provisional",
  "verified",
  "peak",
  "new-peak",
  "recoil",
  "revenge",
  "locked",
  "available",
  "active",
  "completed",
  "failed",
  "scheduled",
];

/** Sample content for visual review only. Not real Quests. */
export default function DesignGalleryPage() {
  return (
    <main id="main" className="app-page app-page--focused stack stack--lg" style={{ paddingBlock: "var(--space-4) var(--space-10)" }}>
      <header className="stack stack--sm">
        <BrandMark size="lg" />
        <h1 className="text-h1">Design System V2</h1>
        <p className="text-muted">
          Component states for review. Sample content only. <Link href="/design/review">Screen review</Link> ·{" "}
          <Link href="/design/sample/boss">Boss</Link> · <Link href="/design/sample/workout">Active workout</Link>
        </p>
      </header>

      <section>
        <SectionHeader title="Attributes" />
        <Card>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, margin: 0, padding: 0, listStyle: "none" }}>
            {(["overall", ...ATTRIBUTE_KEYS] as const).map((key) => (
              <li key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 12 }}>
                <AttributeIcon attribute={key} size={32} />
                {key === "overall" ? "Overall" : ATTRIBUTE_LABELS[key]}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionHeader title="Statuses" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </section>

      <section className="stack">
        <SectionHeader title="Buttons" />
        <Button>Primary action</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="boss">Face the Boss</Button>
        <Button variant="success">Done</Button>
        <Button variant="danger">Stop the test</Button>
        <Button variant="ghost">Later</Button>
      </section>

      <section className="stack">
        <SectionHeader title="Progress" />
        <ProgressBar value={4} max={6} label="Gold" text="4 / 6" tone="gold" size="md" />
        <ProgressBar value={12} max={20} label="Data" text="12 / 20" tone="data" size="md" />
        <ProgressBar value={42} max={100} label="Boss" text="42%" tone="boss" size="md" />
      </section>

      <section className="stack">
        <SectionHeader title="Quest card states" aside="sample" />
        {SAMPLE_QUESTS.map((quest) => (
          <QuestCard key={quest.title} {...quest} />
        ))}
        <QuestCard title="Tempo intervals" description="Needs an Endurance Path." duration="35 min" affects={["endurance"]} evidence="Workout" status="locked" />
        <QuestCard title="Carry ladder" description="Stopped early — that is fine." duration="20 min" affects={["core"]} evidence="Workout" status="failed" />
      </section>
    </main>
  );
}
