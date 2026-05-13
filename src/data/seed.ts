import type { Project, BrainstormCard, RefinementQA } from "../state/types";

export const seedProjects: Project[] = [
  {
    id: "p_acme_billing",
    name: "acme/billing-svc",
    path: "~/work/acme/billing-svc",
    hasKnotic: true,
    sessions: [
      { id: "s_1", kind: "chat", title: "fix webhook signature", updatedAt: Date.now() - 1000 * 60 * 12 },
      { id: "s_2", kind: "brainstorm", title: "queue backend choice", updatedAt: Date.now() - 1000 * 60 * 60 * 6 },
      { id: "s_3", kind: "architect", title: "extract invoice domain", updatedAt: Date.now() - 1000 * 60 * 60 * 26 },
    ],
  },
  {
    id: "p_garden_web",
    name: "garden/web",
    path: "~/work/garden/web",
    hasKnotic: true,
    sessions: [
      { id: "s_4", kind: "chat", title: "auth redirect bug", updatedAt: Date.now() - 1000 * 60 * 90 },
    ],
  },
  {
    id: "p_new",
    name: "experiments/new-thing",
    path: "~/work/experiments/new-thing",
    hasKnotic: false,
    sessions: [],
  },
];

export const seedBrainstormCards: BrainstormCard[] = [
  {
    id: "c_a",
    title: "In-process worker",
    summary: "Run jobs in the same Node process behind an internal queue.",
    pros: ["No new infra", "Lowest latency for small jobs", "Simple deploy"],
    cons: ["Shares fate with API process", "Hard to scale CPU-bound jobs", "Backpressure leaks into request path"],
    fit: 0.58,
  },
  {
    id: "c_b",
    title: "Redis + BullMQ",
    summary: "Dedicated worker pool with Redis-backed queue and retry policies.",
    pros: ["Battle-tested", "Visibility via Bull Board", "Good retry/delay primitives"],
    cons: ["Redis becomes a new SPOF", "At-least-once: jobs must be idempotent", "Ops cost of Redis cluster"],
    fit: 0.82,
  },
  {
    id: "c_c",
    title: "SQS + Lambda consumers",
    summary: "Push jobs to SQS; AWS Lambda picks up batches with managed scaling.",
    pros: ["Elastic, pay-per-use", "Decoupled from app", "AWS-native DLQ + metrics"],
    cons: ["Cold starts on bursty traffic", "Vendor lock-in", "Local dev story is awkward"],
    fit: 0.71,
  },
  {
    id: "c_d",
    title: "Temporal workflows",
    summary: "Durable execution engine that models long-running jobs as workflows.",
    pros: ["Built-in retries + history", "Great for multi-step jobs", "Replay debugging"],
    cons: ["Heavier learning curve", "Adds Temporal cluster to stack", "Overkill for short jobs"],
    fit: 0.49,
  },
];

type Q = Omit<RefinementQA, "selected" | "custom">;

export const refinementBase: Record<string, Q[]> = {
  c_a: [
    {
      q: "What's the expected p99 job duration?",
      options: ["< 1s", "1–10s", "10s – 1m", "> 1m"],
    },
    {
      q: "Are jobs CPU-bound, IO-bound, or mixed?",
      options: ["CPU-bound", "IO-bound", "Mixed", "Don't know yet"],
    },
    {
      q: "Is it acceptable for a deploy to drop in-flight jobs?",
      options: [
        "Yes — they're idempotent and retry on restart",
        "No — must drain before shutdown",
        "Only some classes",
      ],
    },
  ],
  c_b: [
    {
      q: "Do you already operate a Redis cluster, or would this be new?",
      options: ["Existing cluster", "Managed (Elasticache / Upstash)", "New, self-hosted"],
    },
    {
      q: "What retry policy do you want by default?",
      options: [
        "Exponential backoff, 5 attempts",
        "Fixed delay, 3 attempts",
        "No retries (idempotent only)",
      ],
    },
    {
      q: "Are all jobs safely idempotent today?",
      options: ["Yes, fully", "Mostly", "No — needs work first"],
    },
  ],
  c_c: [
    {
      q: "Which AWS region(s) will host the consumers?",
      options: ["us-east-1 only", "us-east-1 + eu-west-1", "multi-region active/active"],
    },
    {
      q: "What's the acceptable cold-start latency?",
      options: ["< 200 ms", "200 ms – 1 s", "> 1 s (batch ok)"],
    },
    {
      q: "Do you need FIFO ordering for any job class?",
      options: ["Yes — for payments", "Yes — for several classes", "No"],
    },
  ],
  c_d: [
    {
      q: "Do you have multi-step workflows that span hours or days?",
      options: ["Yes — already exist", "Yes — planned soon", "No, mostly short jobs"],
    },
    {
      q: "Are you comfortable adopting a new control plane?",
      options: ["Yes", "Only if managed (Temporal Cloud)", "Prefer not"],
    },
    {
      q: "Who will own the Temporal cluster on-call?",
      options: ["Platform team", "Backend team", "Undecided"],
    },
  ],
};

// Mock "follow-up" questions surfaced after the first answer in each card. Demonstrates
// that more questions can appear mid-flow before reaching the summary.
export const refinementFollowups: Record<string, Q[]> = {
  c_a: [
    {
      q: "Given that, how should backpressure surface to callers?",
      options: ["Shed load (drop oldest)", "Buffer in memory with cap", "Reject with 503"],
    },
  ],
  c_b: [
    {
      q: "Where should the dashboard (Bull Board) live?",
      options: ["Behind internal SSO", "Public + read-only", "Not needed"],
    },
  ],
  c_c: [
    {
      q: "How will local dev consume the queue?",
      options: ["LocalStack", "Direct against a sandbox AWS account", "Stub the producer"],
    },
  ],
  c_d: [
    {
      q: "How are existing jobs migrated?",
      options: ["Big bang per service", "Class-by-class, dual-write", "New jobs only"],
    },
  ],
};
