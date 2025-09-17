/**
 * ⏱️ WaitStrategies.ts
 * 
 * Sistema de esperas inteligentes para sincronización con la aplicación web.
 * Maneja timeouts, reintentos y diferentes condiciones de espera.
 * 
 * ¿Por qué son importantes las esperas?
 * - Las páginas web cargan de forma asíncrona
 * - Los elementos pueden aparecer/desaparecer dinámicamente
 * - Las animaciones y transiciones toman tiempo
 * - Las llamadas AJAX/API pueden demorar
 * 
 * ¿Qué son esperas inteligentes?
 * En lugar de usar sleep() fijos, esperamos condiciones específicas.
 * Esto hace las pruebas más rápidas y confiables.
 */

import { Page, Locator, Response } from '@playwright/test';
import { 
  WaitStrategy,
  FrameworkError,
  ErrorCode 
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../core/logging/LoggerFactory';

/**
 * 📋 Opciones para esperas personalizadas
 */
export interface WaitOptions {
  timeout?: number;                // Tiempo máximo de espera
  interval?: number;               // Intervalo entre verificaciones
  message?: string;                // Mensaje personalizado de error
  throwOnTimeout?: boolean;        // Lanzar error si timeout
  retries?: number;               // Número de reintentos
  backoff?: boolean;              // Incrementar tiempo entre reintentos
}

/**
 * 📊 Condiciones de espera personalizadas
 */
export interface WaitCondition {
  name: string;                    // Nombre de la condición
  check: () => Promise<boolean>;   // Función de verificación
  errorMessage?: string;           // Mensaje si falla
}

/**
 * ⏱️ Clase WaitManager - Gestiona todas las esperas
 */
export class WaitManager {
  private page: Page;
  private defaultTimeout: number;
  private logger = LoggerFactory.forComponent(ComponentType.ELEMENT_MANAGER);
  
  constructor(page: Page, defaultTimeout = 30000) {
    this.page = page;
    this.defaultTimeout = defaultTimeout;
  }
  
  /**
   * 🎯 Esperar según una estrategia predefinida
   */
  public async waitFor(
    locator: Locator, 
    strategy: WaitStrategy, 
    timeout?: number
  ): Promise<void> {
    const waitTimeout = timeout || this.defaultTimeout;
    
    this.logger.debug(`Esperando elemento con estrategia: ${strategy}`, {
      timeout: waitTimeout
    });
    
    try {
      switch (strategy) {
        case WaitStrategy.VISIBLE:
          await this.waitForVisible(locator, waitTimeout);
          break;
          
        case WaitStrategy.HIDDEN:
          await this.waitForHidden(locator, waitTimeout);
          break;
          
        case WaitStrategy.ATTACHED:
          await this.waitForAttached(locator, waitTimeout);
          break;
          
        case WaitStrategy.DETACHED:
          await this.waitForDetached(locator, waitTimeout);
          break;
          
        case WaitStrategy.ENABLED:
          await this.waitForEnabled(locator, waitTimeout);
          break;
          
        case WaitStrategy.DISABLED:
          await this.waitForDisabled(locator, waitTimeout);
          break;
          
        case WaitStrategy.STABLE:
          await this.waitForStable(locator, waitTimeout);
          break;
          
        case WaitStrategy.NETWORK_IDLE:
          await this.waitForNetworkIdle(waitTimeout);
          break;
          
        default:
          throw new Error(`Estrategia de espera no soportada: ${strategy}`);
      }
      
      this.logger.debug(`✅ Espera completada: ${strategy}`);
      
    } catch (error) {
      this.logger.error(`❌ Timeout esperando: ${strategy}`, error as Error);
      throw new FrameworkError(
        `Timeout esperando que el elemento esté ${strategy}`,
        ErrorCode.TIMEOUT,
        { strategy, timeout: waitTimeout }
      );
    }
  }
  
  /**
   * 👁️ Esperar a que elemento sea visible
   */
  public async waitForVisible(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ 
      state: 'visible', 
      timeout: timeout || this.defaultTimeout 
    });
    this.logger.trace('Elemento visible');
  }
  
  /**
   * 🙈 Esperar a que elemento esté oculto
   */
  public async waitForHidden(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ 
      state: 'hidden', 
      timeout: timeout || this.defaultTimeout 
    });
    this.logger.trace('Elemento oculto');
  }
  
  /**
   * 📎 Esperar a que elemento esté en el DOM
   */
  public async waitForAttached(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ 
      state: 'attached', 
      timeout: timeout || this.defaultTimeout 
    });
    this.logger.trace('Elemento adjunto al DOM');
  }
  
  /**
   * 🔌 Esperar a que elemento NO esté en el DOM
   */
  public async waitForDetached(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ 
      state: 'detached', 
      timeout: timeout || this.defaultTimeout 
    });
    this.logger.trace('Elemento removido del DOM');
  }
  
  /**
   * ✅ Esperar a que elemento esté habilitado
   */
  public async waitForEnabled(locator: Locator, timeout?: number): Promise<void> {
    const waitTimeout = timeout || this.defaultTimeout;
    const startTime = Date.now();
    
    while (Date.now() - startTime < waitTimeout) {
      if (await locator.isEnabled()) {
        this.logger.trace('Elemento habilitado');
        return;
      }
      await this.page.waitForTimeout(100); // Pequeña pausa
    }
    
    throw new Error('Timeout esperando que elemento esté habilitado');
  }
  
  /**
   * 🚫 Esperar a que elemento esté deshabilitado
   */
  public async waitForDisabled(locator: Locator, timeout?: number): Promise<void> {
    const waitTimeout = timeout || this.defaultTimeout;
    const startTime = Date.now();
    
    while (Date.now() - startTime < waitTimeout) {
      if (await locator.isDisabled()) {
        this.logger.trace('Elemento deshabilitado');
        return;
      }
      await this.page.waitForTimeout(100);
    }
    
    throw new Error('Timeout esperando que elemento esté deshabilitado');
  }
  
  /**
   * 🎯 Esperar a que elemento esté estable (sin animaciones)
   */
  public async waitForStable(locator: Locator, timeout?: number): Promise<void> {
    const waitTimeout = timeout || this.defaultTimeout;
    
    // Esperar a que el elemento esté visible primero
    await this.waitForVisible(locator, waitTimeout);
    
    // Luego esperar a que no haya animaciones
    await locator.evaluate(element => {
      return new Promise<void>((resolve) => {
        // Esperar a que terminen las animaciones CSS
        const animations = element.getAnimations();
        if (animations.length === 0) {
          resolve();
          return;
        }
        
        Promise.all(animations.map(a => a.finished)).then(() => resolve());
      });
    });
    
    this.logger.trace('Elemento estable (sin animaciones)');
  }
  
  /**
   * 🌐 Esperar a que no haya actividad de red
   */
  public async waitForNetworkIdle(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('networkidle', { 
      timeout: timeout || this.defaultTimeout 
    });
    this.logger.trace('Red inactiva');
  }
  
  /**
   * 📄 Esperar a que la página cargue completamente
   */
  public async waitForPageLoad(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('load', { 
      timeout: timeout || this.defaultTimeout 
    });
    this.logger.trace('Página cargada');
  }
  
  /**
   * 📄 Esperar a que el DOM esté listo
   */
  public async waitForDOMContentLoaded(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { 
      timeout: timeout || this.defaultTimeout 
    });
    this.logger.trace('DOM cargado');
  }
  
  /**
   * 🔄 Esperar una navegación
   */
  public async waitForNavigation(
    action: () => Promise<void>, 
    options?: {
      url?: string | RegExp;
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
      timeout?: number;
    }
  ): Promise<Response | null> {
    this.logger.debug('Esperando navegación...');
    
    const response = await this.page.waitForNavigation({
      url: options?.url,
      waitUntil: options?.waitUntil || 'load',
      timeout: options?.timeout || this.defaultTimeout
    }, action);
    
    this.logger.debug(`Navegación completada: ${response?.url()}`);
    return response;
  }
  
  /**
   * 🔗 Esperar una URL específica
   */
  public async waitForURL(
    url: string | RegExp, 
    timeout?: number
  ): Promise<void> {
    await this.page.waitForURL(url, { 
      timeout: timeout || this.defaultTimeout 
    });
    this.logger.debug(`URL alcanzada: ${this.page.url()}`);
  }
  
  /**
   * 📝 Esperar que el texto cambie en un elemento
   */
  public async waitForTextChange(
    locator: Locator, 
    options?: {
      from?: string;
      to?: string;
      timeout?: number;
    }
  ): Promise<string> {
    const waitTimeout = options?.timeout || this.defaultTimeout;
    const startTime = Date.now();
    const initialText = options?.from || await locator.textContent() || '';
    
    this.logger.debug(`Esperando cambio de texto desde: "${initialText}"`);
    
    while (Date.now() - startTime < waitTimeout) {
      const currentText = await locator.textContent() || '';
      
      // Si se especificó texto esperado
      if (options?.to && currentText === options.to) {
        this.logger.debug(`Texto cambió a: "${currentText}"`);
        return currentText;
      }
      
      // Si solo queremos que cambie
      if (!options?.to && currentText !== initialText) {
        this.logger.debug(`Texto cambió de "${initialText}" a "${currentText}"`);
        return currentText;
      }
      
      await this.page.waitForTimeout(100);
    }
    
    throw new Error(`Timeout esperando cambio de texto`);
  }
  
  /**
   * 📊 Esperar que un valor cambie
   */
  public async waitForValueChange(
    locator: Locator,
    expectedValue?: string,
    timeout?: number
  ): Promise<string> {
    const waitTimeout = timeout || this.defaultTimeout;
    const startTime = Date.now();
    
    while (Date.now() - startTime < waitTimeout) {
      const currentValue = await locator.inputValue();
      
      if (expectedValue) {
        if (currentValue === expectedValue) {
          this.logger.debug(`Valor cambió a: "${currentValue}"`);
          return currentValue;
        }
      } else {
        // Solo verificar que haya algún valor
        if (currentValue) {
          this.logger.debug(`Valor presente: "${currentValue}"`);
          return currentValue;
        }
      }
      
      await this.page.waitForTimeout(100);
    }
    
    throw new Error('Timeout esperando cambio de valor');
  }
  
  /**
   * 🎯 Esperar una condición personalizada
   */
  public async waitForCondition(
    condition: WaitCondition,
    options?: WaitOptions
  ): Promise<void> {
    const config = {
      timeout: options?.timeout || this.defaultTimeout,
      interval: options?.interval || 100,
      throwOnTimeout: options?.throwOnTimeout !== false,
      retries: options?.retries || 0,
      backoff: options?.backoff || false
    };
    
    this.logger.debug(`Esperando condición: ${condition.name}`);
    
    let lastError: Error | null = null;
    let attempt = 0;
    
    while (attempt <= config.retries) {
      const startTime = Date.now();
      let currentTimeout = config.timeout;
      
      // Aplicar backoff si está configurado
      if (config.backoff && attempt > 0) {
        currentTimeout = config.timeout * Math.pow(2, attempt);
      }
      
      while (Date.now() - startTime < currentTimeout) {
        try {
          if (await condition.check()) {
            this.logger.debug(`✅ Condición cumplida: ${condition.name}`);
            return;
          }
        } catch (error) {
          lastError = error as Error;
        }
        
        await this.page.waitForTimeout(config.interval);
      }
      
      attempt++;
      if (attempt <= config.retries) {
        this.logger.debug(`Reintentando condición (${attempt}/${config.retries}): ${condition.name}`);
      }
    }
    
    // Si llegamos aquí, timeout
    const errorMessage = condition.errorMessage || 
                        options?.message || 
                        `Timeout esperando condición: ${condition.name}`;
    
    if (config.throwOnTimeout) {
      throw new FrameworkError(
        errorMessage,
        ErrorCode.TIMEOUT,
        { condition: condition.name, attempts: attempt, lastError }
      );
    }
    
    this.logger.warn(errorMessage);
  }
  
  /**
   * ⏰ Esperar un tiempo específico (usar con precaución)
   */
  public async wait(milliseconds: number): Promise<void> {
    this.logger.debug(`Esperando ${milliseconds}ms`);
    await this.page.waitForTimeout(milliseconds);
  }
  
  /**
   * 🔄 Esperar hasta que una función devuelva true
   */
  public async waitUntil(
    predicate: () => Promise<boolean> | boolean,
    options?: WaitOptions
  ): Promise<void> {
    await this.waitForCondition({
      name: 'custom predicate',
      check: async () => {
        const result = await predicate();
        return result;
      }
    }, options);
  }
  
  /**
   * 📦 Esperar a que aparezca un elemento con texto específico
   */
  public async waitForText(
    text: string,
    options?: {
      selector?: string;
      exact?: boolean;
      timeout?: number;
    }
  ): Promise<Locator> {
    const selector = options?.selector || '*';
    const exact = options?.exact ?? false;
    const timeout = options?.timeout || this.defaultTimeout;
    
    const locator = exact 
      ? this.page.locator(`${selector}:text-is("${text}")`)
      : this.page.locator(`${selector}:has-text("${text}")`);
    
    await this.waitForVisible(locator, timeout);
    return locator;
  }
  
  /**
   * 🎨 Esperar que desaparezca un loader/spinner
   */
  public async waitForLoaderToDisappear(
    loaderSelector = '.loader, .spinner, .loading',
    timeout?: number
  ): Promise<void> {
    this.logger.debug('Esperando que desaparezca el loader...');
    
    const loader = this.page.locator(loaderSelector);
    
    // Primero verificar si existe
    if (await loader.count() > 0) {
      await this.waitForHidden(loader, timeout);
      this.logger.debug('Loader desapareció');
    } else {
      this.logger.trace('No se encontró loader');
    }
  }
  
  /**
   * 📊 Esperar múltiples condiciones (AND)
   */
  public async waitForAll(
    conditions: WaitCondition[],
    options?: WaitOptions
  ): Promise<void> {
    this.logger.debug(`Esperando ${conditions.length} condiciones...`);
    
    await this.waitForCondition({
      name: 'all conditions',
      check: async () => {
        for (const condition of conditions) {
          if (!(await condition.check())) {
            return false;
          }
        }
        return true;
      },
      errorMessage: `No se cumplieron todas las condiciones`
    }, options);
  }
  
  /**
   * 📊 Esperar alguna condición (OR)
   */
  public async waitForAny(
    conditions: WaitCondition[],
    options?: WaitOptions
  ): Promise<number> {
    this.logger.debug(`Esperando alguna de ${conditions.length} condiciones...`);
    
    const timeout = options?.timeout || this.defaultTimeout;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      for (let i = 0; i < conditions.length; i++) {
        if (await conditions[i].check()) {
          this.logger.debug(`Condición cumplida: ${conditions[i].name}`);
          return i; // Devolver índice de la condición que se cumplió
        }
      }
      await this.page.waitForTimeout(options?.interval || 100);
    }
    
    throw new FrameworkError(
      'Timeout: Ninguna condición se cumplió',
      ErrorCode.TIMEOUT,
      { conditions: conditions.map(c => c.name) }
    );
  }
}