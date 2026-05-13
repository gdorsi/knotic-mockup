import { create } from "zustand";
import { nanoid } from "nanoid";
import {
  seedProjects,
  seedBrainstormCards,
  refinementBase,
  refinementFollowups,
  seedReviewChapters,
} from "../data/seed";
import type {
  Project,
  Session,
  SessionKind,
  View,
  BrainstormCard,
  BrainstormPhase,
  RefinementQA,
  SpecDraft,
  ArchitectPlan,
  ArchitectStep,
  ReviewChapter,
} from "./types";
import { MockPi } from "../pi/harness";

interface BrainstormState {
  phase: BrainstormPhase;
  intent: string;
  cards: BrainstormCard[];
  selectedCardId?: string;
  qa: RefinementQA[];
  currentIdx: number;
  followupsApplied: boolean;
  notes: string;
  spec?: SpecDraft;
}

interface State {
  projects: Project[];
  view: View;
  activeProjectId?: string;
  brainstorm: Record<string, BrainstormState>; // keyed by sessionId
  architect: Record<string, ArchitectPlan>;     // keyed by specSlug
  review: Record<string, ReviewChapter[]>;      // keyed by specSlug
  chatLog: Record<string, { role: "user" | "agent"; text: string }[]>; // sessionId
  // actions
  setView(v: View): void;
  openProject(id: string): void;
  addProject(name: string, path: string): Project;
  startSession(projectId: string, kind: SessionKind, title?: string): Session;
  completeGlobalKnowledge(projectId: string, knowledge: string): void;
  // brainstorm
  setIntent(sessionId: string, intent: string): void;
  runDivergence(sessionId: string): Promise<void>;
  selectCard(sessionId: string, cardId: string): void;
  backToDivergence(sessionId: string): void;
  setOption(sessionId: string, idx: number, option: string): void;
  setCustom(sessionId: string, idx: number, text: string): void;
  submitRefinement(sessionId: string): void;
  setNotes(sessionId: string, notes: string): void;
  backToRefinement(sessionId: string): void;
  generateSpec(sessionId: string, projectId: string): SpecDraft;
  approveSpec(sessionId: string, projectId: string): void;
  // architect
  ensureArchitectPlan(specSlug: string): ArchitectPlan;
  runArchitect(specSlug: string): Promise<void>;
  // review
  ensureReview(specSlug: string): ReviewChapter[];
  // chat
  sendChat(sessionId: string, text: string): Promise<void>;
}

export const useStore = create<State>((set, get) => ({
  projects: seedProjects,
  view: { kind: "welcome" },
  brainstorm: {},
  architect: {},
  review: {},
  chatLog: {},

  setView(v) {
    set({ view: v });
  },

  openProject(id) {
    const p = get().projects.find((x) => x.id === id);
    if (!p) return;
    set({ activeProjectId: id });
    if (!p.hasKnotic) {
      set({ view: { kind: "global-knowledge", projectId: id } });
    } else {
      set({ view: { kind: "chat", projectId: id } });
    }
  },

  addProject(name, path) {
    const id = "p_" + nanoid(6);
    const p: Project = {
      id,
      name: name.trim(),
      path: path.trim() || `~/work/${slugify(name)}`,
      hasKnotic: false,
      sessions: [],
    };
    set((st) => ({
      projects: [p, ...st.projects],
      activeProjectId: id,
      view: { kind: "global-knowledge", projectId: id },
    }));
    return p;
  },

  startSession(projectId, kind, title) {
    const s: Session = {
      id: "s_" + nanoid(6),
      kind,
      title: title ?? defaultTitle(kind),
      updatedAt: Date.now(),
    };
    set((st) => ({
      projects: st.projects.map((p) =>
        p.id === projectId ? { ...p, sessions: [s, ...p.sessions] } : p,
      ),
      view:
        kind === "chat"
          ? { kind: "chat", projectId, sessionId: s.id }
          : { kind: "brainstorm", projectId, sessionId: s.id },
      brainstorm:
        kind === "brainstorm"
          ? { ...st.brainstorm, [s.id]: emptyBrainstorm() }
          : st.brainstorm,
    }));
    return s;
  },

  completeGlobalKnowledge(projectId, knowledge) {
    set((st) => ({
      projects: st.projects.map((p) =>
        p.id === projectId ? { ...p, hasKnotic: true } : p,
      ),
      view: { kind: "chat", projectId },
    }));
    // best-effort: also write to disk if running under Tauri
    (async () => {
      try {
        const tauri = (window as any).__TAURI_INTERNALS__;
        if (!tauri) return;
        // dynamic + dunder string to avoid Vite/TS resolution; the module
        // is provided at runtime by the Tauri host.
        const id = "@tauri-apps/api/core";
        const mod: any = await import(/* @vite-ignore */ id);
        const proj = get().projects.find((p) => p.id === projectId);
        if (proj) await mod.invoke("create_knotic_dir", { path: proj.path, knowledge });
      } catch {
        /* no-op in browser */
      }
    })();
  },

  setIntent(sessionId, intent) {
    set((st) => ({
      brainstorm: {
        ...st.brainstorm,
        [sessionId]: { ...(st.brainstorm[sessionId] ?? emptyBrainstorm()), intent, phase: "intent" },
      },
    }));
  },

  async runDivergence(sessionId) {
    set((st) => ({
      brainstorm: {
        ...st.brainstorm,
        [sessionId]: { ...st.brainstorm[sessionId], phase: "divergence", cards: [] },
      },
    }));
    const session = await MockPi.createSession({ kind: "brainstorm" });
    for await (const _ev of session.stream(get().brainstorm[sessionId]?.intent ?? "")) {
      // stream is decorative for the mock; the cards come from seed data
    }
    set((st) => ({
      brainstorm: {
        ...st.brainstorm,
        [sessionId]: {
          ...st.brainstorm[sessionId],
          cards: seedBrainstormCards,
          phase: "divergence",
        },
      },
    }));
  },

  selectCard(sessionId, cardId) {
    const base = refinementBase[cardId] ?? [];
    set((st) => ({
      brainstorm: {
        ...st.brainstorm,
        [sessionId]: {
          ...st.brainstorm[sessionId],
          selectedCardId: cardId,
          phase: "refinement",
          qa: base.map((p) => ({ ...p })),
          currentIdx: 0,
          followupsApplied: false,
          notes: "",
        },
      },
    }));
  },

  backToDivergence(sessionId) {
    set((st) => ({
      brainstorm: {
        ...st.brainstorm,
        [sessionId]: {
          ...st.brainstorm[sessionId],
          phase: "divergence",
          selectedCardId: undefined,
          qa: [],
          currentIdx: 0,
          followupsApplied: false,
          notes: "",
        },
      },
    }));
  },

  setOption(sessionId, idx, option) {
    set((st) => {
      const b = st.brainstorm[sessionId];
      const qa = b.qa.map((p, i) =>
        i === idx ? { ...p, selected: option, custom: "" } : p,
      );
      return { brainstorm: { ...st.brainstorm, [sessionId]: { ...b, qa } } };
    });
  },

  setCustom(sessionId, idx, text) {
    set((st) => {
      const b = st.brainstorm[sessionId];
      const qa = b.qa.map((p, i) =>
        i === idx ? { ...p, custom: text, selected: text.trim() ? undefined : p.selected } : p,
      );
      return { brainstorm: { ...st.brainstorm, [sessionId]: { ...b, qa } } };
    });
  },

  submitRefinement(sessionId) {
    set((st) => {
      const b = st.brainstorm[sessionId];
      let qa = b.qa;
      let followupsApplied = b.followupsApplied;
      // After the first answer, surface scripted follow-up(s). Demonstrates that
      // more questions may appear before the flow finishes.
      if (b.currentIdx === 0 && !followupsApplied && b.selectedCardId) {
        const fups = refinementFollowups[b.selectedCardId] ?? [];
        if (fups.length > 0) {
          qa = [...qa, ...fups.map((f) => ({ ...f }))];
          followupsApplied = true;
        }
      }
      const nextIdx = b.currentIdx + 1;
      const done = nextIdx >= qa.length;
      return {
        brainstorm: {
          ...st.brainstorm,
          [sessionId]: {
            ...b,
            qa,
            followupsApplied,
            currentIdx: done ? qa.length : nextIdx,
            phase: done ? "summary" : "refinement",
          },
        },
      };
    });
  },

  setNotes(sessionId, notes) {
    set((st) => ({
      brainstorm: {
        ...st.brainstorm,
        [sessionId]: { ...st.brainstorm[sessionId], notes },
      },
    }));
  },

  backToRefinement(sessionId) {
    set((st) => ({
      brainstorm: {
        ...st.brainstorm,
        [sessionId]: { ...st.brainstorm[sessionId], phase: "refinement", currentIdx: 0 },
      },
    }));
  },

  generateSpec(sessionId, projectId) {
    const b = get().brainstorm[sessionId];
    const card = b.cards.find((c) => c.id === b.selectedCardId)!;
    const slug = slugify(card.title);
    const body = renderSpecMd(card, b.intent, b.qa, b.notes);
    const draft: SpecDraft = {
      slug,
      title: card.title,
      body,
      path: `.knotic/spec/${slug}.spec.md`,
      cardId: card.id,
    };
    set((st) => ({
      brainstorm: {
        ...st.brainstorm,
        [sessionId]: { ...b, spec: draft, phase: "spec_ready" },
      },
      view: { kind: "spec", projectId, specSlug: slug },
    }));
    return draft;
  },

  approveSpec(sessionId, projectId) {
    set((st) => {
      const b = st.brainstorm[sessionId];
      if (!b?.spec) return st;
      return {
        brainstorm: { ...st.brainstorm, [sessionId]: { ...b, phase: "approved" } },
        view: { kind: "architect", projectId, specSlug: b.spec.slug },
      };
    });
    // seed an architect plan for that spec
    const b = get().brainstorm[sessionId];
    if (b?.spec) get().ensureArchitectPlan(b.spec.slug);
  },

  ensureArchitectPlan(specSlug) {
    const existing = get().architect[specSlug];
    if (existing) return existing;
    const steps: ArchitectStep[] = [
      { id: "a1", title: "Read codebase and confirm scope", status: "pending", files: ["src/**"], log: [] },
      { id: "a2", title: "Introduce queue abstraction", status: "pending", files: ["src/queue/index.ts"], log: [] },
      { id: "a3", title: "Wire chosen backend adapter", status: "pending", files: ["src/queue/redis.ts"], log: [] },
      { id: "a4", title: "Migrate existing producers", status: "pending", files: ["src/billing/**"], log: [] },
      { id: "a5", title: "Add retry + idempotency guard", status: "pending", files: ["src/queue/retry.ts"], log: [] },
      { id: "a6", title: "Add integration tests", status: "pending", files: ["test/queue.spec.ts"], log: [] },
      { id: "a7", title: "Write rollout doc", status: "pending", files: ["docs/queue-rollout.md"], log: [] },
    ];
    const plan: ArchitectPlan = { specSlug, steps };
    set((st) => ({ architect: { ...st.architect, [specSlug]: plan } }));
    return plan;
  },

  async runArchitect(specSlug) {
    const plan = get().architect[specSlug];
    if (!plan) return;
    const session = await MockPi.createSession({ kind: "architect" });
    // Run every step to completion. Operator concerns surface as warnings in
    // the step log and as review feedback later, never as a hard pause —
    // the plan does not stop until it reaches code review.
    for (const step of plan.steps) {
      // skip steps that already completed (e.g. resume after partial run)
      if (step.status === "completed" || step.status === "skipped") continue;
      updateStep(set, get, specSlug, step.id, (s) => ({
        ...s,
        status: "running",
        log: [...(s.log ?? []), `[${ts()}] starting ${s.title}`],
      }));
      await new Promise((r) => setTimeout(r, 600));
      const warn = step.id === "a5";
      updateStep(set, get, specSlug, step.id, (s) => ({
        ...s,
        status: "completed",
        detail: warn ? "ok · flagged for review (idempotency contract)" : "ok",
        log: [
          ...(s.log ?? []),
          warn
            ? `[${ts()}] note: idempotency contract needs human review — deferred to code review`
            : `[${ts()}] completed ${s.title}`,
        ],
      }));
    }
    // consume the mock pi stream (purely decorative)
    for await (const _ev of session.stream("execute plan", { spec: specSlug })) {
      // no-op
    }
    // Plan complete → hand off to code review automatically.
    get().ensureReview(specSlug);
    const projId = get().activeProjectId;
    if (projId) {
      set({ view: { kind: "review", projectId: projId, specSlug } });
    }
  },

  ensureReview(specSlug) {
    const existing = get().review[specSlug];
    if (existing) return existing;
    const chapters = seedReviewChapters(specSlug);
    set((st) => ({ review: { ...st.review, [specSlug]: chapters } }));
    return chapters;
  },

  async sendChat(sessionId, text) {
    set((st) => ({
      chatLog: {
        ...st.chatLog,
        [sessionId]: [...(st.chatLog[sessionId] ?? []), { role: "user", text }],
      },
    }));
    const session = await MockPi.createSession({ kind: "chat" });
    for await (const ev of session.stream(text)) {
      if (ev.kind === "message") {
        set((st) => ({
          chatLog: {
            ...st.chatLog,
            [sessionId]: [...(st.chatLog[sessionId] ?? []), { role: "agent", text: ev.text }],
          },
        }));
      }
    }
  },
}));

function defaultTitle(kind: SessionKind): string {
  if (kind === "chat") return "New chat";
  if (kind === "brainstorm") return "New brainstorm";
  return "New plan";
}

function emptyBrainstorm(): BrainstormState {
  return {
    phase: "idle",
    intent: "",
    cards: [],
    qa: [],
    currentIdx: 0,
    followupsApplied: false,
    notes: "",
  };
}

function answerOf(p: RefinementQA): string {
  return (p.custom?.trim() || p.selected || "").trim();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function ts(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function updateStep(
  set: (fn: (st: State) => Partial<State>) => void,
  get: () => State,
  specSlug: string,
  stepId: string,
  upd: (s: ArchitectStep) => ArchitectStep,
) {
  set((st) => {
    const plan = st.architect[specSlug];
    if (!plan) return st;
    return {
      architect: {
        ...st.architect,
        [specSlug]: {
          ...plan,
          steps: plan.steps.map((s) => (s.id === stepId ? upd(s) : s)),
        },
      },
    };
  });
}

function renderSpecMd(
  card: BrainstormCard,
  intent: string,
  qa: RefinementQA[],
  notes: string,
): string {
  const lines: string[] = [];
  lines.push(`# ${card.title}`);
  lines.push("");
  lines.push("> Spec generated from Brainstorming. Loaded automatically by Architect.");
  lines.push("");
  lines.push("## Intent");
  lines.push("");
  lines.push(intent || "_(no intent provided)_");
  lines.push("");
  lines.push("## Direction");
  lines.push("");
  lines.push(card.summary);
  lines.push("");
  lines.push("### Why this branch");
  for (const p of card.pros) lines.push(`- ${p}`);
  lines.push("");
  lines.push("### Known tradeoffs");
  for (const c of card.cons) lines.push(`- ${c}`);
  lines.push("");
  lines.push("## Refinement");
  for (const p of qa) {
    const a = answerOf(p);
    lines.push(`**Q.** ${p.q}`);
    lines.push(`**A.** ${a || "_(unanswered)_"}`);
    lines.push("");
  }
  if (notes.trim()) {
    lines.push("## Additional notes");
    lines.push("");
    lines.push(notes.trim());
    lines.push("");
  }
  lines.push("## Acceptance");
  lines.push("- All chosen tradeoffs are explicit in code or docs.");
  lines.push("- Architect plan completes without manual intervention beyond approvals.");
  lines.push("- Tests cover the happy path and at least one failure mode per step.");
  return lines.join("\n");
}
