export function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <h1>One app. One flow.</h1>
        <p className="lede">
          Knotic's surfaces — Sessions, Brainstorming, Architect, Context Lens — stitched into a
          single standalone desktop flow instead of four IDE panels.
        </p>
        <ol className="flow-steps">
          <li>
            <b>1.</b> Open a project. If it has no <code>.knotic/</code>, you walk through{" "}
            <i>Global Knowledge</i> once.
          </li>
          <li>
            <b>2.</b> <i>Brainstorm</i> shows realistic directions as cards. Pick one and only then
            answer refinement questions.
          </li>
          <li>
            <b>3.</b> Knotic writes a spec to <code>.knotic/spec/&lt;slug&gt;.spec.md</code>. You
            review the link, approve, and you're in Architect.
          </li>
          <li>
            <b>4.</b> Architect runs the plan as a collapsible task list — each step opens its own
            session, log, and diff.
          </li>
        </ol>
        <p className="hint">Pick a project on the left to start.</p>
      </div>
    </div>
  );
}
