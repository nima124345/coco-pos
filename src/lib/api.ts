import { useAuthStore } from "@/store/auth";

/**
 * Fetch wrapper that attaches X-Branch-Id or X-Booth-Event-Id based on current auth context.
 */
export async function apiFetch(input: string, init: RequestInit = {}) {
  const state = useAuthStore.getState();
  const headers = new Headers(init.headers);
  if (state.currentBoothEventId) {
    headers.set("X-Booth-Event-Id", state.currentBoothEventId);
  } else if (state.currentBranchId) {
    headers.set("X-Branch-Id", state.currentBranchId);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}
