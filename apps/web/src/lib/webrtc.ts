// WebRTC peer-connection manager.
// Encapsulates: PeerConnection setup, ICE relay through socket, track wiring.

import type { YunoSocket } from "./socket";

export interface WebRTCArgs {
  socket: YunoSocket;
  roomId: string;
  isInitiator: boolean;
  iceServers: RTCIceServer[];
  localStream: MediaStream;
  onRemoteStream: (s: MediaStream) => void;
  onState: (s: RTCPeerConnectionState) => void;
  onIceState?: (s: RTCIceConnectionState) => void;
}

export class WebRTCSession {
  private pc: RTCPeerConnection;
  private socket: YunoSocket;
  private roomId: string;
  private offerSent = false;
  private remoteStream: MediaStream;
  private cleanupFns: Array<() => void> = [];

  constructor(private args: WebRTCArgs) {
    this.socket = args.socket;
    this.roomId = args.roomId;
    this.remoteStream = new MediaStream();

    this.pc = new RTCPeerConnection({
      iceServers: args.iceServers,
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

    // Wire local tracks
    args.localStream.getTracks().forEach((t) => this.pc.addTrack(t, args.localStream));

    // Trickle ICE outbound
    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.socket.emit("signal:ice-candidate", {
          roomId: this.roomId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    this.pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => {
        if (!this.remoteStream.getTracks().includes(t)) this.remoteStream.addTrack(t);
      });
      args.onRemoteStream(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => args.onState(this.pc.connectionState);
    this.pc.oniceconnectionstatechange = () =>
      args.onIceState?.(this.pc.iceConnectionState);

    // Hook signaling events
    const onOffer = async (p: { roomId: string; sdp: string }) => {
      if (p.roomId !== this.roomId) return;
      await this.pc.setRemoteDescription({ type: "offer", sdp: p.sdp });
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.socket.emit("signal:answer", { roomId: this.roomId, sdp: answer.sdp ?? "" });
    };
    const onAnswer = async (p: { roomId: string; sdp: string }) => {
      if (p.roomId !== this.roomId) return;
      if (this.pc.signalingState === "stable") return; // already set
      await this.pc.setRemoteDescription({ type: "answer", sdp: p.sdp });
    };
    const onIce = async (p: { roomId: string; candidate: RTCIceCandidateInit }) => {
      if (p.roomId !== this.roomId) return;
      try {
        await this.pc.addIceCandidate(p.candidate);
      } catch {
        /* ignore late candidates after teardown */
      }
    };

    this.socket.on("signal:offer", onOffer);
    this.socket.on("signal:answer", onAnswer);
    this.socket.on("signal:ice-candidate", onIce);

    this.cleanupFns.push(() => {
      this.socket.off("signal:offer", onOffer);
      this.socket.off("signal:answer", onAnswer);
      this.socket.off("signal:ice-candidate", onIce);
    });

    if (args.isInitiator) {
      void this.makeOffer();
    }
  }

  private async makeOffer(): Promise<void> {
    if (this.offerSent) return;
    this.offerSent = true;
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(offer);
    this.socket.emit("signal:offer", { roomId: this.roomId, sdp: offer.sdp ?? "" });
  }

  /** Capture a single video frame as base64 jpeg for moderation evidence. */
  captureFrameBase64(maxSize = 256): string | null {
    const remoteVideoTrack = this.remoteStream.getVideoTracks()[0];
    if (!remoteVideoTrack) return null;
    const video = document.createElement("video");
    video.srcObject = new MediaStream([remoteVideoTrack]);
    void video.play();
    const c = document.createElement("canvas");
    c.width = maxSize;
    c.height = maxSize;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    try {
      ctx.drawImage(video, 0, 0, maxSize, maxSize);
      return c.toDataURL("image/jpeg", 0.7);
    } catch {
      return null;
    }
  }

  close(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    try {
      this.pc.getSenders().forEach((s) => s.track?.stop());
    } catch {
      /* ignore */
    }
    this.pc.close();
  }
}
