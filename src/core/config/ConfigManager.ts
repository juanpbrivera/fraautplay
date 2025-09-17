/**
 * 🔧 ConfigManager.ts
 * 
 * Este módulo gestiona TODA la configuración del framework.
 * Piensa en él como el "centro de control" donde se guardan todas las configuraciones.
 * 
 * ¿Qué hace?
 * - Lee configuración de archivos JSON/YAML
 * - Lee variables de entorno
 * - Combina múltiples fuentes de configuración
 * - Valida que la configuración sea correcta
 * 
 * ¿Por qué es importante?
 * - Permite cambiar configuración sin tocar código
 * - Diferentes configuraciones para diferentes ambientes (dev, test, prod)
 * - Configuración centralizada y validada
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
import Joi from 'joi';
import { BrowserConfig, LogLevel } from '../../types/FrameworkTypes';
import _ from 'lodash';

/**
 * 📋 Interface principal de configuración
 * Define TODAS las opciones configurables del framework
 */
export interface FrameworkConfig {
  // 🌐 Configuración del navegador
  browser: BrowserConfig;
  
  // ⏱️ Timeouts globales (en milisegundos)
  timeouts: {
    default: number;        // Timeout por defecto para acciones
    navigation: number;     // Timeout para navegación
    element: number;        // Timeout para buscar elementos
    assertion: number;      // Timeout para validaciones
    script: number;         // Timeout para scripts
    page: number;          // Timeout para carga de página
  };
  
  // 📸 Configuración de screenshots
  screenshots: {
    enabled: boolean;       // Si tomar screenshots
    onError: boolean;       // Screenshot en errores
    onTest: boolean;        // Screenshot en cada test
    path: string;          // Carpeta donde guardar
    fullPage: boolean;     // Capturar página completa
    quality?: number;      // Calidad JPEG (0-100)
    type: 'png' | 'jpeg';  // Formato
  };
  
  // 📊 Configuración de logging
  logging: {
    level: LogLevel;        // Nivel mínimo de log
    console: boolean;       // Mostrar en consola
    file: boolean;         // Guardar en archivo
    filePath?: string;     // Path del archivo
    colorize: boolean;     // Usar colores en consola
    timestamp: boolean;    // Incluir timestamp
    pretty: boolean;       // Formato legible
  };
  
  // 📁 Rutas del framework
  paths: {
    data: string;          // Carpeta de datos CSV
    downloads: string;     // Carpeta de descargas
    videos: string;        // Carpeta de videos
    reports: string;       // Carpeta de reportes
    temp: string;          // Carpeta temporal
  };
  
  // 🔄 Configuración de reintentos
  retry: {
    enabled: boolean;      // Habilitar reintentos
    attempts: number;      // Número de intentos
    delay: number;         // Demora entre intentos (ms)
    backoff: boolean;      // Incrementar demora exponencialmente
  };
  
  // 🌍 Configuración de ambiente
  environment: {
    name: string;          // Nombre del ambiente (dev, test, prod)
    baseUrl?: string;      // URL base de la aplicación
    apiUrl?: string;       // URL base de APIs
    variables?: Record<string, any>; // Variables personalizadas
  };
  
  // 🔐 Configuración de seguridad
  security: {
    ignoreHTTPSErrors: boolean;  // Ignorar errores HTTPS
    bypassCSP: boolean;          // Ignorar Content Security Policy
    credentials?: {              // Credenciales por defecto
      username?: string;
      password?: string;
    };
  };
  
  // 📈 Configuración de rendimiento
  performance: {
    collectMetrics: boolean;      // Recolectar métricas
    slowMo?: number;             // Ralentizar acciones (debugging)
    throttle?: {                 // Simular conexión lenta
      download: number;
      upload: number;
      latency: number;
    };
  };
  
  // 🎯 Configuración específica del proyecto
  project: {
    name?: string;               // Nombre del proyecto
    version?: string;            // Versión
    team?: string;               // Equipo responsable
    metadata?: Record<string, any>; // Metadata adicional
  };
}

/**
 * 🔍 Schema de validación con Joi
 * Define las reglas de validación para la configuración
 */
const configSchema = Joi.object({
  browser: Joi.object({
    type: Joi.string().valid('chromium', 'firefox', 'webkit', 'chrome', 'edge').required(),
    headless: Joi.boolean().default(false),
    slowMo: Joi.number().min(0).default(0),
    timeout: Joi.number().min(0).default(30000),
    viewport: Joi.object({
      width: Joi.number().min(320).default(1920),
      height: Joi.number().min(240).default(1080)
    }),
    locale: Joi.string().default('es-ES'),
    ignoreHTTPSErrors: Joi.boolean().default(false)
  }).required(),
  
  timeouts: Joi.object({
    default: Joi.number().min(0).default(30000),
    navigation: Joi.number().min(0).default(30000),
    element: Joi.number().min(0).default(10000),
    assertion: Joi.number().min(0).default(5000),
    script: Joi.number().min(0).default(30000),
    page: Joi.number().min(0).default(30000)
  }).required(),
  
  screenshots: Joi.object({
    enabled: Joi.boolean().default(true),
    onError: Joi.boolean().default(true),
    onTest: Joi.boolean().default(false),
    path: Joi.string().default('./screenshots'),
    fullPage: Joi.boolean().default(false),
    quality: Joi.number().min(0).max(100),
    type: Joi.string().valid('png', 'jpeg').default('png')
  }).required(),
  
  logging: Joi.object({
    level: Joi.string().valid('trace', 'debug', 'info', 'warn', 'error', 'fatal').default('info'),
    console: Joi.boolean().default(true),
    file: Joi.boolean().default(false),
    filePath: Joi.string(),
    colorize: Joi.boolean().default(true),
    timestamp: Joi.boolean().default(true),
    pretty: Joi.boolean().default(true)
  }).required(),
  
  paths: Joi.object({
    data: Joi.string().default('./data'),
    downloads: Joi.string().default('./downloads'),
    videos: Joi.string().default('./videos'),
    reports: Joi.string().default('./reports'),
    temp: Joi.string().default('./temp')
  }).required(),
  
  retry: Joi.object({
    enabled: Joi.boolean().default(true),
    attempts: Joi.number().min(1).max(10).default(3),
    delay: Joi.number().min(0).default(1000),
    backoff: Joi.boolean().default(true)
  }).required(),
  
  environment: Joi.object({
    name: Joi.string().default('test'),
    baseUrl: Joi.string().uri(),
    apiUrl: Joi.string().uri(),
    variables: Joi.object().pattern(Joi.string(), Joi.any())
  }).required(),
  
  security: Joi.object({
    ignoreHTTPSErrors: Joi.boolean().default(false),
    bypassCSP: Joi.boolean().default(false),
    credentials: Joi.object({
      username: Joi.string(),
      password: Joi.string()
    })
  }).required(),
  
  performance: Joi.object({
    collectMetrics: Joi.boolean().default(true),
    slowMo: Joi.number().min(0),
    throttle: Joi.object({
      download: Joi.number().min(0),
      upload: Joi.number().min(0),
      latency: Joi.number().min(0)
    })
  }).required(),
  
  project: Joi.object({
    name: Joi.string(),
    version: Joi.string(),
    team: Joi.string(),
    metadata: Joi.object()
  })
});

/**
 * 🎯 Clase ConfigManager - Gestiona toda la configuración
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: FrameworkConfig;
  private configPath?: string;
  private envPrefix = 'FRAMEWORK_'; // Prefijo para variables de entorno
  
  /**
   * Constructor privado (patrón Singleton)
   * @param configPath - Ruta opcional al archivo de configuración
   */
  private constructor(configPath?: string) {
    this.configPath = configPath;
    this.config = this.loadDefaultConfig();
    this.loadConfiguration();
  }
  
  /**
   * 🔄 Obtener instancia única (Singleton)
   * ¿Por qué Singleton? Queremos UNA SOLA configuración en todo el framework
   */
  public static getInstance(configPath?: string): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(configPath);
    }
    return ConfigManager.instance;
  }
  
  /**
   * 📦 Cargar configuración por defecto
   * Estos son los valores que usaremos si no se especifica nada
   */
  private loadDefaultConfig(): FrameworkConfig {
    return {
      browser: {
        type: 'chromium',
        headless: false,
        timeout: 30000,
        viewport: { width: 1920, height: 1080 },
        locale: 'es-ES',
        ignoreHTTPSErrors: false,
        javaScriptEnabled: true,
        acceptDownloads: true
      },
      timeouts: {
        default: 30000,
        navigation: 30000,
        element: 10000,
        assertion: 5000,
        script: 30000,
        page: 30000
      },
      screenshots: {
        enabled: true,
        onError: true,
        onTest: false,
        path: './screenshots',
        fullPage: false,
        type: 'png'
      },
      logging: {
        level: LogLevel.INFO,
        console: true,
        file: false,
        colorize: true,
        timestamp: true,
        pretty: true
      },
      paths: {
        data: './data',
        downloads: './downloads',
        videos: './videos',
        reports: './reports',
        temp: './temp'
      },
      retry: {
        enabled: true,
        attempts: 3,
        delay: 1000,
        backoff: true
      },
      environment: {
        name: 'test'
      },
      security: {
        ignoreHTTPSErrors: false,
        bypassCSP: false
      },
      performance: {
        collectMetrics: true
      },
      project: {}
    };
  }
  
  /**
   * 🔄 Cargar configuración de todas las fuentes
   */
  private loadConfiguration(): void {
    // 1️⃣ Cargar variables de entorno (.env)
    this.loadEnvironmentVariables();
    
    // 2️⃣ Cargar archivo de configuración si existe
    if (this.configPath) {
      this.loadConfigFile(this.configPath);
    } else {
      // Buscar archivos de configuración en orden de prioridad
      const configFiles = [
        'framework.config.json',
        'framework.config.yaml',
        'framework.config.yml',
        'config/framework.json',
        'config/framework.yaml'
      ];
      
      for (const file of configFiles) {
        if (fs.existsSync(file)) {
          this.loadConfigFile(file);
          break;
        }
      }
    }
    
    // 3️⃣ Sobrescribir con variables de entorno específicas
    this.overrideWithEnvironment();
    
    // 4️⃣ Validar configuración final
    this.validateConfiguration();
    
    // 5️⃣ Crear directorios necesarios
    this.ensureDirectories();
  }
  
  /**
   * 🌍 Cargar variables de entorno desde archivo .env
   */
  private loadEnvironmentVariables(): void {
    // Cargar archivo .env si existe
    const envFile = process.env.ENV_FILE || '.env';
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
    }
    
    // También cargar .env.{ambiente} si existe
    const environment = process.env.NODE_ENV || 'test';
    const envSpecificFile = `.env.${environment}`;
    if (fs.existsSync(envSpecificFile)) {
      dotenv.config({ path: envSpecificFile });
    }
  }
  
  /**
   * 📁 Cargar archivo de configuración (JSON o YAML)
   */
  private loadConfigFile(filePath: string): void {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const extension = path.extname(filePath).toLowerCase();
      
      let fileConfig: any;
      
      if (extension === '.json') {
        // Parsear JSON
        fileConfig = JSON.parse(fileContent);
      } else if (['.yaml', '.yml'].includes(extension)) {
        // Parsear YAML
        fileConfig = yaml.load(fileContent);
      } else {
        throw new Error(`Formato de archivo no soportado: ${extension}`);
      }
      
      // Mezclar con configuración existente (deep merge)
      this.config = _.merge(this.config, fileConfig);
      
      console.log(`✅ Configuración cargada desde: ${filePath}`);
    } catch (error) {
      console.error(`❌ Error cargando configuración desde ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * 🔄 Sobrescribir con variables de entorno
   * Las variables de entorno tienen la máxima prioridad
   */
  private overrideWithEnvironment(): void {
    // Browser
    if (process.env.FRAMEWORK_BROWSER_TYPE) {
      this.config.browser.type = process.env.FRAMEWORK_BROWSER_TYPE as any;
    }
    if (process.env.FRAMEWORK_BROWSER_HEADLESS) {
      this.config.browser.headless = process.env.FRAMEWORK_BROWSER_HEADLESS === 'true';
    }
    
    // Timeouts
    if (process.env.FRAMEWORK_TIMEOUT_DEFAULT) {
      this.config.timeouts.default = parseInt(process.env.FRAMEWORK_TIMEOUT_DEFAULT);
    }
    
    // Environment
    if (process.env.FRAMEWORK_ENV_NAME) {
      this.config.environment.name = process.env.FRAMEWORK_ENV_NAME;
    }
    if (process.env.FRAMEWORK_BASE_URL) {
      this.config.environment.baseUrl = process.env.FRAMEWORK_BASE_URL;
    }
    
    // Logging
    if (process.env.FRAMEWORK_LOG_LEVEL) {
      this.config.logging.level = process.env.FRAMEWORK_LOG_LEVEL as LogLevel;
    }
  }
  
  /**
   * ✅ Validar configuración con Joi
   */
  private validateConfiguration(): void {
    const { error, value } = configSchema.validate(this.config, {
      abortEarly: false,  // Mostrar todos los errores
      allowUnknown: true  // Permitir campos adicionales
    });
    
    if (error) {
      console.error('❌ Errores de validación en la configuración:');
      error.details.forEach(detail => {
        console.error(`  - ${detail.message}`);
      });
      throw new Error('Configuración inválida');
    }
    
    this.config = value;
  }
  
  /**
   * 📁 Crear directorios necesarios si no existen
   */
  private ensureDirectories(): void {
    const directories = [
      this.config.paths.data,
      this.config.paths.downloads,
      this.config.paths.videos,
      this.config.paths.reports,
      this.config.paths.temp,
      this.config.screenshots.path
    ];
    
    directories.forEach(dir => {
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
  
  /**
   * 🎯 Obtener configuración completa
   */
  public getConfig(): FrameworkConfig {
    return _.cloneDeep(this.config); // Devolver copia para evitar mutaciones
  }
  
  /**
   * 🔍 Obtener valor específico de configuración
   * @param path - Ruta al valor (ej: 'browser.headless')
   */
  public get<T = any>(path: string): T {
    return _.get(this.config, path);
  }
  
  /**
   * 📝 Establecer valor de configuración
   * @param path - Ruta al valor
   * @param value - Nuevo valor
   */
  public set(path: string, value: any): void {
    _.set(this.config, path, value);
    this.validateConfiguration();
  }
  
  /**
   * 🔄 Recargar configuración
   */
  public reload(): void {
    this.config = this.loadDefaultConfig();
    this.loadConfiguration();
  }
  
  /**
   * 💾 Guardar configuración actual en archivo
   */
  public save(filePath?: string): void {
    const savePath = filePath || this.configPath || 'framework.config.json';
    const content = JSON.stringify(this.config, null, 2);
    fs.writeFileSync(savePath, content);
    console.log(`✅ Configuración guardada en: ${savePath}`);
  }
  
  /**
   * 🖨️ Imprimir configuración actual (para debugging)
   */
  public print(): void {
    console.log('📋 Configuración actual:');
    console.log(JSON.stringify(this.config, null, 2));
  }
}