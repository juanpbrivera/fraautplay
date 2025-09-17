/**
 * 🔐 SessionManager.ts
 * 
 * Gestiona sesiones individuales de automatización.
 * Coordina todos los componentes del framework para cada sesión.
 * 
 * ¿Qué es una sesión?
 * Es una instancia completa de automatización que incluye:
 * - Navegador y contexto
 * - Estado y datos
 * - Configuración específica
 * - Recursos asociados (screenshots, logs, etc.)
 * 
 * ¿Por qué necesitamos un SessionManager?
 * - Ejecutar pruebas en paralelo con sesiones aisladas
 * - Mantener estado entre diferentes pasos
 * - Gestionar recursos de forma eficiente
 * - Facilitar debugging con información de contexto
 */

import { Page, Browser, BrowserContext } from '@playwright/test';
import {
  SessionContext,
  BrowserConfig,
  FrameworkError,
  ErrorCode,
  ApplicationState
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../logging/LoggerFactory';
import { BrowserFactory } from '../browsers/BrowserFactory';
import { ElementManager } from '../elements/ElementManager';
import { NavigationActions } from '../interactions/NavigationActions';
import { GestureActions } from '../interactions/GestureActions';
import { InputActions } from '../interactions/InputActions';
import { AssertionHelpers } from '../validations/AssertionHelpers';
import { ValidationStrategies } from '../validations/ValidationStrategies';
import { ScreenshotHelper } from '../utilities/ScreenshotHelper';
import { DataManager } from '../utilities/DataManager';
import { FileUtils } from '../utilities/FileUtils';
import { ConfigManager } from '../config/ConfigManager';

/**
 * 📋 Opciones para crear sesión
 */
export interface SessionOptions {
  id?: string;                      // ID personalizado de sesión
  name?: string;                    // Nombre descriptivo
  browserConfig?: Partial<BrowserConfig>; // Configuración del navegador
  metadata?: Record<string, any>;   // Metadata adicional
  tags?: string[];                  // Tags para categorización
  persistState?: boolean;           // Mantener estado entre sesiones
  statePath?: string;              // Path para guardar estado
  recordVideo?: boolean;           // Grabar video de la sesión
  tracingEnabled?: boolean;        // Habilitar tracing para debugging
}

/**
 * 📋 Estado de la sesión
 */
export interface SessionState {
  id: string;
  status: 'active' | 'paused' | 'closed' | 'error';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  currentUrl?: string;
  currentTitle?: string;
  screenshots: string[];
  videos?: string[];
  errors: Error[];
  metadata: Record<string, any>;
  metrics?: {
    pagesVisited: number;
    actionsPerformed: number;
    assertionsPassed: number;
    assertionsFailed: number;
  };
}

/**
 * 🔐 Clase SessionManager - Gestiona sesiones de automatización
 */
export class SessionManager {
  private static sessions: Map<string, SessionManager> = new Map();
  
  private sessionId: string;
  private sessionContext: SessionContext;
  private sessionState: SessionState;
  private logger = LoggerFactory.forComponent(ComponentType.SESSION_MANAGER);
  private config = ConfigManager.getInstance();
  
  // Componentes del framework
  private elementManager: ElementManager;
  private navigationActions: NavigationActions;
  private gestureActions: GestureActions;
  private inputActions: InputActions;
  private assertionHelpers: AssertionHelpers;
  private validationStrategies: ValidationStrategies;
  private screenshotHelper: ScreenshotHelper;
  private dataManager: DataManager;
  private fileUtils: FileUtils;
  
  // Control de recursos
  private cleanupCallbacks: Array<() => Promise<void>> = [];
  private eventHandlers: Map<string, Function[]> = new Map();
  
  /**
   * Constructor privado (usar create() para instanciar)
   */
  private constructor(
    sessionContext: SessionContext,
    options: SessionOptions
  ) {
    this.sessionId = sessionContext.id;
    this.sessionContext = sessionContext;
    
    // Inicializar estado
    this.sessionState = {
      id: this.sessionId,
      status: 'active',
      startTime: new Date(),
      screenshots: [],
      errors: [],
      metadata: options.metadata || {},
      metrics: {
        pagesVisited: 0,
        actionsPerformed: 0,
        assertionsPassed: 0,
        assertionsFailed: 0
      }
    };
    
    // Inicializar componentes
    this.initializeComponents();
    
    // Configurar logging con contexto de sesión
    LoggerFactory.setGlobalContext({
      sessionId: this.sessionId,
      sessionName: options.name
    });
    
    this.logger.info(`Sesión iniciada: ${this.sessionId}`, {
      name: options.name,
      tags: options.tags
    });
  }
  
  /**
   * 🎯 Crear nueva sesión
   */
  public static async create(options: SessionOptions = {}): Promise<SessionManager> {
    const logger = LoggerFactory.forComponent(ComponentType.SESSION_MANAGER);
    logger.start('Creando nueva sesión');
    
    try {
      // Crear contexto del navegador
      const sessionContext = await BrowserFactory.createSession({
        ...options.browserConfig,
        sessionId: options.id,
        traceEnabled: options.tracingEnabled,
        videoEnabled: options.recordVideo,
        persistContext: options.persistState,
        statePath: options.statePath
      });
      
      // Crear instancia del manager
      const manager = new SessionManager(sessionContext, options);
      
      // Registrar en el mapa global
      SessionManager.sessions.set(sessionContext.id, manager);
      
      // Configurar event listeners
      await manager.setupEventListeners();
      
      logger.success('Sesión creada exitosamente', {
        sessionId: sessionContext.id
      });
      
      return manager;
      
    } catch (error) {
      logger.fail('Error creando sesión', error as Error);
      throw new FrameworkError(
        'No se pudo crear la sesión',
        ErrorCode.BROWSER_ERROR,
        { options, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 🔍 Obtener sesión existente
   */
  public static getSession(sessionId: string): SessionManager | undefined {
    return SessionManager.sessions.get(sessionId);
  }
  
  /**
   * 📊 Obtener todas las sesiones activas
   */
  public static getAllSessions(): SessionManager[] {
    return Array.from(SessionManager.sessions.values());
  }
  
  /**
   * 🧹 Cerrar todas las sesiones
   */
  public static async closeAllSessions(): Promise<void> {
    const logger = LoggerFactory.forComponent(ComponentType.SESSION_MANAGER);
    logger.info('Cerrando todas las sesiones...');
    
    const closePromises = Array.from(SessionManager.sessions.values())
      .map(session => session.close());
    
    await Promise.all(closePromises);
    SessionManager.sessions.clear();
    
    logger.info('Todas las sesiones cerradas');
  }
  
  /**
   * 🔧 Inicializar componentes
   */
  private initializeComponents(): void {
    const page = this.sessionContext.page;
    const context = this.sessionContext.context;
    
    // Elementos
    this.elementManager = new ElementManager({
      page,
      sessionId: this.sessionId,
      autoScreenshot: this.config.get('screenshots.onError'),
      autoHighlight: this.config.get('debug.highlightElements')
    });
    
    // Interacciones
    this.navigationActions = new NavigationActions(page, context);
    this.gestureActions = new GestureActions(page);
    this.inputActions = new InputActions(page);
    
    // Validaciones
    this.assertionHelpers = new AssertionHelpers(page);
    this.validationStrategies = new ValidationStrategies(page);
    
    // Utilidades
    this.screenshotHelper = new ScreenshotHelper(page);
    this.dataManager = new DataManager();
    this.fileUtils = new FileUtils();
    
    this.logger.trace('Componentes inicializados');
  }
  
  /**
   * 🎧 Configurar event listeners
   */
  private async setupEventListeners(): Promise<void> {
    const page = this.sessionContext.page;
    const context = this.sessionContext.context;
    
    // Listener para navegación
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        this.sessionState.currentUrl = frame.url();
        this.sessionState.metrics!.pagesVisited++;
        this.emit('navigation', { url: frame.url() });
      }
    });
    
    // Listener para errores de página
    page.on('pageerror', (error) => {
      this.sessionState.errors.push(error);
      this.logger.error('Error en página', error);
      this.emit('error', { error });
    });
    
    // Listener para console
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.logger.error(`[Console] ${msg.text()}`);
      }
    });
    
    // Listener para diálogos
    page.on('dialog', async (dialog) => {
      this.logger.info(`Diálogo detectado: ${dialog.type()} - ${dialog.message()}`);
      this.emit('dialog', { type: dialog.type(), message: dialog.message() });
      
      // Auto-aceptar por defecto
      await dialog.accept();
    });
    
    // Listener para descargas
    page.on('download', (download) => {
      this.logger.info(`Descarga iniciada: ${download.suggestedFilename()}`);
      this.emit('download', { filename: download.suggestedFilename() });
    });
    
    // Listener para nuevas páginas/tabs
    context.on('page', async (newPage) => {
      this.logger.info('Nueva página/tab detectada');
      this.emit('newPage', { page: newPage });
    });
  }
  
  // 🎯 APIs Públicas - Acceso a componentes
  
  /**
   * 🎯 Obtener ElementManager
   */
  public get elements(): ElementManager {
    this.ensureActive();
    return this.elementManager;
  }
  
  /**
   * 🚀 Obtener NavigationActions
   */
  public get navigation(): NavigationActions {
    this.ensureActive();
    return this.navigationActions;
  }
  
  /**
   * 🖱️ Obtener GestureActions
   */
  public get gestures(): GestureActions {
    this.ensureActive();
    return this.gestureActions;
  }
  
  /**
   * ⌨️ Obtener InputActions
   */
  public get input(): InputActions {
    this.ensureActive();
    return this.inputActions;
  }
  
  /**
   * ✅ Obtener AssertionHelpers
   */
  public get assertions(): AssertionHelpers {
    this.ensureActive();
    return this.assertionHelpers;
  }
  
  /**
   * 📊 Obtener ValidationStrategies
   */
  public get validations(): ValidationStrategies {
    this.ensureActive();
    return this.validationStrategies;
  }
  
  /**
   * 📸 Obtener ScreenshotHelper
   */
  public get screenshots(): ScreenshotHelper {
    this.ensureActive();
    return this.screenshotHelper;
  }
  
  /**
   * 📊 Obtener DataManager
   */
  public get data(): DataManager {
    return this.dataManager;
  }
  
  /**
   * 📁 Obtener FileUtils
   */
  public get files(): FileUtils {
    return this.fileUtils;
  }
  
  /**
   * 📄 Obtener página actual
   */
  public get page(): Page {
    this.ensureActive();
    return this.sessionContext.page;
  }
  
  /**
   * 🌐 Obtener contexto del navegador
   */
  public get context(): BrowserContext {
    this.ensureActive();
    return this.sessionContext.context;
  }
  
  /**
   * 🌐 Obtener navegador
   */
  public get browser(): Browser {
    this.ensureActive();
    return this.sessionContext.browser;
  }
  
  // 🔄 Gestión del ciclo de vida
  
  /**
   * ⏸️ Pausar sesión
   */
  public async pause(): Promise<void> {
    this.logger.info('Pausando sesión');
    this.sessionState.status = 'paused';
    this.emit('paused', {});
  }
  
  /**
   * ▶️ Reanudar sesión
   */
  public async resume(): Promise<void> {
    this.logger.info('Reanudando sesión');
    this.sessionState.status = 'active';
    this.emit('resumed', {});
  }
  
  /**
   * 🔄 Reiniciar sesión
   */
  public async restart(): Promise<void> {
    this.logger.info('Reiniciando sesión');
    
    // Cerrar navegador actual
    await BrowserFactory.closeSession(this.sessionId);
    
    // Crear nuevo contexto
    const newContext = await BrowserFactory.createSession({
      sessionId: this.sessionId
    });
    
    this.sessionContext = newContext;
    this.initializeComponents();
    
    this.emit('restarted', {});
  }
  
  /**
   * 🔚 Cerrar sesión
   */
  public async close(): Promise<void> {
    this.logger.info('Cerrando sesión');
    
    try {
      // Cambiar estado
      this.sessionState.status = 'closed';
      this.sessionState.endTime = new Date();
      this.sessionState.duration = this.sessionState.endTime.getTime() - 
                                   this.sessionState.startTime.getTime();
      
      // Ejecutar callbacks de limpieza
      for (const cleanup of this.cleanupCallbacks) {
        try {
          await cleanup();
        } catch (error) {
          this.logger.error('Error en limpieza', error as Error);
        }
      }
      
      // Limpiar archivos temporales
      await this.fileUtils.cleanTempFiles();
      
      // Cerrar navegador
      await BrowserFactory.closeSession(this.sessionId);
      
      // Eliminar del registro global
      SessionManager.sessions.delete(this.sessionId);
      
      // Emitir evento
      this.emit('closed', this.getState());
      
      this.logger.info('Sesión cerrada exitosamente', {
        duration: this.sessionState.duration,
        metrics: this.sessionState.metrics
      });
      
    } catch (error) {
      this.logger.error('Error cerrando sesión', error as Error);
      this.sessionState.status = 'error';
    }
  }
  
  // 📊 Estado y métricas
  
  /**
   * 📊 Obtener estado actual
   */
  public getState(): SessionState {
    return {
      ...this.sessionState,
      currentUrl: this.sessionContext.page.url(),
      currentTitle: this.sessionContext.page.url()
    };
  }
  
  /**
   * 📊 Obtener métricas
   */
  public getMetrics(): SessionState['metrics'] {
    return { ...this.sessionState.metrics };
  }
  
  /**
   * 📝 Actualizar metadata
   */
  public updateMetadata(metadata: Record<string, any>): void {
    this.sessionState.metadata = {
      ...this.sessionState.metadata,
      ...metadata
    };
  }
  
  /**
   * 📸 Agregar screenshot al registro
   */
  public addScreenshot(path: string): void {
    this.sessionState.screenshots.push(path);
  }
  
  /**
   * ❌ Agregar error al registro
   */
  public addError(error: Error): void {
    this.sessionState.errors.push(error);
  }
  
  // 🎯 Funciones de utilidad
  
  /**
   * 🔄 Ejecutar en contexto de sesión
   */
  public async execute<T>(
    action: (session: SessionManager) => Promise<T>,
    options?: {
      screenshot?: boolean;
      description?: string;
    }
  ): Promise<T> {
    this.ensureActive();
    
    try {
      this.logger.debug(`Ejecutando: ${options?.description || 'acción'}`);
      
      const result = await action(this);
      
      if (options?.screenshot) {
        await this.screenshotHelper.capture(options.description);
      }
      
      this.sessionState.metrics!.actionsPerformed++;
      
      return result;
      
    } catch (error) {
      this.logger.error('Error en ejecución', error as Error);
      this.sessionState.errors.push(error as Error);
      
      if (this.config.get('screenshots.onError')) {
        await this.screenshotHelper.captureError('execution-error', error as Error);
      }
      
      throw error;
    }
  }
  
  /**
   * 🔄 Ejecutar con reintentos
   */
  public async executeWithRetry<T>(
    action: (session: SessionManager) => Promise<T>,
    options?: {
      maxRetries?: number;
      delay?: number;
      backoff?: boolean;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries || 3;
    const delay = options?.delay || 1000;
    const backoff = options?.backoff ?? true;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.execute(action);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
          this.logger.warn(`Intento ${attempt + 1} falló, reintentando en ${waitTime}ms`);
          await this.page.waitForTimeout(waitTime);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * 💾 Guardar estado de la sesión
   */
  public async saveState(filePath?: string): Promise<void> {
    const path = filePath || `./sessions/session_${this.sessionId}_state.json`;
    
    const state = {
      ...this.getState(),
      cookies: await this.context.cookies(),
      localStorage: await this.page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) items[key] = localStorage.getItem(key) || '';
        }
        return items;
      })
    };
    
    await this.fileUtils.writeFile(path, JSON.stringify(state, null, 2));
    this.logger.info(`Estado guardado en: ${path}`);
  }
  
  /**
   * 📂 Cargar estado previo
   */
  public async loadState(filePath: string): Promise<void> {
    const content = await this.fileUtils.readFile(filePath);
    const state = JSON.parse(content.toString());
    
    // Restaurar cookies
    if (state.cookies) {
      await this.context.addCookies(state.cookies);
    }
    
    // Restaurar localStorage
    if (state.localStorage) {
      await this.page.evaluate((items) => {
        Object.entries(items).forEach(([key, value]) => {
          localStorage.setItem(key, value as string);
        });
      }, state.localStorage);
    }
    
    this.logger.info('Estado restaurado desde archivo');
  }
  
  // 🎧 Sistema de eventos
  
  /**
   * 🎧 Suscribirse a evento
   */
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }
  
  /**
   * 📢 Emitir evento
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        this.logger.error(`Error en handler de evento ${event}`, error as Error);
      }
    });
  }
  
  /**
   * 🧹 Registrar callback de limpieza
   */
  public onCleanup(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }
  
  /**
   * ✅ Verificar que la sesión está activa
   */
  private ensureActive(): void {
    if (this.sessionState.status !== 'active') {
      throw new FrameworkError(
        `Sesión no está activa: ${this.sessionState.status}`,
        ErrorCode.BROWSER_ERROR,
        { sessionId: this.sessionId, status: this.sessionState.status }
      );
    }
  }
}