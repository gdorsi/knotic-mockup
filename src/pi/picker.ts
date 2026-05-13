// Directory picker that works in both runtimes:
//   - Tauri: uses the @tauri-apps/plugin-dialog open() with directory=true
//   - Browser (Chromium-family, Safari TP): window.showDirectoryPicker()
// Returns null on cancel, or { mode: "none" } when no API is available so the
// caller can fall back to a manual entry form.

export type PickResult =
  | { mode: "ok"; name: string; path: string }
  | { mode: "cancelled" }
  | { mode: "none" };

export async function pickDirectory(): Promise<PickResult> {
  const w = window as any;
  if (w.__TAURI_INTERNALS__) {
    try {
      const id = "@tauri-apps/plugin-dialog";
      const mod: any = await import(/* @vite-ignore */ id);
      const selected: string | string[] | null = await mod.open({
        directory: true,
        multiple: false,
        title: "Pick a project folder",
      });
      if (!selected) return { mode: "cancelled" };
      const path = Array.isArray(selected) ? selected[0] : selected;
      return { mode: "ok", path, name: basename(path) };
    } catch (e) {
      console.warn("Tauri directory picker failed:", e);
      return { mode: "cancelled" };
    }
  }
  if (typeof w.showDirectoryPicker === "function") {
    try {
      const handle: any = await w.showDirectoryPicker({
        mode: "read",
        startIn: "documents",
      });
      // The web API only exposes the folder name — not an absolute path.
      return { mode: "ok", name: handle.name, path: "~/" + handle.name };
    } catch (e: any) {
      if (e?.name === "AbortError") return { mode: "cancelled" };
      // SecurityError / NotAllowedError / etc. — surface as "no API" so the
      // caller falls back to the inline form instead of going silent.
      console.warn("Browser directory picker failed:", e);
      return { mode: "none" };
    }
  }
  return { mode: "none" };
}

function basename(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}
