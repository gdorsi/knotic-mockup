import { useEffect, useMemo, useState } from "react";
import { PatchDiff } from "@pierre/diffs/react";
import { useStore } from "../state/store";
import type { ReviewChapter, ReviewFeedback, ReviewSeverity } from "../state/types";

export function Review({ projectId, specSlug }: { projectId: string; specSlug: string }) {
  const ensure = useStore((s) => s.ensureReview);
  const chapters = useStore((s) => s.review[specSlug]);
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));

  useEffect(() => {
    ensure(specSlug);
  }, [specSlug, ensure]);

  if (!chapters || !project) return null;

  const stats = summarize(chapters);

  return (
    <div className="rev-wrap">
      <div className="rev-head">
        <div>
          <span className="dim">Code review · per-chapter AI feedback</span>
          <h2>{titleFromSlug(specSlug)}</h2>
          <div className="dim">
            spec: <code>.knotic/spec/{specSlug}.spec.md</code> · {chapters.length} chapters ·{" "}
            {stats.files} files
          </div>
        </div>
        <div className="rev-summary">
          <SevPill sev="blocker" count={stats.bySev.blocker} />
          <SevPill sev="concern" count={stats.bySev.concern} />
          <SevPill sev="suggestion" count={stats.bySev.suggestion} />
          <SevPill sev="nit" count={stats.bySev.nit} />
          <SevPill sev="praise" count={stats.bySev.praise} />
        </div>
      </div>

      <ol className="rev-list">
        {chapters.map((c, i) => (
          <ChapterRow key={c.id} chapter={c} index={i + 1} />
        ))}
      </ol>
    </div>
  );
}

function ChapterRow({ chapter, index }: { chapter: ReviewChapter; index: number }) {
  const [open, setOpen] = useState(index === 1);
  const fbStats = useMemo(() => {
    const out: Record<ReviewSeverity, number> = {
      blocker: 0,
      concern: 0,
      suggestion: 0,
      nit: 0,
      praise: 0,
    };
    for (const f of chapter.feedback) out[f.severity]++;
    return out;
  }, [chapter]);

  return (
    <li className="rev-chapter">
      <button className="rev-chapter-head" onClick={() => setOpen((x) => !x)}>
        <span className="rev-chapter-i">{index}</span>
        <span className="rev-chapter-title">{chapter.title}</span>
        <span className="rev-chapter-files dim">
          {chapter.files.map((f) => (
            <code key={f}>{f}</code>
          ))}
        </span>
        <span className="rev-chapter-counts">
          {fbStats.blocker > 0 && <SevDot sev="blocker" n={fbStats.blocker} />}
          {fbStats.concern > 0 && <SevDot sev="concern" n={fbStats.concern} />}
          {fbStats.suggestion > 0 && <SevDot sev="suggestion" n={fbStats.suggestion} />}
          {fbStats.nit > 0 && <SevDot sev="nit" n={fbStats.nit} />}
          {fbStats.praise > 0 && <SevDot sev="praise" n={fbStats.praise} />}
        </span>
        <span className="rev-chapter-toggle">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="rev-chapter-body">
          <p className="rev-chapter-summary">{chapter.summary}</p>
          <div className="rev-diff">
            <PatchDiff patch={chapter.patch} disableWorkerPool />
          </div>
          <div className="rev-feedback">
            <div className="rev-feedback-head">
              <span className="dim">AI feedback · {chapter.feedback.length}</span>
            </div>
            <ul>
              {chapter.feedback.map((f) => (
                <FeedbackRow key={f.id} fb={f} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

function FeedbackRow({ fb }: { fb: ReviewFeedback }) {
  return (
    <li className={"rev-fb sev-" + fb.severity}>
      <div className="rev-fb-head">
        <span className={"rev-fb-sev sev-" + fb.severity}>{labelFor(fb.severity)}</span>
        <span className="rev-fb-title">{fb.title}</span>
        {fb.ref && <span className="rev-fb-ref dim">{fb.ref}</span>}
      </div>
      <div className="rev-fb-body">{fb.body}</div>
      <div className="rev-fb-actions">
        <button className="btn ghost small" disabled>
          Apply
        </button>
        <button className="btn ghost small" disabled>
          Dismiss
        </button>
        <button className="btn ghost small" disabled>
          Reply
        </button>
      </div>
    </li>
  );
}

function SevPill({ sev, count }: { sev: ReviewSeverity; count: number }) {
  return (
    <span className={"rev-sev-pill sev-" + sev} title={labelFor(sev)}>
      <span className="rev-sev-dot" />
      <span className="rev-sev-count">{count}</span>
      <span className="rev-sev-label">{labelFor(sev)}</span>
    </span>
  );
}

function SevDot({ sev, n }: { sev: ReviewSeverity; n: number }) {
  return (
    <span className={"rev-mini-pill sev-" + sev} title={labelFor(sev)}>
      {n} {labelFor(sev)}
    </span>
  );
}

function labelFor(sev: ReviewSeverity): string {
  if (sev === "blocker") return "blocker";
  if (sev === "concern") return "concern";
  if (sev === "suggestion") return "suggestion";
  if (sev === "nit") return "nit";
  return "praise";
}

function summarize(chapters: ReviewChapter[]) {
  const bySev: Record<ReviewSeverity, number> = {
    blocker: 0,
    concern: 0,
    suggestion: 0,
    nit: 0,
    praise: 0,
  };
  let files = 0;
  for (const c of chapters) {
    files += c.files.length;
    for (const f of c.feedback) bySev[f.severity]++;
  }
  return { bySev, files };
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
