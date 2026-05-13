import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";

type Msg = { role: "user" | "agent"; text: string };

const introMessage: Msg = {
  role: "agent",
  text:
    "Hi — Knotic didn't find a `.knotic/global-knowledge.md` in this project. I can scan the repo and write a starter document covering what the project does, the stack, the conventions to respect, and who owns what. Click **Generate global knowledge** when you're ready; once it's drafted, you can edit it directly or ask me to refine any section.",
};

export function GlobalKnowledgeWizard({ projectId }: { projectId: string }) {
  const proj = useStore((s) => s.projects.find((p) => p.id === projectId));
  const complete = useStore((s) => s.completeGlobalKnowledge);
  const [messages, setMessages] = useState<Msg[]>([introMessage]);
  const [doc, setDoc] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, doc]);

  if (!proj) return null;

  const generate = async () => {
    if (running) return;
    setRunning(true);
    setMessages((m) => [...m, { role: "user", text: "Generate global knowledge." }]);
    await sleep(450);
    setMessages((m) => [...m, { role: "agent", text: "Scanning `package.json`, `README.md` and `src/**`…" }]);
    await sleep(650);
    setMessages((m) => [
      ...m,
      { role: "agent", text: "Read 12 files. Identifying domain language, stack, and conventions…" },
    ]);
    await sleep(700);
    setMessages((m) => [...m, { role: "agent", text: "Drafting document…" }]);
    await sleep(550);
    const draft = renderDraft(proj.name);
    setDoc(draft);
    setMessages((m) => [
      ...m,
      {
        role: "agent",
        text:
          "Done — generated a starter Global Knowledge file. Edit any item in the textbox below, or tell me what to refine and I'll patch it.",
      },
    ]);
    setRunning(false);
  };

  const send = async () => {
    const u = input.trim();
    if (!u || running) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: u }]);
    if (!doc) {
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text:
            "Got it — I'll fold that in when we generate. Click **Generate global knowledge** to start.",
        },
      ]);
      return;
    }
    setRunning(true);
    await sleep(420);
    const { reply, updated } = mockRefine(doc, u);
    setDoc(updated);
    setMessages((m) => [...m, { role: "agent", text: reply }]);
    setRunning(false);
  };

  return (
    <div className="gk-chat">
      <header className="gk-chat-head">
        <span className="dim">Onboarding · Global Knowledge</span>
        <h2>{proj.name}</h2>
        <div className="dim">
          missing <code>.knotic/global-knowledge.md</code> in <code>{proj.path}</code>
        </div>
      </header>

      <div className="gk-chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {running && (
          <div className="msg agent">
            <span className="msg-who">pi</span>
            <div className="msg-body running-dots">
              <span /> <span /> <span />
            </div>
          </div>
        )}
        {doc !== null && (
          <div className="gk-doc">
            <div className="gk-doc-head">
              <span className="dim">.knotic/global-knowledge.md · editable</span>
              <span className="dim">{doc.split("\n").length} lines</span>
            </div>
            <textarea
              className="gk-doc-text"
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              rows={Math.min(28, Math.max(12, doc.split("\n").length + 1))}
              spellCheck={false}
            />
          </div>
        )}
      </div>

      <div className="gk-chat-bar">
        {doc === null ? (
          <button
            className="btn primary gk-generate"
            onClick={generate}
            disabled={running}
          >
            {running ? "Generating…" : "Generate global knowledge ▶"}
          </button>
        ) : (
          <>
            <form
              className="gk-refine"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Ask me to refine an item — e.g. "expand the stack section" or "add a payments owner"'
              />
              <button className="btn ghost" type="submit" disabled={running || !input.trim()}>
                Send
              </button>
            </form>
            <button
              className="btn primary"
              onClick={() => complete(projectId, doc)}
              disabled={running}
            >
              Save & open project →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  return (
    <div className={"msg " + msg.role}>
      <span className="msg-who">{msg.role === "user" ? "you" : "pi"}</span>
      <div className="msg-body">{renderInline(msg.text)}</div>
    </div>
  );
}

// tiny inline markdown for chat bubbles: **bold**, `code`
function renderInline(s: string) {
  const parts: (string | JSX.Element)[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else parts.push(<code key={key++}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

function renderDraft(name: string): string {
  return [
    `# Global Knowledge — ${name}`,
    "",
    "## What this project does",
    "Billing service for Acme. Issues invoices, handles webhooks from Stripe and Adyen, reconciles payouts nightly. Owns the `invoices`, `payouts`, and `disputes` domains.",
    "",
    "## Stack & runtime",
    "Node 20, TypeScript, Fastify 4, Postgres 15. Deployed on Fly.io. CI on GitHub Actions. Telemetry via OpenTelemetry → Honeycomb.",
    "",
    "## Conventions",
    "- ESM only; no CommonJS in `src/`.",
    "- Tests in Vitest (`*.spec.ts`) — co-located with source.",
    "- Conventional commits (`feat:`, `fix:`, `chore:`).",
    "- Never edit `src/legacy/**` directly; behind a feature flag instead.",
    "- Money values in cents (integers), never floats.",
    "",
    "## Stakeholders",
    "- Backend: @guido",
    "- Payments owner: @sara",
    "- On-call: pagerduty/billing",
    "",
    "## Out of scope",
    "- The marketing site (separate repo).",
    "- Subscription pricing logic (lives in `acme/pricing`).",
    "",
  ].join("\n");
}

function mockRefine(doc: string, instruction: string): { reply: string; updated: string } {
  const i = instruction.toLowerCase();
  if (i.includes("stack")) {
    const updated = doc.replace(
      /^Node 20.*$/m,
      "Node 20, TypeScript, Fastify 4, Postgres 15 (with PgBouncer), Redis 7 for queues. Deployed on Fly.io behind Cloudflare. CI on GitHub Actions with required checks: lint, typecheck, unit, integration.",
    );
    return {
      reply: "Expanded the stack section with Redis, PgBouncer and the CI required-checks list.",
      updated,
    };
  }
  if (i.includes("owner") || i.includes("on-call") || i.includes("stakeholder")) {
    const updated = doc.replace(
      /^- On-call:.*$/m,
      "- On-call: pagerduty/billing (primary @guido, secondary @sara)\n- Security review: @kai",
    );
    return {
      reply: "Added rotation detail and the security-review owner to Stakeholders.",
      updated,
    };
  }
  if (i.includes("convention") || i.includes("test")) {
    const updated = doc.replace(
      /^- Tests in Vitest.*$/m,
      "- Tests in Vitest (`*.spec.ts`) — co-located with source. Integration tests in `test/integration/` and must run against a real Postgres.",
    );
    return { reply: "Tightened the testing convention — integration tests must not be mocked.", updated };
  }
  // generic acknowledgement — append as a follow-up note
  const updated = doc.replace(/\n$/, "") +
    `\n\n<!-- refinement note: ${instruction.replace(/-->/g, "--&gt;")} -->\n`;
  return {
    reply:
      "Noted — added a refinement comment at the bottom of the doc. Want me to fold this into a specific section?",
    updated,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
