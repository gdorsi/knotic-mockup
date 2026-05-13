import { useEffect } from "react";
import { useStore } from "../state/store";
import { ChapterList, chapterStats } from "./ChapterList";

export function Review({ projectId, specSlug }: { projectId: string; specSlug: string }) {
  const ensure = useStore((s) => s.ensureReview);
  const chapters = useStore((s) => s.review[specSlug]);
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));

  useEffect(() => {
    ensure(specSlug);
  }, [specSlug, ensure]);

  if (!chapters || !project) return null;

  const stats = chapterStats(chapters);
  return (
    <ChapterList
      chapters={chapters}
      header={
        <>
          <span className="dim">Code review · per-chapter AI feedback</span>
          <h2>{titleFromSlug(specSlug)}</h2>
          <div className="dim">
            spec: <code>.knotic/spec/{specSlug}.spec.md</code> · {chapters.length} chapters ·{" "}
            {stats.files} files
          </div>
        </>
      }
    />
  );
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
