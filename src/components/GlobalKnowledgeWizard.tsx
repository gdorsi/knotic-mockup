import { useMemo, useState } from "react";
import { useStore } from "../state/store";

const steps = [
  {
    id: "domain",
    title: "What does this project do?",
    hint: "One-paragraph product summary. Pi will use this on every call.",
    placeholder:
      "e.g. Billing service for Acme. Issues invoices, handles webhooks from Stripe and Adyen, reconciles payouts nightly.",
  },
  {
    id: "stack",
    title: "Stack & runtime",
    hint: "Languages, frameworks, deployment target.",
    placeholder: "Node 20, TypeScript, Fastify, Postgres 15, deployed on Fly.io.",
  },
  {
    id: "conventions",
    title: "Conventions Knotic should respect",
    hint: "Style, testing, commit format, what NOT to touch.",
    placeholder:
      "ESM only. Tests in Vitest. Never edit src/legacy/**. Commit messages follow conventional commits.",
  },
  {
    id: "people",
    title: "Stakeholders / on-call",
    hint: "So Architect knows when to pause and who to flag.",
    placeholder: "Backend: @guido. Payments owner: @sara. On-call rotation: pagerduty/billing.",
  },
] as const;

export function GlobalKnowledgeWizard({ projectId }: { projectId: string }) {
  const proj = useStore((s) => s.projects.find((p) => p.id === projectId));
  const complete = useStore((s) => s.completeGlobalKnowledge);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = steps[idx];
  const filled = useMemo(
    () => steps.filter((s) => (answers[s.id] ?? "").trim().length > 0).length,
    [answers],
  );

  if (!proj) return null;

  const onNext = () => {
    if (idx < steps.length - 1) setIdx(idx + 1);
    else {
      const md = renderKnowledge(proj.name, answers);
      complete(projectId, md);
    }
  };

  return (
    <div className="gk-wrap">
      <div className="gk-head">
        <h2>Create Global Knowledge</h2>
        <p className="dim">
          Knotic didn't find <code>.knotic/global-knowledge.md</code> in{" "}
          <code>{proj.path}</code>. Once-only setup before sessions get useful.
        </p>
        <div className="gk-progress">
          <div className="gk-bar" style={{ width: `${(filled / steps.length) * 100}%` }} />
          <span className="gk-progress-label">
            {filled} / {steps.length} answered
          </span>
        </div>
      </div>

      <div className="gk-stepper">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={"gk-pill " + (i === idx ? "active " : "") + (answers[s.id] ? "done" : "")}
            onClick={() => setIdx(i)}
          >
            <span className="gk-pill-i">{i + 1}</span>
            <span>{s.title.split("?")[0]}</span>
          </div>
        ))}
      </div>

      <div className="gk-card">
        <h3>{current.title}</h3>
        <p className="dim">{current.hint}</p>
        <textarea
          value={answers[current.id] ?? ""}
          onChange={(e) => setAnswers((a) => ({ ...a, [current.id]: e.target.value }))}
          placeholder={current.placeholder}
          rows={8}
        />
        <div className="gk-actions">
          <button className="btn ghost" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
            ← Back
          </button>
          <button className="btn primary" onClick={onNext}>
            {idx === steps.length - 1 ? "Create .knotic/ and continue →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function renderKnowledge(name: string, a: Record<string, string>): string {
  return [
    `# Global Knowledge — ${name}`,
    "",
    "## What this project does",
    a.domain ?? "",
    "",
    "## Stack & runtime",
    a.stack ?? "",
    "",
    "## Conventions",
    a.conventions ?? "",
    "",
    "## Stakeholders",
    a.people ?? "",
    "",
  ].join("\n");
}
