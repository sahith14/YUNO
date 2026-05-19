"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { LobbyPanel, type GenderFilter } from "@/components/LobbyPanel";
import { MatchingScreen } from "@/components/MatchingScreen";
import { ControlBar } from "@/components/ControlBar";
import { ReportModal, type ReportCategory } from "@/components/ReportModal";
import { GenderGate } from "@/components/GenderGate";
import { FreeFilterCountdown } from "@/components/FreeFilterCountdown";

import {
  authGuest,
  getInterests,
  getMe,
  getToken,
  getIceCredentials,
  setGender as apiSetGender,
} from "@/lib/api";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { WebRTCSession } from "@/lib/webrtc";
import { useChat } from "@/lib/store";

import type { InterestDef, MeResponse } from "@/lib/api";

export default function ChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<WebRTCSession | null>(null);
  const matchStartedRef = useRef<number | null>(null);

  const {
    phase,
    modality,
    interests,
    queuePosition,
    queueEta,
    peerState,
    errorMsg,
    setPhase,
    setModality,
    setInterests,
    setQueueInfo,
    setPeer,
    setError,
  } = useChat();

  const [allInterests, setAllInterests] = useState<InterestDef[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("any");
  const [genderGateOpen, setGenderGateOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  // Whether the current session was joined under free-filter rules — drives the countdown
  const freeFilterActive = !!me && !me.premium && genderFilter !== "any";
  const showCountdown =
    freeFilterActive && (phase === "matched" || phase === "connected") && matchStartedRef.current !== null;

  // ---- Bootstrap auth + interests + me ----
  const refreshMe = useCallback(async () => {
    try {
      const meRes = await getMe();
      setMe(meRes);
      if (!meRes.selfGender) setGenderGateOpen(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [setError]);

  useEffect(() => {
    void (async () => {
      try {
        if (!getToken()) await authGuest();
        const interestRes = await getInterests();
        setAllInterests(interestRes.interests);
        await refreshMe();
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [refreshMe, setError]);

  // ---- Get camera permissions on mount ----
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: modality === "video" ? { width: 640, height: 480, frameRate: 30 } : false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current && modality === "video") {
          localVideoRef.current.srcObject = stream;
        }
        setPhase("ready");
      } catch (err) {
        setError("Allow camera & microphone to start chatting.");
        setPhase("permissions");
      }
    })();
    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modality]);

  // ---- Wire socket events ----
  useEffect(() => {
    if (phase === "permissions") return;
    if (genderGateOpen) return; // hold the socket until gender is set
    const socket = getSocket();

    const onWaiting = (p: { position: number; etaSeconds: number }) => {
      setQueueInfo(p.position, p.etaSeconds);
    };
    const onMatch = async (m: Parameters<Parameters<typeof socket.on<"match:found">>[1]>[0]) => {
      setPeer({ roomId: m.roomId, initiator: m.initiator, peer: m.peer, matchedVia: m.matchedVia });
      setPhase("matched");
      matchStartedRef.current = Date.now();
      if (!localStreamRef.current) return;
      const ice = m.iceServers.length > 0 ? m.iceServers : (await getIceCredentials()).iceServers;
      sessionRef.current?.close();
      sessionRef.current = new WebRTCSession({
        socket,
        roomId: m.roomId,
        isInitiator: m.initiator,
        iceServers: ice as RTCIceServer[],
        localStream: localStreamRef.current,
        onRemoteStream: (s) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = s;
        },
        onState: (s) => {
          // eslint-disable-next-line no-console
          console.log("[yuno] pc state:", s);
          if (s === "connected") setPhase("connected");
          if (s === "failed") {
            setTimeout(() => {
              if (sessionRef.current) socket.emit("room:skip", { roomId: m.roomId, reason: "issue" }, () => {});
            }, 1500);
          }
        },
        onIceState: (s) => {
          // eslint-disable-next-line no-console
          console.log("[yuno] ice state:", s);
        },
      });
      socket.emit("room:ready", { roomId: m.roomId });
    };
    const onEnded = () => {
      sessionRef.current?.close();
      sessionRef.current = null;
      setPeer(null);
      matchStartedRef.current = null;
      setPhase("ended");
      setTimeout(() => requeue(), 600);
    };
    const onError = (e: { code: string; message: string }) => {
      setError(`${e.code}: ${e.message}`);
    };

    socket.on("queue:waiting", onWaiting);
    socket.on("match:found", onMatch);
    socket.on("room:ended", onEnded);
    socket.on("error", onError);

    return () => {
      socket.off("queue:waiting", onWaiting);
      socket.off("match:found", onMatch);
      socket.off("room:ended", onEnded);
      socket.off("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, genderGateOpen]);

  const requeue = useCallback(() => {
    const socket = getSocket();
    setPhase("queueing");
    socket.emit(
      "queue:join",
      {
        modality,
        interests,
        region: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(genderFilter !== "any" ? { filters: { gender: genderFilter } } : {}),
      },
      (res) => {
        if (!res.ok) setError(res.error);
      },
    );
  }, [modality, interests, genderFilter, setError, setPhase]);

  const startMatching = useCallback(() => {
    if (!consentChecked) return;
    if (!me?.selfGender) {
      setGenderGateOpen(true);
      return;
    }
    requeue();
  }, [consentChecked, requeue, me]);

  const handleSkip = useCallback(() => {
    if (!peerState) return;
    const socket = getSocket();
    socket.emit("room:skip", { roomId: peerState.roomId, reason: "skip" }, () => {});
  }, [peerState]);

  const handleLeave = useCallback(() => {
    if (peerState) getSocket().emit("room:leave", { roomId: peerState.roomId });
    sessionRef.current?.close();
    sessionRef.current = null;
    disconnectSocket();
    setPhase("ready");
    setPeer(null);
  }, [peerState, setPhase, setPeer]);

  const handleReport = useCallback(
    async (category: ReportCategory) => {
      if (!peerState) return;
      const evidence = sessionRef.current?.captureFrameBase64() ?? undefined;
      const socket = getSocket();
      await new Promise<void>((resolve) => {
        socket.emit(
          "report:flag",
          { roomId: peerState.roomId, category, evidenceFrameBase64: evidence },
          () => resolve(),
        );
      });
      socket.emit("room:skip", { roomId: peerState.roomId, reason: "issue" }, () => {});
    },
    [peerState],
  );

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setMicOn(enabled);
  };
  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !camOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setCamOn(enabled);
  };

  const onUpgrade = () => {
    window.location.href = "/upgrade";
  };

  const maxInterests = me?.premium ? 5 : 1;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink-950">
      <div className="pointer-events-none absolute inset-0 bg-yuno-radial" />

      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />

      <div className="absolute right-4 top-4 z-20 aspect-video w-32 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-xl md:w-48">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full -scale-x-100 object-cover"
        />
      </div>

      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/70 px-3 py-1.5 text-xs backdrop-blur">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              phase === "connected"
                ? "bg-emerald-400"
                : phase === "queueing" || phase === "matched"
                  ? "animate-pulse-soft bg-accent-500"
                  : "bg-cream-100/40"
            }`}
          />
          <span className="text-cream-100/80">
            {phase === "connected"
              ? "Connected"
              : phase === "queueing"
                ? "Looking for someone..."
                : phase === "matched"
                  ? "Matched!"
                  : phase === "ended"
                    ? "Reconnecting..."
                    : phase === "ready"
                      ? "Ready"
                      : "Camera setup"}
          </span>
        </div>
        {peerState && (
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/70 px-3 py-1.5 text-xs backdrop-blur">
            {peerState.peer.country && <span>🌍 {peerState.peer.country}</span>}
            {peerState.peer.verified && (
              <span className="rounded-full bg-glow-500/20 px-2 py-0.5 text-[10px] text-glow-400">
                Verified
              </span>
            )}
            {peerState.peer.interests.length > 0 && (
              <span className="text-cream-100/60">· {peerState.peer.interests.join(", ")}</span>
            )}
          </div>
        )}
      </div>

      {/* Free-filter countdown */}
      <FreeFilterCountdown
        active={showCountdown}
        startedAt={matchStartedRef.current}
        onUpgrade={onUpgrade}
      />

      {/* Lobby */}
      <AnimatePresence>
        {(phase === "permissions" || phase === "ready") && !genderGateOpen && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-md"
          >
            <LobbyPanel
              modality={modality}
              setModality={setModality}
              interests={interests}
              allInterests={allInterests}
              toggleInterest={(slug) =>
                setInterests(
                  interests.includes(slug)
                    ? interests.filter((s) => s !== slug)
                    : interests.length < maxInterests
                      ? [...interests, slug]
                      : interests,
                )
              }
              maxInterests={maxInterests}
              genderFilter={genderFilter}
              setGenderFilter={setGenderFilter}
              isPremium={!!me?.premium}
              onUpgrade={onUpgrade}
              onStart={startMatching}
              consentChecked={consentChecked}
              setConsent={setConsentChecked}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === "queueing" || phase === "matched") && (
          <MatchingScreen position={queuePosition} etaSeconds={queueEta} />
        )}
      </AnimatePresence>

      {(phase === "connected" || phase === "matched") && (
        <ControlBar
          micOn={micOn}
          camOn={camOn}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onSkip={handleSkip}
          onLeave={handleLeave}
          onReport={() => setReportOpen(true)}
        />
      )}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={handleReport} />

      {/* Gender gate (first-time setup) */}
      <GenderGate
        open={genderGateOpen}
        onPick={async (g) => {
          await apiSetGender(g);
          setGenderGateOpen(false);
          await refreshMe();
        }}
      />

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-32 left-1/2 z-40 -translate-x-1/2 rounded-full border border-accent-500/40 bg-accent-500/15 px-4 py-2 text-sm text-accent-400 backdrop-blur"
          >
            {errorMsg}
            <button onClick={() => setError(null)} className="ml-3 opacity-60 hover:opacity-100">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
