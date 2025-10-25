import { pipeline } from 'node:stream/promises'
import {
  RouterServer,
  createRequestHandler,
  renderRouterToStream,
  renderRouterToString,
} from '@tanstack/react-router/ssr/server'
import { createRouter } from './router'


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




  // Stream the response body
  return handler(({ request, responseHeaders, router }) =>
    renderRouterToStream({
      request,
      responseHeaders,
      router,
      children: <RouterServer router={router} />,
    }),
  )
}
