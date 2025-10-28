
import { prerender } from "react-dom/static";

import type { AnyRouter } from "@tanstack/router-core";

import { cache } from "./cache";
const renderRouterToPPR = async ({
    router,
    responseHeaders,
    children,
    request
}: {
    router: AnyRouter;
    responseHeaders: Headers;
    children: React.ReactNode;
    request: Request;
}) => {
    const pathname = new URL(request.url).pathname;

    console.log('REQUEST PATHNAME prerender:', pathname);





    const abortController = new AbortController();

    const prePromise = prerender(children, {
        signal: abortController.signal,
        onError: (error) => {

        }
    });

    // Abort prelude render if it takes too long (100ms)
    setTimeout(() => {
        abortController.abort();
    });

    const { prelude, postponed } = await prePromise;




    router.serverSsr?.setRenderFinished();
    const html = await new Response(prelude).text();

    const injectedHtml = await Promise.all(router.serverSsr?.injectedHtml || []).then(
        (htmls) => htmls.join("")
    );

    let finalHtml = html.replace(`</body>`, `${injectedHtml}</body>`);

    if (postponed) {






        cache.set(pathname, JSON.stringify(postponed))





    }


    return new Response(finalHtml, {
        status: router.state.statusCode,
        headers: responseHeaders
    });

};
export {
    renderRouterToPPR
};