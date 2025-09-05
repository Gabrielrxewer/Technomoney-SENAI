import { createHash, randomBytes } from "crypto";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";

type Ticket = { userId: string; sid: string; exp: number };
type Msg = Record<string, any>;

const TICKETS = new Map<string, Ticket>();
const BY_SID = new Map<string, Set<WebSocket>>();
const BY_USER = new Map<string, Set<WebSocket>>();
const SCHEDULES = new Map<string, NodeJS.Timeout>();

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function deriveSid(refreshToken: string) {
  return createHash("sha256")
    .update(String(refreshToken || ""))
    .digest("hex");
}

export function issueTicket(userId: string, sid: string) {
  const ticket = b64url(randomBytes(24));
  const exp = Math.floor(Date.now() / 1000) + 30;
  TICKETS.set(ticket, { userId, sid, exp });
  setTimeout(() => TICKETS.delete(ticket), 31000);
  return ticket;
}

function subscribe(userId: string, sid: string, ws: WebSocket) {
  if (!BY_SID.has(sid)) BY_SID.set(sid, new Set());
  BY_SID.get(sid)!.add(ws);
  if (!BY_USER.has(userId)) BY_USER.set(userId, new Set());
  BY_USER.get(userId)!.add(ws);
  ws.on("close", () => {
    BY_SID.get(sid)?.delete(ws);
    BY_USER.get(userId)?.delete(ws);
  });
}

export function publishToSid(sid: string, msg: Msg) {
  const set = BY_SID.get(sid);
  if (!set) return;
  const data = JSON.stringify(msg);
  for (const ws of set) if (ws.readyState === ws.OPEN) ws.send(data);
}

export function publishToUser(userId: string, msg: Msg) {
  const set = BY_USER.get(userId);
  if (!set) return;
  const data = JSON.stringify(msg);
  for (const ws of set) if (ws.readyState === ws.OPEN) ws.send(data);
}

export function clearSessionSchedules(sid: string) {
  const t = SCHEDULES.get(sid);
  if (t) {
    clearTimeout(t);
    SCHEDULES.delete(sid);
  }
}

export function scheduleTokenExpiringSoon(
  sid: string,
  exp: number,
  aheadSeconds = 30
) {
  clearSessionSchedules(sid);
  if (!exp) return;
  const ms = Math.max(0, exp * 1000 - Date.now() - aheadSeconds * 1000);
  const timer = setTimeout(
    () => publishToSid(sid, { type: "token.expiring_soon", exp }),
    ms
  );
  SCHEDULES.set(sid, timer);
}

export function publishJwksRotated(kid: string) {
  for (const [userId] of BY_USER)
    publishToUser(userId, { type: "jwks.rotated", kid });
}

export function publishStepupRequired(userId: string, acr: string) {
  publishToUser(userId, { type: "stepup.required", acr });
}

export function attachWs(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });
  wss.on(
    "connection",
    (ws: WebSocket, request: http.IncomingMessage, ctx: any) => {
      const { userId, sid } = ctx;
      subscribe(userId, sid, ws);
      ws.send(JSON.stringify({ type: "hello", sid, user_id: userId }));
      (ws as any).isAlive = true;
      ws.on("pong", () => {
        (ws as any).isAlive = true;
      });
    }
  );
  server.on("upgrade", (req, socket, head) => {
    const url = String(req.url || "");
    if (!url.startsWith("/api/auth/events")) return socket.destroy();
    const protoRaw = String(req.headers["sec-websocket-protocol"] || "");
    const protos = protoRaw.split(",").map((s) => s.trim());
    const ticketProto = protos.find((s) => s.startsWith("tm.auth.ticket."));
    if (!ticketProto) return socket.destroy();
    const ticket = ticketProto.replace("tm.auth.ticket.", "");
    const entry = TICKETS.get(ticket);
    if (!entry) return socket.destroy();
    if (entry.exp < Math.floor(Date.now() / 1000)) return socket.destroy();
    TICKETS.delete(ticket);
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req, { userId: entry.userId, sid: entry.sid })
    );
  });
  setInterval(() => {
    for (const ws of wss.clients as any) {
      if (ws.isAlive === false) {
        try {
          ws.terminate();
        } catch {}
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {}
    }
  }, 15000);
}
