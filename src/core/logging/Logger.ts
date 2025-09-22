// src/core/logging/Logger.ts

import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';
import { LogContext, LogLevel } from '../../types/FrameworkTypes';
import { LoggingConfig } from '../../types/ConfigTypes';
import * as fs from 'fs';
import * as path from 'path';

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

  private createPinoLogger(): PinoLogger {
    const streams: any[] = [];

    // Stream de consola con Pino 9.5.0
    if (this.config.console) {
      const consoleTransport = this.config.prettyPrint
        ? pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: this.config.timestamp ? 'UTC:yyyy-mm-dd HH:MM:ss.l' : false,
              ignore: 'pid,hostname',
              messageKey: 'msg',
              timestampKey: 'time',
              levelFirst: true,
              sync: false
            },
          })
        : pino.destination({ sync: false });

      streams.push({ stream: consoleTransport });
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

    // Configuración para Pino 9.5.0
    const options: LoggerOptions = {
      level: this.config.level,
      timestamp: this.config.timestamp ? pino.stdTimeFunctions.isoTime : false,
      base: this.context,
      serializers: {
        error: pino.stdSerializers.err,
        err: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res
      },
      formatters: {
        level(label: string, number: number) {
          return { level: number, levelLabel: label };
        }
      }
    };

    if (streams.length > 1) {
      return pino(options, pino.multistream(streams));
    } else if (streams.length === 1) {
      return pino(options, streams[0].stream);
    } else {
      return pino(options);
    }
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.path)) {
      fs.mkdirSync(this.config.path, { recursive: true });
    }
  }

  static getInstance(config: LoggingConfig, context: LogContext = {}): Logger {
    const key = JSON.stringify({ ...config, ...context });
    
    if (!Logger.instances.has(key)) {
      Logger.instances.set(key, new Logger(config, context));
    }
    
    return Logger.instances.get(key)!;
  }

  withContext(additionalContext: LogContext): Logger {
    const newContext = { ...this.context, ...additionalContext };
    return new Logger(this.config, newContext);
  }

  fatal(message: string, data?: any): void {
    this.pinoLogger.fatal({ ...this.context, ...data }, message);
  }

  error(message: string, error?: Error | any, data?: any): void {
    if (error instanceof Error) {
      this.pinoLogger.error({ ...this.context, err: error, ...data }, message);
    } else {
      this.pinoLogger.error({ ...this.context, ...error, ...data }, message);
    }
  }

  warn(message: string, data?: any): void {
    this.pinoLogger.warn({ ...this.context, ...data }, message);
  }

  info(message: string, data?: any): void {
    this.pinoLogger.info({ ...this.context, ...data }, message);
  }

  debug(message: string, data?: any): void {
    this.pinoLogger.debug({ ...this.context, ...data }, message);
  }

  trace(message: string, data?: any): void {
    this.pinoLogger.trace({ ...this.context, ...data }, message);
  }

  startOperation(operation: string, details?: any): void {
    this.info(`Starting ${operation}`, { 
      operation, 
      ...details, 
      startTime: new Date().toISOString() 
    });
  }

  endOperation(operation: string, duration: number, success: boolean, details?: any): void {
    const level = success ? 'info' : 'error';
    this.pinoLogger[level](
      { ...this.context, operation, duration, success, ...details },
      `Completed ${operation} in ${duration}ms`
    );
  }

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

  getPinoLogger(): PinoLogger {
    return this.pinoLogger;
  }

  close(): void {
    // En Pino 9.5.0, usar flush para asegurar que todos los logs se escriban
    if ('flush' in this.pinoLogger) {
      (this.pinoLogger as any).flush();
    }
  }
}