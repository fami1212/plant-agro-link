/**
 * Cache local (localStorage) des transactions escrow et de leurs étapes,
 * afin d'afficher la progression et le % débloqué même hors ligne ou avec
 * une connectivité intermittente.
 */

const PREFIX = "plantera_escrow_cache_v1:";

export interface EscrowSnapshot<T = any> {
  data: T;
  cachedAt: string;
}

function key(scope: string) {
  return `${PREFIX}${scope}`;
}

export function cacheEscrow<T>(scope: string, data: T) {
  try {
    localStorage.setItem(
      key(scope),
      JSON.stringify({ data, cachedAt: new Date().toISOString() })
    );
  } catch {
    /* quota */
  }
}

export function readEscrowCache<T>(scope: string): EscrowSnapshot<T> | null {
  try {
    const raw = localStorage.getItem(key(scope));
    return raw ? (JSON.parse(raw) as EscrowSnapshot<T>) : null;
  } catch {
    return null;
  }
}

export const escrowScopes = {
  list: (userId: string) => `tx-list:${userId}`,
  timeline: (txId: string) => `tx-timeline:${txId}`,
};