// src/elements/Locators.ts
/**
 * API v2 de selectores + adaptador a Playwright.
 * Builders: css(), xpath(), role()
 * Adaptador: getLocator(page, locatorLike) -> Playwright Locator
 *
 * Compatibilidad:
 *  - string (css/xpath)
 *  - builders v2 (css/xpath/role)
 *  - ElementLocator (tipo interno de tu framework: acepta .selector/.css/.xpath/.role/.name/.description)
 *  - Playwright Locator (lo devuelve tal cual)
 */

export type RoleName = string | RegExp;

export type Locator =
  | { type: 'css'; value: string }
  | { type: 'xpath'; value: string }
  | { type: 'role'; role: string; name?: RoleName };

/** Builder público v2 */
export const Locators = {
  css(selector: string): Locator {
    return { type: 'css', value: selector };
  },

  xpath(expr: string): Locator {
    return { type: 'xpath', value: expr };
  },

  role(role: string, opts?: { name?: RoleName }): Locator {
    return { type: 'role', role, name: opts?.name };
  },

  /**
   * Adaptador tolerante para cualquier "locator-like".
   * - string: css or xpath
   * - builders v2: {type:'css'|'xpath'|'role', ...}
   * - ElementLocator (interno): { selector? | css? | xpath? | role? , name? }
   * - Playwright Locator: objeto con métodos de Locator (click, isVisible, etc.)
   */
  getLocator(page: any, locator: any): any {
    // 1) Si ya es un Playwright Locator, lo devolvemos tal cual
    if (locator && typeof locator === 'object') {
      const looksLikePWLocator =
        typeof locator.click === 'function' ||
        typeof locator.isVisible === 'function' ||
        typeof locator.locator === 'function';
      if (looksLikePWLocator) return locator;
    }

    // 2) string -> css o xpath
    if (typeof locator === 'string') {
      const s = locator.trim();
      if (s.startsWith('xpath=')) return page.locator(s);
      if (s.startsWith('//') || s.startsWith('(')) return page.locator(`xpath=${s}`);
      return page.locator(s);
    }

    // 3) Builder v2
    if (locator && typeof locator === 'object' && typeof locator.type === 'string') {
      switch (locator.type) {
        case 'css':
          return page.locator(locator.value);
        case 'xpath':
          return page.locator(`xpath=${locator.value}`);
        case 'role':
          return page.getByRole(locator.role as any, locator.name ? { name: locator.name } : undefined);
      }
    }

    // 4) Compat: ElementLocator (interno de tu framework)
    //    Intentamos extraer en este orden: role/name, xpath, css, selector
    if (locator && typeof locator === 'object') {
      const role = (locator as any).role;
      const name = (locator as any).name ?? (locator as any).ariaName ?? (locator as any).text;
      const css = (locator as any).css ?? (locator as any).selectorCss;
      const xpath = (locator as any).xpath ?? (locator as any).selectorXpath;
      const selector = (locator as any).selector ?? (locator as any).value;

      if (role) {
        return page.getByRole(role as any, name ? { name } : undefined);
      }
      if (typeof xpath === 'string') {
        return page.locator(`xpath=${xpath}`);
      }
      if (typeof css === 'string') {
        return page.locator(css);
      }
      if (typeof selector === 'string') {
        const s = selector.trim();
        if (s.startsWith('xpath=')) return page.locator(s);
        if (s.startsWith('//') || s.startsWith('(')) return page.locator(`xpath=${s}`);
        return page.locator(s);
      }
    }

    // 5) Fallback robusto
    return page.locator(String(locator));
  },
};

export type LocatorBuilder = typeof Locators;
