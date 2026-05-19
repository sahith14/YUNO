// Typed Socket.IO client wrapper — uses the shared event contract.

import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@yuno/shared";
import { getToken } from "./api";
import { deviceFingerprint } from "./fingerprint";

const URL = process.env.NEXT_PUBLIC_SIGNALING_URL ?? "ws://localhost:4001";

export type YunoSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let _socket: YunoSocket | null = null;

export function getSocket(): YunoSocket {
  if (_socket && _socket.connected) return _socket;
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  const token = getToken();
  if (!token) throw new Error("no token; call authGuest() first");

  _socket = io(URL, {
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 800,
    auth: {
      token,
      fingerprint: deviceFingerprint(),
    },
  }) as YunoSocket;

  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
