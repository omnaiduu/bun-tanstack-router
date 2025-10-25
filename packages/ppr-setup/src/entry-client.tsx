import { hydrateRoot } from 'react-dom/client'
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { createRouter } from './router'

// Simplified client entry—no resume logic needed (handled by inline server script)
const router = createRouter();
hydrateRoot(document, <RouterClient router={router} />);

if (import.meta.hot) {
  import.meta.hot.accept();
}