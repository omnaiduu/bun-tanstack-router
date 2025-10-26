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

        if (await fh.exists()) {
            console.log('Serving cached HTML for:', pathname);
            const existingContent = fh.stream();
            return new Response(existingContent, {
                status: 200,
                headers: responseHeaders
            });
        }
        const abortController = new AbortController();
        const prePromise = prerender(children, {
            signal: abortController.signal,
            onError: (error) => {
                console.error('Prelude render error:', error);
            }
        });
        setTimeout(() => {
            abortController.abort();
        });
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


            const inlineScript = `<script>(async function(){
                try{
                    var url = '${"/resume" + postponedKey}';
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