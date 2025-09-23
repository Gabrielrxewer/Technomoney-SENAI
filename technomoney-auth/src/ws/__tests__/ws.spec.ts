import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";

const Module = require("module");
import { EventEmitter } from "events";

const ensureStubPath = () => {
  const stubPath = path.resolve(__dirname, "../../../test-shims/node_modules");
  if (!Module.globalPaths.includes(stubPath)) {
    process.env.NODE_PATH = process.env.NODE_PATH
      ? `${stubPath}${path.delimiter}${process.env.NODE_PATH}`
      : stubPath;
    Module._initPaths();
  }
};

ensureStubPath();

const stubModule = (specifier: string, exports: unknown) => {
  const resolved = require.resolve(specifier);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as any;
};

const ensureLoggerStub = () => {
  const path = require.resolve("../../utils/log/logger");
  if (!require.cache[path]) {
    const records = () => (globalThis as any).__logRecords;
    const createLogger = (bindings: Record<string, unknown>) => ({
      info(payload?: unknown, msg?: string) {
        records().push({ level: "info", payload, msg, bindings });
      },
      warn(payload?: unknown, msg?: string) {
        records().push({ level: "warn", payload, msg, bindings });
      },
      debug(payload?: unknown, msg?: string) {
        records().push({ level: "debug", payload, msg, bindings });
      },
      error(payload?: unknown, msg?: string) {
        records().push({ level: "error", payload, msg, bindings });
      },
    });
    (globalThis as any).__createTestLogger = createLogger;
    const root = createLogger({});
    (root as any).child = (bindings: Record<string, unknown>) =>
      createLogger({ ...(bindings || {}) });
    require.cache[path] = {
      id: path,
      filename: path,
      loaded: true,
      exports: {
        logger: root,
        getLogger(bindings: Record<string, unknown>) {
          return createLogger({ ...(bindings || {}) });
        },
      },
    } as any;
  }
};

class FakeWebSocket extends EventEmitter {
  sent: string[] = [];
  readyState = 1;
  OPEN = 1;
  send(data: string) {
    this.sent.push(data);
  }
  terminate() {}
  ping() {}
}

class FakeWebSocketServer extends EventEmitter {
  clients = new Set<FakeWebSocket>();
  handleUpgrade(
    req: any,
    socket: any,
    head: any,
    cb: (ws: FakeWebSocket) => void
  ) {
    const ws = new FakeWebSocket();
    this.clients.add(ws);
    cb(ws);
  }
}

stubModule("ws", {
  WebSocketServer: FakeWebSocketServer,
  WebSocket: FakeWebSocket,
});

(globalThis as any).__logRecords = [];
ensureLoggerStub();

const { attachWs, issueTicket } = require("../index");

class FakeServer extends EventEmitter {}

const realSetInterval = global.setInterval;
const realSetTimeout = global.setTimeout;
const intervalHandles: NodeJS.Timeout[] = [];
const timeoutHandles: NodeJS.Timeout[] = [];
(global as any).setInterval = (
  fn: (...args: any[]) => void,
  ms?: number,
  ...args: any[]
) => {
  const handle = realSetInterval(fn, ms as any, ...args);
  intervalHandles.push(handle as any);
  return handle;
};
(global as any).setTimeout = (
  fn: (...args: any[]) => void,
  ms?: number,
  ...args: any[]
) => {
  const handle = realSetTimeout(fn, ms as any, ...args);
  timeoutHandles.push(handle as any);
  return handle;
};

test.after(() => {
  for (const spec of ["ws", "../index"]) {
    const resolved = require.resolve(spec);
    delete require.cache[resolved];
  }
  for (const handle of intervalHandles) {
    clearInterval(handle);
  }
  for (const handle of timeoutHandles) {
    clearTimeout(handle);
  }
  (global as any).setInterval = realSetInterval;
  (global as any).setTimeout = realSetTimeout;
});

test("attachWs registra conexões aceitas", async () => {
  (globalThis as any).__logRecords = [];
  const server = new FakeServer();
  attachWs(server as any);
  const ticket = issueTicket("user-1", "session-1");
  const socket: any = {
    destroyed: false,
    destroy() {
      this.destroyed = true;
    },
  };
  const req: any = {
    url: "/api/auth/events",
    headers: {
      "sec-websocket-protocol": `tm.auth.ticket.${ticket}`,
      "x-request-id": "req-42",
    },
    socket: { remoteAddress: "127.0.0.1" },
  };
  server.emit("upgrade", req, socket, Buffer.alloc(0));
  const records: any[] = (globalThis as any).__logRecords;
  const accepted = records.find((r) => r.msg === "ws.connection.accepted");
  assert.ok(accepted, "aceitação deve ser logada");
  assert.equal(accepted.bindings.requestId, "req-42");
  assert.equal(socket.destroyed, false);
});

test("attachWs rejeita conexões inválidas", async () => {
  (globalThis as any).__logRecords = [];
  const server = new FakeServer();
  attachWs(server as any);
  const socket: any = {
    destroyed: false,
    destroy() {
      this.destroyed = true;
    },
  };
  const req: any = {
    url: "/api/auth/events",
    headers: {
      "sec-websocket-protocol": "tm.auth.ticket.invalid",
      "x-request-id": "req-99",
    },
    socket: { remoteAddress: "127.0.0.1" },
  };
  server.emit("upgrade", req, socket, Buffer.alloc(0));
  const records: any[] = (globalThis as any).__logRecords;
  const rejected = records.find((r) => r.msg === "ws.connection.rejected");
  assert.ok(rejected, "rejeição deve ser logada");
  assert.equal(rejected.bindings.requestId, "req-99");
  assert.equal(socket.destroyed, true);
});
