
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

  // Stream the response body for all other routes
  return handler(async ({ request, responseHeaders, router }) => {
    console.log(isProd ? 'Production render' : 'Development render')


    if (pathname === '/resume' || pathname.startsWith('/resume/')) {
      // Use the full pathname as the cache key (e.g. /resume or /resume/123)

      const cacheKey = pathname;
      // Strip the /resume prefix to get the originalpathname used as the cache key
      const originalPath = cacheKey.replace(/^\/resume/, '') || '/';
      const postponed = cache.get(originalPath);
      console.log('Resuming from cache key:', cacheKey, 'Original path:', originalPath, 'Postponed found:', !!postponed);
      if (postponed) {
        const baseUrl = new URL(request.url);
        const originalUrl = new URL(originalPath, `${baseUrl.protocol}//${baseUrl.host}`);

        const resumeHandler = createRequestHandler({
          request: new Request(originalUrl.toString(), {
            method: request.method,
            headers: request.headers,
          }),
          createRouter: () => {
            const r = createRouter();
            // keep same head/context as main router
            r.update({
              context: {
                ...r.options.context,
                head: router.options.context.head,
              },
            });
            return r;
          },
        });

        // Use the resumeHandler to obtain a router instance matching the original path
        return await resumeHandler(async ({ request: _req, responseHeaders: _h, router: resumeRouter }) => {
          try {
            const stream = await resume(<RouterServer router={resumeRouter} />, structuredClone(postponed), {
              nonce: resumeRouter.options.ssr?.nonce,
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
      return new Response('No postponed data found for resumption.', { status: 404 });
    }

    if (isProd) {
      console.log('Production render')
      return renderRouterToPPR({
        request,
        router,
        responseHeaders,
        children: <RouterServer router={router} />,
      })
    } else {
      console.log('Development render')
      return renderRouterToStream({
        request,
        responseHeaders,
        router,
        children: <RouterServer router={router} />,
      })
    }




  })
}
