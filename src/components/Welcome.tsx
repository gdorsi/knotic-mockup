import { useState } from "react";
import { useStore } from "../state/store";
import { pickDirectory } from "../pi/picker";
import { KindIcon } from "./Sidebar";
import { BranchIcon } from "./BranchReview";

export function Welcome() {
  const projects = useStore((s) => s.projects);
  const addProject = useStore((s) => s.addProject);
  const openProject = useStore((s) => s.openProject);
  const startSession = useStore((s) => s.startSession);
  const setView = useStore((s) => s.setView);
  const [picking, setPicking] = useState(false);

  const hasProject = projects.length > 0;
  const firstReady = projects.find((p) => p.hasKnotic);
  const firstUnready = projects.find((p) => !p.hasKnotic);

  const onOpen = async () => {
    setPicking(true);
    try {
      const r = await pickDirectory();
      if (r.mode === "ok") addProject(r.name, r.path);
      else if (r.mode === "none" && firstUnready) openProject(firstUnready.id);
    } finally {
      setPicking(false);
    }
  };

  const onBrainstorm = () => {
    if (firstReady) {
      startSession(firstReady.id, "brainstorm");
      return;
    }
    if (firstUnready) {
      setView({ kind: "global-knowledge", projectId: firstUnready.id });
      return;
    }
    onOpen();
  };

  return (
    <div className="hero">
      <div className="hero-glow" aria-hidden="true" />

      <div className="hero-content">
        <span className="hero-eyebrow">
          <span className="hero-eyebrow-dot" /> Knotic · standalone · powered by Pi
        </span>
        <h1 className="hero-title">
          Welcome to the <span className="hero-accent">new AI era</span>.
        </h1>
        <p className="hero-lede">
          Bring raw ideas to reality. One desktop app, one guided flow — from a half-formed
          thought to a reviewed change set. No tab-switching, no glue, no IDE plugins.
        </p>

        <div className="hero-cta">
          <button className="btn primary hero-btn" onClick={onOpen} disabled={picking}>
            {picking ? "Picking folder…" : "Open a project →"}
          </button>
          <button
            className="btn ghost hero-btn"
            onClick={onBrainstorm}
            disabled={!hasProject && picking}
          >
            <KindIconWrap kind="brainstorm" /> Start a brainstorm
          </button>
        </div>
      </div>

      <section className="gs">
        <h2 className="gs-title">Getting started</h2>
        <ol className="gs-list">
          <GsItem
            i={1}
            done={hasProject}
            icon={<FolderIcon />}
            title="Open a project"
            body="Point Knotic at any folder on disk. New projects skip straight into onboarding."
            cta={hasProject ? "Add another" : "Pick a folder"}
            onClick={onOpen}
            disabled={picking}
          />
          <GsItem
            i={2}
            done={!!firstReady}
            icon={<SparkleIcon />}
            title="Generate Global Knowledge"
            body="One chat. Knotic drafts a starter knowledge file you can iterate on in place — the model uses it on every call."
            cta={firstReady ? "Already done" : firstUnready ? "Continue onboarding" : "Open a project first"}
            onClick={() => firstUnready && setView({ kind: "global-knowledge", projectId: firstUnready.id })}
            disabled={!firstUnready && !firstReady}
          />
          <GsItem
            i={3}
            done={false}
            icon={<KindIconWrap kind="brainstorm" />}
            title="Brainstorm a raw idea"
            body="Frame a decision, see realistic directions as cards, refine the one you want with options + free text, and let Knotic write the spec for you."
            cta="Open Brainstorm"
            onClick={onBrainstorm}
            disabled={!hasProject}
          />
          <GsItem
            i={4}
            done={false}
            icon={<KindIconWrap kind="architect" />}
            title="Architect runs the plan"
            body="Approve the spec and Knotic plans and executes — the plan never stops. When it lands, you get a structured code review split into chapters with per-chapter AI feedback."
            cta="See an example"
            onClick={() => firstReady && setView({ kind: "architect", projectId: firstReady.id, specSlug: "redis-bullmq" })}
            disabled={!firstReady}
          />
          <GsItem
            i={5}
            done={false}
            icon={<BranchIcon />}
            title="Review an existing branch"
            body="Already have changes on a branch? Open the + menu and run an AI review on the diff — same chapter UI, same feedback model."
            cta="Open Review branch"
            onClick={() => firstReady && setView({ kind: "review-branch", projectId: firstReady.id })}
            disabled={!firstReady}
          />
        </ol>
      </section>
    </div>
  );
}

function GsItem({
  i,
  done,
  icon,
  title,
  body,
  cta,
  onClick,
  disabled,
}: {
  i: number;
  done: boolean;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <li className={"gs-item " + (done ? "done" : "")}>
      <span className={"gs-check " + (done ? "on" : "")}>{done ? "✓" : i}</span>
      <div className="gs-body">
        <div className="gs-head">
          <span className="gs-icon">{icon}</span>
          <span className="gs-name">{title}</span>
        </div>
        <p className="gs-text">{body}</p>
      </div>
      <button className="btn ghost small gs-cta" onClick={onClick} disabled={disabled}>
        {cta} →
      </button>
    </li>
  );
}

function KindIconWrap({ kind }: { kind: "chat" | "brainstorm" | "architect" }) {
  return (
    <span className={"gs-kind k-" + kind}>
      <KindIcon kind={kind} />
    </span>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.8l1.4 1.5h4.8A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 1.5l1.3 3.6L13 6.4l-3.7 1.3L8 11.4l-1.3-3.7L3 6.4l3.7-1.3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 11.5l0.6 1.6 1.6 0.6-1.6 0.6-0.6 1.6-0.6-1.6-1.6-0.6 1.6-0.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
