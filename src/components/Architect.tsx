import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import type { ArchitectStep, ArchitectStepStatus } from "../state/types";

export function Architect({ projectId, specSlug }: { projectId: string; specSlug: string }) {
  const ensure = useStore((s) => s.ensureArchitectPlan);
  const plan = useStore((s) => s.architect[specSlug]);
  const run = useStore((s) => s.runArchitect);
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const setView = useStore((s) => s.setView);
  const review = useStore((s) => s.review[specSlug]);

  useEffect(() => {
    ensure(specSlug);
  }, [specSlug, ensure]);

  if (!plan || !project) return null;

  const done = plan.steps.filter((s) => s.status === "completed").length;
  const running = plan.steps.some((s) => s.status === "running");
  const finished = done === plan.steps.length;

  return (
    <div className="arc-wrap">
      <div className="arc-head">
        <div>
          <span className="dim">Architect · plan-and-execute</span>
          <h2>{titleFromSlug(specSlug)}</h2>
          <div className="dim">
            spec: <code>.knotic/spec/{specSlug}.spec.md</code> · steps {done}/{plan.steps.length}
          </div>
        </div>
        <div className="arc-controls">
          {running && <span className="arc-pill running">running</span>}
          {finished && !running && <span className="arc-pill done">complete</span>}
          {finished && review ? (
            <button
              className="btn primary"
              onClick={() =>
                setView({ kind: "review", projectId, specSlug })
              }
            >
              Open code review →
            </button>
          ) : (
            <button
              className="btn primary"
              onClick={() => run(specSlug)}
              disabled={running}
            >
              {done === 0 ? "Run plan ▶" : "Run remaining ▶"}
            </button>
          )}
        </div>
      </div>

      <ol className="arc-list">
        {plan.steps.map((step, i) => (
          <StepRow key={step.id} step={step} index={i + 1} />
        ))}
      </ol>

      {finished && (
        <div className="arc-handoff">
          <div>
            <strong>Plan complete.</strong> Knotic generated a structured code review with
            per-chapter AI feedback (powered by <code>@pierre/diffs</code>).
          </div>
          <button
            className="btn primary"
            onClick={() => setView({ kind: "review", projectId, specSlug })}
          >
            Review changes →
          </button>
        </div>
      )}
    </div>
  );
}

function StepRow({ step, index }: { step: ArchitectStep; index: number }) {
  const [open, setOpen] = useState(step.status === "running" || step.status === "paused");

  return (
    <li className={"arc-step s-" + step.status}>
      <button className="arc-step-head" onClick={() => setOpen((x) => !x)}>
        <span className="arc-step-i">{index}</span>
        <StatusDot status={step.status} />
        <span className="arc-step-title">{step.title}</span>
        {step.detail && <span className="arc-step-detail dim">— {step.detail}</span>}
        <span className="arc-step-toggle">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="arc-step-body">
          {step.files && step.files.length > 0 && (
            <div className="arc-files">
              <span className="dim">files</span>
              {step.files.map((f) => (
                <a key={f} className="arc-file-link" href="#" onClick={(e) => e.preventDefault()}>
                  {f}
                </a>
              ))}
            </div>
          )}
          <div className="arc-log">
            <div className="arc-log-head">
              <span className="dim">step session log</span>
              <a href="#" onClick={(e) => e.preventDefault()} className="dim small">
                open in new tab ↗
              </a>
            </div>
            <pre>
              {(step.log ?? []).join("\n") || "[no events yet]"}
            </pre>
          </div>
          <div className="arc-step-actions">
            <button className="btn ghost small" disabled>play</button>
            <button className="btn ghost small" disabled>skip</button>
            <button className="btn ghost small" disabled>reset</button>
            <button className="btn ghost small" disabled>view diff</button>
          </div>
        </div>
      )}
    </li>
  );
}

function StatusDot({ status }: { status: ArchitectStepStatus }) {
  const map: Record<ArchitectStepStatus, string> = {
    pending: "·",
    running: "◐",
    paused: "⏸",
    completed: "✓",
    skipped: "↷",
    error: "✕",
  };
  return <span className={"arc-dot d-" + status}>{map[status]}</span>;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
