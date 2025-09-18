// src/core/logging/LoggerFactory.ts

import { Logger } from './Logger';
import { LogContext } from '../../types/FrameworkTypes';
import { LoggingConfig } from '../../types/ConfigTypes';
import { ConfigManager } from '../config/ConfigManager';

/**
 * Factory para crear loggers con contexto específico
 * Gestiona la creación y cache de loggers para diferentes componentes
 */
export class LoggerFactory {
  private static loggers: Map<string, Logger> = new Map();
  private static defaultConfig: LoggingConfig | null = null;

  /**
   * Crea o retorna un logger para un componente específico
   */
  static getLogger(component: string, additionalContext?: LogContext): Logger {
    const config = this.getLoggingConfig();
    const context: LogContext = {
      component,
      ...additionalContext
    };

    const key = this.generateKey(component, additionalContext);
    
    if (!this.loggers.has(key)) {
      const logger = new Logger(config, context);
      this.loggers.set(key, logger);
    }
    
    return this.loggers.get(key)!;
  }

  /**
   * Crea un logger para una sesión específica
   */
  static getSessionLogger(sessionId: string, component: string): Logger {
    return this.getLogger(component, { sessionId });
  }

  /**
   * Crea un logger para una operación específica
   */
  static getOperationLogger(
    component: string, 
    operation: string, 
    sessionId?: string
  ): Logger {
    return this.getLogger(component, { 
      action: operation, 
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Crea un logger para testing
   */
  static getTestLogger(testName: string, suiteName?: string): Logger {
    return this.getLogger('Test', {
      test: testName,
      suite: suiteName,
      environment: 'test'
    });
  }

  /**
   * Actualiza la configuración de logging para todos los loggers
   */
  static updateConfig(config: LoggingConfig): void {
    this.defaultConfig = config;
    // Limpiar cache de loggers para forzar recreación con nueva config
    this.loggers.clear();
  }

  /**
   * Obtiene la configuración de logging actual
   */
  private static getLoggingConfig(): LoggingConfig {
    if (!this.defaultConfig) {
      try {
        const configManager = ConfigManager.getInstance();
        this.defaultConfig = configManager.getConfig().logging;
      } catch {
        // Si ConfigManager no está inicializado, usar config por defecto
        this.defaultConfig = {
          level: 'info',
          console: true,
          file: false,
          path: 'logs',
          prettyPrint: true,
          timestamp: true
        };
      }
    }
    return this.defaultConfig;
  }

  /**
   * Genera una clave única para el cache de loggers
   */
  private static generateKey(component: string, context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) {
      return component;
    }
    
    const contextStr = Object.entries(context)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    
    return `${component}|${contextStr}`;
  }

  /**
   * Limpia todos los loggers del cache
   */
  static clearCache(): void {
    for (const logger of this.loggers.values()) {
      logger.close();
    }
    this.loggers.clear();
  }

  /**
   * Obtiene estadísticas de uso de loggers
   */
  static getStats(): {
    totalLoggers: number;
    components: string[];
    memoryUsage: number;
  } {
    const components = new Set<string>();
    
    for (const key of this.loggers.keys()) {
      const component = key.split('|')[0];
      components.add(component);
    }
    
    return {
      totalLoggers: this.loggers.size,
      components: Array.from(components),
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  /**
   * Crea un logger silencioso (útil para testing)
   */
  static getSilentLogger(component: string = 'Silent'): Logger {
    const silentConfig: LoggingConfig = {
      level: 'fatal', // Solo logs fatales
      console: false,
      file: false,
      path: '',
      prettyPrint: false,
      timestamp: false
    };
    
    return new Logger(silentConfig, { component, silent: true });
  }
}