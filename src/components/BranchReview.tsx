import { useEffect, useRef, useState } from "react";
import { useStore, branchReviewId } from "../state/store";
import { ChapterList, chapterStats } from "./ChapterList";

const sampleBranches = [
  "fix/rate-limit-boundary",
  "feat/x-api-key-support",
  "chore/otel-span-rename",
];

export function BranchReview({
  projectId,
  branch,
  base,
}: {
  projectId: string;
  branch?: string;
  base?: string;
}) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const chapters = useStore((s) =>
    branch ? s.review[branchReviewId(branch)] : undefined,
  );

  if (!project) return null;

  if (!branch) {
    return <BranchInput projectId={projectId} />;
  }

  if (!chapters) {
    return <Loading branch={branch} />;
  }

  const stats = chapterStats(chapters);

  return (
    <ChapterList
      chapters={chapters}
      header={
        <>
          <span className="dim">Branch review · per-chapter AI feedback</span>
          <h2 className="branch-h2">
            <BranchIcon /> <code className="branch-code">{branch}</code>
            <span className="dim branch-base">
              {" ← "}
              <code>{base ?? "main"}</code>
            </span>
          </h2>
          <div className="dim">
            {chapters.length} chapters · {stats.files} files
          </div>
        </>
      }
    />
  );
}

function BranchInput({ projectId }: { projectId: string }) {
  const start = useStore((s) => s.startBranchReview);
  const [branch, setBranch] = useState("");
  const [base, setBase] = useState("main");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (!branch.trim()) return;
    start(projectId, branch.trim(), base.trim() || "main");
  };

  return (
    <div className="br-input-wrap">
      <div className="br-input-card">
        <span className="dim">Review branch</span>
        <h2>Pick a branch to review</h2>
        <p className="dim">
          Knotic scans the diff against the base branch, splits it into chapters, and writes
          per-chapter AI feedback. The branch is not modified — review only.
        </p>

        <label className="br-label">
          Branch
          <input
            ref={inputRef}
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="feat/x-api-key-support"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </label>

        <label className="br-label">
          Compare against
          <input
            type="text"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="main"
          />
        </label>

        <div className="br-suggest">
          <span className="dim">Try one of</span>
          {sampleBranches.map((b) => (
            <button
              key={b}
              className="br-suggest-chip"
              onClick={() => {
                setBranch(b);
              }}
            >
              <BranchIcon /> {b}
            </button>
          ))}
        </div>

        <div className="br-actions">
          <button className="btn primary" onClick={submit} disabled={!branch.trim()}>
            Start review →
          </button>
        </div>
      </div>
    </div>
  );
}

function Loading({ branch }: { branch: string }) {
  return (
    <div className="loading">
      <div className="spinner" />
      <span>
        Generating review for <code>{branch}</code>…
      </span>
    </div>
  );
}

export function BranchIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle
        cx="4"
        cy="3.2"
        r="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="4"
        cy="12.8"
        r="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="12"
        cy="6.4"
        r="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M4 4.8v6.4M4 9c0-2.2 1.8-4 4-4h2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
