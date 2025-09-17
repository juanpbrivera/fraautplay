// src/elements/ElementManager.ts

import { Page, Locator } from 'playwright';
import { 
  ElementLocator, 
  ActionOptions, 
  WaitOptions,
  ActionResult 
} from '../types/FrameworkTypes';
import { Locators } from './Locators';
import { WaitStrategies } from './WaitStrategies';
import { ElementActions } from './ElementActions';
import { LoggerFactory } from '../core/logging/LoggerFactory';
import { ScreenshotHelper } from '../utilities/ScreenshotHelper';

/**
 * API principal para gestionar elementos web
 * Centraliza todas las operaciones sobre elementos con manejo de errores y logging
 */
export class ElementManager {
  private page: Page;
  private logger = LoggerFactory.getLogger('ElementManager');
  private defaultTimeout: number = 30000;
  private captureScreenshotsOnError: boolean = true;

  constructor(
    page: Page, 
    options?: {
      defaultTimeout?: number;
      captureScreenshotsOnError?: boolean;
    }
  ) {
    this.page = page;
    this.defaultTimeout = options?.defaultTimeout ?? 30000;
    this.captureScreenshotsOnError = options?.captureScreenshotsOnError ?? true;
    
    WaitStrategies.initialize();
  }

  /**
   * Encuentra un elemento en la página
   */
  async find(
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<Locator> {
    try {
      this.logger.debug('Finding element', { 
        locator: locator.description 
      });
      
      return await WaitStrategies.waitForElement(
        this.page, 
        locator, 
        { timeout: this.defaultTimeout, ...options }
      );
    } catch (error) {
      await this.handleError('find', locator, error as Error);
      throw error;
    }
  }

  /**
   * Encuentra múltiples elementos
   */
  async findAll(
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<Locator[]> {
    try {
      this.logger.debug('Finding all elements', { 
        locator: locator.description 
      });
      
      // Esperar a que al menos un elemento esté presente
      await WaitStrategies.waitForElement(
        this.page, 
        locator, 
        { timeout: this.defaultTimeout, ...options }
      );
      
      const elements = Locators.getLocator(this.page, locator);
      const count = await elements.count();
      
      const result: Locator[] = [];
      for (let i = 0; i < count; i++) {
        result.push(elements.nth(i));
      }
      
      this.logger.debug('Found multiple elements', { 
        locator: locator.description,
        count 
      });
      
      return result;
    } catch (error) {
      await this.handleError('findAll', locator, error as Error);
      throw error;
    }
  }

  /**
   * Click en un elemento
   */
  async click(
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const result = await ElementActions.click(
      this.page, 
      locator, 
      { timeout: this.defaultTimeout, ...options }
    );
    
    if (!result.success && this.captureScreenshotsOnError) {
      result.screenshot = await this.captureScreenshot('click_error');
    }
    
    return result;
  }

  /**
   * Doble click
   */
  async doubleClick(
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const result = await ElementActions.doubleClick(
      this.page, 
      locator, 
      { timeout: this.defaultTimeout, ...options }
    );
    
    if (!result.success && this.captureScreenshotsOnError) {
      result.screenshot = await this.captureScreenshot('double_click_error');
    }
    
    return result;
  }

  /**
   * Click derecho
   */
  async rightClick(
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const result = await ElementActions.rightClick(
      this.page, 
      locator, 
      { timeout: this.defaultTimeout, ...options }
    );
    
    if (!result.success && this.captureScreenshotsOnError) {
      result.screenshot = await this.captureScreenshot('right_click_error');
    }
    
    return result;
  }

  /**
   * Escribir texto
   */
  async type(
    locator: ElementLocator,
    text: string,
    options?: ActionOptions & { clearFirst?: boolean }
  ): Promise<ActionResult<void>> {
    const result = await ElementActions.type(
      this.page, 
      locator, 
      text,
      { timeout: this.defaultTimeout, ...options }
    );
    
    if (!result.success && this.captureScreenshotsOnError) {
      result.screenshot = await this.captureScreenshot('type_error');
    }
    
    return result;
  }

  /**
   * Limpiar campo
   */
  async clear(
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    return ElementActions.clear(
      this.page, 
      locator, 
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Seleccionar opción
   */
  async selectOption(
    locator: ElementLocator,
    value: string | string[],
    options?: ActionOptions
  ): Promise<ActionResult<string[]>> {
    return ElementActions.selectOption(
      this.page, 
      locator, 
      value,
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Marcar/desmarcar checkbox
   */
  async check(
    locator: ElementLocator,
    checked: boolean = true,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    return ElementActions.check(
      this.page, 
      locator, 
      checked,
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Subir archivo
   */
  async uploadFile(
    locator: ElementLocator,
    filePath: string | string[],
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    return ElementActions.uploadFile(
      this.page, 
      locator, 
      filePath,
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Hover sobre elemento
   */
  async hover(
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    return ElementActions.hover(
      this.page, 
      locator, 
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Drag and drop
   */
  async dragAndDrop(
    sourceLocator: ElementLocator,
    targetLocator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    return ElementActions.dragAndDrop(
      this.page, 
      sourceLocator, 
      targetLocator,
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Presionar tecla
   */
  async press(
    locator: ElementLocator,
    key: string,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    return ElementActions.press(
      this.page, 
      locator, 
      key,
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Obtener texto
   */
  async getText(
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<string> {
    const result = await ElementActions.getText(
      this.page, 
      locator, 
      { timeout: this.defaultTimeout, ...options }
    );
    
    if (!result.success) {
      throw result.error || new Error('Failed to get text');
    }
    
    return result.data || '';
  }

  /**
   * Obtener atributo
   */
  async getAttribute(
    locator: ElementLocator,
    attributeName: string,
    options?: ActionOptions
  ): Promise<string | null> {
    const result = await ElementActions.getAttribute(
      this.page, 
      locator, 
      attributeName,
      { timeout: this.defaultTimeout, ...options }
    );
    
    if (!result.success) {
      throw result.error || new Error('Failed to get attribute');
    }
    
    return result.data || null;
  }

  /**
   * Verifica si un elemento está visible
   */
  async isVisible(
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<boolean> {
    try {
      const element = await this.find(locator, { 
        ...options, 
        state: 'visible' 
      });
      return await element.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Verifica si un elemento está habilitado
   */
  async isEnabled(
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<boolean> {
    try {
      const element = await this.find(locator, options);
      return await element.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Verifica si un checkbox está marcado
   */
  async isChecked(
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<boolean> {
    try {
      const element = await this.find(locator, options);
      return await element.isChecked();
    } catch {
      return false;
    }
  }

  /**
   * Espera a que un elemento esté visible
   */
  async waitForVisible(
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<Locator> {
    return WaitStrategies.waitForVisible(
      this.page, 
      locator, 
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Espera a que un elemento esté oculto
   */
  async waitForHidden(
    locator: ElementLocator,
    options?: WaitOptions
  ): Promise<void> {
    return WaitStrategies.waitForHidden(
      this.page, 
      locator, 
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Espera a que un elemento contenga texto
   */
  async waitForText(
    locator: ElementLocator,
    text: string,
    options?: WaitOptions
  ): Promise<Locator> {
    return WaitStrategies.waitForText(
      this.page, 
      locator, 
      text,
      { timeout: this.defaultTimeout, ...options }
    );
  }

  /**
   * Ejecuta una acción con reintentos
   */
  async withRetry<T>(
    action: () => Promise<T>,
    options?: {
      maxAttempts?: number;
      delay?: number;
      backoff?: boolean;
    }
  ): Promise<T> {
    return WaitStrategies.waitWithRetry(action, {
      timeout: this.defaultTimeout,
      ...options
    });
  }

  /**
   * Obtiene el conteo de elementos que coinciden con el localizador
   */
  async count(locator: ElementLocator): Promise<number> {
    try {
      const element = Locators.getLocator(this.page, locator);
      return await element.count();
    } catch (error) {
      this.logger.error('Failed to count elements', error as Error, {
        locator: locator.description
      });
      return 0;
    }
  }

  /**
   * Verifica si existe al menos un elemento
   */
  async exists(locator: ElementLocator): Promise<boolean> {
    const count = await this.count(locator);
    return count > 0;
  }

  /**
   * Scroll hasta un elemento
   */
  async scrollIntoView(
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      const element = await this.find(locator, options);
      await element.scrollIntoViewIfNeeded();
      
      const duration = Date.now() - startTime;
      this.logger.debug('Scrolled to element', {
        locator: locator.description,
        duration
      });
      
      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to scroll to element', error as Error, {
        locator: locator.description,
        duration
      });
      
      return {
        success: false,
        error: error as Error,
        duration
      };
    }
  }

  /**
   * Tomar screenshot de un elemento específico
   */
  async screenshot(
    locator: ElementLocator,
    options?: {
      path?: string;
      type?: 'png' | 'jpeg';
      quality?: number;
    }
  ): Promise<Buffer> {
    try {
      const element = await this.find(locator);
      return await element.screenshot(options);
    } catch (error) {
      this.logger.error('Failed to take element screenshot', error as Error, {
        locator: locator.description
      });
      throw error;
    }
  }

  /**
   * Manejo centralizado de errores
   */
  private async handleError(
    action: string,
    locator: ElementLocator,
    error: Error
  ): Promise<void> {
    this.logger.error(`Element action failed: ${action}`, error, {
      locator: locator.description,
      action
    });
    
    if (this.captureScreenshotsOnError) {
      await this.captureScreenshot(`${action}_error`);
    }
  }

  /**
   * Captura screenshot para debugging
   */
  private async captureScreenshot(prefix: string): Promise<string | undefined> {
    try {
      // Este método será implementado en ScreenshotHelper
      return await ScreenshotHelper.capture(this.page, { 
        prefix,
        fullPage: true 
      });
    } catch (error) {
      this.logger.warn('Failed to capture error screenshot', { error });
      return undefined;
    }
  }

  /**
   * Actualiza el timeout por defecto
   */
  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
    this.logger.debug('Default timeout updated', { timeout });
  }

  /**
   * Obtiene la página actual
   */
  getPage(): Page {
    return this.page;
  }
}