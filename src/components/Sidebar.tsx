import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import type { Project, Session, SessionKind } from "../state/types";
import { BranchIcon } from "./BranchReview";

export function Sidebar() {
  const projects = useStore((s) => s.projects);
  const setView = useStore((s) => s.setView);
  const view = useStore((s) => s.view);
  const addProject = useStore((s) => s.addProject);

  const onAddClick = () => {
    const { name, path } = randomProjectEntry(projects.map((p) => p.name));
    addProject(name, path);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="logo">
          <span className="logo-mark">◇</span>
          <span className="logo-text">knotic</span>
        </div>
        <button
          className="new-btn"
          title="Add a random mock project"
          onClick={onAddClick}
        >
          +
        </button>
      </div>

      <div className="sidebar-section-title">Projects</div>
      <div className="sidebar-list">
        {projects.map((p) => (
          <ProjectRow key={p.id} project={p} view={view} setView={setView} />
        ))}
      </div>
      <div className="sidebar-foot">
        <div className="foot-row">
          <span className="dim">Provider</span>
          <span>Anthropic · claude-opus-4-7</span>
        </div>
        <div className="foot-row">
          <span className="dim">Harness</span>
          <span>Pi (pi.dev)</span>
        </div>
      </div>
    </aside>
  );
}

const randomOrgs = ["acme", "garden", "neon", "atlas", "polaris", "delta", "kit", "vault"];
const randomApps = [
  "payments-svc",
  "billing-poller",
  "edge-router",
  "queue-worker",
  "auth-shim",
  "feature-flags",
  "search-index",
  "image-pipeline",
  "secrets-rotator",
  "webhook-relay",
];

function randomProjectEntry(taken: string[]): { name: string; path: string } {
  for (let i = 0; i < 40; i++) {
    const org = randomOrgs[Math.floor(Math.random() * randomOrgs.length)];
    const app = randomApps[Math.floor(Math.random() * randomApps.length)];
    const name = `${org}/${app}`;
    if (!taken.includes(name)) return { name, path: `~/work/${name}` };
  }
  // collisions exhausted — append a short suffix
  const suffix = Math.random().toString(36).slice(2, 5);
  return { name: `lab/${suffix}-svc`, path: `~/work/lab/${suffix}-svc` };
}

function ProjectRow({
  project,
  view,
  setView,
}: {
  project: Project;
  view: ReturnType<typeof useStore.getState>["view"];
  setView: (v: ReturnType<typeof useStore.getState>["view"]) => void;
}) {
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const openProject = useStore((s) => s.openProject);
  const startSession = useStore((s) => s.startSession);
  const isActive = "projectId" in view && (view as any).projectId === project.id;
  const menuRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const start = (kind: SessionKind) => {
    setMenuOpen(false);
    if (!project.hasKnotic) {
      setView({ kind: "global-knowledge", projectId: project.id });
      return;
    }
    startSession(project.id, kind);
  };

  const startBranchReview = () => {
    setMenuOpen(false);
    if (!project.hasKnotic) {
      setView({ kind: "global-knowledge", projectId: project.id });
      return;
    }
    setView({ kind: "review-branch", projectId: project.id });
  };

  const openSettings = () => {
    setView({ kind: "project-settings", projectId: project.id });
  };

  return (
    <div className={"proj " + (isActive ? "active" : "")}>
      <div className="proj-row">
        <button
          className="proj-toggle"
          onClick={() => setOpen((x) => !x)}
          aria-label="toggle"
        >
          {open ? "▾" : "▸"}
        </button>
        <button
          className="proj-name"
          onClick={() => openProject(project.id)}
          title={project.path}
        >
          <span className="proj-icon">{project.hasKnotic ? "●" : "○"}</span>
          {project.name}
        </button>
        <div className="proj-actions" ref={menuRef}>
          <button
            className="proj-cog"
            title="Project settings"
            onClick={(e) => {
              e.stopPropagation();
              openSettings();
            }}
          >
            <CogIcon />
          </button>
          <button
            ref={addBtnRef}
            className={"proj-add" + (menuOpen ? " open" : "")}
            title="New session"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              if (!menuOpen && addBtnRef.current) {
                const r = addBtnRef.current.getBoundingClientRect();
                const menuWidth = 240;
                setMenuPos({
                  top: r.bottom + 4,
                  left: Math.max(8, r.right - menuWidth),
                });
              }
              setMenuOpen((x) => !x);
            }}
          >
            +
          </button>
          {menuOpen && (
            <div
              className="proj-menu"
              role="menu"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                className="proj-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  start("chat");
                }}
              >
                <KindIcon kind="chat" />
                <div className="proj-menu-text">
                  <span className="proj-menu-title">New chat</span>
                  <span className="proj-menu-sub">interactive session</span>
                </div>
              </button>
              <button
                className="proj-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  start("brainstorm");
                }}
              >
                <KindIcon kind="brainstorm" />
                <div className="proj-menu-text">
                  <span className="proj-menu-title">New brainstorm</span>
                  <span className="proj-menu-sub">explore options → spec</span>
                </div>
              </button>
              <button
                className="proj-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  startBranchReview();
                }}
              >
                <BranchIcon />
                <div className="proj-menu-text">
                  <span className="proj-menu-title">Review branch</span>
                  <span className="proj-menu-sub">AI review on a branch diff</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
      {open && (
        <ul className="sess-list">
          {project.sessions.length === 0 && (
            <li className="sess-empty">no sessions yet</li>
          )}
          {project.sessions.map((s) => (
            <SessionRow key={s.id} project={project} session={s} view={view} setView={setView} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SessionRow({
  project,
  session,
  view,
  setView,
}: {
  project: Project;
  session: Session;
  view: ReturnType<typeof useStore.getState>["view"];
  setView: (v: ReturnType<typeof useStore.getState>["view"]) => void;
}) {
  const active =
    "sessionId" in view && (view as any).sessionId === session.id;
  return (
    <li
      className={"sess " + (active ? "active" : "")}
      onClick={() => {
        if (session.kind === "chat")
          setView({ kind: "chat", projectId: project.id, sessionId: session.id });
        else if (session.kind === "brainstorm")
          setView({ kind: "brainstorm", projectId: project.id, sessionId: session.id });
        else setView({ kind: "architect", projectId: project.id, specSlug: "demo" });
      }}
    >
      <span
        className={"sess-kind k-" + session.kind}
        title={kindLabel(session.kind)}
        aria-label={kindLabel(session.kind)}
      >
        <KindIcon kind={session.kind} />
      </span>
      <span className="sess-title">{session.title}</span>
      <span className="sess-time">{relTime(session.updatedAt)}</span>
    </li>
  );
}

function kindLabel(k: SessionKind) {
  if (k === "chat") return "Chat";
  if (k === "brainstorm") return "Brainstorm";
  return "Architect";
}

function CogIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KindIcon({ kind }: { kind: SessionKind }) {
  if (kind === "chat") {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M3 3.5A1.5 1.5 0 0 1 4.5 2h7A1.5 1.5 0 0 1 13 3.5V9a1.5 1.5 0 0 1-1.5 1.5H7L4 13v-2.5h-.5A1.5 1.5 0 0 1 2 9.0V3.5C2 3.5 2.67 3.5 3 3.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "brainstorm") {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M8 1.5a4.5 4.5 0 0 0-3 7.85V11h6V9.35A4.5 4.5 0 0 0 8 1.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M5.75 12.5h4.5M6.5 14.25h3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect
        x="2.2"
        y="2.2"
        width="11.6"
        height="11.6"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 5.6h4M5 8h6M5 10.4h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function relTime(t: number): string {
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  return Math.floor(h / 24) + "d";
}
