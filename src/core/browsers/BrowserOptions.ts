/**
 * 🌐 BrowserOptions.ts
 * 
 * Define todas las opciones y configuraciones disponibles para los navegadores.
 * Proporciona presets optimizados para diferentes escenarios de prueba.
 * 
 * ¿Por qué un archivo separado para opciones?
 * - Centraliza todas las configuraciones de navegador
 * - Proporciona presets reutilizables
 * - Documenta todas las opciones disponibles
 * - Facilita la configuración para diferentes ambientes
 */

import { devices, LaunchOptions, BrowserContextOptions } from '@playwright/test';
import { BrowserType, DeviceType, BrowserConfig } from '../types/FrameworkTypes';

/**
 * 🎯 Presets de configuración para diferentes escenarios
 */
export class BrowserPresets {
  /**
   * 🚀 Configuración para máximo rendimiento
   */
  static readonly PERFORMANCE: Partial<BrowserConfig> = {
    headless: true,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    javaScriptEnabled: true,
    bypassCSP: false,
    colorScheme: 'no-preference'
  };
  
  /**
   * 🐛 Configuración para debugging
   */
  static readonly DEBUG: Partial<BrowserConfig> = {
    headless: false,
    slowMo: 100,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    timeout: 60000,
    recordVideo: {
      dir: './videos',
      size: { width: 1920, height: 1080 }
    }
  };
  
  /**
   * 🏢 Configuración para ambiente de producción
   */
  static readonly PRODUCTION: Partial<BrowserConfig> = {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: false,
    bypassCSP: false,
    javaScriptEnabled: true,
    acceptDownloads: false,
    timeout: 30000
  };
  
  /**
   * 🧪 Configuración para CI/CD
   */
  static readonly CI: Partial<BrowserConfig> = {
    headless: true,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: false,
    slowMo: 0,
    timeout: 30000,
    recordVideo: {
      dir: './test-results/videos',
      size: { width: 1280, height: 720 }
    }
  };
  
  /**
   * 📱 Configuración para testing móvil
   */
  static readonly MOBILE: Partial<BrowserConfig> = {
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  };
  
  /**
   * 🖥️ Configuración para testing desktop
   */
  static readonly DESKTOP: Partial<BrowserConfig> = {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false
  };
  
  /**
   * 📱 Configuración para testing tablet
   */
  static readonly TABLET: Partial<BrowserConfig> = {
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: false
  };
  
  /**
   * 🔒 Configuración con seguridad estricta
   */
  static readonly SECURE: Partial<BrowserConfig> = {
    headless: true,
    ignoreHTTPSErrors: false,
    bypassCSP: false,
    javaScriptEnabled: true,
    permissions: [],
    geolocation: undefined,
    offline: false
  };
  
  /**
   * ♿ Configuración para testing de accesibilidad
   */
  static readonly ACCESSIBILITY: Partial<BrowserConfig> = {
    headless: false,
    viewport: { width: 1280, height: 720 },
    colorScheme: 'light',
    slowMo: 50, // Para poder observar interacciones
    deviceScaleFactor: 1.25, // Simular zoom 125%
    hasTouch: false
  };
  
  /**
   * 🌐 Configuración para testing de localización
   */
  static getLocalizationPreset(locale: string, timezone: string): Partial<BrowserConfig> {
    return {
      locale,
      timezoneId: timezone,
      viewport: { width: 1920, height: 1080 },
      headless: false
    };
  }
}

/**
 * 📱 Configuraciones de dispositivos específicos
 */
export class DeviceProfiles {
  /**
   * 📱 Obtener perfil de dispositivo Playwright
   */
  static getDevice(deviceType: DeviceType): any {
    const deviceMap: Record<DeviceType, string> = {
      'Desktop': 'Desktop Chrome',
      'iPhone 12': 'iPhone 12',
      'iPhone 13': 'iPhone 13',
      'Pixel 5': 'Pixel 5',
      'iPad Pro': 'iPad Pro',
      'Galaxy S21': 'Galaxy S21'
    };
    
    const deviceName = deviceMap[deviceType];
    return deviceName === 'Desktop Chrome' ? null : devices[deviceName];
  }
  
  /**
   * 📱 iPhone 12
   */
  static readonly IPHONE_12: Partial<BrowserConfig> = {
    ...devices['iPhone 12'],
    type: 'webkit' as BrowserType
  };
  
  /**
   * 📱 iPhone 13 Pro
   */
  static readonly IPHONE_13_PRO: Partial<BrowserConfig> = {
    ...devices['iPhone 13 Pro'],
    type: 'webkit' as BrowserType
  };
  
  /**
   * 📱 Samsung Galaxy S21
   */
  static readonly GALAXY_S21: Partial<BrowserConfig> = {
    ...devices['Galaxy S21'],
    type: 'chromium' as BrowserType
  };
  
  /**
   * 📱 Google Pixel 5
   */
  static readonly PIXEL_5: Partial<BrowserConfig> = {
    ...devices['Pixel 5'],
    type: 'chromium' as BrowserType
  };
  
  /**
   * 📱 iPad Pro
   */
  static readonly IPAD_PRO: Partial<BrowserConfig> = {
    ...devices['iPad Pro'],
    type: 'webkit' as BrowserType
  };
  
  /**
   * 📱 iPad Mini
   */
  static readonly IPAD_MINI: Partial<BrowserConfig> = {
    ...devices['iPad Mini'],
    type: 'webkit' as BrowserType
  };
  
  /**
   * 💻 Desktop Chrome
   */
  static readonly DESKTOP_CHROME: Partial<BrowserConfig> = {
    type: 'chromium' as BrowserType,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false
  };
  
  /**
   * 💻 Desktop Firefox
   */
  static readonly DESKTOP_FIREFOX: Partial<BrowserConfig> = {
    type: 'firefox' as BrowserType,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false
  };
  
  /**
   * 💻 Desktop Safari
   */
  static readonly DESKTOP_SAFARI: Partial<BrowserConfig> = {
    type: 'webkit' as BrowserType,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false
  };
}

/**
 * 🔧 Builder para construir configuraciones personalizadas
 */
export class BrowserConfigBuilder {
  private config: Partial<BrowserConfig> = {};
  
  /**
   * Establecer tipo de navegador
   */
  withBrowser(type: BrowserType): this {
    this.config.type = type;
    return this;
  }
  
  /**
   * Establecer viewport
   */
  withViewport(width: number, height: number): this {
    this.config.viewport = { width, height };
    return this;
  }
  
  /**
   * Establecer modo headless
   */
  withHeadless(headless: boolean): this {
    this.config.headless = headless;
    return this;
  }
  
  /**
   * Establecer slowMo para debugging
   */
  withSlowMo(ms: number): this {
    this.config.slowMo = ms;
    return this;
  }
  
  /**
   * Establecer timeout
   */
  withTimeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }
  
  /**
   * Establecer locale
   */
  withLocale(locale: string): this {
    this.config.locale = locale;
    return this;
  }
  
  /**
   * Establecer timezone
   */
  withTimezone(timezone: string): this {
    this.config.timezoneId = timezone;
    return this;
  }
  
  /**
   * Establecer geolocalización
   */
  withGeolocation(latitude: number, longitude: number): this {
    this.config.geolocation = { latitude, longitude };
    return this;
  }
  
  /**
   * Establecer permisos
   */
  withPermissions(permissions: string[]): this {
    this.config.permissions = permissions;
    return this;
  }
  
  /**
   * Establecer user agent
   */
  withUserAgent(userAgent: string): this {
    this.config.userAgent = userAgent;
    return this;
  }
  
  /**
   * Establecer proxy
   */
  withProxy(server: string, username?: string, password?: string): this {
    this.config.proxy = { server, username, password };
    return this;
  }
  
  /**
   * Establecer headers HTTP
   */
  withExtraHTTPHeaders(headers: Record<string, string>): this {
    this.config.extraHTTPHeaders = headers;
    return this;
  }
  
  /**
   * Habilitar grabación de video
   */
  withVideoRecording(dir: string, size?: { width: number; height: number }): this {
    this.config.recordVideo = { dir, size };
    return this;
  }
  
  /**
   * Establecer credenciales HTTP
   */
  withHTTPCredentials(username: string, password: string): this {
    this.config.httpCredentials = { username, password };
    return this;
  }
  
  /**
   * Aplicar preset
   */
  withPreset(preset: Partial<BrowserConfig>): this {
    this.config = { ...this.config, ...preset };
    return this;
  }
  
  /**
   * Aplicar perfil de dispositivo
   */
  withDevice(deviceProfile: Partial<BrowserConfig>): this {
    this.config = { ...this.config, ...deviceProfile };
    return this;
  }
  
  /**
   * Construir configuración final
   */
  build(): BrowserConfig {
    // Aplicar valores por defecto si no están establecidos
    return {
      type: this.config.type || 'chromium',
      headless: this.config.headless ?? false,
      viewport: this.config.viewport || { width: 1920, height: 1080 },
      timeout: this.config.timeout || 30000,
      ...this.config
    } as BrowserConfig;
  }
}

/**
 * 🛠️ Utilidades para opciones del navegador
 */
export class BrowserOptionsUtils {
  /**
   * Obtener argumentos de línea de comandos para Chromium
   */
  static getChromiumArgs(options: Partial<BrowserConfig>): string[] {
    const args: string[] = [];
    
    // Argumentos básicos para mejor rendimiento
    args.push('--disable-blink-features=AutomationControlled');
    args.push('--disable-dev-shm-usage');
    
    // Argumentos de seguridad
    if (!options.bypassCSP) {
      args.push('--enable-features=StrictOriginIsolation');
    }
    
    if (options.ignoreHTTPSErrors) {
      args.push('--ignore-certificate-errors');
    }
    
    // Argumentos de rendimiento
    if (options.headless) {
      args.push('--disable-gpu');
      args.push('--disable-software-rasterizer');
      args.push('--mute-audio');
    }
    
    // Tamaño de ventana
    if (options.viewport) {
      args.push(`--window-size=${options.viewport.width},${options.viewport.height}`);
    }
    
    // Proxy
    if (options.proxy) {
      args.push(`--proxy-server=${options.proxy.server}`);
      if (options.proxy.bypass) {
        args.push(`--proxy-bypass-list=${options.proxy.bypass}`);
      }
    }
    
    // Deshabilitar características no necesarias
    args.push('--disable-notifications');
    args.push('--disable-geolocation');
    args.push('--disable-media-stream');
    args.push('--disable-background-timer-throttling');
    args.push('--disable-backgrounding-occluded-windows');
    args.push('--disable-renderer-backgrounding');
    
    return args;
  }
  
  /**
   * Obtener argumentos para Firefox
   */
  static getFirefoxArgs(options: Partial<BrowserConfig>): string[] {
    const args: string[] = [];
    
    if (options.headless) {
      args.push('-headless');
    }
    
    if (options.viewport) {
      args.push(`-width=${options.viewport.width}`);
      args.push(`-height=${options.viewport.height}`);
    }
    
    return args;
  }
  
  /**
   * Obtener argumentos para WebKit
   */
  static getWebKitArgs(options: Partial<BrowserConfig>): string[] {
    // WebKit no soporta muchos argumentos de línea de comandos
    return [];
  }
  
  /**
   * Validar configuración
   */
  static validateConfig(config: Partial<BrowserConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validar tipo de navegador
    const validBrowsers = ['chromium', 'firefox', 'webkit', 'chrome', 'edge'];
    if (config.type && !validBrowsers.includes(config.type)) {
      errors.push(`Tipo de navegador inválido: ${config.type}`);
    }
    
    // Validar viewport
    if (config.viewport) {
      if (config.viewport.width < 320 || config.viewport.width > 3840) {
        errors.push(`Ancho de viewport inválido: ${config.viewport.width}`);
      }
      if (config.viewport.height < 240 || config.viewport.height > 2160) {
        errors.push(`Alto de viewport inválido: ${config.viewport.height}`);
      }
    }
    
    // Validar timeout
    if (config.timeout && (config.timeout < 0 || config.timeout > 300000)) {
      errors.push(`Timeout inválido: ${config.timeout}ms`);
    }
    
    // Validar locale
    if (config.locale && !/^[a-z]{2}-[A-Z]{2}$/.test(config.locale)) {
      errors.push(`Formato de locale inválido: ${config.locale}`);
    }
    
    // Validar color scheme
    if (config.colorScheme && !['light', 'dark', 'no-preference'].includes(config.colorScheme)) {
      errors.push(`Color scheme inválido: ${config.colorScheme}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Mezclar configuraciones con prioridad
   */
  static mergeConfigs(...configs: Partial<BrowserConfig>[]): BrowserConfig {
    const merged = configs.reduce((acc, config) => ({
      ...acc,
      ...config,
      // Mezclar objetos anidados
      viewport: config.viewport ? { ...acc.viewport, ...config.viewport } : acc.viewport,
      geolocation: config.geolocation ? { ...acc.geolocation, ...config.geolocation } : acc.geolocation,
      proxy: config.proxy ? { ...acc.proxy, ...config.proxy } : acc.proxy,
      recordVideo: config.recordVideo ? { ...acc.recordVideo, ...config.recordVideo } : acc.recordVideo,
      httpCredentials: config.httpCredentials ? { ...acc.httpCredentials, ...config.httpCredentials } : acc.httpCredentials
    }), {} as Partial<BrowserConfig>);
    
    // Aplicar valores por defecto
    return {
      type: merged.type || 'chromium',
      headless: merged.headless ?? false,
      viewport: merged.viewport || { width: 1920, height: 1080 },
      timeout: merged.timeout || 30000,
      ...merged
    } as BrowserConfig;
  }
  
  /**
   * Obtener configuración para ambiente específico
   */
  static getConfigForEnvironment(environment: string): Partial<BrowserConfig> {
    const envConfigs: Record<string, Partial<BrowserConfig>> = {
      'development': BrowserPresets.DEBUG,
      'test': BrowserPresets.PERFORMANCE,
      'staging': BrowserPresets.PRODUCTION,
      'production': BrowserPresets.PRODUCTION,
      'ci': BrowserPresets.CI,
      'local': BrowserPresets.DEBUG
    };
    
    return envConfigs[environment.toLowerCase()] || BrowserPresets.PERFORMANCE;
  }
}

/**
 * 🏷️ Exportar tipos de opciones de Playwright para conveniencia
 */
export type { LaunchOptions, BrowserContextOptions } from '@playwright/test';