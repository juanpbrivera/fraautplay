/**
 * 🌐 BrowserFactory.ts
 * 
 * Factory Pattern para crear instancias de navegadores.
 * Es como una "fábrica" que produce navegadores configurados y listos para usar.
 * 
 * ¿Qué es el Factory Pattern?
 * Es un patrón de diseño que encapsula la creación de objetos complejos.
 * En lugar de crear navegadores directamente, usamos esta fábrica que se encarga
 * de toda la complejidad de configuración.
 * 
 * ¿Por qué es útil?
 * - Centraliza la lógica de creación
 * - Facilita cambiar entre diferentes navegadores
 * - Maneja configuraciones complejas
 * - Gestiona el ciclo de vida del navegador
 */

import { 
  chromium, 
  firefox, 
  webkit, 
  Browser, 
  BrowserContext,
  Page,
  devices,
  LaunchOptions,
  BrowserContextOptions 
} from '@playwright/test';
import { 
  BrowserType, 
  BrowserConfig, 
  SessionContext,
  DeviceType,
  FrameworkError,
  ErrorCode 
} from '../../types/FrameworkTypes';
import { Logger } from '../logging/Logger';
import { ConfigManager } from '../config/ConfigManager';
import * as path from 'path';

/**
 * 🎯 Opciones para lanzar el navegador
 */
export interface BrowserLaunchOptions extends BrowserConfig {
  sessionId?: string;           // ID único para la sesión
  traceEnabled?: boolean;        // Habilitar tracing (para debugging)
  tracePath?: string;           // Dónde guardar el trace
  videoEnabled?: boolean;       // Grabar video
  videoPath?: string;          // Dónde guardar el video
  useDevice?: DeviceType;       // Emular dispositivo específico
  persistContext?: boolean;     // Mantener datos entre sesiones
  statePath?: string;          // Path para guardar estado del navegador
}

/**
 * 🏭 Clase BrowserFactory - Crea y gestiona navegadores
 */
export class BrowserFactory {
  private static browsers: Map<string, Browser> = new Map();
  private static contexts: Map<string, BrowserContext> = new Map();
  private static pages: Map<string, Page> = new Map();
  private static sessions: Map<string, SessionContext> = new Map();
  private static logger = new Logger('BrowserFactory');
  private static config = ConfigManager.getInstance().get('browser');
  
  /**
   * 🚀 Crear una nueva sesión de navegador
   * Esta es la función principal que usarán los tests
   */
  public static async createSession(options?: BrowserLaunchOptions): Promise<SessionContext> {
    const sessionId = options?.sessionId || this.generateSessionId();
    const startTime = new Date();
    
    this.logger.testStart(`Creando sesión: ${sessionId}`);
    this.logger.startTimer();
    
    try {
      // 1️⃣ Mezclar opciones con configuración por defecto
      const finalOptions = this.mergeOptions(options);
      
      // 2️⃣ Lanzar el navegador
      const browser = await this.launchBrowser(finalOptions);
      this.browsers.set(sessionId, browser);
      
      // 3️⃣ Crear contexto (sesión aislada)
      const context = await this.createContext(browser, finalOptions, sessionId);
      this.contexts.set(sessionId, context);
      
      // 4️⃣ Crear página inicial
      const page = await context.newPage();
      this.pages.set(sessionId, page);
      
      // 5️⃣ Configurar la página
      await this.configurePage(page, finalOptions);
      
      // 6️⃣ Crear objeto de sesión
      const session: SessionContext = {
        id: sessionId,
        browser,
        context,
        page,
        startTime,
        metadata: {
          browserType: finalOptions.type,
          headless: finalOptions.headless,
          viewport: finalOptions.viewport,
          device: finalOptions.useDevice
        },
        screenshots: []
      };
      
      this.sessions.set(sessionId, session);
      
      const duration = this.logger.stopTimer();
      this.logger.info(`✅ Sesión creada exitosamente`, {
        sessionId,
        duration,
        browserType: finalOptions.type,
        headless: finalOptions.headless
      });
      
      return session;
      
    } catch (error) {
      const duration = this.logger.stopTimer();
      this.logger.error('❌ Error creando sesión', error as Error, { sessionId, duration });
      
      // Limpiar recursos si algo falló
      await this.closeSession(sessionId);
      
      throw new FrameworkError(
        `No se pudo crear la sesión del navegador: ${(error as Error).message}`,
        ErrorCode.BROWSER_ERROR,
        { sessionId, options }
      );
    }
  }
  
  /**
   * 🌐 Lanzar el navegador según el tipo especificado
   */
  private static async launchBrowser(options: BrowserLaunchOptions): Promise<Browser> {
    this.logger.debug(`Lanzando navegador: ${options.type}`);
    
    // Opciones comunes para todos los navegadores
    const launchOptions: LaunchOptions = {
      headless: options.headless ?? false,
      slowMo: options.slowMo,
      timeout: options.timeout,
      
      // Argumentos adicionales del navegador
      args: this.getBrowserArgs(options),
      
      // Configuración de proxy si existe
      proxy: options.proxy,
      
      // Path para descargas
      downloadsPath: options.acceptDownloads ? 
        path.join(process.cwd(), 'downloads') : undefined,
      
      // Tracing para debugging
      tracesDir: options.traceEnabled ? 
        path.join(process.cwd(), 'traces') : undefined
    };
    
    // Lanzar el navegador apropiado
    let browser: Browser;
    
    switch (options.type) {
      case 'chromium':
        browser = await chromium.launch(launchOptions);
        break;
        
      case 'firefox':
        browser = await firefox.launch(launchOptions);
        break;
        
      case 'webkit':
        browser = await webkit.launch(launchOptions);
        break;
        
      case 'chrome':
        // Chrome real (requiere instalación)
        browser = await chromium.launch({
          ...launchOptions,
          channel: 'chrome'
        });
        break;
        
      case 'edge':
        // Edge real (requiere instalación)
        browser = await chromium.launch({
          ...launchOptions,
          channel: 'msedge'
        });
        break;
        
      default:
        throw new Error(`Tipo de navegador no soportado: ${options.type}`);
    }
    
    this.logger.debug('Navegador lanzado exitosamente', {
      type: options.type,
      version: browser.version()
    });
    
    return browser;
  }
  
  /**
   * 🔧 Obtener argumentos específicos del navegador
   */
  private static getBrowserArgs(options: BrowserLaunchOptions): string[] {
    const args: string[] = [];
    
    // Argumentos comunes
    if (options.type === 'chromium' || options.type === 'chrome' || options.type === 'edge') {
      // Mejorar rendimiento
      args.push('--disable-blink-features=AutomationControlled');
      args.push('--disable-dev-shm-usage');
      args.push('--no-sandbox'); // Necesario en algunos entornos CI/CD
      
      // Tamaño de ventana inicial
      if (options.viewport) {
        args.push(`--window-size=${options.viewport.width},${options.viewport.height}`);
      }
      
      // Desactivar notificaciones
      args.push('--disable-notifications');
      
      // Si es headless, optimizaciones adicionales
      if (options.headless) {
        args.push('--disable-gpu');
        args.push('--disable-software-rasterizer');
      }
      
      // Ignorar errores de certificado si está configurado
      if (options.ignoreHTTPSErrors) {
        args.push('--ignore-certificate-errors');
      }
    }
    
    return args;
  }
  
  /**
   * 📱 Crear contexto del navegador (sesión aislada)
   */
  private static async createContext(
    browser: Browser, 
    options: BrowserLaunchOptions,
    sessionId: string
  ): Promise<BrowserContext> {
    this.logger.debug('Creando contexto del navegador');
    
    const contextOptions: BrowserContextOptions = {
      // Viewport
      viewport: options.viewport || { width: 1920, height: 1080 },
      
      // Dispositivo a emular
      ...(options.useDevice ? devices[options.useDevice] : {}),
      
      // Configuración regional
      locale: options.locale,
      timezoneId: options.timezoneId,
      
      // Geolocalización
      geolocation: options.geolocation,
      permissions: options.permissions,
      
      // Configuración de red
      extraHTTPHeaders: options.extraHTTPHeaders,
      httpCredentials: options.httpCredentials,
      offline: options.offline,
      
      // Seguridad
      ignoreHTTPSErrors: options.ignoreHTTPSErrors,
      bypassCSP: options.bypassCSP,
      
      // JavaScript
      javaScriptEnabled: options.javaScriptEnabled ?? true,
      
      // Descargas
      acceptDownloads: options.acceptDownloads ?? true,
      
      // User agent
      userAgent: options.userAgent,
      
      // Tema
      colorScheme: options.colorScheme,
      
      // Reducir detección de automatización
      // @ts-ignore - Esta opción puede no estar en los tipos pero funciona
      stealth: true
    };
    
    // Video recording
    if (options.videoEnabled || options.recordVideo) {
      contextOptions.recordVideo = {
        dir: options.videoPath || options.recordVideo?.dir || './videos',
        size: options.recordVideo?.size || options.viewport
      };
    }
    
    // Crear contexto
    let context: BrowserContext;
    
    if (options.persistContext && options.statePath) {
      // Contexto persistente (mantiene cookies, localStorage, etc.)
      this.logger.debug('Creando contexto persistente');
      // Para contexto persistente, necesitamos usar launchPersistentContext
      // que requiere cerrar el navegador actual y relanzar
      await browser.close();
      
      const browserType = options.type === 'chromium' ? chromium :
                          options.type === 'firefox' ? firefox : webkit;
      
      context = await browserType.launchPersistentContext(options.statePath, {
        ...contextOptions,
        headless: options.headless,
        slowMo: options.slowMo
      });
    } else {
      // Contexto normal (sesión nueva)
      context = await browser.newContext(contextOptions);
    }
    
    // Configurar tracing si está habilitado
    if (options.traceEnabled) {
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true
      });
      
      this.logger.debug('Tracing habilitado para debugging');
    }
    
    // Event listeners del contexto
    this.setupContextListeners(context, sessionId);
    
    this.logger.debug('Contexto creado exitosamente');
    return context;
  }
  
  /**
   * ⚙️ Configurar la página
   */
  private static async configurePage(page: Page, options: BrowserLaunchOptions): Promise<void> {
    this.logger.debug('Configurando página');
    
    // Establecer timeout por defecto
    if (options.timeout) {
      page.setDefaultTimeout(options.timeout);
      page.setDefaultNavigationTimeout(options.timeout);
    }
    
    // Configurar tamaño de viewport (por si cambió después de crear el contexto)
    if (options.viewport) {
      await page.setViewportSize(options.viewport);
    }
    
    // Event listeners de la página
    this.setupPageListeners(page);
    
    // Inyectar scripts útiles para testing
    await this.injectHelperScripts(page);
    
    this.logger.debug('Página configurada exitosamente');
  }
  
  /**
   * 🎧 Configurar listeners del contexto
   */
  private static setupContextListeners(context: BrowserContext, sessionId: string): void {
    // Cuando se crea una nueva página
    context.on('page', async (page) => {
      this.logger.debug('Nueva página creada en el contexto', { sessionId });
      await this.configurePage(page, this.config);
      this.setupPageListeners(page);
    });
    
    // Cuando se cierra el contexto
    context.on('close', () => {
      this.logger.debug('Contexto cerrado', { sessionId });
    });
  }
  
  /**
   * 🎧 Configurar listeners de la página
   */
  private static setupPageListeners(page: Page): void {
    // Logs de consola del navegador
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      // Mapear tipos de consola a niveles de log
      switch (type) {
        case 'error':
          this.logger.error(`[Browser Console] ${text}`);
          break;
        case 'warning':
          this.logger.warn(`[Browser Console] ${text}`);
          break;
        case 'info':
        case 'log':
          this.logger.debug(`[Browser Console] ${text}`);
          break;
        default:
          this.logger.trace(`[Browser Console] [${type}] ${text}`);
      }
    });
    
    // Errores de página
    page.on('pageerror', (error) => {
      this.logger.error('[Page Error]', error);
    });
    
    // Crashes
    page.on('crash', () => {
      this.logger.fatal('[Page Crashed] La página se ha estrellado');
    });
    
    // Diálogos (alerts, confirms, prompts)
    page.on('dialog', async (dialog) => {
      this.logger.info(`[Dialog] ${dialog.type()}: ${dialog.message()}`);
      // Auto-aceptar diálogos por defecto
      await dialog.accept();
    });
    
    // Descargas
    page.on('download', (download) => {
      this.logger.info(`[Download] Archivo descargado: ${download.suggestedFilename()}`);
    });
    
    // Popups
    page.on('popup', (popup) => {
      this.logger.info('[Popup] Nueva ventana popup abierta');
    });
    
    // Request failures
    page.on('requestfailed', (request) => {
      this.logger.warn(`[Request Failed] ${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });
  }
  
  /**
   * 💉 Inyectar scripts helper en la página
   */
  private static async injectHelperScripts(page: Page): Promise<void> {
    // Script para hacer elementos más visibles durante debugging
    await page.addInitScript(() => {
      // Agregar clase para debugging
      (window as any).__addDebugClass = (selector: string) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.classList.add('framework-debug-highlight');
        });
      };
      
      // Estilo para resaltar elementos
      const style = document.createElement('style');
      style.textContent = `
        .framework-debug-highlight {
          outline: 2px solid red !important;
          background-color: rgba(255, 0, 0, 0.1) !important;
        }
      `;
      document.head.appendChild(style);
      
      // Helper para obtener texto visible
      (window as any).__getVisibleText = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        return element.textContent?.trim();
      };
      
      // Helper para verificar si elemento es visible
      (window as any).__isElementVisible = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return rect.width > 0 && 
               rect.height > 0 && 
               style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
      };
    });
  }
  
  /**
   * 🔄 Mezclar opciones con configuración por defecto
   */
  private static mergeOptions(options?: BrowserLaunchOptions): BrowserLaunchOptions {
    const defaultConfig = ConfigManager.getInstance().get('browser') as BrowserConfig;
    
    return {
      ...defaultConfig,
      ...options,
      viewport: {
        ...defaultConfig.viewport,
        ...options?.viewport
      }
    };
  }
  
  /**
   * 🆔 Generar ID único de sesión
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  
  /**
   * 🔍 Obtener sesión por ID
   */
  public static getSession(sessionId: string): SessionContext | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * 📄 Obtener página de una sesión
   */
  public static getPage(sessionId: string): Page | undefined {
    return this.pages.get(sessionId);
  }
  
  /**
   * 🆕 Crear nueva página en una sesión existente
   */
  public static async newPage(sessionId: string): Promise<Page> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new FrameworkError(
        `No se encontró la sesión: ${sessionId}`,
        ErrorCode.BROWSER_ERROR
      );
    }
    
    const page = await context.newPage();
    await this.configurePage(page, this.config);
    
    this.logger.debug('Nueva página creada', { sessionId });
    return page;
  }
  
  /**
   * 🔚 Cerrar sesión y liberar recursos
   */
  public static async closeSession(sessionId: string): Promise<void> {
    this.logger.info(`Cerrando sesión: ${sessionId}`);
    
    try {
      // Guardar trace si estaba habilitado
      const context = this.contexts.get(sessionId);
      if (context && (await context.tracing.isStarted)) {
        const tracePath = path.join(process.cwd(), 'traces', `${sessionId}.zip`);
        await context.tracing.stop({ path: tracePath });
        this.logger.debug(`Trace guardado en: ${tracePath}`);
      }
      
      // Cerrar páginas
      const page = this.pages.get(sessionId);
      if (page && !page.isClosed()) {
        await page.close();
      }
      
      // Cerrar contexto
      if (context) {
        await context.close();
      }
      
      // Cerrar navegador
      const browser = this.browsers.get(sessionId);
      if (browser && browser.isConnected()) {
        await browser.close();
      }
      
      // Limpiar mapas
      this.pages.delete(sessionId);
      this.contexts.delete(sessionId);
      this.browsers.delete(sessionId);
      this.sessions.delete(sessionId);
      
      this.logger.info(`✅ Sesión cerrada exitosamente: ${sessionId}`);
      
    } catch (error) {
      this.logger.error(`Error cerrando sesión: ${sessionId}`, error as Error);
    }
  }
  
  /**
   * 🔚 Cerrar todas las sesiones
   */
  public static async closeAllSessions(): Promise<void> {
    this.logger.info('Cerrando todas las sesiones...');
    
    const closePromises = Array.from(this.sessions.keys()).map(sessionId => 
      this.closeSession(sessionId)
    );
    
    await Promise.all(closePromises);
    
    this.logger.info('✅ Todas las sesiones cerradas');
  }
  
  /**
   * 📊 Obtener estadísticas de las sesiones activas
   */
  public static getStats(): any {
    return {
      activeSessions: this.sessions.size,
      browsers: this.browsers.size,
      contexts: this.contexts.size,
      pages: this.pages.size,
      sessions: Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        startTime: s.startTime,
        browserType: s.metadata?.browserType,
        headless: s.metadata?.headless
      }))
    };
  }
}