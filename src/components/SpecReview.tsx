import { useMemo } from "react";
import { useStore } from "../state/store";
import type { SpecDraft } from "../state/types";

export function SpecReview({ projectId, specSlug }: { projectId: string; specSlug: string }) {
  const approve = useStore((s) => s.approveSpec);
  // find spec across brainstorm sessions
  const { sessionId, spec } = useStore((s) => {
    for (const [sid, bs] of Object.entries(s.brainstorm)) {
      if (bs.spec?.slug === specSlug) return { sessionId: sid, spec: bs.spec };
    }
    return { sessionId: undefined, spec: undefined };
  });
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const lineCount = useMemo(() => (spec ? spec.body.split("\n").length : 0), [spec]);

  if (!spec || !sessionId || !project) {
    return <div className="empty">Spec not found.</div>;
  }

  return (
    <div className="spec-wrap">
      <div className="spec-head">
        <div>
          <span className="dim">Spec generated · ready for Architect</span>
          <h2>{spec.title}</h2>
          <div className="spec-link-row">
            <a
              className="spec-link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigator.clipboard?.writeText(`${project.path}/${spec.path}`);
              }}
              title="Copy path"
            >
              📄 {project.path}/{spec.path}
            </a>
            <span className="dim">· {lineCount} lines</span>
          </div>
        </div>
        <div className="spec-actions">
          <button className="btn ghost" disabled>
            Edit
          </button>
          <button className="btn primary" onClick={() => approve(sessionId, projectId)}>
            Approve & open in Architect →
          </button>
        </div>
      </div>
      <SpecPreview body={spec.body} />
      <div className="spec-foot">
        <span className="dim">
          Approving copies the spec to <code>{spec.path}</code> and starts a new Architect plan
          bound to it. You can still edit the spec in place after approval.
        </span>
      </div>
    </div>
  );
}

function SpecPreview({ body }: { body: string }) {
  // very small markdown subset renderer — bold, italics, code, headings, lists, blockquote
  const html = useMemo(() => mdToHtml(body), [body]);
  return <div className="spec-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return escape(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

function mdToHtml(src: string): string {
  const out: string[] = [];
  const lines = src.split("\n");
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("# ")) {
      closeList();
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      closeList();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      closeList();
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("> ")) {
      closeList();
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      closeList();
      out.push("");
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}
