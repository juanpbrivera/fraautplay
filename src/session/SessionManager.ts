// src/session/SessionManager.ts
import type { Browser, BrowserContext, Page } from 'playwright';
import { BrowserFactory } from '../core/browsers/BrowserFactory';
import type { BrowserOptions } from '../core/browsers/BrowserOptions';

export interface Session {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Orquesta el ciclo de vida de una sesión { browser, context, page }.
 * No reinterpreta headless: pasa las opciones tal cual a BrowserFactory.
 */
export class SessionManager {
  private static sessions = new Set<Session>();

  static async start(
    options: Partial<BrowserOptions> = {}
  ): Promise<Session> {
    // Lanzar browser respetando JSON/ENV
    const browser = await BrowserFactory.launch(options);

    // Crear contexto (aplicamos viewport si viene)
    const context = await browser.newContext({
      viewport: options.viewport ?? { width: 1280, height: 800 },
    });

    const page = await context.newPage();
    const session: Session = { browser, context, page };
    this.sessions.add(session);
    return session;
  }

  static async stop(session: Session | undefined): Promise<void> {
    if (!session) return;
    try { await session.page.close({ runBeforeUnload: true }); } catch {}
    try { await session.context.close(); } catch {}
    try { await session.browser.close(); } catch {}
    this.sessions.delete(session);
  }

  static async stopAll(): Promise<void> {
    const all = Array.from(this.sessions);
    this.sessions.clear();
    for (const s of all) {
      try { await s.page.close({ runBeforeUnload: true }); } catch {}
      try { await s.context.close(); } catch {}
      try { await s.browser.close(); } catch {}
    }
  }

  static async newPage(session: Session): Promise<Page> {
    return await session.context.newPage();
  }

  static getActiveSessions(): ReadonlyArray<Session> {
    return Array.from(this.sessions);
  }
}

export default SessionManager;
