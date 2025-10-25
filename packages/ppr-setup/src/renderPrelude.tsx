import { cache } from "./cache";

import { prerender } from "react-dom/static";

const renderRouterToPPR = async ({
    router,
    responseHeaders,
    children,
    request
}: {
    router: any;
    responseHeaders: Headers;
    children: React.ReactNode;
    request: Request;
}) => {
    try {
        const abortController = new AbortController();
        const pre = prerender(children, {
            signal: abortController.signal
        });
        setTimeout(() => {
            abortController.abort();
        }); // 30 seconds timeout

        let { prelude, postponed } = await pre;

        // Run html extraction, cache, setRenderFinished, and injectedHtml concurrently
        const pathname = new URL(request.url).pathname;
        const [html, _] = await Promise.all([
            new Response(prelude).text(),
            (async () => {
                if (postponed) {
                    // Save postponed using the original pathname as the cache key.
                    // Resume handler will strip the `/resume` prefix and look up this key.
                    cache.set(pathname, structuredClone(postponed));
                }
                router.serverSsr.setRenderFinished();
            })()
        ]);

        // Inject HTML concurrently with above
        const injectedHtml = await Promise.all(router.serverSsr.injectedHtml).then(
            (htmls) => htmls.join("")
        );

        let finalHtml = html.replace(`</body>`, `${injectedHtml}</body>`);

        // If postponed is not null, add a small meta marker in the head so the client can trigger resume streaming
        if (postponed) {
            const serverPath = (() => {
                try {
                    return new URL(request.url).pathname;
                } catch { return '/'; }
            })();
            const metaTag = `<meta name="ppr-resume" content="/resume${serverPath}" />`;
            const headCloseIdx = finalHtml.indexOf('</head>');
            if (headCloseIdx !== -1) {
                finalHtml = finalHtml.slice(0, headCloseIdx) + metaTag + finalHtml.slice(headCloseIdx);
            } else {
                // fallback: if no </head> found, prepend to start
                finalHtml = metaTag + finalHtml;
            }
        }
        console.log("Postponed value:", postponed ? 'exists' : 'none');




        return new Response(`<!DOCTYPE html>${finalHtml}`, {
            status: router.state.statusCode,
            headers: responseHeaders
        });
    } catch (error) {
        console.error("Render to string error:", error);
        return new Response("Internal Server Error", {
            status: 500,
            headers: responseHeaders
        });
    }
};
export {
    renderRouterToPPR
};
