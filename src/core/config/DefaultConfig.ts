/**
 * 🎯 DefaultConfig.ts
 * 
 * Configuración por defecto del framework.
 * Estos valores se usarán cuando no se especifique una configuración personalizada.
 * 
 * ¿Por qué tener configuración por defecto?
 * - Permite empezar a usar el framework inmediatamente sin configuración
 * - Proporciona valores sensatos y probados
 * - Sirve como documentación de todas las opciones disponibles
 * - Facilita la migración entre versiones
 */

import { FrameworkConfig } from './ConfigManager';
import { LogLevel } from '../../types/FrameworkTypes';

/**
 * 📋 Configuración por defecto del framework
 * Estos valores están optimizados para la mayoría de casos de uso
 */
export const DEFAULT_CONFIG: FrameworkConfig = {
  // 🌐 Configuración del navegador
  browser: {
    type: 'chromium',              // Chromium es el más rápido y estable
    headless: false,               // Visible por defecto para debugging
    timeout: 30000,                // 30 segundos de timeout global
    viewport: {
      width: 1920,                 // Full HD por defecto
      height: 1080
    },
    locale: 'es-ES',               // Español de España
    timezoneId: 'America/Lima',    // Zona horaria de Lima
    acceptDownloads: true,         // Permitir descargas
    ignoreHTTPSErrors: false,      // NO ignorar errores HTTPS en producción
    javaScriptEnabled: true,       // JavaScript siempre habilitado
    bypassCSP: false,              // Respetar Content Security Policy
    colorScheme: 'light',          // Tema claro por defecto
    
    // Configuración adicional para mejor rendimiento
    deviceScaleFactor: 1,          // Escala normal (no retina)
    hasTouch: false,               // Sin emulación touch por defecto
    isMobile: false,               // Vista desktop por defecto
  },
  
  // ⏱️ Timeouts (en milisegundos)
  timeouts: {
    default: 30000,                // 30 segundos para acciones generales
    navigation: 30000,             // 30 segundos para navegación
    element: 10000,                // 10 segundos para encontrar elementos
    assertion: 5000,               // 5 segundos para validaciones
    script: 30000,                 // 30 segundos para scripts
    page: 30000                    // 30 segundos para carga de página
  },
  
  // 📸 Screenshots
  screenshots: {
    enabled: true,                 // Tomar screenshots habilitado
    onError: true,                 // Screenshot automático en errores
    onTest: false,                 // No tomar en cada test (para no llenar disco)
    path: './screenshots',         // Carpeta de screenshots
    fullPage: false,               // Solo viewport por defecto (más rápido)
    quality: 80,                   // Calidad 80% para JPEG (buen balance)
    type: 'png'                    // PNG por defecto (mejor calidad)
  },
  
  // 📊 Logging
  logging: {
    level: LogLevel.INFO,          // Nivel INFO por defecto
    console: true,                 // Mostrar en consola
    file: false,                   // No guardar en archivo por defecto
    filePath: './logs/framework.log', // Path si se habilita
    colorize: true,                // Colores en consola
    timestamp: true,               // Incluir timestamp
    pretty: true                   // Formato legible
  },
  
  // 📁 Rutas
  paths: {
    data: './data',                // Carpeta de datos CSV
    downloads: './downloads',      // Carpeta de descargas
    videos: './videos',            // Carpeta de videos
    reports: './reports',          // Carpeta de reportes
    temp: './temp'                 // Carpeta temporal
  },
  
  // 🔄 Reintentos
  retry: {
    enabled: true,                 // Reintentos habilitados
    attempts: 3,                   // 3 intentos máximo
    delay: 1000,                   // 1 segundo entre intentos
    backoff: true                  // Incrementar delay exponencialmente
  },
  
  // 🌍 Ambiente
  environment: {
    name: 'test',                  // Ambiente de testing por defecto
    baseUrl: undefined,            // Se debe configurar por proyecto
    apiUrl: undefined,             // Se debe configurar por proyecto
    variables: {}                  // Variables personalizadas vacías
  },
  
  // 🔐 Seguridad
  security: {
    ignoreHTTPSErrors: false,      // NO ignorar HTTPS errors
    bypassCSP: false,              // NO bypass CSP
    credentials: undefined         // Sin credenciales por defecto
  },
  
  // 📈 Rendimiento
  performance: {
    collectMetrics: true,          // Recolectar métricas habilitado
    slowMo: 0,                     // Sin ralentización por defecto
    throttle: undefined            // Sin throttling por defecto
  },
  
  // 🎯 Proyecto
  project: {
    name: 'Web Automation Framework',
    version: '1.0.0',
    team: 'QA Automation',
    metadata: {}
  }
};

/**
 * 🔧 Configuración para ambiente de desarrollo
 */
export const DEV_CONFIG: Partial<FrameworkConfig> = {
  browser: {
    ...DEFAULT_CONFIG.browser,
    headless: false,               // Siempre visible en dev
    slowMo: 100                    // Ralentizar para debugging
  },
  logging: {
    ...DEFAULT_CONFIG.logging,
    level: LogLevel.DEBUG,         // Más detalle en dev
    file: true                     // Guardar logs en dev
  },
  screenshots: {
    ...DEFAULT_CONFIG.screenshots,
    onTest: true                   // Screenshots en cada test
  }
};

/**
 * 🏢 Configuración para ambiente de producción
 */
export const PROD_CONFIG: Partial<FrameworkConfig> = {
  browser: {
    ...DEFAULT_CONFIG.browser,
    headless: true,                // Headless en producción
    timeout: 60000                 // Más timeout en producción
  },
  logging: {
    ...DEFAULT_CONFIG.logging,
    level: LogLevel.WARN,          // Solo warnings y errores
    console: false,                // No mostrar en consola
    file: true,                    // Siempre guardar en archivo
    pretty: false                  // JSON puro para parsing
  },
  screenshots: {
    ...DEFAULT_CONFIG.screenshots,
    onError: true,                 // Solo en errores
    quality: 60                    // Menor calidad para ahorrar espacio
  },
  retry: {
    ...DEFAULT_CONFIG.retry,
    attempts: 5                    // Más reintentos en producción
  }
};

/**
 * 🧪 Configuración para CI/CD
 */
export const CI_CONFIG: Partial<FrameworkConfig> = {
  browser: {
    ...DEFAULT_CONFIG.browser,
    headless: true,                // Siempre headless en CI
    viewport: {
      width: 1280,                 // Tamaño estándar CI
      height: 720
    }
  },
  logging: {
    ...DEFAULT_CONFIG.logging,
    level: LogLevel.INFO,
    console: true,                 // Para ver en logs de CI
    file: true,                    // Guardar para artifacts
    colorize: false                // Sin colores en CI
  },
  screenshots: {
    ...DEFAULT_CONFIG.screenshots,
    path: './test-results/screenshots', // Carpeta específica CI
    onError: true,
    fullPage: true                 // Captura completa en CI
  },
  paths: {
    ...DEFAULT_CONFIG.paths,
    reports: './test-results/reports',
    videos: './test-results/videos'
  }
};

/**
 * 📱 Configuración para testing mobile
 */
export const MOBILE_CONFIG: Partial<FrameworkConfig> = {
  browser: {
    ...DEFAULT_CONFIG.browser,
    viewport: {
      width: 375,                  // iPhone viewport
      height: 667
    },
    hasTouch: true,                // Emular touch
    isMobile: true,                // Modo móvil
    deviceScaleFactor: 2           // Pantalla retina
  }
};

/**
 * 🎯 Función para obtener configuración según ambiente
 */
export function getConfigByEnvironment(environment?: string): Partial<FrameworkConfig> {
  switch (environment?.toLowerCase()) {
    case 'dev':
    case 'development':
      return { ...DEFAULT_CONFIG, ...DEV_CONFIG };
      
    case 'prod':
    case 'production':
      return { ...DEFAULT_CONFIG, ...PROD_CONFIG };
      
    case 'ci':
    case 'ci/cd':
    case 'pipeline':
      return { ...DEFAULT_CONFIG, ...CI_CONFIG };
      
    case 'mobile':
      return { ...DEFAULT_CONFIG, ...MOBILE_CONFIG };
      
    default:
      return DEFAULT_CONFIG;
  }
}

/**
 * 🔍 Validar que una configuración tenga todos los campos requeridos
 */
export function validateConfig(config: Partial<FrameworkConfig>): boolean {
  // Verificar campos requeridos
  const requiredFields = [
    'browser.type',
    'timeouts.default',
    'screenshots.enabled',
    'logging.level',
    'environment.name'
  ];
  
  for (const field of requiredFields) {
    const keys = field.split('.');
    let value: any = config;
    
    for (const key of keys) {
      value = value?.[key as keyof typeof value];
      if (value === undefined) {
        console.error(`❌ Campo requerido faltante: ${field}`);
        return false;
      }
    }
  }
  
  return true;
}

/**
 * 🔄 Mezclar configuraciones de forma profunda
 */
export function mergeConfigs(...configs: Partial<FrameworkConfig>[]): FrameworkConfig {
  const result = { ...DEFAULT_CONFIG };
  
  for (const config of configs) {
    if (!config) continue;
    
    // Mezclar cada sección
    Object.keys(config).forEach(key => {
      const k = key as keyof FrameworkConfig;
      if (typeof config[k] === 'object' && !Array.isArray(config[k])) {
        result[k] = { ...result[k] as any, ...config[k] as any };
      } else {
        (result as any)[k] = config[k];
      }
    });
  }
  
  return result;
}