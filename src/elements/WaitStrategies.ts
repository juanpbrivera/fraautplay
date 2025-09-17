// src/elements/WaitStrategies.ts

import { Page, Locator } from 'playwright';
import { WaitOptions, ElementLocator } from '../types/FrameworkTypes';
import { Locators } from './Locators';
import { LoggerFactory } from '../core/logging/LoggerFactory';
import { ConfigManager } from '../core/config/ConfigManager';

/**
 * Estrategias de espera inteligentes para elementos web
 * Maneja timeouts, reintentos y condiciones de espera
 */
export class WaitStrategies {
  private static logger = LoggerFactory.getLogger('WaitStrategies');
  private static defaultTimeout: number = 30000;

  /**
   * Inicializa los timeouts por defecto desde la configuración
   */
  static initialize(): void {
    try {
      const config = ConfigManager.getInstance().getConfig();
      this.defaultTimeout = config.timeouts.element;
    } catch {
      this.logger.debug('Using default timeout', { timeout: this.defaultTimeout });
    }
  }

  /**
   * Espera a que un elemento esté presente en el DOM
   */
  static async waitForElement(
    page: Page,
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<Locator> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const state = options?.state ?? 'attached';
    
    this.logger.debug('Waiting for element', {
      locator: locator.description,
      state,
      timeout
    });

    const startTime = Date.now();
    const element = Locators.getLocator(page, locator);

    try {
      await element.waitFor({ 
        state, 
        timeout 
      });
      
      const duration = Date.now() - startTime;
      this.logger.debug('Element found', {
        locator: locator.description,
        duration
      });
      
      return element;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Element not found within timeout', error as Error, {
        locator: locator.description,
        timeout,
        duration
      });
      throw new Error(
        `Element not found: ${locator.description} (waited ${duration}ms)`
      );
    }
  }

  /**
   * Espera a que un elemento sea visible
   */
  static async waitForVisible(
    page: Page,
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<Locator> {
    return this.waitForElement(page, locator, {
      ...options,
      state: 'visible'
    });
  }

  /**
   * Espera a que un elemento esté oculto
   */
  static async waitForHidden(
    page: Page,
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<void> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    
    this.logger.debug('Waiting for element to be hidden', {
      locator: locator.description,
      timeout
    });

    const element = Locators.getLocator(page, locator);
    
    try {
      await element.waitFor({ 
        state: 'hidden', 
        timeout 
      });
      
      this.logger.debug('Element is now hidden', {
        locator: locator.description
      });
    } catch (error) {
      this.logger.error('Element did not become hidden', error as Error, {
        locator: locator.description,
        timeout
      });
      throw error;
    }
  }

  /**
   * Espera a que un elemento sea clickeable
   */
  static async waitForClickable(
    page: Page,
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<Locator> {
    const element = await this.waitForVisible(page, locator, options);
    
    // Verificar que el elemento no esté deshabilitado
    const isDisabled = await element.isDisabled();
    if (isDisabled) {
      throw new Error(`Element is disabled: ${locator.description}`);
    }
    
    return element;
  }

  /**
   * Espera a que un elemento contenga texto específico
   */
  static async waitForText(
    page: Page,
    locator: ElementLocator,
    text: string,
    options?: WaitOptions
  ): Promise<Locator> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    
    this.logger.debug('Waiting for element to contain text', {
      locator: locator.description,
      text,
      timeout
    });

    const element = await this.waitForElement(page, locator, options);
    
    try {
      await element.waitFor({
        state: 'visible',
        timeout
      });
      
      // Esperar a que el texto aparezca
      await page.waitForFunction(
        (el, expectedText) => {
          const elem = document.querySelector(el);
          return elem?.textContent?.includes(expectedText);
        },
        element.toString(),
        text,
        { timeout }
      );
      
      this.logger.debug('Element contains expected text', {
        locator: locator.description,
        text
      });
      
      return element;
    } catch (error) {
      this.logger.error('Text not found in element', error as Error, {
        locator: locator.description,
        expectedText: text,
        timeout
      });
      throw error;
    }
  }

  /**
   * Espera con reintento personalizado
   */
  static async waitWithRetry<T>(
    action: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoff?: boolean;
      timeout?: number;
      errorMessage?: string;
    } = {}
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 3;
    const delay = options.delay ?? 1000;
    const backoff = options.backoff ?? true;
    const timeout = options.timeout ?? this.defaultTimeout;
    const errorMessage = options.errorMessage ?? 'Action failed after retries';
    
    const startTime = Date.now();
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.trace('Attempting action', { attempt, maxAttempts });
        
        // Verificar timeout total
        if (Date.now() - startTime > timeout) {
          throw new Error(`Timeout exceeded after ${timeout}ms`);
        }
        
        const result = await action();
        
        if (attempt > 1) {
          this.logger.debug('Action succeeded after retry', { 
            attempt, 
            totalTime: Date.now() - startTime 
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts) {
          const waitTime = backoff ? delay * attempt : delay;
          
          this.logger.debug('Action failed, retrying', {
            attempt,
            maxAttempts,
            waitTime,
            error: lastError.message
          });
          
          await this.sleep(waitTime);
        }
      }
    }
    
    this.logger.error('Action failed after all retries', lastError!, {
      maxAttempts,
      totalTime: Date.now() - startTime
    });
    
    throw new Error(`${errorMessage}: ${lastError?.message}`);
  }

  /**
   * Espera hasta que se cumpla una condición
   */
  static async waitUntil(
    condition: () => Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      message?: string;
    } = {}
  ): Promise<void> {
    const timeout = options.timeout ?? this.defaultTimeout;
    const interval = options.interval ?? 500;
    const message = options.message ?? 'Condition not met';
    
    const startTime = Date.now();
    
    this.logger.debug('Waiting for condition', { timeout, interval });
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          this.logger.debug('Condition met', {
            duration: Date.now() - startTime
          });
          return;
        }
      } catch (error) {
        this.logger.trace('Condition check failed', { error });
      }
      
      await this.sleep(interval);
    }
    
    throw new Error(`${message} (timeout: ${timeout}ms)`);
  }

  /**
   * Espera a que la página esté completamente cargada
   */
  static async waitForPageLoad(
    page: Page,
    options?: {
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
      timeout?: number;
    }
  ): Promise<void> {
    const waitUntil = options?.waitUntil ?? 'load';
    const timeout = options?.timeout ?? this.defaultTimeout;
    
    this.logger.debug('Waiting for page load', { waitUntil, timeout });
    
    try {
      await page.waitForLoadState(waitUntil, { timeout });
      this.logger.debug('Page loaded successfully');
    } catch (error) {
      this.logger.error('Page load timeout', error as Error, { waitUntil, timeout });
      throw error;
    }
  }

  /**
   * Espera un tiempo específico
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Espera a que aparezca cualquiera de los elementos especificados
   */
  static async waitForAnyElement(
    page: Page,
    locators: ElementLocator[],
    options?: WaitOptions
  ): Promise<{ element: Locator; index: number }> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    
    this.logger.debug('Waiting for any of multiple elements', {
      count: locators.length,
      timeout
    });
    
    const promises = locators.map((locator, index) =>
      this.waitForElement(page, locator, options)
        .then(element => ({ element, index }))
    );
    
    try {
      const result = await Promise.race(promises);
      
      this.logger.debug('Found element', {
        index: result.index,
        locator: locators[result.index].description
      });
      
      return result;
    } catch (error) {
      this.logger.error('None of the elements found', error as Error, {
        count: locators.length,
        timeout
      });
      throw new Error('None of the specified elements were found');
    }
  }
}