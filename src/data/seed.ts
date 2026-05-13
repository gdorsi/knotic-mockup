import type { Project, BrainstormCard, RefinementQA, ReviewChapter } from "../state/types";

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

// Stable mock unified diffs + AI review feedback used by the code-review phase.
export function seedReviewChapters(specSlug: string): ReviewChapter[] {
  return [
    {
      id: "ch1",
      title: "Queue abstraction",
      summary:
        "Introduces a small Queue interface with enqueue / dequeue / ack so the rest of the codebase doesn't depend on a specific backend.",
      files: ["src/queue/index.ts"],
      patch: `diff --git a/src/queue/index.ts b/src/queue/index.ts
new file mode 100644
--- /dev/null
+++ b/src/queue/index.ts
@@ -0,0 +1,28 @@
+export type JobId = string;
+
+export interface Job<T> {
+  id: JobId;
+  payload: T;
+  attempts: number;
+}
+
+export interface Queue<T> {
+  enqueue(payload: T): Promise<JobId>;
+  dequeue(): Promise<Job<T> | null>;
+  ack(id: JobId): Promise<void>;
+  nack(id: JobId, opts?: { requeue?: boolean }): Promise<void>;
+}
+
+export function createQueue<T>(backend: Queue<T>): Queue<T> {
+  return backend;
+}
`,
      feedback: [
        {
          id: "f1",
          severity: "suggestion",
          title: "Consider a generic visibility-timeout option",
          body:
            "enqueue() takes only a payload. Many backends (SQS, BullMQ) accept a per-message visibility / delay. Adding an `EnqueueOpts` argument now is cheaper than adding it later, and the Redis adapter in chapter 2 already needs it.",
          ref: "src/queue/index.ts:14",
        },
        {
          id: "f2",
          severity: "nit",
          title: "JobId could be a branded type",
          body:
            "Using a plain string is fine, but a `type JobId = string & { readonly __brand: 'JobId' }` makes mixing ids with other strings a compile error. Cheap insurance.",
        },
      ],
    },
    {
      id: "ch2",
      title: "Redis adapter",
      summary:
        "Wires a BullMQ-backed implementation of the Queue interface. Retry policy is configurable, dead-letter is opt-in.",
      files: ["src/queue/redis.ts"],
      patch: `diff --git a/src/queue/redis.ts b/src/queue/redis.ts
new file mode 100644
--- /dev/null
+++ b/src/queue/redis.ts
@@ -0,0 +1,40 @@
+import { Queue as BullQueue, Worker } from "bullmq";
+import type { Queue, Job, JobId } from "./index";
+
+export interface RedisQueueOpts {
+  name: string;
+  connection: { host: string; port: number };
+  retries?: number;
+}
+
+export function redisQueue<T>(opts: RedisQueueOpts): Queue<T> {
+  const q = new BullQueue<T>(opts.name, { connection: opts.connection });
+
+  return {
+    async enqueue(payload) {
+      const job = await q.add("job", payload, {
+        attempts: opts.retries ?? 5,
+        backoff: { type: "exponential", delay: 1000 },
+      });
+      return job.id!;
+    },
+    async dequeue() {
+      // BullMQ pulls via Worker, not by polling — see Worker setup below.
+      return null;
+    },
+    async ack(id) {
+      const job = await q.getJob(id);
+      await job?.remove();
+    },
+    async nack(id, opts) {
+      const job = await q.getJob(id);
+      if (opts?.requeue) await job?.retry();
+    },
+  };
+}
`,
      feedback: [
        {
          id: "f3",
          severity: "concern",
          title: "dequeue() always returns null",
          body:
            "The interface implies a pull model, but the implementation comments that BullMQ uses a Worker. Either change Queue<T> to expose subscribe/onJob, or actually implement a polling dequeue. The current shape will silently no-op for any consumer of the interface.",
          ref: "src/queue/redis.ts:22",
        },
        {
          id: "f4",
          severity: "blocker",
          title: "No connection error handling",
          body:
            "If BullMQ can't reach Redis, the constructor throws synchronously on first use and the enqueue path crashes the producer. Wrap construction + first enqueue in a guarded path that surfaces a typed error to the caller, or the rollout will look like an API outage.",
          ref: "src/queue/redis.ts:10",
        },
        {
          id: "f5",
          severity: "praise",
          title: "Good defaults",
          body:
            "5 attempts + exponential backoff is the right starting policy. Matches the answer captured during refinement and avoids surprising operators.",
        },
      ],
    },
    {
      id: "ch3",
      title: "Producer migration",
      summary:
        "Switches the webhook handler from inline processing to enqueueing onto the new queue.",
      files: ["src/billing/webhook.ts"],
      patch: `diff --git a/src/billing/webhook.ts b/src/billing/webhook.ts
--- a/src/billing/webhook.ts
+++ b/src/billing/webhook.ts
@@ -1,12 +1,15 @@
-import { processWebhook } from "./process";
+import { redisQueue } from "../queue/redis";
+
+const jobs = redisQueue<{ event: string; body: unknown }>({
+  name: "billing-webhook",
+  connection: { host: "redis", port: 6379 },
+});

 export async function handleWebhook(req: Request, res: Response) {
   const event = req.headers["x-event"];
   const body = await req.json();

-  // Inline processing — slow under bursty traffic.
-  await processWebhook(event, body);
-
-  res.status(200).send("ok");
+  // Acknowledge immediately, do the work off-thread.
+  await jobs.enqueue({ event, body });
+  res.status(202).send("queued");
 }
`,
      feedback: [
        {
          id: "f6",
          severity: "concern",
          title: "Status code change is a contract break",
          body:
            "Stripe and Adyen both retry on non-2xx. 202 is fine for them, but anything internal that checks for exactly 200 will break. Grep for callers before merging.",
          ref: "src/billing/webhook.ts:14",
        },
        {
          id: "f7",
          severity: "suggestion",
          title: "Hard-coded Redis host",
          body:
            "host: \"redis\" works in docker-compose but not in prod. Move to config and validate at startup.",
          ref: "src/billing/webhook.ts:5",
        },
      ],
    },
    {
      id: "ch4",
      title: "Integration tests",
      summary: "Covers the happy path and a retry-then-succeed scenario against an in-memory backend.",
      files: ["test/queue.spec.ts"],
      patch: `diff --git a/test/queue.spec.ts b/test/queue.spec.ts
new file mode 100644
--- /dev/null
+++ b/test/queue.spec.ts
@@ -0,0 +1,32 @@
+import { describe, expect, it } from "vitest";
+import { createQueue, type Queue } from "../src/queue";
+
+function memoryQueue<T>(): Queue<T> {
+  const buf: { id: string; payload: T }[] = [];
+  let n = 0;
+  return {
+    async enqueue(payload) {
+      const id = String(++n);
+      buf.push({ id, payload });
+      return id;
+    },
+    async dequeue() {
+      const m = buf.shift();
+      return m ? { id: m.id, payload: m.payload, attempts: 1 } : null;
+    },
+    async ack() {},
+    async nack(id, opts) {
+      if (opts?.requeue) buf.unshift({ id, payload: null as any });
+    },
+  };
+}
+
+describe("queue", () => {
+  it("delivers in order", async () => {
+    const q = createQueue(memoryQueue<number>());
+    await q.enqueue(1);
+    await q.enqueue(2);
+    expect((await q.dequeue())?.payload).toBe(1);
+    expect((await q.dequeue())?.payload).toBe(2);
+  });
+});
`,
      feedback: [
        {
          id: "f8",
          severity: "concern",
          title: "Missing failure-mode test",
          body:
            "Spec acceptance criteria say \"Tests cover the happy path and at least one failure mode per step.\" There's no test exercising nack + retry. Add one before approving.",
          ref: "test/queue.spec.ts:30",
        },
        {
          id: "f9",
          severity: "nit",
          title: "payload: null as any",
          body:
            "The memory queue's nack-requeue path re-enqueues with `null as any`. Harmless in this test, but it would be a real bug if reused. A short comment would prevent the copy-paste.",
          ref: "test/queue.spec.ts:19",
        },
      ],
    },
  ];
}

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
