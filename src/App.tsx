import { Sidebar } from "./components/Sidebar";
import { GlobalKnowledgeWizard } from "./components/GlobalKnowledgeWizard";
import { Chat } from "./components/Chat";
import { Brainstorm } from "./components/Brainstorm";
import { SpecReview } from "./components/SpecReview";
import { Architect } from "./components/Architect";
import { Review } from "./components/Review";
import { BranchReview } from "./components/BranchReview";
import { Welcome } from "./components/Welcome";
import { useStore } from "./state/store";

export function App() {
  const view = useStore((s) => s.view);
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="view">
          {view.kind === "welcome" && <Welcome />}
          {view.kind === "global-knowledge" && <GlobalKnowledgeWizard projectId={view.projectId} />}
          {view.kind === "chat" && <Chat projectId={view.projectId} sessionId={view.sessionId} />}
          {view.kind === "brainstorm" && (
            <Brainstorm projectId={view.projectId} sessionId={view.sessionId} />
          )}
          {view.kind === "spec" && <SpecReview projectId={view.projectId} specSlug={view.specSlug} />}
          {view.kind === "architect" && (
            <Architect projectId={view.projectId} specSlug={view.specSlug} />
          )}
          {view.kind === "review" && (
            <Review projectId={view.projectId} specSlug={view.specSlug} />
          )}
          {view.kind === "review-branch" && (
            <BranchReview
              projectId={view.projectId}
              branch={view.branch}
              base={view.base}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  const view = useStore((s) => s.view);
  const projects = useStore((s) => s.projects);
  let crumbs: string[] = ["Knotic"];
  if ("projectId" in view) {
    const p = projects.find((x) => x.id === (view as any).projectId);
    if (p) crumbs.push(p.name);
  }
  if (view.kind === "global-knowledge") crumbs.push("Global Knowledge");
  if (view.kind === "chat") crumbs.push("Chat");
  if (view.kind === "brainstorm") crumbs.push("Brainstorm");
  if (view.kind === "spec") crumbs.push("Spec");
  if (view.kind === "architect") crumbs.push("Architect");
  if (view.kind === "review") crumbs.push("Code review");
  if (view.kind === "review-branch")
    crumbs.push(view.branch ? `Review · ${view.branch}` : "Review branch");
  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i} className="crumb">
            {c}
            {i < crumbs.length - 1 && <span className="crumb-sep">/</span>}
          </span>
        ))}
      </div>
      <div className="top-right">
        <span className="pi-badge" title="Powered by Pi (pi.dev) — mocked in this build">
          <span className="pi-dot" /> pi.dev harness · mock
        </span>
      </div>
    </header>
  );
}
