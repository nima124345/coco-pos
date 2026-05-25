import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthBranch {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface AuthBoothEvent {
  id: string;
  name: string;
  location: string;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
}

export type WorkMode = "BRANCH" | "BOOTH" | null;

interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "STAFF";
}

interface AuthState {
  user: AuthUser | null;
  shiftId: string | null;
  availableBranches: AuthBranch[];
  availableBoothEvents: AuthBoothEvent[];
  currentBranchId: string | null;
  currentBoothEventId: string | null;
  setUser: (user: AuthUser | null) => void;
  setShiftId: (shiftId: string | null) => void;
  setBranches: (branches: AuthBranch[]) => void;
  setBoothEvents: (events: AuthBoothEvent[]) => void;
  setBranchContext: (branchId: string) => void;
  setBoothContext: (boothEventId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      shiftId: null,
      availableBranches: [],
      availableBoothEvents: [],
      currentBranchId: null,
      currentBoothEventId: null,
      setUser: (user) => set({ user }),
      setShiftId: (shiftId) => set({ shiftId }),
      setBranches: (branches) => set({ availableBranches: branches }),
      setBoothEvents: (events) => set({ availableBoothEvents: events }),
      setBranchContext: (branchId) =>
        set({
          currentBranchId: branchId,
          currentBoothEventId: null,
          shiftId: null,
        }),
      setBoothContext: (boothEventId) =>
        set({
          currentBoothEventId: boothEventId,
          currentBranchId: null,
          shiftId: null,
        }),
      logout: () =>
        set({
          user: null,
          shiftId: null,
          availableBranches: [],
          availableBoothEvents: [],
          currentBranchId: null,
          currentBoothEventId: null,
        }),
    }),
    {
      name: "coco-auth",
    }
  )
);

/** Derive the current work mode from state (called inside components, not hooks-needed) */
export function getWorkMode(state: {
  currentBranchId: string | null;
  currentBoothEventId: string | null;
}): WorkMode {
  if (state.currentBoothEventId) return "BOOTH";
  if (state.currentBranchId) return "BRANCH";
  return null;
}
