import type { StateCreator } from "zustand";
import { seedSessionStatsData } from "@/features/session-stats/seed";
import type {
  SessionStatsData,
  SessionStatsSession,
} from "@/features/session-stats/types";
import type { StudioState } from "../types";

export type SessionStatsSlice = {
  sessionStatsSessions: SessionStatsSession[];
  sessionStatsLastIngestedAt: string | null;
  setSessionStatsData: (data: SessionStatsData) => void;
};

export const createSessionStatsSlice: StateCreator<StudioState, [], [], SessionStatsSlice> = (set) => ({
  sessionStatsSessions: seedSessionStatsData.sessions,
  sessionStatsLastIngestedAt: seedSessionStatsData.lastIngestedAt ?? null,
  setSessionStatsData: (data) =>
    set({
      sessionStatsSessions: data.sessions,
      sessionStatsLastIngestedAt: data.lastIngestedAt ?? null,
    }),
});
