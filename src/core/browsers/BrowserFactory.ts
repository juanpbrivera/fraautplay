// src/core/browsers/BrowserFactory.ts

import { 
  chromium, 
  firefox, 
  webkit, 
  Browser, 
  BrowserContext, 
  Page, 
  LaunchOptions 
} from 'playwright';
import { BrowserOptions, BrowserType } from '../../types/FrameworkTypes';
import { Logger } from '../logging/Logger';
import { DefaultConfig } from '../config/DefaultConfig';

/**
 * Factory para crear y gestionar instancias de navegadores
 * Centraliza la creación de navegadores con configuración consistente
 */
export class BrowserFactory {
  private static browsers: Map<string, Browser> = new Map();
  private static contexts: Map<string, BrowserContext> = new Map();
  private static pages: Map<string, Page> = new Map();
  private static logger: Logger;

  /**
   * Inicializa el logger del factory
   */
  private static initLogger(): void {
    if (!this.logger) {
      this.logger = new Logger(DefaultConfig.getDefaultConfig().logging, { 
        component: 'BrowserFactory' 
      });
    }
  }

  /**
   * Lanza un navegador con las opciones especificadas
   */
  static async launchBrowser(options: BrowserOptions): Promise<Browser> {
    this.initLogger();
    const browserKey = this.generateBrowserKey(options);
    
    // Reutilizar navegador existente si ya está lanzado
    if (this.browsers.has(browserKey)) {
      this.logger.debug('Reusing existing browser instance', { browserKey });
      return this.browsers.get(browserKey)!;
    }

    this.logger.info('Launching new browser', { 
      type: options.browserType, 
      headless: options.headless 
    });

    try {
      const launchOptions = this.buildLaunchOptions(options);
      const browser = await this.launchBrowserByType(options.browserType, launchOptions);
      
      this.browsers.set(browserKey, browser);
      this.logger.info('Browser launched successfully', { browserKey });
      
      return browser;
    } catch (error) {
      this.logger.error('Failed to launch browser', error as Error, { options });
      throw new Error(`Failed to launch browser: ${(error as Error).message}`);
    }
  }

  /**
   * Crea un contexto de navegador (sesión aislada)
   */
  static async createContext(
    browser: Browser, 
    options: Partial<BrowserOptions> = {}
  ): Promise<BrowserContext> {
    this.initLogger();
    const contextKey = `${browser.browserType().name()}_${Date.now()}`;
    
    this.logger.debug('Creating browser context', { contextKey });

    try {
      const contextOptions = this.buildContextOptions(options);
      const context = await browser.newContext(contextOptions);
      
      // Configurar permisos si es necesario
      if (options.ignoreHTTPSErrors) {
        await context.grantPermissions(['geolocation', 'notifications']);
      }
      
      this.contexts.set(contextKey, context);
      this.logger.info('Browser context created', { contextKey });
      
      return context;
    } catch (error) {
      this.logger.error('Failed to create context', error as Error);
      throw new Error(`Failed to create context: ${(error as Error).message}`);
    }
  }

  /**
   * Crea una nueva página en el contexto especificado
   */
  static async createPage(context: BrowserContext): Promise<Page> {
    this.initLogger();
    const pageKey = `page_${Date.now()}`;
    
    this.logger.debug('Creating new page', { pageKey });

    try {
      const page = await context.newPage();
      
      // Configurar event listeners básicos
      page.on('console', msg => {
        this.logger.trace(`Browser console: ${msg.type()}`, { 
          text: msg.text() 
        });
      });
      
      page.on('pageerror', error => {
        this.logger.error('Page error detected', error);
      });

      page.on('crash', () => {
        this.logger.fatal('Page crashed');
      });
      
      this.pages.set(pageKey, page);
      this.logger.info('Page created successfully', { pageKey });
      
      return page;
    } catch (error) {
      this.logger.error('Failed to create page', error as Error);
      throw new Error(`Failed to create page: ${(error as Error).message}`);
    }
  }

  /**
   * Lanza el navegador según el tipo especificado
   */
  private static async launchBrowserByType(
    type: BrowserType, 
    options: LaunchOptions
  ): Promise<Browser> {
    switch (type) {
      case 'chromium':
        return await chromium.launch(options);
      case 'firefox':
        return await firefox.launch(options);
      case 'webkit':
        return await webkit.launch(options);
      case 'chrome':
        return await chromium.launch({
          ...options,
          channel: 'chrome'
        });
      case 'edge':
        return await chromium.launch({
          ...options,
          channel: 'msedge'
        });
      default:
        throw new Error(`Unsupported browser type: ${type}`);
    }
  }

  /**
   * Construye las opciones de lanzamiento del navegador
   */
  private static buildLaunchOptions(options: BrowserOptions): LaunchOptions {
    const launchOptions: LaunchOptions = {
      headless: options.headless ?? true,
      slowMo: options.slowMo ?? 0,
      timeout: options.timeout ?? 30000,
      args: options.args ?? [],
    };

    // Agregar argumentos comunes útiles
    if (options.headless) {
      launchOptions.args!.push('--no-sandbox', '--disable-setuid-sandbox');
    }

    if (options.ignoreHTTPSErrors) {
      launchOptions.ignoreDefaultArgs = ['--disable-extensions'];
    }

    if (options.downloadsPath) {
      launchOptions.downloadsPath = options.downloadsPath;
    }

    return launchOptions;
  }

  /**
   * Construye las opciones del contexto
   */
  private static buildContextOptions(options: Partial<BrowserOptions>): any {
    const contextOptions: any = {
      ignoreHTTPSErrors: options.ignoreHTTPSErrors ?? false,
      viewport: options.viewport ?? { width: 1920, height: 1080 },
    };

    if (options.locale) {
      contextOptions.locale = options.locale;
    }

    if (options.timezone) {
      contextOptions.timezoneId = options.timezone;
    }

    return contextOptions;
  }

  /**
   * Genera una clave única para identificar el navegador
   */
  private static generateBrowserKey(options: BrowserOptions): string {
    return `${options.browserType}_${options.headless ? 'headless' : 'headed'}`;
  }

  /**
   * Cierra un navegador específico
   */
  static async closeBrowser(browser: Browser): Promise<void> {
    this.initLogger();
    
    try {
      await browser.close();
      
      // Limpiar de los mapas
      for (const [key, value] of this.browsers.entries()) {
        if (value === browser) {
          this.browsers.delete(key);
          this.logger.info('Browser closed and removed from cache', { key });
          break;
        }
      }
    } catch (error) {
      this.logger.error('Error closing browser', error as Error);
      throw error;
    }
  }

  /**
   * Cierra todos los navegadores abiertos
   */
  static async closeAllBrowsers(): Promise<void> {
    this.initLogger();
    this.logger.info('Closing all browsers');
    
    const closePromises: Promise<void>[] = [];
    
    for (const browser of this.browsers.values()) {
      closePromises.push(browser.close());
    }
    
    await Promise.all(closePromises);
    
    this.browsers.clear();
    this.contexts.clear();
    this.pages.clear();
    
    this.logger.info('All browsers closed successfully');
  }

  /**
   * Obtiene todas las páginas activas
   */
  static getActivePages(): Page[] {
    return Array.from(this.pages.values());
  }

  /**
   * Obtiene todos los navegadores activos
   */
  static getActiveBrowsers(): Browser[] {
    return Array.from(this.browsers.values());
  }
}