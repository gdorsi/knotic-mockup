import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import type { ProjectSettingsTab } from "../state/types";

const tabs: { id: ProjectSettingsTab; label: string }[] = [
  { id: "context-lens", label: "Context Lens" },
  { id: "global-knowledge", label: "Global Knowledge" },
  { id: "model", label: "Model" },
  { id: "limits", label: "Limits" },
];

export function ProjectSettings({
  projectId,
  initialTab,
}: {
  projectId: string;
  initialTab?: ProjectSettingsTab;
}) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const [tab, setTab] = useState<ProjectSettingsTab>(initialTab ?? "context-lens");

  if (!project) return null;

  return (
    <div className="ps-wrap">
      <header className="ps-head">
        <div>
          <span className="dim">Project settings</span>
          <h2>{project.name}</h2>
          <div className="dim">
            <code>{project.path}</code>
            {project.hasKnotic && (
              <span className="ps-flag">
                <span className="ps-flag-dot" /> .knotic/ initialized
              </span>
            )}
          </div>
        </div>
      </header>

      <nav className="ps-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={"ps-tab " + (tab === t.id ? "active" : "")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="ps-body">
        {tab === "context-lens" && <ContextLens />}
        {tab === "global-knowledge" && <GlobalKnowledgePanel projectId={projectId} />}
        {tab === "model" && <ModelPanel />}
        {tab === "limits" && <LimitsPanel />}
      </section>
    </div>
  );
}

// ---------- Context Lens ----------

type ContextGroup = {
  id: string;
  label: string;
  hint: string;
  files: { path: string; tokens: number }[];
  included: boolean;
};

const initialGroups: ContextGroup[] = [
  {
    id: "gk",
    label: "Global Knowledge",
    hint: "Static facts about the project written during onboarding.",
    files: [{ path: ".knotic/global-knowledge.md", tokens: 412 }],
    included: true,
  },
  {
    id: "spec",
    label: "Active spec",
    hint: "The current approved spec, when one is loaded by Architect.",
    files: [{ path: ".knotic/spec/in-process-worker.spec.md", tokens: 580 }],
    included: true,
  },
  {
    id: "src",
    label: "Source — top-level modules",
    hint: "Surface-area files that get pulled in by default.",
    files: [
      { path: "src/server.ts", tokens: 612 },
      { path: "src/billing/webhook.ts", tokens: 488 },
      { path: "src/billing/invoices.ts", tokens: 1024 },
      { path: "src/queue/index.ts", tokens: 240 },
    ],
    included: true,
  },
  {
    id: "tests",
    label: "Tests",
    hint: "Pulled in only when the call is about test code or failures.",
    files: [{ path: "test/integration/webhook.spec.ts", tokens: 540 }],
    included: false,
  },
  {
    id: "legacy",
    label: "Legacy code",
    hint: "Excluded by default per project conventions.",
    files: [
      { path: "src/legacy/old-billing.ts", tokens: 3120 },
      { path: "src/legacy/migrate.ts", tokens: 980 },
    ],
    included: false,
  },
];

function ContextLens() {
  const [groups, setGroups] = useState(initialGroups);
  const [ignore, setIgnore] = useState("src/legacy/**\ndist/**\n*.snap");

  const total = useMemo(
    () =>
      groups
        .filter((g) => g.included)
        .reduce((n, g) => n + g.files.reduce((s, f) => s + f.tokens, 0), 0),
    [groups],
  );
  const budget = 200000;
  const pct = Math.min(100, (total / budget) * 100);

  return (
    <div className="cl-wrap">
      <div className="cl-intro">
        <div>
          <h3>Context Lens</h3>
          <p className="dim">
            Inspect — and govern — exactly what gets sent to the model on every call. Toggle a
            source off and Knotic stops including it. Patterns below apply on top.
          </p>
        </div>
        <div className="cl-budget">
          <div className="cl-budget-meta">
            <span className="dim">Next-call budget</span>
            <span className="cl-budget-num">
              <strong>{fmt(total)}</strong>{" "}
              <span className="dim">/ {fmt(budget)} tokens</span>
            </span>
          </div>
          <div className="cl-bar">
            <div
              className="cl-bar-fill"
              style={{ width: pct + "%", background: barColor(pct) }}
            />
          </div>
        </div>
      </div>

      <div className="cl-groups">
        {groups.map((g) => (
          <div key={g.id} className={"cl-group " + (g.included ? "on" : "off")}>
            <button
              className="cl-group-head"
              onClick={() =>
                setGroups((gs) =>
                  gs.map((x) => (x.id === g.id ? { ...x, included: !x.included } : x)),
                )
              }
            >
              <span className={"cl-toggle " + (g.included ? "on" : "off")}>
                <span className="cl-toggle-knob" />
              </span>
              <div className="cl-group-title">
                <span>{g.label}</span>
                <span className="dim cl-group-hint">{g.hint}</span>
              </div>
              <span className="cl-group-tokens">
                {fmt(g.files.reduce((s, f) => s + f.tokens, 0))} tok
              </span>
            </button>
            <ul className="cl-files">
              {g.files.map((f) => (
                <li key={f.path}>
                  <code>{f.path}</code>
                  <span className="dim">{fmt(f.tokens)} tok</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="cl-ignore">
        <label className="dim">Ignore patterns</label>
        <textarea
          value={ignore}
          onChange={(e) => setIgnore(e.target.value)}
          rows={4}
          spellCheck={false}
        />
        <span className="dim small">
          One glob per line. Applied after the group toggles above.
        </span>
      </div>
    </div>
  );
}

function barColor(pct: number) {
  if (pct >= 85) return "var(--bad)";
  if (pct >= 60) return "var(--warn)";
  return "var(--accent)";
}

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// ---------- Global Knowledge panel ----------

function GlobalKnowledgePanel({ projectId }: { projectId: string }) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  if (!project) return null;

  if (!project.hasKnotic) {
    return (
      <div className="ps-section">
        <h3>Global Knowledge</h3>
        <p className="dim">
          Not initialized yet. Open the project to run onboarding.
        </p>
      </div>
    );
  }
  return (
    <div className="ps-section">
      <h3>Global Knowledge</h3>
      <p className="dim">
        Written by the onboarding flow. Edit directly — the file lives at{" "}
        <code>{project.path}/.knotic/global-knowledge.md</code>.
      </p>
      <textarea
        className="gk-doc-text"
        rows={18}
        defaultValue={"# Global Knowledge\n\n(loaded from disk in the real build)"}
      />
      <div className="ps-row">
        <button className="btn ghost" disabled>
          Re-open onboarding
        </button>
        <button className="btn primary" disabled>
          Save
        </button>
      </div>
    </div>
  );
}

// ---------- Model panel ----------

function ModelPanel() {
  const providers = [
    { id: "anthropic", label: "Anthropic", model: "claude-opus-4-7" },
    { id: "openai", label: "OpenAI", model: "gpt-5.1" },
    { id: "google", label: "Google", model: "gemini-2.5-pro" },
    { id: "local", label: "Local (Ollama)", model: "qwen3-coder:30b" },
  ];
  const [selected, setSelected] = useState("anthropic");
  return (
    <div className="ps-section">
      <h3>Default model</h3>
      <p className="dim">
        Used by chat, brainstorm, architect, and review unless overridden in-session.
      </p>
      <div className="ps-providers">
        {providers.map((p) => (
          <button
            key={p.id}
            className={"ps-provider " + (selected === p.id ? "on" : "")}
            onClick={() => setSelected(p.id)}
          >
            <span className={"ps-provider-radio " + (selected === p.id ? "on" : "")} />
            <span className="ps-provider-label">
              <strong>{p.label}</strong>
              <span className="dim"> · {p.model}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Limits panel ----------

function LimitsPanel() {
  const [maxIter, setMaxIter] = useState(40);
  const [maxFiles, setMaxFiles] = useState(120);
  const [reasoning, setReasoning] = useState("balanced");
  return (
    <div className="ps-section">
      <h3>Limits & behavior</h3>
      <div className="ps-grid">
        <div className="ps-field">
          <label>Max tool iterations per call</label>
          <input
            type="number"
            value={maxIter}
            onChange={(e) => setMaxIter(Number(e.target.value))}
          />
          <span className="dim small">Architect will pause and ask once this is reached.</span>
        </div>
        <div className="ps-field">
          <label>Max files in context</label>
          <input
            type="number"
            value={maxFiles}
            onChange={(e) => setMaxFiles(Number(e.target.value))}
          />
          <span className="dim small">Hard cap on Context Lens before pattern-based trimming.</span>
        </div>
        <div className="ps-field">
          <label>Reasoning preset</label>
          <select value={reasoning} onChange={(e) => setReasoning(e.target.value)}>
            <option value="fast">fast</option>
            <option value="balanced">balanced</option>
            <option value="deep">deep</option>
          </select>
        </div>
      </div>
    </div>
  );
}
