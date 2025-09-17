// src/elements/ElementActions.ts

import { Page, Locator } from 'playwright';
import { ElementLocator, ActionOptions, ActionResult } from '../types/FrameworkTypes';
import { Locators } from './Locators';
import { WaitStrategies } from './WaitStrategies';
import { LoggerFactory } from '../core/logging/LoggerFactory';

/**
 * Acciones sobre elementos web
 * Proporciona métodos para interactuar con elementos de forma segura y consistente
 */
export class ElementActions {
  private static logger = LoggerFactory.getLogger('ElementActions');

  /**
   * Click en un elemento
   */
  static async click(
    page: Page,
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Clicking element', {
        locator: locator.description,
        options
      });

      const element = await WaitStrategies.waitForClickable(page, locator, options);
      
      await element.click({
        force: options?.force,
        delay: options?.delay,
        button: options?.button,
        clickCount: options?.clickCount,
        modifiers: options?.modifiers,
        timeout: options?.timeout
      });

      const duration = Date.now() - startTime;
      this.logger.info('Element clicked successfully', {
        locator: locator.description,
        duration
      });

      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to click element', error as Error, {
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
   * Doble click en un elemento
   */
  static async doubleClick(
    page: Page,
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    return this.click(page, locator, {
      ...options,
      clickCount: 2
    });
  }

  /**
   * Click derecho en un elemento
   */
  static async rightClick(
    page: Page,
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Right-clicking element', {
        locator: locator.description
      });

      const element = await WaitStrategies.waitForClickable(page, locator, options);
      
      await element.click({
        button: 'right',
        force: options?.force,
        delay: options?.delay,
        timeout: options?.timeout
      });

      const duration = Date.now() - startTime;
      this.logger.info('Element right-clicked successfully', {
        locator: locator.description,
        duration
      });

      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to right-click element', error as Error, {
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
   * Escribir texto en un elemento
   */
  static async type(
    page: Page,
    locator: ElementLocator,
    text: string,
    options?: ActionOptions & { clearFirst?: boolean }
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Typing into element', {
        locator: locator.description,
        textLength: text.length,
        clearFirst: options?.clearFirst
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      
      // Limpiar el campo si se solicita
      if (options?.clearFirst) {
        await element.clear();
      }
      
      await element.type(text, {
        delay: options?.delay,
        timeout: options?.timeout
      });

      const duration = Date.now() - startTime;
      this.logger.info('Text typed successfully', {
        locator: locator.description,
        duration
      });

      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to type text', error as Error, {
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
   * Limpiar el contenido de un elemento
   */
  static async clear(
    page: Page,
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Clearing element', {
        locator: locator.description
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      await element.clear();

      const duration = Date.now() - startTime;
      this.logger.info('Element cleared successfully', {
        locator: locator.description,
        duration
      });

      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to clear element', error as Error, {
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
   * Seleccionar una opción de un dropdown
   */
  static async selectOption(
    page: Page,
    locator: ElementLocator,
    value: string | string[],
    options?: ActionOptions
  ): Promise<ActionResult<string[]>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Selecting option', {
        locator: locator.description,
        value
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      const selected = await element.selectOption(value, {
        timeout: options?.timeout
      });

      const duration = Date.now() - startTime;
      this.logger.info('Option selected successfully', {
        locator: locator.description,
        selected,
        duration
      });

      return {
        success: true,
        data: selected,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to select option', error as Error, {
        locator: locator.description,
        value,
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
   * Marcar/desmarcar un checkbox
   */
  static async check(
    page: Page,
    locator: ElementLocator,
    checked: boolean = true,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Setting checkbox state', {
        locator: locator.description,
        checked
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      
      if (checked) {
        await element.check({
          force: options?.force,
          timeout: options?.timeout
        });
      } else {
        await element.uncheck({
          force: options?.force,
          timeout: options?.timeout
        });
      }

      const duration = Date.now() - startTime;
      this.logger.info('Checkbox state set successfully', {
        locator: locator.description,
        checked,
        duration
      });

      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to set checkbox state', error as Error, {
        locator: locator.description,
        checked,
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
   * Subir un archivo
   */
  static async uploadFile(
    page: Page,
    locator: ElementLocator,
    filePath: string | string[],
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Uploading file', {
        locator: locator.description,
        filePath
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      await element.setInputFiles(filePath);

      const duration = Date.now() - startTime;
      this.logger.info('File uploaded successfully', {
        locator: locator.description,
        duration
      });

      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to upload file', error as Error, {
        locator: locator.description,
        filePath,
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
   * Hover sobre un elemento
   */
  static async hover(
    page: Page,
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Hovering over element', {
        locator: locator.description
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      await element.hover({
        force: options?.force,
        timeout: options?.timeout
      });

      const duration = Date.now() - startTime;
      this.logger.info('Hover successful', {
        locator: locator.description,
        duration
      });

      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to hover over element', error as Error, {
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
   * Arrastrar y soltar
   */
  static async dragAndDrop(
    page: Page,
    sourceLocator: ElementLocator,
    targetLocator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Performing drag and drop', {
        source: sourceLocator.description,
        target: targetLocator.description
      });

      const sourceElement = await WaitStrategies.waitForVisible(page, sourceLocator, options);
      const targetElement = await WaitStrategies.waitForVisible(page, targetLocator, options);
      
      await sourceElement.dragTo(targetElement, {
        force: options?.force,
        timeout: options?.timeout
      });

      const duration = Date.now() - startTime;
      this.logger.info('Drag and drop successful', {
        source: sourceLocator.description,
        target: targetLocator.description,
        duration
      });

      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to perform drag and drop', error as Error, {
        source: sourceLocator.description,
        target: targetLocator.description,
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
   * Presionar tecla(s)
   */
  static async press(
    page: Page,
    locator: ElementLocator,
    key: string,
    options?: ActionOptions
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Pressing key', {
        locator: locator.description,
        key
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      await element.press(key, {
        delay: options?.delay,
        timeout: options?.timeout
      });

      const duration = Date.now() - startTime;
      this.logger.info('Key pressed successfully', {
        locator: locator.description,
        key,
        duration
      });

      return {
        success: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to press key', error as Error, {
        locator: locator.description,
        key,
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
   * Obtener el texto de un elemento
   */
  static async getText(
    page: Page,
    locator: ElementLocator,
    options?: ActionOptions
  ): Promise<ActionResult<string>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Getting element text', {
        locator: locator.description
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      const text = await element.textContent();

      const duration = Date.now() - startTime;
      this.logger.debug('Text retrieved successfully', {
        locator: locator.description,
        text,
        duration
      });

      return {
        success: true,
        data: text || '',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to get element text', error as Error, {
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
   * Obtener el valor de un atributo
   */
  static async getAttribute(
    page: Page,
    locator: ElementLocator,
    attributeName: string,
    options?: ActionOptions
  ): Promise<ActionResult<string | null>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Getting element attribute', {
        locator: locator.description,
        attribute: attributeName
      });

      const element = await WaitStrategies.waitForElement(page, locator, options);
      const value = await element.getAttribute(attributeName);

      const duration = Date.now() - startTime;
      this.logger.debug('Attribute retrieved successfully', {
        locator: locator.description,
        attribute: attributeName,
        value,
        duration
      });

      return {
        success: true,
        data: value,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to get element attribute', error as Error, {
        locator: locator.description,
        attribute: attributeName,
        duration
      });

      return {
        success: false,
        error: error as Error,
        duration
      };
    }
  }
}