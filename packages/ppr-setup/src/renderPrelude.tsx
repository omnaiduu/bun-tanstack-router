import { cache } from "./cache";
import { prerender, type PrerenderResult } from "react-dom/static";
import { file, write } from "bun"
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
        let pathname = new URL(request.url).pathname;
        pathname = pathname === "/" ? "/index" : pathname;

        const fh = file("./html" + pathname)

        // if (await fh.exists()) {
        //     console.log('Serving cached HTML for:', pathname);
        //     const existingContent = fh.stream();
        //     return new Response(existingContent, {
        //         status: 200,
        //         headers: responseHeaders
        //     });
        // }
        const abortController = new AbortController();

        const prePromise = prerender(children, {
            signal: abortController.signal,
            onError: (error) => {
                console.error('Prelude render error:', error);
            }
        });

        // Abort prelude render if it takes too long (100ms)
        setTimeout(() => {
            abortController.abort();
        }, 100);

        const { prelude, postponed } = await prePromise;
        

        const postponedKey = new URL(request.url).pathname;
        console.log('Postponed key for caching:', postponedKey);
        const [html, _] = await Promise.all([
            new Response(prelude).text(),
            (async () => {
                if (postponed) {
                    cache.set(postponedKey, postponed);
                }
                router.serverSsr.setRenderFinished();
            })()
        ]);

        const injectedHtml = await Promise.all(router.serverSsr.injectedHtml).then(
            (htmls) => htmls.join("")
        );

        let finalHtml = html.replace(`</body>`, `${injectedHtml}</body>`);

        if (postponed) {

            const reqbody = {
                postponed: JSON.stringify(postponed),
                path: new URL(request.url).pathname
            }
            const jsonBody = JSON.stringify(reqbody)
            const inlineScript = `<script>document.addEventListener('DOMContentLoaded', async function(){
    try {
    function removeSuffix(str, suffix) {
  if (str.endsWith(suffix)) {
    return str.slice(0, -suffix.length);
  }
    return str;
}
        var url = "/resume";
        var res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: ${JSON.stringify(jsonBody)}
        });
        if (!res.ok) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        const range = document.createRange();
        const target =  document.body; 
        range.selectNodeContents(target);  // Fixed: Use selectNodeContents for inner context
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('Stream complete');
                break;
            }
            let html = decoder.decode(value, { stream: true });
           
            
            // Skip if empty
            if (!html.trim()) continue;

            html = removeSuffix(html, '</body></html>');
            console.log('Cleaned HTML chunk:', html);
            const fragment = range.createContextualFragment(html);

            

            // // Extract & recreate scripts
            // Array.from(fragment.querySelectorAll('script')).forEach(oldScript => {
            //     const newScript = document.createElement('script');
            //     newScript.textContent = oldScript.textContent;
            //     Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            //     document.head.appendChild(newScript); // Runs ASAP
            //     oldScript.remove();
            // });
            



            // Append cleaned nodes
           target.appendChild(fragment);
        }
    } catch (e) {
        console.error('Inline resume failed', e);
    }
});</script>`;
            finalHtml = finalHtml.replace(`</body>`, `${inlineScript}</body>`);
        }

        await write(fh, finalHtml)
        return new Response(finalHtml, {
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