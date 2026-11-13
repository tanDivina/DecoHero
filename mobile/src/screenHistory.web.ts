import { useEffect, useRef } from "react";

// Kept in history.state for every screen above Home: which screen, how many entries above Home, and
// the screen it was opened from.
type Entry = { screen: string; depth: number; prev: string };
const HOME = "home";
const entry = (state: unknown = window.history.state): Entry | undefined => (state as { deco?: Entry } | null)?.deco;

/**
 * Mirrors the current screen into the browser history so the back button moves inside the app:
 * opening Results / Shop / About adds an entry, the in-app Back link removes it again, and the
 * browser's back and forward buttons call onPop with the screen to show.
 */
export function useScreenHistory<S extends string>(screen: S, onPop: (screen: S, cameFrom: S) => void): void {
  const handler = useRef(onPop);
  handler.current = onPop;

  useEffect(() => {
    const pop = (e: PopStateEvent) => {
      const at = entry(e.state);
      handler.current((at?.screen ?? HOME) as S, (at?.prev ?? HOME) as S);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  useEffect(() => {
    const at = entry();
    const shown = at?.screen ?? HOME;
    if (screen === shown) return; // the browser moved us here, or nothing changed
    // In-app Back: step back through the entries we added, so no stale ones are left behind.
    if (screen === HOME) window.history.go(-(at?.depth ?? 1));
    else if (at && at.prev === screen) window.history.back();
    else window.history.pushState({ deco: { screen, depth: (at?.depth ?? 0) + 1, prev: shown } satisfies Entry }, "");
  }, [screen]);
}
