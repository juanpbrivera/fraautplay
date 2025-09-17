// src/core/logging/Logger.ts

import pino, { Logger as PinoLogger } from 'pino';
import { LogContext, LogLevel } from '../../types/FrameworkTypes';
import { LoggingConfig } from '../../types/ConfigTypes';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Logger centralizado con Pino
 * Proporciona logging estructurado con niveles, contexto y formato personalizable
 */
export class Logger {
  private pinoLogger: PinoLogger;
  private config: LoggingConfig;
  private context: LogContext;
  private static instances: Map<string, Logger> = new Map();

  constructor(config: LoggingConfig, context: LogContext = {}) {
    this.config = config;
    this.context = context;
    this.pinoLogger = this.createPinoLogger();
  }

  /**
   * Crea una instancia de Pino con la configuración especificada
   */
  private createPinoLogger(): PinoLogger {
    const streams: any[] = [];

    // Stream de consola
    if (this.config.console) {
      const consoleStream = this.config.prettyPrint
        ? pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: this.config.timestamp ? 'UTC:yyyy-mm-dd HH:MM:ss.l' : false,
              ignore: 'pid,hostname',
              messageFormat: '{msg} {context}',
            },
          })
        : process.stdout;

      streams.push({ stream: consoleStream });
    }

    // Stream de archivo
    if (this.config.file) {
      this.ensureLogDirectory();
      const logFile = path.join(this.config.path, `framework-${new Date().toISOString().split('T')[0]}.log`);
      streams.push({
        stream: pino.destination({
          dest: logFile,
          sync: false,
        }),
      });
    }

    // Configuración base de Pino
    const options: pino.LoggerOptions = {
      level: this.config.level,
      timestamp: this.config.timestamp ? pino.stdTimeFunctions.isoTime : false,
      base: {
        framework: 'web-automation',
        ...this.context,
      },
      serializers: {
        error: pino.stdSerializers.err,
      },
    };

    // Crear logger con múltiples streams si es necesario
    if (streams.length > 1) {
      return pino(options, pino.multistream(streams));
    } else if (streams.length === 1) {
      return pino(options, streams[0].stream);
    } else {
      return pino(options);
    }
  }

  /**
   * Asegura que el directorio de logs existe
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.path)) {
      fs.mkdirSync(this.config.path, { recursive: true });
    }
  }

  /**
   * Obtiene o crea una instancia de logger para un contexto específico
   */
  static getInstance(config: LoggingConfig, context: LogContext = {}): Logger {
    const key = JSON.stringify({ ...config, ...context });
    
    if (!Logger.instances.has(key)) {
      Logger.instances.set(key, new Logger(config, context));
    }
    
    return Logger.instances.get(key)!;
  }

  /**
   * Añade contexto adicional al logger
   */
  withContext(additionalContext: LogContext): Logger {
    const newContext = { ...this.context, ...additionalContext };
    return new Logger(this.config, newContext);
  }

  /**
   * Log de nivel fatal
   */
  fatal(message: string, data?: any): void {
    this.pinoLogger.fatal({ ...this.context, ...data }, message);
  }

  /**
   * Log de nivel error
   */
  error(message: string, error?: Error | any, data?: any): void {
    if (error instanceof Error) {
      this.pinoLogger.error({ ...this.context, error, ...data }, message);
    } else {
      this.pinoLogger.error({ ...this.context, ...error, ...data }, message);
    }
  }

  /**
   * Log de nivel warning
   */
  warn(message: string, data?: any): void {
    this.pinoLogger.warn({ ...this.context, ...data }, message);
  }

  /**
   * Log de nivel info
   */
  info(message: string, data?: any): void {
    this.pinoLogger.info({ ...this.context, ...data }, message);
  }

  /**
   * Log de nivel debug
   */
  debug(message: string, data?: any): void {
    this.pinoLogger.debug({ ...this.context, ...data }, message);
  }

  /**
   * Log de nivel trace
   */
  trace(message: string, data?: any): void {
    this.pinoLogger.trace({ ...this.context, ...data }, message);
  }

  /**
   * Log de inicio de operación
   */
  startOperation(operation: string, details?: any): void {
    this.info(`Starting ${operation}`, { operation, ...details, startTime: new Date().toISOString() });
  }

  /**
   * Log de fin de operación
   */
  endOperation(operation: string, duration: number, success: boolean, details?: any): void {
    const level = success ? 'info' : 'error';
    this.pinoLogger[level](
      { ...this.context, operation, duration, success, ...details },
      `Completed ${operation} in ${duration}ms`
    );
  }

  /**
   * Log de métrica
   */
  metric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.info(`Metric: ${name}`, {
      metric: {
        name,
        value,
        unit,
        tags,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Obtiene el logger interno de Pino
   */
  getPinoLogger(): PinoLogger {
    return this.pinoLogger;
  }

  /**
   * Cierra los streams del logger
   */
  close(): void {
    // Pino maneja el cierre automáticamente, pero podemos forzar el flush
    this.pinoLogger.flush();
  }
}