import { cache } from "./cache";
import { prerender, type PrerenderResult } from "react-dom/static";

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
        const prePromise = prerender(children, {
            signal: abortController.signal,

        });
        setTimeout(() => {
            abortController.abort();
        }, 10);
        const { prelude, postponed } = await prePromise;


        const pathname = new URL(request.url).pathname;
        const [html, _] = await Promise.all([
            new Response(prelude).text(),
            (async () => {
                if (postponed) {
                    cache.set(pathname, postponed);
                }
                router.serverSsr.setRenderFinished();
            })()
        ]);

        const injectedHtml = await Promise.all(router.serverSsr.injectedHtml).then(
            (htmls) => htmls.join("")
        );

        let finalHtml = html.replace(`</body>`, `${injectedHtml}</body>`);

        if (postponed) {
            const serverPath = new URL(request.url).pathname || '/';

            const inlineScript = `<script>(async function(){
                try{
                    var url = '/resume' + '${serverPath}';
                    var res = await fetch(url);
                    if(!res.ok) return;
                    var fullHtml = await res.text();
                    if(!fullHtml.trim()) return;
                    var cleanHtml = fullHtml.replace(/<\\/body>[\\s\\S]*<\\/html>$/i,'').trim();
                    var range = document.createRange();
                    range.selectNode(document.body);
                    var fragment = range.createContextualFragment(cleanHtml);
                    var placeholder = document.querySelector('[id^="B:"]');
                    if (placeholder) {
                        placeholder.after(fragment);
                    } else {
                        document.body.appendChild(fragment);
                    }
                }catch(e){console.error('Inline resume failed',e)}
            })();</script>`;

            finalHtml = finalHtml.replace(`</body>`, `${inlineScript}</body>`);
        }

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