import { useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { SESSION_ENDED_MESSAGE } from "@/lib/session-message";

const CHECK_EVERY_MS = 20_000;

// While someone is signed in, keeps checking whether their session has been ended:
//  - a new web deploy (the build's version differs from /version.json), or
//  - a new API deploy / an admin change (the API answers 401, and the token can no longer be renewed).
// Either way they are signed out at once and must log in again.
export function useSessionWatch() {
  const signedIn = useAuthStore((s) => !!s.accessToken);

  useEffect(() => {
    if (!signedIn) return;
    let running = false;

    async function check() {
      if (running) return;
      running = true;
      try {
        if (__APP_VERSION__ !== "dev") {
          try {
            const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
            const latest = response.ok ? ((await response.json()) as { version?: string }).version : undefined;
            if (latest && latest !== __APP_VERSION__) {
              useAuthStore.getState().endSession(SESSION_ENDED_MESSAGE);
              window.location.replace("/login"); // full reload picks up the new build
              return;
            }
          } catch {
            // offline or not JSON: try again next round
          }
        }
        // A 401 here goes through the api client's refresh, which signs the user out when it is refused.
        await apiClient.get("/auth/ping").catch(() => undefined);
      } finally {
        running = false;
      }
    }

    const onVisible = () => document.visibilityState === "visible" && void check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    void check();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [signedIn]);
}
