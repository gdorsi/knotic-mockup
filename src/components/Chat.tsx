import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";

export function Chat({ projectId, sessionId }: { projectId: string; sessionId?: string }) {
  const startSession = useStore((s) => s.startSession);
  const send = useStore((s) => s.sendChat);
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const log = useStore((s) => (sessionId ? s.chatLog[sessionId] ?? [] : []));
  const [text, setText] = useState("");

  useEffect(() => {
    if (!sessionId) startSession(projectId, "chat");
  }, [sessionId, projectId, startSession]);

  const placeholder = useMemo(
    () => `Ask anything about ${project?.name ?? "this project"}…`,
    [project?.name],
  );

  if (!sessionId) return null;

  return (
    <div className="chat">
      <div className="chat-log">
        {log.length === 0 && (
          <div className="chat-empty">
            <p>New chat session. The Pi harness will stream a mocked answer.</p>
            <ul className="chat-hints">
              <li>"explain how invoice retries work"</li>
              <li>"why does <code>POST /webhook</code> 401?"</li>
              <li>"open Brainstorm if I should rework queues"</li>
            </ul>
          </div>
        )}
        {log.map((m, i) => (
          <div key={i} className={"msg " + m.role}>
            <span className="msg-who">{m.role === "user" ? "you" : "pi"}</span>
            <div className="msg-body">{m.text}</div>
          </div>
        ))}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          send(sessionId, text);
          setText("");
        }}
      >
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!text.trim()) return;
              send(sessionId, text);
              setText("");
            }
          }}
        />
        <button className="btn primary" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
