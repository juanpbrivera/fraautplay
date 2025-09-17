/**
 * 🚀 NavigationActions.ts
 * 
 * Gestiona todas las acciones de navegación en la aplicación web.
 * Incluye navegación por URL, historial, frames, tabs y ventanas.
 * 
 * ¿Qué acciones de navegación maneja?
 * - Navegar a URLs
 * - Ir hacia atrás/adelante en el historial
 * - Refrescar la página
 * - Manejar múltiples tabs/ventanas
 * - Trabajar con iframes
 * - Interceptar navegaciones
 * 
 * Nota: Adaptado para WEB (no mobile como tap(), swipe(), etc.)
 */

import { Page, BrowserContext, Response, Frame } from '@playwright/test';
import { 
  NavigationOptions,
  ActionResult,
  FrameworkError,
  ErrorCode 
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../core/logging/LoggerFactory';
import { WaitManager } from '../elements/WaitStrategies';

/**
 * 📋 Opciones avanzadas de navegación
 */
export interface AdvancedNavigationOptions extends NavigationOptions {
  waitForSelector?: string;        // Esperar a que aparezca un selector
  waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  screenshot?: boolean;             // Tomar screenshot después de navegar
  validateURL?: string | RegExp;   // Validar que la URL coincida
  retries?: number;                 // Reintentos si falla
  headers?: Record<string, string>; // Headers adicionales
}

/**
 * 📋 Información de una pestaña/ventana
 */
export interface TabInfo {
  page: Page;
  title: string;
  url: string;
  index: number;
}

/**
 * 🚀 Clase NavigationActions - Gestiona navegación web
 */
export class NavigationActions {
  private page: Page;
  private context: BrowserContext;
  private logger = LoggerFactory.forComponent(ComponentType.NAVIGATION);
  private waitManager: WaitManager;
  private navigationHistory: string[] = [];
  private tabs: Map<string, Page> = new Map();
  
  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.waitManager = new WaitManager(page);
    
    // Registrar la página principal
    this.tabs.set('main', page);
    
    // Escuchar eventos de navegación
    this.setupNavigationListeners();
  }
  
  /**
   * 🌐 Navegar a una URL
   */
  public async goto(url: string, options?: AdvancedNavigationOptions): Promise<ActionResult> {
    this.logger.start(`Navegando a: ${url}`);
    const startTime = Date.now();
    
    try {
      // Agregar headers si se especificaron
      if (options?.headers) {
        await this.page.setExtraHTTPHeaders(options.headers);
      }
      
      // Navegar con reintentos
      let lastError: Error | null = null;
      const retries = options?.retries || 0;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await this.page.goto(url, {
            timeout: options?.timeout || 30000,
            waitUntil: options?.waitForLoadState || options?.waitUntil || 'load',
            referer: options?.referer
          });
          
          // Verificar respuesta
          if (response && !response.ok()) {
            throw new Error(`HTTP ${response.status()} - ${response.statusText()}`);
          }
          
          // Esperar selector específico si se especificó
          if (options?.waitForSelector) {
            await this.page.waitForSelector(options.waitForSelector, {
              timeout: options.timeout
            });
          }
          
          // Validar URL si se especificó
          if (options?.validateURL) {
            const currentURL = this.page.url();
            const isValid = typeof options.validateURL === 'string' 
              ? currentURL.includes(options.validateURL)
              : options.validateURL.test(currentURL);
              
            if (!isValid) {
              throw new Error(`URL no coincide. Esperada: ${options.validateURL}, Actual: ${currentURL}`);
            }
          }
          
          // Agregar al historial
          this.navigationHistory.push(url);
          
          const result: ActionResult = {
            success: true,
            data: {
              url: this.page.url(),
              status: response?.status(),
              ok: response?.ok()
            },
            duration: Date.now() - startTime,
            timestamp: new Date(),
            details: `Navegación exitosa a ${url}`
          };
          
          // Screenshot si se solicitó
          if (options?.screenshot) {
            const screenshotPath = `navigation-${Date.now()}.png`;
            await this.page.screenshot({ path: screenshotPath });
            result.screenshot = screenshotPath;
          }
          
          this.logger.success('Navegación completada', result);
          return result;
          
        } catch (error) {
          lastError = error as Error;
          if (attempt < retries) {
            this.logger.warn(`Intento ${attempt + 1} falló, reintentando...`, { error: lastError.message });
            await this.page.waitForTimeout(1000 * (attempt + 1)); // Backoff
          }
        }
      }
      
      throw lastError || new Error('Navegación falló');
      
    } catch (error) {
      const result: ActionResult = {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
      
      this.logger.fail('Navegación falló', error as Error, result);
      throw new FrameworkError(
        `No se pudo navegar a ${url}: ${(error as Error).message}`,
        ErrorCode.NAVIGATION_FAILED,
        { url, options }
      );
    }
  }
  
  /**
   * 🔙 Ir hacia atrás en el historial
   */
  public async goBack(options?: NavigationOptions): Promise<ActionResult> {
    this.logger.debug('Navegando hacia atrás');
    
    try {
      const response = await this.page.goBack({
        timeout: options?.timeout,
        waitUntil: options?.waitUntil || 'load'
      });
      
      return {
        success: true,
        data: { url: this.page.url() },
        timestamp: new Date(),
        details: 'Navegación hacia atrás exitosa'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'No se pudo navegar hacia atrás',
        ErrorCode.NAVIGATION_FAILED,
        { error }
      );
    }
  }
  
  /**
   * 🔜 Ir hacia adelante en el historial
   */
  public async goForward(options?: NavigationOptions): Promise<ActionResult> {
    this.logger.debug('Navegando hacia adelante');
    
    try {
      const response = await this.page.goForward({
        timeout: options?.timeout,
        waitUntil: options?.waitUntil || 'load'
      });
      
      return {
        success: true,
        data: { url: this.page.url() },
        timestamp: new Date(),
        details: 'Navegación hacia adelante exitosa'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'No se pudo navegar hacia adelante',
        ErrorCode.NAVIGATION_FAILED,
        { error }
      );
    }
  }
  
  /**
   * 🔄 Recargar la página
   */
  public async reload(options?: NavigationOptions): Promise<ActionResult> {
    this.logger.debug('Recargando página');
    
    try {
      const response = await this.page.reload({
        timeout: options?.timeout,
        waitUntil: options?.waitUntil || 'load'
      });
      
      return {
        success: true,
        data: { url: this.page.url() },
        timestamp: new Date(),
        details: 'Página recargada exitosamente'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'No se pudo recargar la página',
        ErrorCode.NAVIGATION_FAILED,
        { error }
      );
    }
  }
  
  /**
   * 📑 Abrir nueva pestaña/ventana
   */
  public async openNewTab(url?: string, name?: string): Promise<Page> {
    this.logger.debug(`Abriendo nueva pestaña${url ? `: ${url}` : ''}`);
    
    const newPage = await this.context.newPage();
    const tabName = name || `tab-${Date.now()}`;
    this.tabs.set(tabName, newPage);
    
    if (url) {
      await newPage.goto(url);
    }
    
    this.logger.info(`Nueva pestaña abierta: ${tabName}`);
    return newPage;
  }
  
  /**
   * 🔄 Cambiar a otra pestaña
   */
  public async switchToTab(identifier: string | number | Page): Promise<void> {
    this.logger.debug('Cambiando de pestaña');
    
    let targetPage: Page | undefined;
    
    if (typeof identifier === 'string') {
      // Buscar por nombre
      targetPage = this.tabs.get(identifier);
    } else if (typeof identifier === 'number') {
      // Buscar por índice
      const pages = this.context.pages();
      targetPage = pages[identifier];
    } else {
      // Es una página directamente
      targetPage = identifier;
    }
    
    if (!targetPage) {
      throw new FrameworkError(
        'No se encontró la pestaña especificada',
        ErrorCode.BROWSER_ERROR,
        { identifier }
      );
    }
    
    this.page = targetPage;
    await targetPage.bringToFront();
    
    this.logger.info(`Cambiado a pestaña: ${targetPage.url()}`);
  }
  
  /**
   * ❌ Cerrar pestaña
   */
  public async closeTab(identifier?: string | number | Page): Promise<void> {
    this.logger.debug('Cerrando pestaña');
    
    let targetPage: Page | undefined;
    
    if (!identifier) {
      // Cerrar pestaña actual
      targetPage = this.page;
    } else if (typeof identifier === 'string') {
      targetPage = this.tabs.get(identifier);
    } else if (typeof identifier === 'number') {
      const pages = this.context.pages();
      targetPage = pages[identifier];
    } else {
      targetPage = identifier;
    }
    
    if (targetPage && !targetPage.isClosed()) {
      await targetPage.close();
      
      // Eliminar del registro
      for (const [name, page] of this.tabs.entries()) {
        if (page === targetPage) {
          this.tabs.delete(name);
          break;
        }
      }
      
      // Si cerramos la pestaña actual, cambiar a la primera disponible
      if (targetPage === this.page) {
        const pages = this.context.pages();
        if (pages.length > 0) {
          this.page = pages[0];
        }
      }
    }
    
    this.logger.info('Pestaña cerrada');
  }
  
  /**
   * 📋 Obtener información de todas las pestañas
   */
  public async getAllTabs(): Promise<TabInfo[]> {
    const pages = this.context.pages();
    const tabsInfo: TabInfo[] = [];
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      tabsInfo.push({
        page,
        title: await page.title(),
        url: page.url(),
        index: i
      });
    }
    
    return tabsInfo;
  }
  
  /**
   * 🖼️ Trabajar con iframe
   */
  public async switchToFrame(selector: string): Promise<Frame> {
    this.logger.debug(`Cambiando a iframe: ${selector}`);
    
    const frame = this.page.frame(selector) || 
                  await this.page.waitForSelector(selector).then(el => el?.contentFrame());
    
    if (!frame) {
      throw new FrameworkError(
        `No se encontró el iframe: ${selector}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { selector }
      );
    }
    
    this.logger.info('Cambiado a iframe');
    return frame;
  }
  
  /**
   * 🔙 Salir del iframe actual
   */
  public async switchToMainFrame(): Promise<void> {
    // En Playwright, simplemente usamos this.page para el frame principal
    this.logger.debug('Volviendo al frame principal');
  }
  
  /**
   * 📍 Obtener URL actual
   */
  public getCurrentURL(): string {
    return this.page.url();
  }
  
  /**
   * 📍 Obtener título de la página
   */
  public async getTitle(): Promise<string> {
    return await this.page.title();
  }
  
  /**
   * 🔍 Esperar navegación
   */
  public async waitForNavigation(
    action: () => Promise<void>,
    options?: NavigationOptions
  ): Promise<Response | null> {
    return await this.page.waitForNavigation({
      timeout: options?.timeout,
      waitUntil: options?.waitUntil || 'load'
    }, action);
  }
  
  /**
   * 🔗 Esperar una URL específica
   */
  public async waitForURL(
    url: string | RegExp,
    options?: { timeout?: number }
  ): Promise<void> {
    await this.page.waitForURL(url, options);
    this.logger.debug(`URL alcanzada: ${this.page.url()}`);
  }
  
  /**
   * 🚫 Bloquear navegaciones (útil para testing)
   */
  public async blockNavigation(patterns?: string[]): Promise<void> {
    await this.page.route(patterns ? 
      (url) => patterns.some(p => url.href.includes(p)) : 
      '**/*', 
      route => route.abort()
    );
    
    this.logger.info('Navegaciones bloqueadas');
  }
  
  /**
   * 🔄 Interceptar y modificar navegaciones
   */
  public async interceptNavigation(
    pattern: string | RegExp,
    handler: (url: string) => string | null
  ): Promise<void> {
    await this.page.route(pattern, async route => {
      const originalUrl = route.request().url();
      const newUrl = handler(originalUrl);
      
      if (newUrl) {
        await route.fulfill({
          status: 302,
          headers: { Location: newUrl }
        });
      } else {
        await route.continue();
      }
    });
    
    this.logger.info('Interceptor de navegación configurado');
  }
  
  /**
   * 📊 Obtener historial de navegación
   */
  public getNavigationHistory(): string[] {
    return [...this.navigationHistory];
  }
  
  /**
   * 🧹 Limpiar historial
   */
  public clearNavigationHistory(): void {
    this.navigationHistory = [];
    this.logger.debug('Historial de navegación limpiado');
  }
  
  /**
   * 🎧 Configurar listeners de navegación
   */
  private setupNavigationListeners(): void {
    // Registrar cambios de URL
    this.page.on('framenavigated', frame => {
      if (frame === this.page.mainFrame()) {
        const url = frame.url();
        this.logger.trace(`Navegación detectada: ${url}`);
        this.navigationHistory.push(url);
      }
    });
    
    // Registrar nuevas ventanas/pestañas
    this.context.on('page', async page => {
      const tabName = `tab-${Date.now()}`;
      this.tabs.set(tabName, page);
      this.logger.info(`Nueva ventana/pestaña detectada: ${tabName}`);
    });
  }
  
  /**
   * 🔄 Navegar y esperar elemento específico
   */
  public async gotoAndWait(
    url: string,
    waitForSelector: string,
    options?: NavigationOptions
  ): Promise<ActionResult> {
    const result = await this.goto(url, options);
    
    await this.page.waitForSelector(waitForSelector, {
      timeout: options?.timeout || 30000
    });
    
    this.logger.debug(`Elemento esperado encontrado: ${waitForSelector}`);
    return result;
  }
  
  /**
   * 📱 Emular dispositivo (viewport)
   */
  public async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
    this.logger.info(`Viewport establecido: ${width}x${height}`);
  }
  
  /**
   * 🌍 Establecer geolocalización
   */
  public async setGeolocation(latitude: number, longitude: number): Promise<void> {
    await this.context.setGeolocation({ latitude, longitude });
    this.logger.info(`Geolocalización establecida: ${latitude}, ${longitude}`);
  }
  
  /**
   * 🍪 Limpiar cookies
   */
  public async clearCookies(): Promise<void> {
    await this.context.clearCookies();
    this.logger.info('Cookies limpiadas');
  }
  
  /**
   * 📦 Limpiar almacenamiento local
   */
  public async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
    this.logger.info('LocalStorage limpiado');
  }
  
  /**
   * 📦 Limpiar almacenamiento de sesión
   */
  public async clearSessionStorage(): Promise<void> {
    await this.page.evaluate(() => sessionStorage.clear());
    this.logger.info('SessionStorage limpiado');
  }
}