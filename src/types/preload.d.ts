import type { KryptApi } from '../../electron/preload';

declare global {
  interface Window {
    krypt: KryptApi;
  }
}

export {};
