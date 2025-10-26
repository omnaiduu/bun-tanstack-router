
import {
  RouterServer,
  createRequestHandler,
  renderRouterToStream,
  renderRouterToString
} from '@tanstack/react-router/ssr/server'
import { createRouter } from './router'
import { cache } from './cache'
import { resume } from 'react-dom/server.edge'
import { renderRouterToPPR } from './renderPrelude'
const isProd = process.env.NODE_ENV === 'production'


export type ResumeBody = {
  postponed: string
  path: string
}

export async function render({
  req,

  head,
}: {
  head: string
  req: Request

}) {


  // Create a request handler
  const handler = createRequestHandler({
    request: req,
    createRouter: () => {
      const router = createRouter()

      // Update each router instance with the head info from vite
      router.update({
        context: {
          ...router.options.context,
          head: head,
        },
      })
      return router
    },
  })

  // Let's use the default stream handler to create the response
  const pathname = new URL(req.url).pathname

  // Fast check for /resume/:id

  console.log('Handling request for:', pathname);



  if (pathname.startsWith('/resume')) {
    // Use the full pathname as the cache key (e.g. /resume or /resume/123)


    // Strip the /resume prefix to get the original pathname used as the cache key




    const regBody = await req.json() as ResumeBody;
    const postponed = JSON.parse(regBody.postponed);
    const originalPath = regBody.path;
    console.log('Resuming for original path:', originalPath);
    if (postponed) {
      const baseUrl = new URL(req.url);
      const originalUrl = new URL(originalPath, `${baseUrl.protocol}//${baseUrl.host}`);

      const resumeHandler = createRequestHandler({
        request: new Request(originalUrl.toString(), {
          method: req.method,
          headers: req.headers,
        }),
        createRouter: () => {
          const r = createRouter();
          // keep same head/context as main router
          r.update({
            context: {
              ...r.options.context,
              head: r.options.context.head,
            },
          });
          return r;
        },
      });

      // Use the resumeHandler to obtain a router instance matching the original path
      return await resumeHandler(async ({ request: _req, responseHeaders: _h, router: resumeRouter }) => {
        try {
          const stream = await resume(<RouterServer router={resumeRouter} />, structuredClone(postponed), {
            signal: req.signal,
            onError: (error) => {
              console.error('Error occurred while resuming:', error);
            },
          });
          return new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        } catch (err) {
          console.error('Resume render failed:', err);
          return new Response('Resume failed', { status: 500 });
        }
      });
    }


  }






  // Stream the response body for all other routes
  return handler(async ({ request, responseHeaders, router }) => {
    console.log(isProd ? 'Production render' : 'Development render')



    if (isProd) {

      return renderRouterToPPR({
        request,
        router,
        responseHeaders,
        children: <RouterServer router={router} />,
      })
    } else {

      return renderRouterToStream({
        request,
        responseHeaders,
        router,
        children: <RouterServer router={router} />,
      })
    }




  })
}
