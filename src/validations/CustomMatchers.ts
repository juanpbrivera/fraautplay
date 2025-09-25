// src/validations/CustomMatchers.ts
/**
 * Custom matchers para Playwright con tipado correcto:
 * - Tipo de IMPLEMENTACIÓN (recibe: this, received, expected)
 * - Tipo de USO (lo que ve el automatizador en expect(...))
 * - Idempotente y sin dependencias externas
 */

type MaybePromise<T> = T | Promise<T>;
type MatcherResult = { pass: boolean; message(): string };

// ────────────────────────── Tipos públicos (USO) ──────────────────────────
// Este es el que reexporta index.ts para el IDE del automatizador (opcional).
export type CustomMatchers = {
  toHaveUrlPart(expected: string | RegExp): MaybePromise<MatcherResult>;
  toMatchNormalizedText(expected: string | RegExp): MaybePromise<MatcherResult>;
  toBeVisibleWithin(timeout?: number): MaybePromise<MatcherResult>;
};

// ───────────────────── Tipos internos (IMPLEMENTACIÓN) ────────────────────
type MatcherImplFn = (
  this: any,
  received: any,
  expected?: any
) => MaybePromise<MatcherResult>;

type CustomMatchersImpl = {
  toHaveUrlPart: MatcherImplFn;
  toMatchNormalizedText: MatcherImplFn;
  toBeVisibleWithin: MatcherImplFn;
};

// ─────────────────────────── Helpers internos ─────────────────────────────
function normalizeText(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

async function toStringOrUrl(received: any): Promise<string> {
  if (received && typeof received.url === 'function') {
    try {
      const u = await received.url();
      return typeof u === 'string' ? u : String(u);
    } catch { /* ignore */ }
  }
  return typeof received === 'string' ? received : String(received);
}

async function getTextFromLocator(received: any): Promise<string> {
  if (received && typeof received.textContent === 'function') {
    const t = await received.textContent().catch(() => null);
    return normalizeText(t);
    }
  if (received && typeof received.innerText === 'function') {
    const t = await received.innerText().catch(() => null);
    return normalizeText(t);
  }
  return normalizeText(typeof received === 'string' ? received : String(received));
}

async function waitVisibleWithin(received: any, timeout = 2000): Promise<boolean> {
  if (received && typeof received.waitFor === 'function') {
    try {
      await received.waitFor({ state: 'visible', timeout });
      return true;
    } catch { return false; }
  }
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (received && typeof received.isVisible === 'function') {
      try {
        if (await received.isVisible()) return true;
      } catch { /* ignore */ }
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

// ───────────────────── Registrar en expect.extend ─────────────────────────
export function registerCustomMatchers(): void {
  const anyExpect: any = (globalThis as any)?.expect;
  if (!anyExpect || typeof anyExpect.extend !== 'function') return;

  const matchers: CustomMatchersImpl = {
    async toHaveUrlPart(this: any, received: any, expected: string | RegExp) {
      const isNot: boolean = !!this?.isNot;
      const url = await toStringOrUrl(received);
      const pass = typeof expected === 'string' ? url.includes(expected) : expected.test(url);
      const notStr = isNot ? ' not' : '';
      const expStr = typeof expected === 'string' ? `"${expected}"` : expected.toString();
      return {
        pass,
        message: () => `Expected URL "${url}"${notStr} to contain/match ${expStr}`,
      };
    },

    async toMatchNormalizedText(this: any, received: any, expected: string | RegExp) {
      const isNot: boolean = !!this?.isNot;
      const text = await getTextFromLocator(received);
      const pass =
        typeof expected === 'string'
          ? text === normalizeText(expected)
          : expected.test(text);
      const notStr = isNot ? ' not' : '';
      const expStr =
        typeof expected === 'string' ? `"${normalizeText(expected)}"` : expected.toString();
      return {
        pass,
        message: () => `Expected normalized text "${text}"${notStr} to equal/match ${expStr}`,
      };
    },

    async toBeVisibleWithin(this: any, received: any, timeout?: number) {
      const isNot: boolean = !!this?.isNot;
      const ok = await waitVisibleWithin(received, timeout ?? 2000);
      return {
        pass: ok,
        message: () =>
          `Expected locator to${isNot ? ' not' : ''} be visible within ${timeout ?? 2000}ms`,
      };
    },
  };

  anyExpect.extend(matchers as Record<string, MatcherImplFn>);
}

// ─────────── Augmentación de tipos para autocompletado en expect(...) ───────
declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      toHaveUrlPart(expected: string | RegExp): Promise<R>;
      toMatchNormalizedText(expected: string | RegExp): Promise<R>;
      toBeVisibleWithin(timeout?: number): Promise<R>;
    }
  }
}

// Mantener como módulo
export {};
