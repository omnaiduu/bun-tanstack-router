import { createRouter as createReactRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'
import { QueryClient } from '@tanstack/react-query'
export function createRouter() {

  const queryClient = new QueryClient()
  const router = createReactRouter({
    routeTree,
    context: {
      head: '',
      queryClient,
    },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
