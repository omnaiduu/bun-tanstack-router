import { hydrateRoot } from 'react-dom/client'
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { createRouter } from './router'

async function maybeResumeThenHydrate() {
  // If server indicated a resume URL via meta tag, fetch and stream it into the document first
  const meta = document.querySelector('meta[name="ppr-resume"]') as HTMLMetaElement | null;
  if (meta && meta.content) {
    const url = meta.content;
    try {
      const res = await fetch(url);
      // Try to find the server-inserted placeholder element (id starting with "B:") so we can insert streamed S: nodes next to it.
      const all = Array.from(document.querySelectorAll('[id]')) as Element[];
      const placeholder = all.find((el) => el.id && el.id.startsWith('B:')) as Element | undefined;

      // We'll stream into a fragment and then insert that fragment before the placeholder (if found),
      // so the streamed <div id="S:..."> nodes are present in the document where the server expects them.
      const fragment = document.createDocumentFragment();

      if (!res.body) {
        const text = await res.text();
        const temp = document.createElement('div');
        temp.innerHTML = text;
        while (temp.firstChild) fragment.appendChild(temp.firstChild);
      } else {
        const decoder = new TextDecoder();
        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const html = decoder.decode(value);
          const temp = document.createElement('div');
          temp.innerHTML = html;
          while (temp.firstChild) fragment.appendChild(temp.firstChild);
        }
      }

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(fragment, placeholder.nextSibling);
      } else {
        // fallback: append to body
        document.body.appendChild(fragment as unknown as Node);
      }

      // After the streamed S: nodes are inserted, the stream's embedded script should call $RC to swap in content.
      // Now hydrate the whole document so the router attaches to the resolved DOM.
      const router = createRouter();
      hydrateRoot(document, <RouterClient router={router} />);
      return;
    } catch (e) {
      console.error('Resume fetch failed:', e);
    }
  }

  const router = createRouter();
  // No resume meta, hydrate whole document
  hydrateRoot(document, <RouterClient router={router} />)
}

maybeResumeThenHydrate()

if (import.meta.hot) {
  import.meta.hot.accept()
}