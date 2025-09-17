/**
 * 🏭 LoggerFactory.ts
 * 
 * Factory para crear instancias de Logger con contexto específico.
 * Permite crear loggers especializados para cada componente del framework.
 * 
 * ¿Por qué un Factory para Loggers?
 * - Cada componente puede tener su propio logger con contexto
 * - Facilita filtrar logs por componente
 * - Permite configuración específica por módulo
 * - Gestión centralizada de todas las instancias de logger
 */

import { Logger, LogContext } from './Logger';
import { ConfigManager } from '../config/ConfigManager';
import { LogLevel } from '../../types/FrameworkTypes';

/**
 * 📋 Configuración específica para un logger
 */
export interface LoggerConfig {
  name: string;                    // Nombre del logger
  level?: LogLevel;                // Nivel específico (override global)
  context?: LogContext;            // Contexto inicial
  enabled?: boolean;               // Si está habilitado
  console?: boolean;               // Override para consola
  file?: boolean;                  // Override para archivo
}

/**
 * 🏭 Clase LoggerFactory - Crea y gestiona loggers
 */
export class LoggerFactory {
  private static loggers: Map<string, Logger> = new Map();
  private static globalContext: LogContext = {};
  private static config = ConfigManager.getInstance().get('logging');
  
  /**
   * 🎯 Crear o obtener un logger
   * Si ya existe, lo devuelve. Si no, lo crea.
   */
  public static getLogger(name: string, context?: LogContext): Logger {
    // Si ya existe, actualizar contexto y devolver
    if (this.loggers.has(name)) {
      const logger = this.loggers.get(name)!;
      if (context) {
        logger.setContext({ ...this.globalContext, ...context });
      }
      return logger;
    }
    
    // Crear nuevo logger
    const logger = this.createLogger(name, context);
    this.loggers.set(name, logger);
    
    return logger;
  }
  
  /**
   * 🔧 Crear un nuevo logger con configuración
   */
  public static createLogger(name: string, context?: LogContext): Logger {
    const finalContext = {
      ...this.globalContext,
      ...context,
      component: name  // Agregar nombre del componente al contexto
    };
    
    return new Logger(name, finalContext);
  }
  
  /**
   * 🌍 Establecer contexto global para todos los loggers
   * Útil para agregar información común como sessionId, testName, etc.
   */
  public static setGlobalContext(context: LogContext): void {
    this.globalContext = { ...this.globalContext, ...context };
    
    // Actualizar contexto en loggers existentes
    this.loggers.forEach(logger => {
      logger.setContext(this.globalContext);
    });
  }
  
  /**
   * 🔄 Limpiar contexto global
   */
  public static clearGlobalContext(): void {
    this.globalContext = {};
    
    // Limpiar contexto en loggers existentes
    this.loggers.forEach(logger => {
      logger.clearContext();
    });
  }
  
  /**
   * 🎯 Crear logger para un componente específico del framework
   */
  public static forComponent(component: ComponentType, context?: LogContext): Logger {
    return this.getLogger(component, context);
  }
  
  /**
   * 🧪 Crear logger para un test
   */
  public static forTest(testName: string, context?: LogContext): Logger {
    return this.getLogger('Test', {
      testName,
      ...context
    });
  }
  
  /**
   * 📄 Crear logger para una página específica
   */
  public static forPage(pageName: string, context?: LogContext): Logger {
    return this.getLogger('Page', {
      page: pageName,
      ...context
    });
  }
  
  /**
   * 🎯 Crear logger para una acción específica
   */
  public static forAction(actionName: string, context?: LogContext): Logger {
    return this.getLogger('Action', {
      action: actionName,
      ...context
    });
  }
  
  /**
   * 📊 Obtener estadísticas de los loggers
   */
  public static getStats(): LoggerStats {
    return {
      totalLoggers: this.loggers.size,
      loggers: Array.from(this.loggers.keys()),
      globalContext: this.globalContext,
      config: this.config
    };
  }
  
  /**
   * 🔄 Flush de todos los loggers
   * Asegura que todos los logs se escriban antes de cerrar
   */
  public static async flushAll(): Promise<void> {
    const flushPromises = Array.from(this.loggers.values()).map(logger => 
      logger.flush()
    );
    
    await Promise.all(flushPromises);
  }
  
  /**
   * 🗑️ Limpiar un logger específico
   */
  public static removeLogger(name: string): void {
    this.loggers.delete(name);
  }
  
  /**
   * 🗑️ Limpiar todos los loggers
   */
  public static clear(): void {
    this.loggers.clear();
    this.globalContext = {};
  }
  
  /**
   * 🎨 Crear un logger decorado con funciones helper
   * Útil para componentes que necesitan logging especializado
   */
  public static createDecoratedLogger(name: string, context?: LogContext): DecoratedLogger {
    const logger = this.getLogger(name, context);
    
    return {
      logger,
      
      // Métodos de logging estándar
      trace: (msg: string, data?: any) => logger.trace(msg, data),
      debug: (msg: string, data?: any) => logger.debug(msg, data),
      info: (msg: string, data?: any) => logger.info(msg, data),
      warn: (msg: string, data?: any) => logger.warn(msg, data),
      error: (msg: string, error?: Error, data?: any) => logger.error(msg, error, data),
      fatal: (msg: string, error?: Error, data?: any) => logger.fatal(msg, error, data),
      
      // Métodos especializados con formato predefinido
      start: (operation: string) => {
        logger.info(`▶️ Iniciando: ${operation}`);
        logger.startTimer();
      },
      
      success: (operation: string, data?: any) => {
        const duration = logger.stopTimer();
        logger.info(`✅ Completado: ${operation}`, { ...data, duration });
      },
      
      fail: (operation: string, error?: Error, data?: any) => {
        const duration = logger.stopTimer();
        logger.error(`❌ Fallido: ${operation}`, error, { ...data, duration });
      },
      
      step: (stepNumber: number, description: string) => {
        logger.info(`📍 Paso ${stepNumber}: ${description}`);
      },
      
      metric: (name: string, value: number, unit?: string) => {
        logger.info(`📊 Métrica: ${name} = ${value}${unit ? ' ' + unit : ''}`, {
          metric: name,
          value,
          unit
        });
      },
      
      section: (title: string) => {
        logger.info(`${'='.repeat(50)}`);
        logger.info(`📌 ${title}`);
        logger.info(`${'='.repeat(50)}`);
      }
    };
  }
}

/**
 * 📋 Tipos de componentes del framework
 */
export enum ComponentType {
  BROWSER_FACTORY = 'BrowserFactory',
  CONFIG_MANAGER = 'ConfigManager',
  ELEMENT_MANAGER = 'ElementManager',
  SESSION_MANAGER = 'SessionManager',
  DATA_MANAGER = 'DataManager',
  SCREENSHOT_HELPER = 'ScreenshotHelper',
  NAVIGATION = 'NavigationActions',
  GESTURES = 'GestureActions',
  INPUT = 'InputActions',
  VALIDATION = 'ValidationHelpers',
  UTILITIES = 'Utilities',
  FIXTURES = 'Fixtures'
}

/**
 * 📊 Estadísticas de los loggers
 */
interface LoggerStats {
  totalLoggers: number;
  loggers: string[];
  globalContext: LogContext;
  config: any;
}

/**
 * 🎨 Logger decorado con métodos helper
 */
export interface DecoratedLogger {
  logger: Logger;
  
  // Métodos estándar
  trace: (msg: string, data?: any) => void;
  debug: (msg: string, data?: any) => void;
  info: (msg: string, data?: any) => void;
  warn: (msg: string, data?: any) => void;
  error: (msg: string, error?: Error, data?: any) => void;
  fatal: (msg: string, error?: Error, data?: any) => void;
  
  // Métodos especializados
  start: (operation: string) => void;
  success: (operation: string, data?: any) => void;
  fail: (operation: string, error?: Error, data?: any) => void;
  step: (stepNumber: number, description: string) => void;
  metric: (name: string, value: number, unit?: string) => void;
  section: (title: string) => void;
}

/**
 * 🎯 Helper para crear loggers temáticos
 */
export class ThemedLogger {
  private logger: Logger;
  
  constructor(name: string, private theme: LogTheme) {
    this.logger = LoggerFactory.getLogger(name);
  }
  
  public log(level: LogLevel, message: string, data?: any): void {
    const themedMessage = this.applyTheme(message);
    this.logger[level](themedMessage, data);
  }
  
  private applyTheme(message: string): string {
    switch (this.theme) {
      case LogTheme.SUCCESS:
        return `✅ ${message}`;
      case LogTheme.ERROR:
        return `❌ ${message}`;
      case LogTheme.WARNING:
        return `⚠️ ${message}`;
      case LogTheme.INFO:
        return `ℹ️ ${message}`;
      case LogTheme.DEBUG:
        return `🐛 ${message}`;
      case LogTheme.PERFORMANCE:
        return `⚡ ${message}`;
      case LogTheme.SECURITY:
        return `🔒 ${message}`;
      case LogTheme.NETWORK:
        return `🌐 ${message}`;
      case LogTheme.DATABASE:
        return `💾 ${message}`;
      default:
        return message;
    }
  }
}

/**
 * 🎨 Temas para logs
 */
export enum LogTheme {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  NETWORK = 'network',
  DATABASE = 'database'
}

/**
 * 🔧 Configurador de loggers por módulo
 * Permite configurar niveles específicos para cada módulo
 */
export class LoggerConfigurator {
  private static moduleConfigs: Map<string, LoggerConfig> = new Map();
  
  /**
   * Configurar nivel para un módulo específico
   */
  public static setModuleLevel(moduleName: string, level: LogLevel): void {
    const config = this.moduleConfigs.get(moduleName) || { name: moduleName };
    config.level = level;
    this.moduleConfigs.set(moduleName, config);
    
    // Actualizar logger si existe
    const logger = LoggerFactory.loggers.get(moduleName);
    if (logger) {
      // Recrear con nuevo nivel
      LoggerFactory.loggers.delete(moduleName);
      LoggerFactory.getLogger(moduleName);
    }
  }
  
  /**
   * Obtener configuración de un módulo
   */
  public static getModuleConfig(moduleName: string): LoggerConfig | undefined {
    return this.moduleConfigs.get(moduleName);
  }
  
  /**
   * Habilitar/deshabilitar módulo
   */
  public static setModuleEnabled(moduleName: string, enabled: boolean): void {
    const config = this.moduleConfigs.get(moduleName) || { name: moduleName };
    config.enabled = enabled;
    this.moduleConfigs.set(moduleName, config);
  }
}