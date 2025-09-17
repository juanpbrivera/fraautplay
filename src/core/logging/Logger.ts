/**
 * 🔍 Logger.ts
 * 
 * Sistema de logging centralizado del framework.
 * Piensa en el logger como una "caja negra" de un avión - registra TODO lo que pasa.
 * 
 * ¿Por qué es importante el logging?
 * - Debugging: Ver qué está pasando cuando algo falla
 * - Auditoría: Registro de todas las acciones
 * - Monitoreo: Detectar problemas en producción
 * - Análisis: Entender el comportamiento del sistema
 * 
 * Usamos Pino porque es:
 * - MUY rápido (no impacta el rendimiento)
 * - Estructurado (JSON logs)
 * - Flexible (múltiples destinos)
 */

import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';
import pinoPretty from 'pino-pretty';
import * as fs from 'fs';
import * as path from 'path';
import { LogLevel, FrameworkError, ErrorCode } from '../../types/FrameworkTypes';
import { ConfigManager } from '../config/ConfigManager';

/**
 * 📊 Contexto adicional para logs
 * Permite agregar información extra a cada log
 */
export interface LogContext {
  sessionId?: string;      // ID de la sesión actual
  testName?: string;       // Nombre del test ejecutándose
  step?: string;           // Paso actual
  browser?: string;        // Navegador usado
  page?: string;           // Página actual
  element?: string;        // Elemento involucrado
  action?: string;         // Acción ejecutada
  duration?: number;       // Duración en ms
  error?: Error;           // Error si hubo
  screenshot?: string;     // Path del screenshot
  metadata?: Record<string, any>; // Datos adicionales
}

/**
 * 🎯 Clase Logger - Maneja todo el logging del framework
 */
export class Logger {
  private pinoLogger: PinoLogger;
  private context: LogContext = {};
  private startTime?: Date;
  private config: any;
  
  /**
   * Constructor del Logger
   * @param name - Nombre del logger (ej: 'BrowserFactory', 'ElementManager')
   * @param context - Contexto inicial
   */
  constructor(name: string, context?: LogContext) {
    const configManager = ConfigManager.getInstance();
    this.config = configManager.get('logging');
    
    // Configurar opciones de Pino
    const options: LoggerOptions = {
      name,
      level: this.config.level || 'info',
      
      // Agregar información base a todos los logs
      base: {
        framework: 'web-automation-framework',
        environment: configManager.get('environment.name'),
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost'
      },
      
      // Formato de timestamp
      timestamp: this.config.timestamp ? pino.stdTimeFunctions.isoTime : false,
      
      // Serializers personalizados para objetos especiales
      serializers: {
        error: this.errorSerializer,
        req: this.requestSerializer,
        res: this.responseSerializer
      },
      
      // Hooks para procesar logs
      hooks: {
        logMethod(inputArgs: any[], method: any) {
          // Agregar contexto a cada log
          if (inputArgs.length >= 2 && typeof inputArgs[1] === 'object') {
            inputArgs[1] = { ...context, ...inputArgs[1] };
          }
          return method.apply(this, inputArgs);
        }
      }
    };
    
    // Determinar destino del log
    const destinations = [];
    
    // 1️⃣ Consola con formato pretty
    if (this.config.console) {
      const prettyOptions = {
        colorize: this.config.colorize,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
        singleLine: false,
        
        // Colores personalizados por nivel
        customColors: 'err:red,warn:yellow,info:green,debug:blue',
        
        // Formato personalizado para diferentes niveles
        customLevels: {
          trace: 10,
          debug: 20,
          info: 30,
          warn: 40,
          error: 50,
          fatal: 60
        },
        
        // Iconos para cada nivel (más visual)
        customPrettifiers: {
          level: (logLevel: string) => {
            const icons: Record<string, string> = {
              trace: '🔍',
              debug: '🐛',
              info: '✅',
              warn: '⚠️',
              error: '❌',
              fatal: '💀'
            };
            return `${icons[logLevel] || '📝'} ${logLevel.toUpperCase()}`;
          }
        }
      };
      
      if (this.config.pretty) {
        destinations.push(pinoPretty(prettyOptions));
      } else {
        destinations.push(pino.destination({ sync: false }));
      }
    }
    
    // 2️⃣ Archivo de log
    if (this.config.file && this.config.filePath) {
      const logDir = path.dirname(this.config.filePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      destinations.push(
        pino.destination({
          dest: this.config.filePath,
          sync: false,
          mkdir: true
        })
      );
    }
    
    // Crear logger con múltiples destinos
    if (destinations.length > 1) {
      this.pinoLogger = pino(options, pino.multistream(destinations));
    } else if (destinations.length === 1) {
      this.pinoLogger = pino(options, destinations[0]);
    } else {
      // Si no hay destinos configurados, usar consola por defecto
      this.pinoLogger = pino(options);
    }
    
    // Establecer contexto inicial
    if (context) {
      this.setContext(context);
    }
  }
  
  /**
   * 🔄 Establecer contexto para futuros logs
   */
  public setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }
  
  /**
   * 🔄 Limpiar contexto
   */
  public clearContext(): void {
    this.context = {};
  }
  
  /**
   * ⏱️ Iniciar medición de tiempo
   */
  public startTimer(): void {
    this.startTime = new Date();
  }
  
  /**
   * ⏱️ Detener medición y obtener duración
   */
  public stopTimer(): number {
    if (!this.startTime) return 0;
    const duration = new Date().getTime() - this.startTime.getTime();
    this.startTime = undefined;
    return duration;
  }
  
  // 📊 Métodos de logging por nivel
  
  /**
   * 🔍 TRACE: Información súper detallada (debugging profundo)
   */
  public trace(message: string, data?: any): void {
    this.log('trace', message, data);
  }
  
  /**
   * 🐛 DEBUG: Información de debugging
   */
  public debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }
  
  /**
   * ✅ INFO: Información general del flujo
   */
  public info(message: string, data?: any): void {
    this.log('info', message, data);
  }
  
  /**
   * ⚠️ WARN: Advertencias (algo raro pero no crítico)
   */
  public warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }
  
  /**
   * ❌ ERROR: Errores recuperables
   */
  public error(message: string, error?: Error | any, data?: any): void {
    const logData = {
      ...data,
      error: error ? this.errorSerializer(error) : undefined
    };
    this.log('error', message, logData);
  }
  
  /**
   * 💀 FATAL: Errores críticos (detendrán la ejecución)
   */
  public fatal(message: string, error?: Error | any, data?: any): void {
    const logData = {
      ...data,
      error: error ? this.errorSerializer(error) : undefined
    };
    this.log('fatal', message, logData);
  }
  
  /**
   * 🎯 Método principal de logging
   */
  private log(level: string, message: string, data?: any): void {
    const logData = {
      ...this.context,
      ...data,
      timestamp: new Date().toISOString()
    };
    
    // Llamar al método correspondiente de Pino
    (this.pinoLogger as any)[level](logData, message);
  }
  
  // 📊 Métodos especializados para acciones comunes
  
  /**
   * 🌐 Log de navegación
   */
  public navigation(url: string, success: boolean, duration?: number): void {
    this.info(`Navegación a: ${url}`, {
      action: 'navigation',
      url,
      success,
      duration
    });
  }
  
  /**
   * 🎯 Log de búsqueda de elemento
   */
  public elementSearch(selector: string, found: boolean, duration?: number): void {
    const level = found ? 'debug' : 'warn';
    const message = found 
      ? `Elemento encontrado: ${selector}`
      : `Elemento NO encontrado: ${selector}`;
    
    this.log(level, message, {
      action: 'element_search',
      selector,
      found,
      duration
    });
  }
  
  /**
   * 🖱️ Log de acción sobre elemento
   */
  public elementAction(action: string, selector: string, success: boolean, details?: any): void {
    const level = success ? 'info' : 'error';
    const message = `${action} en elemento: ${selector}`;
    
    this.log(level, message, {
      action: `element_${action}`,
      selector,
      success,
      ...details
    });
  }
  
  /**
   * ✅ Log de validación/assertion
   */
  public assertion(description: string, passed: boolean, actual?: any, expected?: any): void {
    const level = passed ? 'info' : 'error';
    const status = passed ? 'PASÓ' : 'FALLÓ';
    const message = `Validación ${status}: ${description}`;
    
    this.log(level, message, {
      action: 'assertion',
      passed,
      actual,
      expected
    });
  }
  
  /**
   * 📸 Log de screenshot
   */
  public screenshot(path: string, reason?: string): void {
    this.debug(`Screenshot guardado: ${path}`, {
      action: 'screenshot',
      path,
      reason
    });
  }
  
  /**
   * 🎬 Log de inicio de test
   */
  public testStart(testName: string, metadata?: any): void {
    this.info(`🎬 INICIO TEST: ${testName}`, {
      action: 'test_start',
      testName,
      ...metadata
    });
  }
  
  /**
   * 🏁 Log de fin de test
   */
  public testEnd(testName: string, passed: boolean, duration?: number, metadata?: any): void {
    const emoji = passed ? '✅' : '❌';
    const status = passed ? 'PASÓ' : 'FALLÓ';
    
    this.info(`${emoji} FIN TEST: ${testName} - ${status}`, {
      action: 'test_end',
      testName,
      passed,
      duration,
      ...metadata
    });
  }
  
  /**
   * 📊 Log de métricas de rendimiento
   */
  public performance(metrics: any): void {
    this.info('📊 Métricas de rendimiento', {
      action: 'performance',
      metrics
    });
  }
  
  // 🔧 Serializers personalizados
  
  /**
   * 🔄 Serializer para errores
   */
  private errorSerializer(error: Error | FrameworkError | any): any {
    if (!error) return undefined;
    
    const serialized: any = {
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      stack: error.stack
    };
    
    // Si es un FrameworkError, agregar campos adicionales
    if (error instanceof FrameworkError || error.code) {
      serialized.code = error.code;
      serialized.details = error.details;
      serialized.screenshot = error.screenshot;
    }
    
    // Agregar propiedades adicionales
    Object.keys(error).forEach(key => {
      if (!['message', 'name', 'stack', 'code', 'details', 'screenshot'].includes(key)) {
        serialized[key] = (error as any)[key];
      }
    });
    
    return serialized;
  }
  
  /**
   * 🔄 Serializer para requests HTTP
   */
  private requestSerializer(req: any): any {
    if (!req) return undefined;
    
    return {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      params: req.params
    };
  }
  
  /**
   * 🔄 Serializer para responses HTTP
   */
  private responseSerializer(res: any): any {
    if (!res) return undefined;
    
    return {
      statusCode: res.statusCode || res.status,
      headers: res.headers,
      duration: res.duration
    };
  }
  
  /**
   * 🎯 Crear un child logger con contexto adicional
   * Útil para crear loggers específicos para cada componente
   */
  public child(context: LogContext): Logger {
    const childLogger = new Logger(this.pinoLogger.bindings().name || 'child', {
      ...this.context,
      ...context
    });
    return childLogger;
  }
  
  /**
   * 📝 Método helper para loggear grupos de información
   */
  public group(title: string, data: Record<string, any>): void {
    const formattedData = Object.entries(data)
      .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
      .join('\n');
    
    this.info(`📋 ${title}\n${formattedData}`);
  }
  
  /**
   * 🔄 Flush: Asegurar que todos los logs se escriban
   */
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.pinoLogger.flush(() => {
        resolve();
      });
    });
  }
}