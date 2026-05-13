import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import type { BrainstormCard } from "../state/types";

export function Brainstorm({
  projectId,
  sessionId,
}: {
  projectId: string;
  sessionId?: string;
}) {
  const startSession = useStore((s) => s.startSession);
  const state = useStore((s) => (sessionId ? s.brainstorm[sessionId] : undefined));
  const setIntent = useStore((s) => s.setIntent);
  const runDivergence = useStore((s) => s.runDivergence);
  const selectCard = useStore((s) => s.selectCard);
  const backToDivergence = useStore((s) => s.backToDivergence);
  const setOption = useStore((s) => s.setOption);
  const setCustom = useStore((s) => s.setCustom);
  const submit = useStore((s) => s.submitRefinement);
  const setNotes = useStore((s) => s.setNotes);
  const backToRefinement = useStore((s) => s.backToRefinement);
  const generateSpec = useStore((s) => s.generateSpec);

  useEffect(() => {
    if (!sessionId) startSession(projectId, "brainstorm");
  }, [sessionId, projectId, startSession]);

  if (!sessionId || !state) return null;

  // ----- phase: idle / intent -----
  if (state.phase === "idle" || state.phase === "intent") {
    return (
      <div className="bs-intent">
        <h2>What decision are you trying to make?</h2>
        <p className="dim">
          Frame it as a choice. Knotic explores tradeoffs and proposes branches before any code
          gets written.
        </p>
        <IntentBox
          initial={state.intent}
          onSubmit={(v) => {
            setIntent(sessionId, v);
            runDivergence(sessionId);
          }}
        />
        <ExampleIntents
          onPick={(v) => {
            setIntent(sessionId, v);
            runDivergence(sessionId);
          }}
        />
      </div>
    );
  }

  // ----- phase: divergence (cards) -----
  if (state.phase === "divergence") {
    return (
      <div className="bs-cards-wrap">
        <div className="bs-intent-summary">
          <span className="dim">Intent</span>
          <p>{state.intent}</p>
        </div>
        {state.cards.length === 0 ? (
          <Loading text="Exploring branches…" />
        ) : (
          <>
            <h3>Pick a direction to refine</h3>
            <div className="bs-cards">
              {state.cards.map((c) => (
                <Card key={c.id} card={c} onSelect={() => selectCard(sessionId, c.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ----- phase: refinement -----
  if (state.phase === "refinement") {
    const card = state.cards.find((c) => c.id === state.selectedCardId)!;
    const idx = state.currentIdx;
    const current = state.qa[idx];
    if (!current) return null;
    const answered =
      (current.selected ?? "").length > 0 || (current.custom ?? "").trim().length > 0;
    const answeredSoFar = state.qa.slice(0, idx);

    return (
      <div className="bs-refine">
        <div className="bs-refine-head">
          <span className="dim">Refining · question {idx + 1} of {state.qa.length}</span>
          <h2>{card.title}</h2>
          <p>{card.summary}</p>
        </div>

        {answeredSoFar.length > 0 && (
          <div className="bs-trail">
            {answeredSoFar.map((p, i) => (
              <div key={i} className="bs-trail-row">
                <span className="bs-trail-i">{i + 1}</span>
                <div>
                  <div className="bs-trail-q">{p.q}</div>
                  <div className="bs-trail-a">
                    {p.custom?.trim() || p.selected || "_(skipped)_"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bs-qcard">
          <div className="bs-q">{current.q}</div>
          <div className="bs-opts">
            {current.options.map((opt) => {
              const active = current.selected === opt && !(current.custom ?? "").trim();
              return (
                <button
                  key={opt}
                  className={"bs-opt" + (active ? " active" : "")}
                  onClick={() => setOption(sessionId, idx, opt)}
                >
                  <span className="bs-opt-bullet">{active ? "●" : "○"}</span>
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="bs-custom">
            <label className="bs-custom-label">
              Or write your own answer
              <span className="dim"> · overrides the selection above</span>
            </label>
            <textarea
              rows={2}
              value={current.custom ?? ""}
              onChange={(e) => setCustom(sessionId, idx, e.target.value)}
              placeholder="Type a custom answer…"
            />
          </div>
        </div>

        <div className="bs-actions">
          <button className="btn ghost" onClick={() => backToDivergence(sessionId)}>
            ← Back to options
          </button>
          <button
            className="btn primary"
            disabled={!answered}
            onClick={() => submit(sessionId)}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  // ----- phase: summary -----
  if (state.phase === "summary") {
    const card = state.cards.find((c) => c.id === state.selectedCardId)!;
    return (
      <div className="bs-refine">
        <div className="bs-refine-head">
          <span className="dim">All questions answered · review summary</span>
          <h2>{card.title}</h2>
          <p>{card.summary}</p>
        </div>

        <ol className="bs-summary">
          {state.qa.map((p, i) => {
            const a = (p.custom?.trim() || p.selected || "").trim();
            return (
              <li key={i}>
                <div className="bs-summary-q">
                  <span className="bs-trail-i">{i + 1}</span>
                  {p.q}
                </div>
                <div className="bs-summary-a">{a || "_(unanswered)_"}</div>
              </li>
            );
          })}
        </ol>

        <div className="bs-notes">
          <label className="bs-custom-label">
            Anything to change or add before generating the spec?
          </label>
          <textarea
            rows={4}
            value={state.notes}
            onChange={(e) => setNotes(sessionId, e.target.value)}
            placeholder="Optional notes, constraints, or corrections. Appended to the spec under 'Additional notes'."
          />
        </div>

        <div className="bs-actions">
          <button className="btn ghost" onClick={() => backToRefinement(sessionId)}>
            ← Edit answers
          </button>
          <button
            className="btn primary"
            onClick={() => generateSpec(sessionId, projectId)}
          >
            Generate spec →
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function IntentBox({
  initial,
  onSubmit,
}: {
  initial: string;
  onSubmit: (v: string) => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <form
      className="bs-intent-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit(v.trim());
      }}
    >
      <textarea
        rows={3}
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder='e.g. "Should we keep background jobs in-process, or move to a real queue?"'
      />
      <button className="btn primary" type="submit" disabled={!v.trim()}>
        Explore branches →
      </button>
    </form>
  );
}

function ExampleIntents({ onPick }: { onPick: (v: string) => void }) {
  const examples = [
    "Should we keep background jobs in-process, or move to a real queue?",
    "Migrate from REST to tRPC for internal services?",
    "Replace homegrown feature flags with LaunchDarkly?",
  ];
  return (
    <div className="bs-examples">
      <span className="dim">or try</span>
      {examples.map((e) => (
        <button key={e} className="bs-example" onClick={() => onPick(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}

function Card({ card, onSelect }: { card: BrainstormCard; onSelect: () => void }) {
  return (
    <button className="bs-card" onClick={onSelect}>
      <header>
        <h4>{card.title}</h4>
        <FitBadge fit={card.fit} />
      </header>
      <p>{card.summary}</p>
      <div className="bs-card-cols">
        <div>
          <div className="bs-card-sub good">Pros</div>
          <ul>
            {card.pros.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="bs-card-sub bad">Tradeoffs</div>
          <ul>
            {card.cons.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
      <footer>
        <span className="bs-card-cta">Refine this direction →</span>
      </footer>
    </button>
  );
}

function FitBadge({ fit }: { fit: number }) {
  const pct = Math.round(fit * 100);
  let tone = "low";
  if (pct >= 75) tone = "high";
  else if (pct >= 55) tone = "mid";
  return <span className={"fit fit-" + tone}>fit {pct}%</span>;
}

function Loading({ text }: { text: string }) {
  return (
    <div className="loading">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}
