/**
 * 📋 ConfigTypes.ts
 * 
 * Define todos los tipos e interfaces relacionados con la configuración.
 * Separa los tipos de configuración de los tipos generales del framework.
 * 
 * ¿Por qué un archivo separado para tipos de configuración?
 * - Evita dependencias circulares
 * - Facilita la generación de esquemas de configuración
 * - Permite validación de tipos en tiempo de compilación
 * - Documenta todas las opciones de configuración disponibles
 */

import { BrowserConfig, LogLevel } from './FrameworkTypes';

/**
 * 🔧 Configuración principal del framework
 */
export interface FrameworkConfiguration {
  // Configuración del navegador
  browser: BrowserConfiguration;
  
  // Timeouts
  timeouts: TimeoutConfiguration;
  
  // Screenshots
  screenshots: ScreenshotConfiguration;
  
  // Logging
  logging: LoggingConfiguration;
  
  // Paths
  paths: PathConfiguration;
  
  // Retry
  retry: RetryConfiguration;
  
  // Environment
  environment: EnvironmentConfiguration;
  
  // Security
  security: SecurityConfiguration;
  
  // Performance
  performance: PerformanceConfiguration;
  
  // Project
  project: ProjectConfiguration;
  
  // Features
  features: FeatureConfiguration;
  
  // Debug
  debug: DebugConfiguration;
  
  // Reporting
  reporting: ReportingConfiguration;
}

/**
 * 🌐 Configuración del navegador
 */
export interface BrowserConfiguration extends BrowserConfig {
  // Configuraciones adicionales específicas del framework
  autoClose?: boolean;              // Cerrar automáticamente al finalizar
  reuseContext?: boolean;           // Reutilizar contexto entre tests
  defaultDevice?: string;           // Dispositivo por defecto
  extensions?: string[];            // Extensiones del navegador
  launchPersistentContext?: boolean; // Usar contexto persistente
}

/**
 * ⏱️ Configuración de timeouts
 */
export interface TimeoutConfiguration {
  default: number;                  // Timeout por defecto
  navigation: number;                // Timeout de navegación
  element: number;                   // Timeout para elementos
  assertion: number;                 // Timeout para assertions
  script: number;                    // Timeout para scripts
  page: number;                      // Timeout de página
  download: number;                  // Timeout para descargas
  upload: number;                    // Timeout para uploads
  network: number;                   // Timeout de red
}

/**
 * 📸 Configuración de screenshots
 */
export interface ScreenshotConfiguration {
  enabled: boolean;                  // Screenshots habilitados
  onError: boolean;                  // Screenshot en errores
  onTest: boolean;                   // Screenshot en cada test
  onAssertion?: boolean;             // Screenshot en cada assertion
  path: string;                      // Ruta de screenshots
  fullPage: boolean;                 // Página completa
  quality?: number;                  // Calidad (0-100)
  type: 'png' | 'jpeg';             // Formato
  naming?: {                         // Configuración de nombres
    pattern: string;                 // Patrón de nombre
    includeTimestamp: boolean;       // Incluir timestamp
    includeBrowser: boolean;         // Incluir navegador
    includeTestName: boolean;        // Incluir nombre del test
  };
  cleanup?: {                        // Limpieza automática
    enabled: boolean;
    daysToKeep: number;
  };
}

/**
 * 📊 Configuración de logging
 */
export interface LoggingConfiguration {
  level: LogLevel;                   // Nivel de log
  console: boolean;                  // Log en consola
  file: boolean;                     // Log en archivo
  filePath?: string;                 // Ruta del archivo
  colorize: boolean;                 // Colores en consola
  timestamp: boolean;                // Incluir timestamp
  pretty: boolean;                   // Formato bonito
  
  // Configuración avanzada
  maxFiles?: number;                 // Máximo de archivos de log
  maxFileSize?: string;              // Tamaño máximo de archivo
  rotation?: boolean;                // Rotación de logs
  
  // Filtros
  includeModules?: string[];         // Módulos a incluir
  excludeModules?: string[];         // Módulos a excluir
  
  // Formato personalizado
  format?: {
    template?: string;               // Template de formato
    json?: boolean;                  // Formato JSON
    metadata?: boolean;              // Incluir metadata
  };
}

/**
 * 📁 Configuración de rutas
 */
export interface PathConfiguration {
  data: string;                      // Ruta de datos
  downloads: string;                 // Ruta de descargas
  videos: string;                    // Ruta de videos
  reports: string;                   // Ruta de reportes
  temp: string;                      // Ruta temporal
  traces?: string;                   // Ruta de traces
  artifacts?: string;                // Ruta de artifacts
  sessions?: string;                 // Ruta de sesiones
}

/**
 * 🔄 Configuración de reintentos
 */
export interface RetryConfiguration {
  enabled: boolean;                  // Reintentos habilitados
  attempts: number;                  // Número de intentos
  delay: number;                     // Delay entre intentos
  backoff: boolean;                  // Backoff exponencial
  
  // Configuración específica por tipo
  navigation?: {
    attempts: number;
    delay: number;
  };
  
  element?: {
    attempts: number;
    delay: number;
  };
  
  assertion?: {
    attempts: number;
    delay: number;
  };
  
  // Condiciones para reintentar
  retryOn?: {
    timeout?: boolean;
    networkError?: boolean;
    elementNotFound?: boolean;
    custom?: (error: Error) => boolean;
  };
}

/**
 * 🌍 Configuración de ambiente
 */
export interface EnvironmentConfiguration {
  name: string;                      // Nombre del ambiente
  baseUrl?: string;                  // URL base
  apiUrl?: string;                   // URL de API
  
  // Variables de ambiente
  variables?: Record<string, any>;
  
  // URLs específicas
  urls?: {
    login?: string;
    logout?: string;
    home?: string;
    admin?: string;
  };
  
  // Credenciales por ambiente
  credentials?: {
    admin?: { username: string; password: string };
    user?: { username: string; password: string };
    readonly?: { username: string; password: string };
  };
  
  // Feature flags
  features?: Record<string, boolean>;
  
  // Configuración específica del ambiente
  settings?: Record<string, any>;
}

/**
 * 🔐 Configuración de seguridad
 */
export interface SecurityConfiguration {
  ignoreHTTPSErrors: boolean;        // Ignorar errores HTTPS
  bypassCSP: boolean;                // Bypass CSP
  
  // Credenciales por defecto
  credentials?: {
    username?: string;
    password?: string;
  };
  
  // Headers de seguridad
  headers?: Record<string, string>;
  
  // Certificados
  certificates?: {
    ca?: string[];                   // Certificate authorities
    cert?: string;                   // Client certificate
    key?: string;                    // Client key
  };
  
  // Políticas
  policies?: {
    allowInsecureContent?: boolean;
    allowMixedContent?: boolean;
    enforceCSP?: boolean;
  };
}

/**
 * 📈 Configuración de rendimiento
 */
export interface PerformanceConfiguration {
  collectMetrics: boolean;           // Recolectar métricas
  slowMo?: number;                   // Ralentización
  
  // Throttling
  throttle?: {
    cpu?: number;                    // Multiplicador de CPU
    network?: {
      download: number;              // Velocidad de descarga (bytes/s)
      upload: number;                // Velocidad de subida (bytes/s)
      latency: number;               // Latencia (ms)
    };
  };
  
  // Métricas a recolectar
  metrics?: {
    domContentLoaded?: boolean;
    firstPaint?: boolean;
    firstContentfulPaint?: boolean;
    largestContentfulPaint?: boolean;
    cumulativeLayoutShift?: boolean;
    totalBlockingTime?: boolean;
    memoryUsage?: boolean;
  };
  
  // Umbrales de rendimiento
  thresholds?: {
    pageLoad?: number;               // Tiempo máximo de carga
    firstPaint?: number;
    lcp?: number;
    cls?: number;
    tbt?: number;
  };
}

/**
 * 🎯 Configuración del proyecto
 */
export interface ProjectConfiguration {
  name?: string;                     // Nombre del proyecto
  version?: string;                  // Versión
  description?: string;              // Descripción
  team?: string;                     // Equipo
  
  // Metadata del proyecto
  metadata?: {
    owner?: string;
    repository?: string;
    documentation?: string;
    slack?: string;
    jira?: string;
  };
  
  // Tags y categorías
  tags?: string[];
  categories?: string[];
  
  // Configuración de tests
  testConfig?: {
    parallel?: boolean;              // Ejecutar en paralelo
    workers?: number;                // Número de workers
    retries?: number;                // Reintentos de tests
    timeout?: number;                // Timeout de tests
    grep?: string | RegExp;          // Filtro de tests
    grepInvert?: string | RegExp;    // Filtro inverso
  };
}

/**
 * 🎮 Configuración de features
 */
export interface FeatureConfiguration {
  // Features del framework
  autoWait?: boolean;                // Esperas automáticas
  autoRetry?: boolean;               // Reintentos automáticos
  autoScreenshot?: boolean;          // Screenshots automáticos
  autoHighlight?: boolean;           // Resaltar elementos
  autoScroll?: boolean;              // Scroll automático
  
  // Validaciones automáticas
  autoValidation?: {
    enabled?: boolean;
    checkConsoleErrors?: boolean;
    checkNetworkErrors?: boolean;
    checkPageErrors?: boolean;
  };
  
  // Interceptores
  interceptors?: {
    requests?: boolean;              // Interceptar requests
    responses?: boolean;             // Interceptar responses
    console?: boolean;               // Interceptar console
    dialogs?: boolean;               // Interceptar diálogos
  };
  
  // Mocking
  mocking?: {
    enabled?: boolean;
    routes?: Array<{
      url: string | RegExp;
      response: any;
    }>;
  };
}

/**
 * 🐛 Configuración de debug
 */
export interface DebugConfiguration {
  enabled?: boolean;                 // Debug habilitado
  verbose?: boolean;                 // Modo verbose
  pauseOnError?: boolean;            // Pausar en errores
  pauseOnFailure?: boolean;          // Pausar en fallos
  
  // Elementos de debug
  highlightElements?: boolean;       // Resaltar elementos
  showSelectors?: boolean;           // Mostrar selectores
  showActions?: boolean;             // Mostrar acciones
  
  // Breakpoints
  breakpoints?: {
    beforeAction?: boolean;
    afterAction?: boolean;
    onError?: boolean;
    onAssertion?: boolean;
  };
  
  // Tracing
  tracing?: {
    enabled?: boolean;
    screenshots?: boolean;
    snapshots?: boolean;
    sources?: boolean;
  };
}

/**
 * 📊 Configuración de reportes
 */
export interface ReportingConfiguration {
  enabled?: boolean;                 // Reportes habilitados
  
  // Tipos de reportes
  reporters?: Array<{
    type: 'html' | 'json' | 'junit' | 'allure' | 'custom';
    outputPath?: string;
    options?: Record<string, any>;
  }>;
  
  // Contenido del reporte
  include?: {
    screenshots?: boolean;
    videos?: boolean;
    traces?: boolean;
    logs?: boolean;
    metrics?: boolean;
    errors?: boolean;
  };
  
  // Formato del reporte
  format?: {
    title?: string;
    logo?: string;
    theme?: 'light' | 'dark';
    customCSS?: string;
  };
  
  // Notificaciones
  notifications?: {
    slack?: {
      enabled: boolean;
      webhook: string;
      channel?: string;
    };
    email?: {
      enabled: boolean;
      to: string[];
      from: string;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
    };
  };
}

/**
 * 🎯 Configuración parcial (para merge)
 */
export type PartialFrameworkConfiguration = DeepPartial<FrameworkConfiguration>;

/**
 * 🔧 Tipo helper para partial profundo
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 📝 Esquema de validación de configuración
 */
export interface ConfigurationSchema {
  required: (keyof FrameworkConfiguration)[];
  optional: (keyof FrameworkConfiguration)[];
  deprecated?: Array<{
    field: string;
    replacement?: string;
    removeVersion?: string;
  }>;
}

/**
 * 🏷️ Tipos de configuración por fuente
 */
export enum ConfigurationSource {
  DEFAULT = 'default',
  FILE = 'file',
  ENVIRONMENT = 'environment',
  RUNTIME = 'runtime',
  CLI = 'cli'
}

/**
 * 📦 Configuración con metadata
 */
export interface ConfigurationWithMetadata {
  config: FrameworkConfiguration;
  source: ConfigurationSource;
  timestamp: Date;
  validated: boolean;
  errors?: string[];
  warnings?: string[];
}