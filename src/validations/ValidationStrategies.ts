// src/validations/ValidationStrategies.ts

import { Page } from 'playwright';
import { ValidationResult } from '../types/FrameworkTypes';
import { LoggerFactory } from '../core/logging/LoggerFactory';
import { NavigationActions } from '../interactions/NavigationActions';

/**
 * Estrategias de validación para estados de aplicación
 * Valida condiciones complejas y estados de página
 */
export class ValidationStrategies {
  private static logger = LoggerFactory.getLogger('ValidationStrategies');

  /**
   * Valida que la página está en la URL correcta
   */
  static async validateURL(
    page: Page,
    expectedUrl: string | RegExp,
    options?: {
      exact?: boolean;
      timeout?: number;
      message?: string;
    }
  ): Promise<ValidationResult> {
    try {
      this.logger.debug('Validating URL', { expectedUrl });

      // Esperar a que la URL cambie si es necesario
      if (options?.timeout) {
        await NavigationActions.waitForURLChange(page, expectedUrl, {
          timeout: options.timeout
        });
      }

      const currentUrl = page.url();
      let matches = false;

      if (typeof expectedUrl === 'string') {
        matches = options?.exact 
          ? currentUrl === expectedUrl
          : currentUrl.includes(expectedUrl);
      } else {
        matches = expectedUrl.test(currentUrl);
      }

      if (matches) {
        return {
          passed: true,
          message: options?.message || `URL matches expected`,
          actual: currentUrl,
          expected: expectedUrl.toString()
        };
      } else {
        return {
          passed: false,
          message: options?.message || `URL does not match expected`,
          actual: currentUrl,
          expected: expectedUrl.toString()
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `URL validation failed`,
        actual: page.url(),
        expected: expectedUrl.toString()
      };
    }
  }

  /**
   * Valida el título de la página
   */
  static async validateTitle(
    page: Page,
    expectedTitle: string | RegExp,
    options?: {
      exact?: boolean;
      message?: string;
    }
  ): Promise<ValidationResult> {
    try {
      const actualTitle = await page.title();
      let matches = false;

      if (typeof expectedTitle === 'string') {
        matches = options?.exact
          ? actualTitle === expectedTitle
          : actualTitle.includes(expectedTitle);
      } else {
        matches = expectedTitle.test(actualTitle);
      }

      if (matches) {
        return {
          passed: true,
          message: options?.message || `Page title matches expected`,
          actual: actualTitle,
          expected: expectedTitle.toString()
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Page title does not match`,
          actual: actualTitle,
          expected: expectedTitle.toString()
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Title validation failed`,
        actual: 'error',
        expected: expectedTitle.toString()
      };
    }
  }

  /**
   * Valida que no hay errores en la consola
   */
  static async validateNoConsoleErrors(
    page: Page,
    options?: {
      ignoreWarnings?: boolean;
      message?: string;
    }
  ): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      
      // Configurar listener de consola
      page.on('console', msg => {
        if (msg.type() === 'error' || 
            (!options?.ignoreWarnings && msg.type() === 'warning')) {
          errors.push(`${msg.type()}: ${msg.text()}`);
        }
      });

      // Dar tiempo para capturar errores existentes
      await page.waitForTimeout(100);

      if (errors.length === 0) {
        return {
          passed: true,
          message: options?.message || `No console errors found`,
          actual: 'no errors',
          expected: 'no errors'
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Console errors detected`,
          actual: errors.join(', '),
          expected: 'no errors'
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Console error validation failed`,
        actual: 'error',
        expected: 'no errors'
      };
    }
  }

  /**
   * Valida que la página está completamente cargada
   */
  static async validatePageLoaded(
    page: Page,
    options?: {
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
      timeout?: number;
      message?: string;
    }
  ): Promise<ValidationResult> {
    try {
      await page.waitForLoadState(options?.waitUntil || 'load', {
        timeout: options?.timeout || 30000
      });

      return {
        passed: true,
        message: options?.message || `Page loaded successfully`,
        actual: 'loaded',
        expected: 'loaded'
      };
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Page did not load completely`,
        actual: 'not loaded',
        expected: 'loaded'
      };
    }
  }

  /**
   * Valida respuesta de red específica
   */
  static async validateNetworkResponse(
    page: Page,
    urlPattern: string | RegExp,
    expectedStatus: number,
    options?: {
      timeout?: number;
      message?: string;
    }
  ): Promise<ValidationResult> {
    try {
      const response = await page.waitForResponse(
        resp => {
          const url = resp.url();
          const matches = typeof urlPattern === 'string'
            ? url.includes(urlPattern)
            : urlPattern.test(url);
          return matches;
        },
        { timeout: options?.timeout || 10000 }
      );

      const actualStatus = response.status();

      if (actualStatus === expectedStatus) {
        return {
          passed: true,
          message: options?.message || `Network response has expected status`,
          actual: actualStatus,
          expected: expectedStatus
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Network response status mismatch`,
          actual: actualStatus,
          expected: expectedStatus
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Network response validation failed`,
        actual: 'timeout',
        expected: expectedStatus
      };
    }
  }

  /**
   * Valida que no hay peticiones fallidas
   */
  static async validateNoFailedRequests(
    page: Page,
    options?: {
      ignorePatterns?: (string | RegExp)[];
      message?: string;
    }
  ): Promise<ValidationResult> {
    try {
      const failedRequests: string[] = [];

      page.on('requestfailed', request => {
        const url = request.url();
        
        // Verificar si debe ignorarse
        const shouldIgnore = options?.ignorePatterns?.some(pattern => {
          return typeof pattern === 'string'
            ? url.includes(pattern)
            : pattern.test(url);
        });

        if (!shouldIgnore) {
          failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText}`);
        }
      });

      // Dar tiempo para capturar requests
      await page.waitForTimeout(100);

      if (failedRequests.length === 0) {
        return {
          passed: true,
          message: options?.message || `No failed requests`,
          actual: 'no failures',
          expected: 'no failures'
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Failed requests detected`,
          actual: failedRequests.join(', '),
          expected: 'no failures'
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Request validation failed`,
        actual: 'error',
        expected: 'no failures'
      };
    }
  }

  /**
   * Valida cookies específicas
   */
  static async validateCookie(
    page: Page,
    cookieName: string,
    expectedValue?: string,
    options?: {
      domain?: string;
      message?: string;
    }
  ): Promise<ValidationResult> {
    try {
      const cookies = await page.context().cookies();
      const cookie = cookies.find(c => 
        c.name === cookieName && 
        (!options?.domain || c.domain === options.domain)
      );

      if (!cookie) {
        return {
          passed: false,
          message: options?.message || `Cookie not found: ${cookieName}`,
          actual: 'not found',
          expected: expectedValue || 'exists'
        };
      }

      if (expectedValue === undefined) {
        return {
          passed: true,
          message: options?.message || `Cookie exists: ${cookieName}`,
          actual: cookie.value,
          expected: 'exists'
        };
      }

      if (cookie.value === expectedValue) {
        return {
          passed: true,
          message: options?.message || `Cookie has expected value`,
          actual: cookie.value,
          expected: expectedValue
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Cookie value mismatch`,
          actual: cookie.value,
          expected: expectedValue
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Cookie validation failed`,
        actual: 'error',
        expected: expectedValue || 'exists'
      };
    }
  }

  /**
   * Valida localStorage
   */
  static async validateLocalStorage(
    page: Page,
    key: string,
    expectedValue?: string,
    options?: {
      message?: string;
    }
  ): Promise<ValidationResult> {
    try {
      const actualValue = await page.evaluate((k) => {
        return localStorage.getItem(k);
      }, key);

      if (actualValue === null) {
        return {
          passed: false,
          message: options?.message || `LocalStorage key not found: ${key}`,
          actual: 'null',
          expected: expectedValue || 'exists'
        };
      }

      if (expectedValue === undefined) {
        return {
          passed: true,
          message: options?.message || `LocalStorage key exists: ${key}`,
          actual: actualValue,
          expected: 'exists'
        };
      }

      if (actualValue === expectedValue) {
        return {
          passed: true,
          message: options?.message || `LocalStorage has expected value`,
          actual: actualValue,
          expected: expectedValue
        };
      } else {
        return {
          passed: false,
          message: options?.message || `LocalStorage value mismatch`,
          actual: actualValue,
          expected: expectedValue
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `LocalStorage validation failed`,
        actual: 'error',
        expected: expectedValue || 'exists'
      };
    }
  }

  /**
   * Valida múltiples condiciones
   */
  static async validateAll(
    validations: (() => Promise<ValidationResult>)[]
  ): Promise<ValidationResult> {
    const results: ValidationResult[] = [];
    
    for (const validation of validations) {
      results.push(await validation());
    }

    const allPassed = results.every(r => r.passed);
    const failedCount = results.filter(r => !r.passed).length;

    if (allPassed) {
      return {
        passed: true,
        message: `All ${results.length} validations passed`,
        actual: results.length,
        expected: results.length
      };
    } else {
      return {
        passed: false,
        message: `${failedCount} of ${results.length} validations failed`,
        actual: results.length - failedCount,
        expected: results.length
      };
    }
  }

  /**
   * Valida que al menos una condición se cumple
   */
  static async validateAny(
    validations: (() => Promise<ValidationResult>)[]
  ): Promise<ValidationResult> {
    const results: ValidationResult[] = [];
    
    for (const validation of validations) {
      const result = await validation();
      results.push(result);
      
      // Si alguna pasa, retornar éxito inmediatamente
      if (result.passed) {
        return {
          passed: true,
          message: `At least one validation passed`,
          actual: 'passed',
          expected: 'at least one pass'
        };
      }
    }

    return {
      passed: false,
      message: `None of ${results.length} validations passed`,
      actual: 'all failed',
      expected: 'at least one pass'
    };
  }

  /**
   * Valida el rendimiento de carga de la página
   */
  static async validatePagePerformance(
    page: Page,
    maxLoadTime: number,
    options?: {
      message?: string;
    }
  ): Promise<ValidationResult> {
    try {
      const metrics = await page.evaluate(() => {
        const perf = performance.timing;
        return {
          loadTime: perf.loadEventEnd - perf.navigationStart,
          domReady: perf.domContentLoadedEventEnd - perf.navigationStart,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
        };
      });

      if (metrics.loadTime <= maxLoadTime) {
        return {
          passed: true,
          message: options?.message || `Page loaded within time limit`,
          actual: metrics.loadTime,
          expected: maxLoadTime
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Page load time exceeded limit`,
          actual: metrics.loadTime,
          expected: maxLoadTime
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Performance validation failed`,
        actual: 'error',
        expected: maxLoadTime
      };
    }
  }
}