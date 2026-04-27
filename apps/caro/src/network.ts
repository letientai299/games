import { joinRoom, getRelaySockets } from "@trystero-p2p/nostr";

declare const __GIT_SHA__: string;
const APP_ID = `letientai.io/games/caro--${__GIT_SHA__}`;
const CODE_CHARS = "0123456789";
const CODE_LENGTH = 4;

const RELAY_URLS = [
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.mostr.pub",
  "wss://hol.is",
  "wss://nostr.mom",
  "wss://relay.nostr.place",
  "wss://nostr.data.haus",
];

export type NetworkEvent =
  | { type: "connected" }
  | { type: "move"; row: number; col: number }
  | { type: "disconnected" };

export type RelayStatus = "connecting" | "open" | "closed";

export interface RelayInfo {
  url: string;
  status: RelayStatus;
}

export interface NetworkHandle {
  roomCode: string;
  send: (move: { row: number; col: number }) => void;
  leave: () => void;
  setOnEvent: (cb: (event: NetworkEvent) => void) => void;
  getRelayStatuses: () => RelayInfo[];
}

export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

function readRelayStatuses(): RelayInfo[] {
  const sockets = getRelaySockets();
  return RELAY_URLS.map((url) => {
    const ws: WebSocket | undefined = sockets[url];
    let status: RelayStatus;
    if (!ws) status = "connecting";
    else if (ws.readyState === WebSocket.OPEN) status = "open";
    else if (ws.readyState === WebSocket.CONNECTING) status = "connecting";
    else status = "closed";
    return { url, status };
  });
}

let warmupRoom: ReturnType<typeof joinRoom> | null = null;

/** Pre-connect to relays so joinRoom is near-instant later. */
export function warmupRelays(): void {
  if (warmupRoom) return;
  warmupRoom = joinRoom({ appId: APP_ID, relayUrls: RELAY_URLS }, "__warmup__");
}

/** Release the warmup room (call after the real room is joined). */
function releaseWarmup(): void {
  warmupRoom?.leave();
  warmupRoom = null;
}

export function connectToRoom(
  code: string,
  onEvent: (event: NetworkEvent) => void,
): NetworkHandle {
  let currentHandler = onEvent;

  console.log(`[net] joining room "${code}" with appId "${APP_ID}"`);
  const room = joinRoom({ appId: APP_ID, relayUrls: RELAY_URLS }, code);
  releaseWarmup();

  const [sendMove, onMove] = room.makeAction<{ row: number; col: number }>(
    "move",
  );

  room.onPeerJoin((peerId) => {
    console.log(`[net] peer joined: ${peerId}`);
    currentHandler({ type: "connected" });
  });
  room.onPeerLeave((peerId) => {
    console.log(`[net] peer left: ${peerId}`);
    currentHandler({ type: "disconnected" });
  });
  onMove((data) => {
    console.log(`[net] move received:`, data);
    currentHandler({ type: "move", row: data.row, col: data.col });
  });

  return {
    roomCode: code,
    send: (move) => sendMove(move),
    leave: () => room.leave(),
    setOnEvent: (cb) => {
      currentHandler = cb;
    },
    getRelayStatuses: readRelayStatuses,
  };
}
