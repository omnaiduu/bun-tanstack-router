
import {
  RouterServer,
  createRequestHandler,

} from '@tanstack/react-router/ssr/server'
import { createRouter } from './router'

import { renderRouterToPPR } from './renderPrelude'
import { resumeStream } from './resume'
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

  const pathname = new URL(req.url).pathname

  console.log('Handling request for:', pathname);
  if (pathname.startsWith('/resume')) {
    return resumeStream({
      request: req,
      
    })
  } else {
    const handler = createRequestHandler({
      request: req,
      createRouter: () => {
        const router = createRouter()
  
        // Update each router instance with the head info from vite
        router.update({
          context: {
            ...router.options.context,
            head: head
            ,
          },
        })
        return router
      },
    })
  
    return handler(async ({ request, responseHeaders, router }) => {
      console.log(isProd ? 'Production render' : 'Development render')
  
  
      
    
  
        return renderRouterToPPR({
          request,
          router,
          responseHeaders,
          children: <RouterServer router={router} />,
        })
      
  
  
  
  
  
  
    })

  }

 
}
