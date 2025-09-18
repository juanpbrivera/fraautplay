// src/session/SessionManager.ts

import { Browser, BrowserContext, Page } from 'playwright';
import { SessionContext, BrowserOptions } from '../types/FrameworkTypes';
import { BrowserFactory } from '../core/browsers/BrowserFactory';
import { LoggerFactory } from '../core/logging/LoggerFactory';
import { ConfigManager } from '../core/config/ConfigManager';

/**
 * Gestor de sesiones de automatización
 * Maneja el ciclo de vida de sesiones de browser
 */
export class SessionManager {
  private static sessions: Map<string, SessionContext> = new Map();
  private static logger = LoggerFactory.getLogger('SessionManager');

  /**
   * Crea una nueva sesión
   */
  static async createSession(
    options?: {
      browserOptions?: BrowserOptions;
      contextOptions?: any;
      sessionId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<SessionContext> {
    const sessionId = options?.sessionId || this.generateSessionId();
    
    this.logger.info('Creating new session', { sessionId });

    try {
      // Obtener opciones del browser
      const config = ConfigManager.getInstance().getConfig();
      const browserOptions = options?.browserOptions || config.browser;

      // Lanzar browser
      const browser = await BrowserFactory.launchBrowser(browserOptions);

      // Crear contexto
      const context = await BrowserFactory.createContext(
        browser,
        options?.browserOptions
      );

      // Configurar event listeners del contexto
      this.setupContextListeners(context, sessionId);

      // Crear página
      const page = await BrowserFactory.createPage(context);

      // Configurar event listeners de la página
      this.setupPageListeners(page, sessionId);

      // Crear contexto de sesión
      const session: SessionContext = {
        id: sessionId,
        browser,
        context,
        page,
        createdAt: new Date(),
        metadata: options?.metadata || {}
      };

      // Guardar sesión
      this.sessions.set(sessionId, session);

      this.logger.info('Session created successfully', {
        sessionId,
        browserType: browserOptions.browserType
      });

      return session;
    } catch (error) {
      this.logger.error('Failed to create session', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Obtiene una sesión existente
   */
  static getSession(sessionId: string): SessionContext | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Obtiene todas las sesiones activas
   */
  static getAllSessions(): SessionContext[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cierra una sesión específica
   */
  static async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      this.logger.warn('Session not found', { sessionId });
      return;
    }

    this.logger.info('Closing session', { sessionId });

    try {
      // Cerrar página
      if (session.page && !session.page.isClosed()) {
        await session.page.close();
      }

      // Cerrar contexto
      if (session.context) {
        await session.context.close();
      }

      // Cerrar browser si no hay más contextos
      if (session.browser && session.browser.contexts().length === 0) {
        await BrowserFactory.closeBrowser(session.browser);
      }

      // Eliminar de la lista
      this.sessions.delete(sessionId);

      this.logger.info('Session closed successfully', { sessionId });
    } catch (error) {
      this.logger.error('Error closing session', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Cierra todas las sesiones activas
   */
  static async closeAllSessions(): Promise<void> {
    this.logger.info('Closing all sessions', { 
      count: this.sessions.size 
    });

    const closePromises = Array.from(this.sessions.keys()).map(
      sessionId => this.closeSession(sessionId)
    );

    await Promise.allSettled(closePromises);

    this.sessions.clear();
    
    // Cerrar todos los browsers restantes
    await BrowserFactory.closeAllBrowsers();

    this.logger.info('All sessions closed');
  }

  /**
   * Reutiliza una sesión existente o crea una nueva
   */
  static async getOrCreateSession(
    sessionId: string,
    options?: {
      browserOptions?: BrowserOptions;
      contextOptions?: any;
      metadata?: Record<string, any>;
    }
  ): Promise<SessionContext> {
    let session = this.getSession(sessionId);

    if (session) {
      this.logger.debug('Reusing existing session', { sessionId });
      
      // Verificar que la sesión sigue activa
      if (session.page.isClosed()) {
        this.logger.warn('Session page is closed, creating new page', { sessionId });
        session.page = await BrowserFactory.createPage(session.context);
        this.setupPageListeners(session.page, sessionId);
      }
      
      return session;
    }

    this.logger.debug('Creating new session', { sessionId });
    return this.createSession({ ...options, sessionId });
  }

  /**
   * Actualiza metadata de una sesión
   */
  static updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>
  ): void {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.metadata = {
        ...session.metadata,
        ...metadata
      };
      
      this.logger.debug('Session metadata updated', { 
        sessionId, 
        metadata 
      });
    }
  }

  /**
   * Crea una nueva página en una sesión existente
   */
  static async createNewPage(sessionId: string): Promise<Page> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    this.logger.debug('Creating new page in session', { sessionId });

    const page = await session.context.newPage();
    this.setupPageListeners(page, sessionId);

    this.logger.info('New page created in session', { sessionId });

    return page;
  }

  /**
   * Guarda el estado de la sesión (cookies, localStorage, etc)
   */
  static async saveSessionState(
    sessionId: string,
    filePath?: string
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const path = filePath || `session_${sessionId}_${Date.now()}.json`;

    try {
      this.logger.debug('Saving session state', { sessionId, path });
      
      const state = await session.context.storageState({ path });
      
      this.logger.info('Session state saved', { sessionId, path });
      
      return path;
    } catch (error) {
      this.logger.error('Failed to save session state', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Restaura el estado de una sesión desde un archivo
   */
  static async restoreSessionState(
    sessionId: string,
    statePath: string,
    options?: {
      browserOptions?: BrowserOptions;
      metadata?: Record<string, any>;
    }
  ): Promise<SessionContext> {
    this.logger.info('Restoring session from state', { 
      sessionId, 
      statePath 
    });

    try {
      const config = ConfigManager.getInstance().getConfig();
      const browserOptions = options?.browserOptions || config.browser;

      // Lanzar browser
      const browser = await BrowserFactory.launchBrowser(browserOptions);

      // Crear contexto con estado guardado
      const context = await browser.newContext({
        storageState: statePath
      });

      this.setupContextListeners(context, sessionId);

      // Crear página
      const page = await context.newPage();
      this.setupPageListeners(page, sessionId);

      // Crear contexto de sesión
      const session: SessionContext = {
        id: sessionId,
        browser,
        context,
        page,
        createdAt: new Date(),
        metadata: {
          ...options?.metadata,
          restoredFrom: statePath
        }
      };

      // Guardar sesión
      this.sessions.set(sessionId, session);

      this.logger.info('Session restored successfully', { sessionId });

      return session;
    } catch (error) {
      this.logger.error('Failed to restore session', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Obtiene información de una sesión
   */
  static getSessionInfo(sessionId: string): {
    id: string;
    createdAt: Date;
    duration: number;
    pagesCount: number;
    metadata: Record<string, any>;
  } | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      createdAt: session.createdAt,
      duration: Date.now() - session.createdAt.getTime(),
      pagesCount: session.context.pages().length,
      metadata: session.metadata || {}
    };
  }

  /**
   * Verifica si una sesión está activa
   */
  static isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    return !session.page.isClosed();
  }

  /**
   * Limpia sesiones inactivas
   */
  static async cleanupInactiveSessions(): Promise<number> {
    const inactiveSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.page.isClosed()) {
        inactiveSessions.push(sessionId);
      }
    }

    for (const sessionId of inactiveSessions) {
      await this.closeSession(sessionId);
    }

    if (inactiveSessions.length > 0) {
      this.logger.info('Cleaned up inactive sessions', { 
        count: inactiveSessions.length 
      });
    }

    return inactiveSessions.length;
  }

  /**
   * Configura event listeners para el contexto
   */
  private static setupContextListeners(
    context: BrowserContext,
    sessionId: string
  ): void {
    context.on('page', page => {
      this.logger.debug('New page created in context', { sessionId });
      this.setupPageListeners(page, sessionId);
    });

    context.on('close', () => {
      this.logger.debug('Context closed', { sessionId });
    });
  }

  /**
   * Configura event listeners para la página
   */
  private static setupPageListeners(
    page: Page,
    sessionId: string
  ): void {
    const logger = LoggerFactory.getSessionLogger(sessionId, 'Page');

    page.on('console', msg => {
      if (msg.type() === 'error') {
        logger.error(`Console error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        logger.warn(`Console warning: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      logger.error('Page error', error);
    });

    page.on('crash', () => {
      logger.fatal('Page crashed');
    });

    page.on('close', () => {
      logger.debug('Page closed');
    });

    page.on('requestfailed', request => {
      logger.warn('Request failed', {
        url: request.url(),
        failure: request.failure()
      });
    });
  }

  /**
   * Genera un ID de sesión único
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtiene estadísticas de las sesiones
   */
  static getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    inactiveSessions: number;
    totalPages: number;
    avgSessionDuration: number;
  } {
    let activeSessions = 0;
    let inactiveSessions = 0;
    let totalPages = 0;
    let totalDuration = 0;

    for (const session of this.sessions.values()) {
      if (!session.page.isClosed()) {
        activeSessions++;
        totalPages += session.context.pages().length;
      } else {
        inactiveSessions++;
      }
      
      totalDuration += Date.now() - session.createdAt.getTime();
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      inactiveSessions,
      totalPages,
      avgSessionDuration: this.sessions.size > 0 
        ? totalDuration / this.sessions.size 
        : 0
    };
  }
}