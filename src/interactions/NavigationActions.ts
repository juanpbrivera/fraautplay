// src/interactions/NavigationActions.ts
import type { Page, Response } from 'playwright';
import type { NavigationOptions } from '../types/FrameworkTypes';
import { LoggerFactory } from '../core/logging/LoggerFactory';
import { WaitStrategies } from '../elements/WaitStrategies';

const DEFAULT_WAIT: Exclude<NonNullable<NavigationOptions>['waitUntil'], undefined> = 'domcontentloaded';
const DEFAULT_TIMEOUT = 30_000;

/**
 * Acciones de navegación para aplicaciones web (instanciable)
 * - DX mejorada: new NavigationActions(page).goto(...)
 * - Compatibilidad: conserva métodos estáticos delegando a la instancia
 */
export class NavigationActions {
  private static logger = LoggerFactory.getLogger('NavigationActions');

  constructor(private readonly page: Page) {}

  /** Mezcla opciones con defaults coherentes */
  private withDefaults(opts?: NavigationOptions) {
    return {
      waitUntil: opts?.waitUntil ?? DEFAULT_WAIT,
      timeout: opts?.timeout ?? DEFAULT_TIMEOUT,
    } as const;
  }

  /** Navega a una URL */
  async goto(url: string, options?: NavigationOptions): Promise<Response | null> {
    try {
      NavigationActions.logger.info('Navigating to URL', { url });
      const res = await this.page.goto(url, this.withDefaults(options));
      NavigationActions.logger.info('Navigation completed', { url, status: res?.status() });
      return res;
    } catch (error) {
      NavigationActions.logger.error('Navigation failed', error as Error, { url });
      throw error;
    }
  }

  /** Atrás en historial */
  async goBack(options?: NavigationOptions): Promise<Response | null> {
    try {
      NavigationActions.logger.debug('Navigating back');
      const res = await this.page.goBack(this.withDefaults(options));
      NavigationActions.logger.info('Navigated back', { url: this.page.url() });
      return res;
    } catch (error) {
      NavigationActions.logger.error('Failed to navigate back', error as Error);
      throw error;
    }
  }

  /** Adelante en historial */
  async goForward(options?: NavigationOptions): Promise<Response | null> {
    try {
      NavigationActions.logger.debug('Navigating forward');
      const res = await this.page.goForward(this.withDefaults(options));
      NavigationActions.logger.info('Navigated forward', { url: this.page.url() });
      return res;
    } catch (error) {
      NavigationActions.logger.error('Failed to navigate forward', error as Error);
      throw error;
    }
  }

  /** Recarga página */
  async reload(options?: NavigationOptions): Promise<Response | null> {
    try {
      NavigationActions.logger.debug('Reloading page');
      const res = await this.page.reload(this.withDefaults(options));
      NavigationActions.logger.info('Page reloaded', { url: this.page.url() });
      return res;
    } catch (error) {
      NavigationActions.logger.error('Failed to reload page', error as Error);
      throw error;
    }
  }

  /** Espera a que ocurra una navegación disparada por `action()` */
  async waitForNavigation(
    action: () => Promise<void>,
    options?: NavigationOptions
  ): Promise<Response | null> {
    try {
      NavigationActions.logger.debug('Waiting for navigation');
      const [res] = await Promise.all([
        this.page.waitForNavigation(this.withDefaults(options)),
        action(),
      ]);
      NavigationActions.logger.info('Navigation detected', { url: this.page.url(), status: res?.status() });
      return res;
    } catch (error) {
      NavigationActions.logger.error('Navigation wait failed', error as Error);
      throw error;
    }
  }

  /** Espera a que la URL cambie (o haga match con `expectedUrl`) */
  async waitForURLChange(expectedUrl?: string | RegExp, options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const from = this.page.url();
    NavigationActions.logger.debug('Waiting for URL change', { currentUrl: from, expectedUrl });

    try {
      await this.page.waitForURL(expectedUrl ?? /.*/, { timeout });
      NavigationActions.logger.info('URL changed', { from, to: this.page.url() });
    } catch (error) {
      NavigationActions.logger.error('URL change timeout', error as Error, {
        currentUrl: this.page.url(),
        expectedUrl,
      });
      throw error;
    }
  }

  /** Abre nueva pestaña/ventana (y navega si se pasa `url`) */
  async openNewTab(url?: string): Promise<Page> {
    try {
      NavigationActions.logger.debug('Opening new tab', { url });
      const newPage = await this.page.context().newPage();
      if (url) await newPage.goto(url);
      NavigationActions.logger.info('New tab opened', { url: url ?? 'about:blank' });
      return newPage;
    } catch (error) {
      NavigationActions.logger.error('Failed to open new tab', error as Error);
      throw error;
    }
  }

  /** Cierra la pestaña actual */
  async closeTab(): Promise<void> {
    try {
      NavigationActions.logger.debug('Closing tab', { url: this.page.url() });
      await this.page.close();
      NavigationActions.logger.info('Tab closed');
    } catch (error) {
      NavigationActions.logger.error('Failed to close tab', error as Error);
      throw error;
    }
  }

  /** Cambia a pestaña por índice (0-based) */
  async switchToTab(index: number): Promise<Page> {
    try {
      const pages = this.page.context().pages();
      if (index < 0 || index >= pages.length) {
        throw new Error(`Tab index ${index} out of range (0-${pages.length - 1})`);
      }
      const target = pages[index];
      await target.bringToFront();
      NavigationActions.logger.info('Switched to tab', { index, url: target.url() });
      return target;
    } catch (error) {
      NavigationActions.logger.error('Failed to switch tab', error as Error, { index });
      throw error;
    }
  }

  /** Todas las pestañas del contexto */
  getAllTabs(): Page[] {
    return this.page.context().pages();
  }

  /** Manejo one-shot de diálogo (alert/confirm/prompt) */
  async handleDialog(action: 'accept' | 'dismiss', promptText?: string): Promise<void> {
    try {
      NavigationActions.logger.debug('Setting up dialog handler', { action });
      this.page.once('dialog', async dialog => {
        NavigationActions.logger.info('Dialog detected', { type: dialog.type(), message: dialog.message() });
        if (action === 'accept') await dialog.accept(promptText);
        else await dialog.dismiss();
      });
    } catch (error) {
      NavigationActions.logger.error('Failed to handle dialog', error as Error);
      throw error;
    }
  }

  /** Scroll a posición específica */
  async scrollTo(position: 'top' | 'bottom' | 'center' | { x: number; y: number }): Promise<void> {
    try {
      NavigationActions.logger.debug('Scrolling to position', { position });
      if (typeof position === 'string') {
        switch (position) {
          case 'top':
            await this.page.evaluate(() => window.scrollTo(0, 0));
            break;
          case 'bottom':
            await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            break;
          case 'center':
            await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
            break;
        }
      } else {
        await this.page.evaluate((pos) => window.scrollTo(pos.x, pos.y), position);
      }
      NavigationActions.logger.debug('Scrolled to position');
    } catch (error) {
      NavigationActions.logger.error('Failed to scroll', error as Error);
      throw error;
    }
  }

  /** URL actual */
  getCurrentURL(): string {
    return this.page.url();
  }

  /** Título actual */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /** ¿La URL actual coincide con `expectedUrl`? */
  isAtURL(expectedUrl: string | RegExp): boolean {
    const current = this.page.url();
    return typeof expectedUrl === 'string'
      ? (current === expectedUrl || current.includes(expectedUrl))
      : expectedUrl.test(current);
  }

  /** Espera a que la página esté cargada (delegado) */
  async waitForPageLoad(options?: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
  }): Promise<void> {
    await WaitStrategies.waitForPageLoad(this.page, options);
  }

  /** Simula back (útil en SPA) */
  async pressBack(): Promise<void> {
    try {
      NavigationActions.logger.debug('Pressing browser back button');
      await this.page.keyboard.press('Alt+Left');
      await WaitStrategies.sleep(500);
    } catch (error) {
      NavigationActions.logger.error('Failed to press back', error as Error);
      throw error;
    }
  }

  /** Navega al home rápidamente */
  async pressHome(homeUrl: string): Promise<void> {
    try {
      NavigationActions.logger.debug('Navigating to home', { homeUrl });
      await this.goto(homeUrl);
    } catch (error) {
      NavigationActions.logger.error('Failed to navigate home', error as Error);
      throw error;
    }
  }

  /* ======================================================================
   * COMPATIBILIDAD: API estática antigua → delega a instancia
   * ====================================================================== */
  static goto(page: Page, url: string, options?: NavigationOptions) {
    return new NavigationActions(page).goto(url, options);
  }
  static goBack(page: Page, options?: NavigationOptions) {
    return new NavigationActions(page).goBack(options);
  }
  static goForward(page: Page, options?: NavigationOptions) {
    return new NavigationActions(page).goForward(options);
  }
  static reload(page: Page, options?: NavigationOptions) {
    return new NavigationActions(page).reload(options);
  }
  static waitForNavigation(page: Page, action: () => Promise<void>, options?: NavigationOptions) {
    return new NavigationActions(page).waitForNavigation(action, options);
  }
  static waitForURLChange(page: Page, expectedUrl?: string | RegExp, options?: { timeout?: number }) {
    return new NavigationActions(page).waitForURLChange(expectedUrl, options);
  }
  static openNewTab(page: Page, url?: string) {
    return new NavigationActions(page).openNewTab(url);
  }
  static closeTab(page: Page) {
    return new NavigationActions(page).closeTab();
  }
  static switchToTab(page: Page, index: number) {
    return new NavigationActions(page).switchToTab(index);
  }
  static getAllTabs(page: Page) {
    return new NavigationActions(page).getAllTabs();
  }
  static handleDialog(page: Page, action: 'accept' | 'dismiss', promptText?: string) {
    return new NavigationActions(page).handleDialog(action, promptText);
  }
  static scrollTo(page: Page, position: 'top' | 'bottom' | 'center' | { x: number; y: number }) {
    return new NavigationActions(page).scrollTo(position);
  }
  static getCurrentURL(page: Page) {
    return new NavigationActions(page).getCurrentURL();
  }
  static getTitle(page: Page) {
    return new NavigationActions(page).getTitle();
  }
  static isAtURL(page: Page, expectedUrl: string | RegExp) {
    return new NavigationActions(page).isAtURL(expectedUrl);
  }
  static waitForPageLoad(page: Page, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number }) {
    return new NavigationActions(page).waitForPageLoad(options);
  }
  static pressBack(page: Page) {
    return new NavigationActions(page).pressBack();
  }
  static pressHome(page: Page, homeUrl: string) {
    return new NavigationActions(page).pressHome(homeUrl);
  }
}
