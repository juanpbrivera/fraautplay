/**
 * 🚀 Web Automation Framework
 * 
 * Framework empresarial para automatización web basado en Playwright.
 * Diseñado para ser consumido por múltiples soluciones de automatización.
 * 
 * @version 1.0.0
 * @author Equipo de Automatización
 * @license MIT
 */

// ============================================================================
// EXPORTACIONES PRINCIPALES
// ============================================================================

// 🏗️ Core - Componentes fundamentales
export { BrowserFactory } from './core/browsers/BrowserFactory';
export {
  BrowserPresets,
  DeviceProfiles,
  BrowserConfigBuilder,
  BrowserOptionsUtils
} from './core/browsers/BrowserOptions';

export { ConfigManager } from './core/config/ConfigManager';
export {
  DEFAULT_CONFIG,
  DEV_CONFIG,
  PROD_CONFIG,
  CI_CONFIG,
  MOBILE_CONFIG,
  getConfigByEnvironment,
  validateConfig,
  mergeConfigs
} from './core/config/DefaultConfig';

export { Logger, LogContext } from './core/logging/Logger';
export {
  LoggerFactory,
  ComponentType,
  DecoratedLogger,
  ThemedLogger,
  LogTheme,
  LoggerConfigurator
} from './core/logging/LoggerFactory';

// 🎯 Elements - Gestión de elementos web
export { ElementManager, ElementManagerOptions } from './elements/ElementManager';
export {
  LocatorBuilder,
  AdvancedLocatorOptions,
  LocatorInfo,
  ElementInfo,
  CommonSelectors
} from './elements/Locators';
export {
  WaitManager,
  WaitOptions,
  WaitCondition
} from './elements/WaitStrategies';
export {
  ElementActions,
  DragDropOptions,
  ScrollOptions
} from './elements/ElementActions';

// 🎬 Interactions - Acciones e interacciones
export {
  NavigationActions,
  AdvancedNavigationOptions,
  TabInfo
} from './interactions/NavigationActions';
export {
  GestureActions,
  ScrollOptions as GestureScrollOptions,
  PinchOptions,
  LongPressOptions,
  CustomGestureOptions
} from './interactions/GestureActions';
export {
  InputActions,
  AdvancedTypeOptions,
  ClearOptions,
  InputValidation
} from './interactions/InputActions';

// ✅ Validations - Sistema de validaciones
export {
  AssertionHelpers,
  AssertionOptions,
  AssertionResult
} from './validations/AssertionHelpers';
export {
  ValidationStrategies,
  ValidationStrategy,
  FormValidationResult,
  TableValidationResult,
  ApplicationState
} from './validations/ValidationStrategies';
export { expect, setupCustomMatchers } from './validations/CustomMatchers';

// 🛠️ Utilities - Utilidades reutilizables
export {
  DataManager,
  CSVLoadOptions,
  DataFilterOptions,
  DataSchema
} from './utilities/DataManager';
export {
  ScreenshotHelper,
  AdvancedScreenshotOptions,
  ScreenshotResult
} from './utilities/ScreenshotHelper';
export {
  FileUtils,
  FileInfo,
  DownloadMonitorOptions,
  DownloadResult
} from './utilities/FileUtils';

// 🔐 Session - Gestión de sesiones
export {
  SessionManager,
  SessionOptions,
  SessionState
} from './session/SessionManager';

// 📋 Types - Tipos TypeScript
export * from './types/FrameworkTypes';
export * from './types/ConfigTypes';

// ============================================================================
// CLASE PRINCIPAL DEL FRAMEWORK
// ============================================================================

import { SessionManager } from './session/SessionManager';
import { ConfigManager } from './core/config/ConfigManager';
import { LoggerFactory } from './core/logging/LoggerFactory';
import { BrowserFactory } from './core/browsers/BrowserFactory';
import { FrameworkConfiguration } from './types/ConfigTypes';
import { expect as baseExpect } from '@playwright/test';

/**
 * 🎯 Clase principal del Framework
 * Punto de entrada unificado para todas las funcionalidades
 */
export class WebAutomationFramework {
  private static instance: WebAutomationFramework;
  private static isInitialized = false;
  private configManager: ConfigManager;
  
  /**
   * Constructor privado (Singleton)
   */
  private constructor() {
    this.configManager = ConfigManager.getInstance();
  }
  
  /**
   * 🚀 Inicializar el framework
   */
  public static async initialize(
    config?: Partial<FrameworkConfiguration> | string
  ): Promise<WebAutomationFramework> {
    if (!WebAutomationFramework.instance) {
      WebAutomationFramework.instance = new WebAutomationFramework();
    }
    
    const instance = WebAutomationFramework.instance;
    
    // Cargar configuración
    if (typeof config === 'string') {
      // Si es string, es la ruta al archivo de configuración
      ConfigManager.getInstance(config);
    } else if (config) {
      // Si es objeto, aplicar configuración
      const configManager = ConfigManager.getInstance();
      Object.entries(config).forEach(([key, value]) => {
        configManager.set(key, value);
      });
    }
    
    // Configurar logging global
    LoggerFactory.setGlobalContext({
      framework: 'web-automation-framework',
      version: '1.0.0',
      environment: instance.configManager.get('environment.name')
    });
    
    // Configurar matchers personalizados
    const { setupCustomMatchers } = await import('./validations/CustomMatchers');
    setupCustomMatchers();
    
    WebAutomationFramework.isInitialized = true;
    
    const logger = LoggerFactory.forComponent('Framework' as any);
    logger.info('🚀 Web Automation Framework inicializado', {
      environment: instance.configManager.get('environment.name'),
      browser: instance.configManager.get('browser.type'),
      headless: instance.configManager.get('browser.headless')
    });
    
    return instance;
  }
  
  /**
   * 🎯 Crear nueva sesión de automatización
   */
  public async createSession(options?: any): Promise<SessionManager> {
    this.ensureInitialized();
    return await SessionManager.create(options);
  }
  
  /**
   * 🔍 Obtener sesión existente
   */
  public getSession(sessionId: string): SessionManager | undefined {
    this.ensureInitialized();
    return SessionManager.getSession(sessionId);
  }
  
  /**
   * 📊 Obtener todas las sesiones activas
   */
  public getAllSessions(): SessionManager[] {
    this.ensureInitialized();
    return SessionManager.getAllSessions();
  }
  
  /**
   * 🧹 Cerrar todas las sesiones
   */
  public async closeAllSessions(): Promise<void> {
    this.ensureInitialized();
    await SessionManager.closeAllSessions();
    await BrowserFactory.closeAllSessions();
  }
  
  /**
   * 🔧 Obtener configuración
   */
  public getConfig(path?: string): any {
    this.ensureInitialized();
    return path ? this.configManager.get(path) : this.configManager.getConfig();
  }
  
  /**
   * 🔧 Establecer configuración
   */
  public setConfig(path: string, value: any): void {
    this.ensureInitialized();
    this.configManager.set(path, value);
  }
  
  /**
   * 🔄 Recargar configuración
   */
  public reloadConfig(): void {
    this.ensureInitialized();
    this.configManager.reload();
  }
  
  /**
   * 📊 Obtener estadísticas del framework
   */
  public getStats(): any {
    this.ensureInitialized();
    return {
      sessions: SessionManager.getAllSessions().length,
      browsers: BrowserFactory.getStats(),
      config: {
        environment: this.configManager.get('environment.name'),
        browser: this.configManager.get('browser.type')
      }
    };
  }
  
  /**
   * 🧹 Limpiar recursos
   */
  public async cleanup(): Promise<void> {
    this.ensureInitialized();
    
    const logger = LoggerFactory.forComponent('Framework' as any);
    logger.info('🧹 Limpiando recursos del framework...');
    
    // Cerrar todas las sesiones
    await this.closeAllSessions();
    
    // Flush de logs
    await LoggerFactory.flushAll();
    
    // Limpiar caché de configuración
    this.configManager.clearCache?.();
    
    logger.info('✅ Limpieza completada');
  }
  
  /**
   * 🔍 Obtener instancia del framework (Singleton)
   */
  public static getInstance(): WebAutomationFramework {
    if (!WebAutomationFramework.instance) {
      throw new Error(
        'Framework no inicializado. Llame a WebAutomationFramework.initialize() primero.'
      );
    }
    return WebAutomationFramework.instance;
  }
  
  /**
   * ✅ Verificar que el framework está inicializado
   */
  private ensureInitialized(): void {
    if (!WebAutomationFramework.isInitialized) {
      throw new Error(
        'Framework no inicializado. Llame a WebAutomationFramework.initialize() primero.'
      );
    }
  }
}

// ============================================================================
// FUNCIONES HELPER DE ALTO NIVEL
// ============================================================================

/**
 * 🚀 Inicializar framework (función helper)
 */
export async function initialize(
  config?: Partial<FrameworkConfiguration> | string
): Promise<WebAutomationFramework> {
  return await WebAutomationFramework.initialize(config);
}

/**
 * 🎯 Crear sesión rápida (función helper)
 */
export async function createSession(options?: any): Promise<SessionManager> {
  const framework = await WebAutomationFramework.initialize();
  return await framework.createSession(options);
}

/**
 * 🧹 Limpiar todo (función helper)
 */
export async function cleanup(): Promise<void> {
  const framework = WebAutomationFramework.getInstance();
  await framework.cleanup();
}

// ============================================================================
// RE-EXPORTAR PLAYWRIGHT TYPES
// ============================================================================

export type {
  Page,
  Browser,
  BrowserContext,
  Locator,
  Frame,
  Response,
  Request,
  Route,
  Cookie,
  StorageState,
  APIResponse,
  Download,
  Video,
  Tracing
} from '@playwright/test';

// ============================================================================
// VERSIÓN Y METADATA
// ============================================================================

export const VERSION = '1.0.0';
export const FRAMEWORK_NAME = 'Web Automation Framework';
export const AUTHOR = 'Equipo de Automatización';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default WebAutomationFramework;

/**
 * 📚 Ejemplo de uso básico:
 * 
 * ```typescript
 * import { WebAutomationFramework } from '@banco/web-automation-framework';
 * 
 * // Inicializar framework
 * const framework = await WebAutomationFramework.initialize({
 *   environment: { name: 'test', baseUrl: 'https://example.com' },
 *   browser: { type: 'chromium', headless: false }
 * });
 * 
 * // Crear sesión
 * const session = await framework.createSession({
 *   name: 'Mi Test',
 *   tags: ['regression', 'login']
 * });
 * 
 * // Usar el framework
 * await session.navigation.goto('https://example.com');
 * await session.elements.click({ strategy: 'css', value: '#login-button' });
 * await session.input.typeText({ strategy: 'css', value: '#username' }, 'user@example.com');
 * 
 * // Validaciones
 * await session.assertions.toBeVisible({ strategy: 'css', value: '.dashboard' });
 * 
 * // Cerrar sesión
 * await session.close();
 * ```
 */