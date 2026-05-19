// Room lifecycle helpers — creation, lookup, teardown.

import { randomUUID } from "node:crypto";
import { redis } from "./redis.js";
import { REDIS_KEYS } from "@yuno/shared";

export interface ActiveRoom {
  roomId: string;
  userA: string;          // socketId
  userB: string;
  userAId: string;        // userId
  userBId: string;
  startedAt: number;
  initiator: string;      // socketId of initiator
  modality: "video" | "audio" | "text";
  matchedVia: string;
  /** Set when at least one peer has emitted room:ready */
  readyAt?: number;
}

const ROOM_HASH = "rooms:active";    // Hash<roomId, JSON ActiveRoom>

export function newRoomId(): string {
  return randomUUID();
}

export async function persistRoom(room: ActiveRoom): Promise<void> {
  const tx = redis.multi();
  tx.hset(ROOM_HASH, room.roomId, JSON.stringify(room));
  tx.set(REDIS_KEYS.userRoom(room.userAId), room.roomId, "EX", 7200);
  tx.set(REDIS_KEYS.userRoom(room.userBId), room.roomId, "EX", 7200);
  await tx.exec();
}

export async function getRoom(roomId: string): Promise<ActiveRoom | null> {
  const raw = await redis.hget(ROOM_HASH, roomId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveRoom;
  } catch {
    return null;
  }
}

export async function endRoom(roomId: string): Promise<ActiveRoom | null> {
  const room = await getRoom(roomId);
  if (!room) return null;

  const tx = redis.multi();
  tx.hdel(ROOM_HASH, roomId);
  tx.del(REDIS_KEYS.userRoom(room.userAId));
  tx.del(REDIS_KEYS.userRoom(room.userBId));
  tx.del(REDIS_KEYS.userState(room.userAId));
  tx.del(REDIS_KEYS.userState(room.userBId));
  await tx.exec();
  return room;
}

export async function getUserActiveRoomId(userId: string): Promise<string | null> {
  const v = await redis.get(REDIS_KEYS.userRoom(userId));
  return v;
}

/** Mark the room as ready (at least one peer signaled `room:ready`). */
export async function markRoomReady(roomId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room || room.readyAt) return;
  room.readyAt = Date.now();
  await redis.hset("rooms:active", roomId, JSON.stringify(room));
}
