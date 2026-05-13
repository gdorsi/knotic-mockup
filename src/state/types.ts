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

export type View =
  | { kind: "welcome" }
  | { kind: "global-knowledge"; projectId: string }
  | { kind: "chat"; projectId: string; sessionId?: string }
  | { kind: "brainstorm"; projectId: string; sessionId?: string }
  | { kind: "spec"; projectId: string; specSlug: string }
  | { kind: "architect"; projectId: string; specSlug: string };
