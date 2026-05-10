import type { NextRequest } from "next/server";
import { WebSocketServer } from "ws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js 16 App Router does not expose the raw Node.js server, so we upgrade
// the HTTP connection manually by attaching a one-shot WebSocketServer to the
// incoming socket.
export async function GET(req: NextRequest) {
  const upgradeHeader = req.headers.get("upgrade");
  if (upgradeHeader?.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  // Access the raw Node.js objects via the non-standard but available property
  // that Next.js 16 exposes when runtime = "nodejs".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socket = (req as any).socket as import("net").Socket | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const head = (req as any).head as Buffer | undefined;

  if (!socket) {
    return new Response("Cannot access raw socket", { status: 500 });
  }

  const wss = new WebSocketServer({ noServer: true });

  await new Promise<void>((resolve) => {
    wss.handleUpgrade(
      // The ws package expects http.IncomingMessage; cast the request
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req as any,
      socket,
      head ?? Buffer.alloc(0),
      (ws) => {
        ws.send(JSON.stringify({ type: "connected", message: "WebSocket echo server ready" }));
        ws.on("message", (data) => {
          ws.send(JSON.stringify({ type: "echo", data: data.toString() }));
        });
        ws.on("close", resolve);
      }
    );
  });

  // Response is handled by the WebSocket upgrade, return empty response
  return new Response(null, { status: 101 });
}
