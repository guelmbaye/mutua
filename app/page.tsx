import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Github } from "lucide-react";
import { CapabilityDemo } from "@/components/landing/capability-demo";
import { Band, CTA, Lede, ModelCard, Primitive } from "@/components/landing/pieces";
import { REPO_URL } from "@/domain/constants";

export const metadata: Metadata = {
  title: "MUTUA — Shared State for Humans and Agents",
  description:
    "A WebMCP-native decision workspace where humans and AI agents explore changes, simulate consequences, and commit decisions together. A proposal cannot be committed until a human approves it.",
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-soft">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Image
          src="/logo-mutua-light.png"
          alt="MUTUA"
          width={2008}
          height={783}
          priority
          className="h-7 w-auto"
        />
        <nav className="flex items-center gap-5 text-sm">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden text-graphite-600 transition-colors hover:text-graphite sm:inline"
          >
            GitHub
          </a>
          <Link href="/workspace" className="font-medium text-graphite transition-colors hover:text-accent">
            Launch demo
          </Link>
        </nav>
      </header>

      {/* Hero — left aligned and editorial. This is decision infrastructure, not a SaaS splash. */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-10 sm:pb-24 sm:pt-16">
        <p className="font-mono text-eyebrow uppercase tracking-[0.09em] text-slate">
          Shared state for humans and agents
        </p>
        <h1 className="mt-5 text-balance text-[42px] font-semibold leading-[1.02] tracking-[-0.03em] text-graphite sm:text-[68px]">
          One state.
          <br />
          Two participants.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-graphite-600">
          MUTUA is a WebMCP-native decision workspace where humans and AI agents explore changes,
          simulate consequences, and commit decisions together. The agent doesn&apos;t work around you.
          It works in the same reality you do.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <CTA href="/workspace">
            Launch demo
            <ArrowRight className="h-4 w-4" aria-hidden />
          </CTA>
          <CTA href={REPO_URL} variant="outline" external>
            <Github className="h-4 w-4" aria-hidden />
            View source
          </CTA>
        </div>
        <p className="mt-4 text-meta text-slate">
          No account, no setup, ninety seconds. Desktop, 1280px and up.
        </p>
      </section>

      <Band number="01" eyebrow="The problem">
        <Lede>
          Agentic products keep asking you to choose between an agent that only talks, and one that
          acts without you.
        </Lede>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <ModelCard
            label="Advisor"
            rows={["Application", "    ↑", "  Human", "    ↑", "   Chat", "    ↑", "  Agent"]}
            body="It can explain what should change, but it never touches the work. You translate its advice into the application by hand."
          />
          <ModelCard
            label="Operator"
            rows={["  Human", "    ↓", "  Agent", "    ↓", "  Tools", "    ↓", "Application"]}
            body="Powerful, and opaque. Consequential actions happen somewhere behind the interface, and you learn about them afterwards."
          />
          <ModelCard
            accent
            label="Collaborator"
            rows={[
              "SHARED APPLICATION STATE",
              "    ┌─────┴─────┐",
              "  HUMAN       AGENT",
              "    │           │",
              "   UI        WebMCP",
              "    └─────┬─────┘",
              "        COMMIT",
            ]}
            body="The interface becomes the common workspace. The agent proposes inside it, you decide inside it, and neither of you loses sight of the other."
          />
        </div>
      </Band>

      <Band number="02" eyebrow="Four primitives">
        <Lede>
          A collaboration model that would be hard to build cleanly without WebMCP.
        </Lede>
        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          <Primitive
            index="01"
            title="Shared state"
            body="One store backs the interface and every WebMCP tool. There is no agent-side copy of reality that can quietly drift out of date."
          />
          <Primitive
            index="02"
            title="Proposal state"
            body="Agent changes are explicit, reversible operations applied to a cloned plan. Exactly one capability can touch what's real, and it is gated."
          />
          <Primitive
            index="03"
            title="Human locks"
            body="Lock a commitment and it cannot be rescoped, delayed, reassigned or resized. A plan built before the lock is flagged as a conflict, never rewritten behind your back."
          />
          <Primitive
            index="04"
            title="Dynamic capability surface"
            body="The registered tool set is a function of workflow phase. Comparison doesn't exist before simulation. Commit doesn't exist before approval."
          />
        </div>
      </Band>

      <Band number="03" eyebrow="The moment">
        <div className="grid gap-10 md:grid-cols-[1fr_400px] md:items-center">
          <div>
            <Lede>
              Capabilities aren&apos;t functions a page exposes. They&apos;re permission to
              participate in its current state.
            </Lede>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-graphite-600">
              Before you approve a plan, the agent does not have the ability to commit it. Not
              disabled, not guarded by a confirmation dialog — <strong className="font-medium text-graphite">not
              registered</strong>. Approving is a state transition only a human can make, and the WebMCP
              surface changes the instant it happens.
            </p>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-graphite-600">
              Registration is guidance. Enforcement is separate: the commit handler independently
              re-validates approval, simulation freshness, state version and hard constraints, so an
              agent that calls it out of turn is refused rather than obeyed.
            </p>
            <p className="mt-6 text-meta text-slate">Try it — the control is real.</p>
          </div>
          <CapabilityDemo />
        </div>
      </Band>

      <Band number="04" eyebrow="Deterministic by construction">
        <Lede>The agent chooses operations. The application computes consequences.</Lede>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-graphite-600">
          No model calculates a deadline, a workload or a cost in MUTUA. The engines are pure
          functions over the workspace, which is why the demo replays identically every time — and
          why the test suite can assert these exact figures.
        </p>

        <div className="mt-9 overflow-x-auto rounded border border-slate-line bg-white">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Launch recovery outcomes after one engineer becomes unavailable
            </caption>
            <thead>
              <tr className="border-b border-slate-line text-left">
                <th scope="col" className="px-4 py-2.5 font-mono text-eyebrow uppercase tracking-[0.09em] text-slate">
                  Metric
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold text-graphite">
                  Current
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold text-graphite">
                  Proposal A
                </th>
                <th scope="col" className="bg-accent-soft px-4 py-2.5 font-semibold text-graphite">
                  Proposal B
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-line/70">
              <NumberRow label="Launch" values={["At risk · +2 days", "Sep 30", "Sep 30"]} tones={["danger", "success", "success"]} />
              <NumberRow label="Extra cost" values={["—", "+$12,000", "+$4,000"]} />
              <NumberRow label="Peak overload" values={["34%", "4%", "9%"]} tones={["danger", "success", "success"]} />
              <NumberRow label="Scope loss" values={["—", "1 feature", "None"]} tones={["neutral", "warning", "success"]} />
              <NumberRow label="Human locks" values={["—", "Conflict", "Respected"]} tones={["neutral", "danger", "success"]} />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-meta text-slate">
          One QA engineer becomes unavailable four weeks before a September 30 launch. Proposal B
          exists because a human locked the Analytics dashboard — the lock doesn&apos;t filter
          operations, it changes which recovery is possible at all.
        </p>
      </Band>

      <Band number="05" eyebrow="Beyond the demo">
        <Lede>The launch workspace is the proof, not the product.</Lede>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-graphite-600">
          Shared state, reversible proposals, constraint enforcement, dynamic capability registration,
          human authorisation and an audit trail are domain-general. Software launch recovery was
          chosen because it&apos;s legible in seconds.
        </p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {[
            "Incident response",
            "Procurement",
            "Staffing",
            "Infrastructure operations",
            "Financial planning",
            "Compliance",
            "Engineering design",
          ].map((domain) => (
            <li
              key={domain}
              className="rounded-full border border-slate-line bg-white px-3 py-1.5 text-sm text-graphite-600"
            >
              {domain}
            </li>
          ))}
        </ul>
      </Band>

      <footer className="border-t border-slate-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Image
              src="/logo-mutua-light.png"
              alt="MUTUA"
              width={2008}
              height={783}
              className="h-6 w-auto"
            />
            <p className="mt-4 text-lg font-medium tracking-tight text-graphite">
              Think together. Change safely. Commit deliberately.
            </p>
            <p className="mt-2 max-w-md text-sm text-slate">
              WebMCP can do more than let agents use websites. It can let websites define how humans
              and agents work together.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CTA href="/workspace">
              Launch demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </CTA>
            <CTA href={REPO_URL} variant="outline" external>
              <Github className="h-4 w-4" aria-hidden />
              Source
            </CTA>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NumberRow({
  label,
  values,
  tones = [],
}: {
  label: string;
  values: string[];
  tones?: ("success" | "warning" | "danger" | "neutral")[];
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-graphite",
  };
  return (
    <tr>
      <th scope="row" className="px-4 py-2.5 text-left font-normal text-slate">
        {label}
      </th>
      {values.map((value, index) => (
        <td
          key={value + index}
          className={`tabular px-4 py-2.5 ${toneClass[tones[index] ?? "neutral"]} ${
            index === 2 ? "bg-accent-soft/40" : ""
          }`}
        >
          {value}
        </td>
      ))}
    </tr>
  );
}
