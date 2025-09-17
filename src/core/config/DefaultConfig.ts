// src/core/config/DefaultConfig.ts

import { FrameworkConfig } from '../../types/ConfigTypes';
import * as path from 'path';

/**
 * Configuración por defecto del framework
 * Proporciona valores predeterminados sensibles para todos los aspectos del framework
 */
export class DefaultConfig {
  /**
   * Retorna la configuración por defecto completa
   */
  static getDefaultConfig(): FrameworkConfig {
    const projectRoot = process.cwd();
    
    return {
      browser: {
        browserType: 'chromium',
        headless: true,
        viewport: { width: 1920, height: 1080 },
        timeout: 30000,
        ignoreHTTPSErrors: false,
        args: [],
        slowMo: 0
      },
      
      timeouts: {
        default: 30000,
        navigation: 30000,
        element: 10000,
        action: 5000,
        assertion: 5000
      },
      
      screenshots: {
        enabled: true,
        onFailure: true,
        onSuccess: false,
        path: path.join(projectRoot, 'screenshots'),
        fullPage: false,
        format: 'png',
        quality: 90
      },
      
      logging: {
        level: 'info',
        console: true,
        file: true,
        path: path.join(projectRoot, 'logs'),
        prettyPrint: true,
        timestamp: true
      },
      
      paths: {
        data: path.join(projectRoot, 'data'),
        screenshots: path.join(projectRoot, 'screenshots'),
        reports: path.join(projectRoot, 'reports'),
        downloads: path.join(projectRoot, 'downloads'),
        temp: path.join(projectRoot, '.tmp')
      },
      
      retry: {
        enabled: true,
        maxAttempts: 3,
        delay: 1000,
        backoff: true
      },
      
      parallel: {
        workers: 1,
        fullyParallel: false,
        forbidOnly: true,
        retries: 0
      },
      
      environment: {
        name: 'development',
        baseUrl: 'http://localhost:3000',
        apiUrl: 'http://localhost:3000/api',
        variables: {}
      }
    };
  }

  /**
   * Obtiene configuración para ambiente de desarrollo
   */
  static getDevelopmentConfig(): Partial<FrameworkConfig> {
    return {
      browser: {
        browserType: 'chromium',
        headless: false,
        slowMo: 100,
        viewport: { width: 1920, height: 1080 },
        timeout: 60000,
        ignoreHTTPSErrors: true
      },
      logging: {
        level: 'debug',
        console: true,
        file: true,
        path: 'logs',
        prettyPrint: true,
        timestamp: true
      },
      screenshots: {
        enabled: true,
        onFailure: true,
        onSuccess: true,
        path: 'screenshots',
        fullPage: true,
        format: 'png'
      }
    };
  }

  /**
   * Obtiene configuración para CI/CD
   */
  static getCIConfig(): Partial<FrameworkConfig> {
    return {
      browser: {
        browserType: 'chromium',
        headless: true,
        viewport: { width: 1920, height: 1080 },
        timeout: 30000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        ignoreHTTPSErrors: true
      },
      logging: {
        level: 'info',
        console: true,
        file: true,
        path: 'logs',
        prettyPrint: false,
        timestamp: true
      },
      parallel: {
        workers: 4,
        fullyParallel: true,
        forbidOnly: true,
        retries: 2
      },
      retry: {
        enabled: true,
        maxAttempts: 2,
        delay: 2000,
        backoff: true
      }
    };
  }

  /**
   * Obtiene configuración para testing local
   */
  static getLocalTestConfig(): Partial<FrameworkConfig> {
    return {
      browser: {
        browserType: 'chromium',
        headless: false,
        viewport: { width: 1920, height: 1080 },
        timeout: 60000,
        slowMo: 0,
        ignoreHTTPSErrors: true
      },
      logging: {
        level: 'debug',
        console: true,
        file: false,
        path: 'logs',
        prettyPrint: true,
        timestamp: false
      },
      screenshots: {
        enabled: true,
        onFailure: true,
        onSuccess: false,
        path: 'screenshots',
        fullPage: false,
        format: 'png'
      }
    };
  }

  /**
   * Valida que una configuración sea válida
   */
  static validateConfig(config: Partial<FrameworkConfig>): boolean {
    // Validaciones básicas
    if (config.browser) {
      const validBrowsers = ['chromium', 'firefox', 'webkit', 'chrome', 'edge'];
      if (config.browser.browserType && !validBrowsers.includes(config.browser.browserType)) {
        throw new Error(`Invalid browser type: ${config.browser.browserType}`);
      }
      
      if (config.browser.viewport) {
        if (config.browser.viewport.width <= 0 || config.browser.viewport.height <= 0) {
          throw new Error('Viewport dimensions must be positive');
        }
      }
    }
    
    if (config.logging) {
      const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
      if (config.logging.level && !validLevels.includes(config.logging.level)) {
        throw new Error(`Invalid log level: ${config.logging.level}`);
      }
    }
    
    if (config.retry) {
      if (config.retry.maxAttempts !== undefined && config.retry.maxAttempts < 0) {
        throw new Error('Max retry attempts must be non-negative');
      }
    }
    
    return true;
  }

  /**
   * Merge de configuraciones (la nueva sobrescribe la base)
   */
  static mergeConfig(
    baseConfig: FrameworkConfig, 
    overrideConfig: Partial<FrameworkConfig>
  ): FrameworkConfig {
    return {
      browser: { ...baseConfig.browser, ...(overrideConfig.browser || {}) },
      timeouts: { ...baseConfig.timeouts, ...(overrideConfig.timeouts || {}) },
      screenshots: { ...baseConfig.screenshots, ...(overrideConfig.screenshots || {}) },
      logging: { ...baseConfig.logging, ...(overrideConfig.logging || {}) },
      paths: { ...baseConfig.paths, ...(overrideConfig.paths || {}) },
      retry: { ...baseConfig.retry, ...(overrideConfig.retry || {}) },
      parallel: overrideConfig.parallel || baseConfig.parallel,
      environment: overrideConfig.environment || baseConfig.environment
    };
  }
}