// Zustand store for chat-page state. Lightweight — just enough to coordinate
// between the lobby UI, the active room UI, and the controls.

import { create } from "zustand";
import type { MatchPeerInfo, Modality } from "@yuno/shared";

export type ChatPhase =
  | "permissions"   // need camera/mic
  | "ready"         // got permissions, can join
  | "queueing"      // in queue, waiting for match
  | "matched"       // match:found received, setting up WebRTC
  | "connected"     // pc connected, video flowing
  | "ended";        // room ended; fading out before re-queue

export interface PeerState {
  roomId: string;
  initiator: boolean;
  peer: MatchPeerInfo;
  matchedVia: string;
}

interface ChatStore {
  phase: ChatPhase;
  modality: Modality;
  interests: string[];
  queuePosition: number;
  queueEta: number;
  peerState: PeerState | null;
  errorMsg: string | null;
  setPhase: (p: ChatPhase) => void;
  setModality: (m: Modality) => void;
  setInterests: (i: string[]) => void;
  setQueueInfo: (pos: number, eta: number) => void;
  setPeer: (p: PeerState | null) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useChat = create<ChatStore>((set) => ({
  phase: "permissions",
  modality: "video",
  interests: [],
  queuePosition: 0,
  queueEta: 0,
  peerState: null,
  errorMsg: null,
  setPhase: (phase) => set({ phase }),
  setModality: (modality) => set({ modality }),
  setInterests: (interests) => set({ interests }),
  setQueueInfo: (queuePosition, queueEta) => set({ queuePosition, queueEta }),
  setPeer: (peerState) => set({ peerState }),
  setError: (errorMsg) => set({ errorMsg }),
  reset: () =>
    set({
      phase: "permissions",
      queuePosition: 0,
      queueEta: 0,
      peerState: null,
      errorMsg: null,
    }),
}));
