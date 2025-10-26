import path from "node:path";
import fs from "node:fs";
import type { RunnableDevEnvironment, ViteDevServer } from "vite";
import type { ServerWebSocket } from "bun";
import type { PostponedState } from "react-dom/static";

const isTest = process.env.NODE_ENV === "test" || !!process.env.VITE_TEST_BUILD;

export interface CreatedServer {
  server: ReturnType<typeof Bun.serve>;
  vite?: ViteDevServer;
}

export async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === "production"
): Promise<CreatedServer> {
  let vite: ViteDevServer | undefined;
  let serverEnv: RunnableDevEnvironment | undefined;

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  if (!isProd) {
    const { createServer } = await import("vite");
    vite = await createServer({
      root,
      logLevel: isTest ? "error" : "info",
      server: {
        middlewareMode: true,
        hmr: {
          clientPort: 3003,
          port: 3003,
        }, // Disable Vite's own WebSocket server, we'll handle it
      },

      appType: "custom",
      environments: { server: {} },
    });

    serverEnv = vite.environments.server as RunnableDevEnvironment;
  }

  const server = Bun.serve({
    port,

    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // (No in-server test endpoints here — simulated delays are implemented in the route code)

      if (isProd) {
        // Production: serve static files or SSR
        if (path.extname(pathname) !== "") {
          const filePath = path.join(root, "dist", "client", pathname);
          try {
            // Make sure the file exists before attempting to stream it
            if (!fs.existsSync(filePath)) {
              return new Response("Not Found", { status: 404 });
            }
            return new Response(Bun.file(filePath), { status: 200 });
          } catch (err) {
            console.error("Static file serve error:", err);
            return new Response("Not Found", { status: 404 });
          }
        }

        // SSR
        const entry = await import(
          path.join(root, "dist", "server", "entry-server.js")
        );
        const render =
          entry.render || entry.default?.render || entry.default || entry;
        const result = await render({ req, head: "" });
        if (result instanceof Response) return result;
        if (typeof result === "string")
          return new Response(result, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        return new Response("SSR entry returned no response", { status: 500 });
      }

      // Development
      const accept = req.headers.get("accept") || "";
      if (!accept.includes("text/html")) {
        // Serve modules/assets via Vite
        const requestPath = pathname + url.search;
        const clientEnv = vite?.environments?.client;
        if (clientEnv) {
          try {
            const result = await clientEnv.transformRequest(requestPath);
            if (result?.code) {
              const contentType = requestPath.endsWith(".css")
                ? "text/css; charset=utf-8"
                : "application/javascript; charset=utf-8";
              const headers = new Headers({ "content-type": contentType });
              if (result.etag) headers.set("etag", result.etag);
              return new Response(result.code, { status: 200, headers });
            }
          } catch {}
        }
        return new Response("Not Found", { status: 404 });
      }

      // SSR in dev
      if (serverEnv) {
        // Best effort extraction of the head from vite's index transformation hook
        let viteHead = await vite!.transformIndexHtml(
          url.pathname,
          `<html><head></head><body></body></html>`
        );
        viteHead = viteHead.substring(
          viteHead.indexOf("<head>") + 6,
          viteHead.indexOf("</head>")
        );

        const entry = await serverEnv.runner.import("/src/entry-server.tsx");
        const render =
          entry.render || entry.default?.render || entry.default || entry;
        const result = await render({ req, head: viteHead });
        if (result instanceof Response) return result;
        if (typeof result === "string")
          return new Response(result, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        return new Response("SSR entry returned no response", { status: 500 });
      }

      return new Response("Vite not available", { status: 500 });
    },
  });

  // Wire up Vite's HMR to broadcast through Bun's WebSocket

  return { server, vite };
}

if (!isTest) {
  createServer().then(({ server }) => {
    console.info(`Client Server: ${server.url}`);
  });
}
