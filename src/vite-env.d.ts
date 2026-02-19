/// <reference types="vite/client" />

interface Window {
  /** Admin secret captured from URL query param on /admin page */
  __ADMIN_SECRET__: string;
  /** Sage wallet connect function exposed for external access */
  _sageConnect: () => Promise<void>;
}
