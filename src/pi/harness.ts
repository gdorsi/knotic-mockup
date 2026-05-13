// Thin boundary around the Pi agent harness (https://pi.dev).
// Real implementation would call the Pi SDK / RPC channel:
//   import { createSession } from "@earendil-works/pi-coding-agent";
//   const s = await createSession({ provider: "anthropic", model: "claude-opus-4-7" });
//   for await (const ev of s.stream(prompt)) { ... }
//
// Here we stub it: every call streams scripted events so the UI can be
// exercised without credentials. Swap `MockPi` for a real client and the
// rest of the app stays identical.

import { nanoid } from "nanoid";

export type PiEvent =
  | { kind: "thought"; text: string }
  | { kind: "message"; text: string }
  | { kind: "tool"; name: string; arg: string }
  | { kind: "step"; id: string; title: string; status: PiStepStatus; detail?: string }
  | { kind: "done"; payload?: unknown };

export type PiStepStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "skipped"
  | "error";

export interface PiSession {
  id: string;
  stream(prompt: string, ctx?: Record<string, unknown>): AsyncIterable<PiEvent>;
  cancel(): void;
}

export interface PiClient {
  createSession(opts?: { kind?: "chat" | "brainstorm" | "architect" }): Promise<PiSession>;
}

// ---------- Mock implementation ----------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function* scripted(events: PiEvent[], cancelled: { v: boolean }): AsyncIterable<PiEvent> {
  for (const e of events) {
    if (cancelled.v) return;
    await sleep(180 + Math.random() * 320);
    yield e;
  }
}

export const MockPi: PiClient = {
  async createSession(opts) {
    const id = nanoid(8);
    const cancelled = { v: false };
    return {
      id,
      cancel() {
        cancelled.v = true;
      },
      async *stream(prompt, ctx) {
        const kind = opts?.kind ?? "chat";
        if (kind === "chat") {
          yield* scripted(
            [
              { kind: "thought", text: "reading project context…" },
              { kind: "tool", name: "context_lens.scan", arg: "src/**" },
              {
                kind: "message",
                text: `**Pi (mock):** I read your prompt — *"${prompt}"*. In a real run this would stream tokens from your chosen provider via Pi's RPC channel.`,
              },
              { kind: "done" },
            ],
            cancelled,
          );
          return;
        }
        if (kind === "brainstorm") {
          yield* scripted(
            [
              { kind: "thought", text: "intent → divergence" },
              { kind: "tool", name: "repo.read", arg: "package.json,src/**" },
              { kind: "thought", text: "simulating tradeoffs…" },
              { kind: "message", text: "Generated 3 candidate directions." },
              { kind: "done", payload: { phase: "divergence" } },
            ],
            cancelled,
          );
          return;
        }
        // architect
        yield* scripted(
          [
            { kind: "thought", text: "loading spec…" },
            { kind: "tool", name: "spec.load", arg: String((ctx as any)?.spec ?? "") },
            { kind: "step", id: "s1", title: "Scaffold module", status: "running" },
            { kind: "step", id: "s1", title: "Scaffold module", status: "completed", detail: "Added `src/feature/index.ts`" },
            { kind: "step", id: "s2", title: "Wire entry points", status: "running" },
            { kind: "step", id: "s2", title: "Wire entry points", status: "completed", detail: "Updated 2 imports" },
            { kind: "step", id: "s3", title: "Write tests", status: "running" },
            { kind: "step", id: "s3", title: "Write tests", status: "paused", detail: "Awaiting fixture data" },
            { kind: "done" },
          ],
          cancelled,
        );
      },
    };
  },
};
