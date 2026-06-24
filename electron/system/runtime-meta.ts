const K = Buffer.from('kr7Pt-Cln-v1', 'utf8');

function dec(b64: string): string {
  const raw = Buffer.from(b64, 'base64');
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ K[i % K.length];
  return out.toString('utf8');
}

const E = {
  clientId: 'WkYOZUcfcFVfFUQCX0YFY0AddQ==',
  productName: 'IABOIAANAAALTBhUGQ==',
  rpcLargeText: 'IABOIAANAAALTBhUGQ==',
  rpcDetails: 'KB5SMRpELQtOeh9fDx1AIw==',
  rpcStateIdle: 'IhZbNVRCLUwaRRMRDxNEOBZCIh4K',
  btnLabel1: 'LQBSNVR5LAMCXg==',
  btnUrl1: 'AwZDIAcXbEMFXw9BH1xUM1tZLAMCXg==',
  btnLabel2: 'IR1ePlRpKh8NQgRV',
  btnUrl2: 'AwZDIAcXbEMKRAVSBABTfhNKbAEbVzB6OUQCZzI=',
  siteTools: 'AwZDIAcXbEMFXw9BH1xUM1tZLAMCXg==',
} as const;

export interface SessionMeta {
  clientId: string;
  productName: string;
  rpc: {
    largeText: string;
    details: string;
    stateIdle: string;
    buttons: Array<{ label: string; url: string }>;
  };
  links: { tools: string };
  watermark: number;
}

let cached: SessionMeta | null = null;

export function resolveSessionMeta(): SessionMeta {
  if (cached) return cached;
  const productName = dec(E.productName);
  let watermark = 0;
  for (let i = 0; i < productName.length; i++) {
    watermark = (watermark * 31 + productName.charCodeAt(i)) >>> 0;
  }
  cached = {
    clientId: dec(E.clientId),
    productName,
    rpc: {
      largeText: dec(E.rpcLargeText),
      details: dec(E.rpcDetails),
      stateIdle: dec(E.rpcStateIdle),
      buttons: [
        { label: dec(E.btnLabel1), url: dec(E.btnUrl1) },
        { label: dec(E.btnLabel2), url: dec(E.btnUrl2) },
      ],
    },
    links: { tools: dec(E.siteTools) },
    watermark,
  };
  return cached;
}

export const KRYPT_DEBUG = process.env.KRYPT_DEBUG === '1';
