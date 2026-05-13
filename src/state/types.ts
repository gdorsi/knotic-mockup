export type SessionKind = "chat" | "brainstorm" | "architect";

export interface Session {
  id: string;
  kind: SessionKind;
  title: string;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  hasKnotic: boolean;
  sessions: Session[];
}

export interface BrainstormCard {
  id: string;
  title: string;
  summary: string;
  pros: string[];
  cons: string[];
  fit: number; // 0..1
}

export type BrainstormPhase =
  | "idle"
  | "intent"
  | "divergence"
  | "refinement"
  | "summary"
  | "spec_ready"
  | "approved";

export interface RefinementQA {
  q: string;
  options: string[];
  selected?: string; // one of options
  custom?: string;   // free-text override
}

export interface SpecDraft {
  slug: string;
  title: string;
  body: string;
  path: string; // .knotic/spec/<slug>.spec.md
  cardId: string;
}

export type ArchitectStepStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "skipped"
  | "error";

export interface ArchitectStep {
  id: string;
  title: string;
  status: ArchitectStepStatus;
  detail?: string;
  files?: string[];
  log?: string[];
}

export interface ArchitectPlan {
  specSlug: string;
  steps: ArchitectStep[];
}

export type ReviewSeverity = "blocker" | "concern" | "suggestion" | "nit" | "praise";

export interface ReviewFeedback {
  id: string;
  severity: ReviewSeverity;
  title: string;
  body: string;
  /** optional file:line reference inside the chapter */
  ref?: string;
}

export interface ReviewChapter {
  id: string;
  title: string;
  summary: string;
  files: string[];
  /** unified-diff string, rendered with @pierre/diffs PatchDiff */
  patch: string;
  feedback: ReviewFeedback[];
}

export type View =
  | { kind: "welcome" }
  | { kind: "global-knowledge"; projectId: string }
  | { kind: "chat"; projectId: string; sessionId?: string }
  | { kind: "brainstorm"; projectId: string; sessionId?: string }
  | { kind: "spec"; projectId: string; specSlug: string }
  | { kind: "architect"; projectId: string; specSlug: string }
  | { kind: "review"; projectId: string; specSlug: string }
  | { kind: "review-branch"; projectId: string; branch?: string; base?: string }
  | { kind: "project-settings"; projectId: string; tab?: ProjectSettingsTab };

export type ProjectSettingsTab =
  | "context-lens"
  | "global-knowledge"
  | "model"
  | "limits";
