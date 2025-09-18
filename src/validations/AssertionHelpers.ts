// src/validations/AssertionHelpers.ts

import { Page, expect } from '@playwright/test';
import { ElementLocator, ValidationResult } from '../types/FrameworkTypes';
import { WaitStrategies } from '../elements/WaitStrategies';
import { ElementManager } from '../elements/ElementManager';
import { LoggerFactory } from '../core/logging/LoggerFactory';

/**
 * Helpers de aserción para validaciones
 * Proporciona métodos útiles para verificar estados y condiciones
 */
export class AssertionHelpers {
  private static logger = LoggerFactory.getLogger('AssertionHelpers');

  /**
   * Verifica que un elemento existe
   */
  static async toExist(
    page: Page,
    locator: ElementLocator,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Checking element exists', {
        locator: locator.description
      });

      await WaitStrategies.waitForElement(page, locator, {
        timeout: options?.timeout
      });

      this.logger.info('Element exists', {
        locator: locator.description
      });

      return {
        passed: true,
        message: options?.message || `Element exists: ${locator.description}`,
        actual: 'exists',
        expected: 'exists'
      };
    } catch (error) {
      this.logger.warn('Element does not exist', {
        locator: locator.description
      });

      return {
        passed: false,
        message: options?.message || `Element not found: ${locator.description}`,
        actual: 'not found',
        expected: 'exists'
      };
    }
  }

  /**
   * Verifica que un elemento NO existe
   */
  static async toNotExist(
    page: Page,
    locator: ElementLocator,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      const manager = new ElementManager(page);
      const exists = await manager.exists(locator);

      if (!exists) {
        return {
          passed: true,
          message: options?.message || `Element does not exist: ${locator.description}`,
          actual: 'not exists',
          expected: 'not exists'
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Element should not exist: ${locator.description}`,
          actual: 'exists',
          expected: 'not exists'
        };
      }
    } catch (error) {
      return {
        passed: true,
        message: options?.message || `Element does not exist: ${locator.description}`,
        actual: 'not exists',
        expected: 'not exists'
      };
    }
  }

  /**
   * Verifica que un elemento está visible
   */
  static async toBeVisible(
    page: Page,
    locator: ElementLocator,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      this.logger.debug('Checking element visibility', {
        locator: locator.description
      });

      const element = await WaitStrategies.waitForVisible(page, locator, {
        timeout: options?.timeout
      });

      const isVisible = await element.isVisible();

      if (isVisible) {
        return {
          passed: true,
          message: options?.message || `Element is visible: ${locator.description}`,
          actual: 'visible',
          expected: 'visible'
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Element is not visible: ${locator.description}`,
          actual: 'hidden',
          expected: 'visible'
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Element is not visible: ${locator.description}`,
        actual: 'not found',
        expected: 'visible'
      };
    }
  }

  /**
   * Verifica que un elemento NO está visible
   */
  static async toBeHidden(
    page: Page,
    locator: ElementLocator,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      await WaitStrategies.waitForHidden(page, locator, {
        timeout: options?.timeout
      });

      return {
        passed: true,
        message: options?.message || `Element is hidden: ${locator.description}`,
        actual: 'hidden',
        expected: 'hidden'
      };
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Element is not hidden: ${locator.description}`,
        actual: 'visible',
        expected: 'hidden'
      };
    }
  }

  /**
   * Verifica que un elemento tiene texto específico
   */
  static async toHaveText(
    page: Page,
    locator: ElementLocator,
    expectedText: string,
    options?: { 
      exact?: boolean; 
      timeout?: number; 
      message?: string;
      ignoreCase?: boolean;
    }
  ): Promise<ValidationResult> {
    try {
      this.logger.debug('Checking element text', {
        locator: locator.description,
        expectedText
      });

      const manager = new ElementManager(page);
      const actualText = await manager.getText(locator);
      
      let matches = false;
      
      if (options?.exact) {
        matches = options?.ignoreCase 
          ? actualText.toLowerCase() === expectedText.toLowerCase()
          : actualText === expectedText;
      } else {
        matches = options?.ignoreCase
          ? actualText.toLowerCase().includes(expectedText.toLowerCase())
          : actualText.includes(expectedText);
      }

      if (matches) {
        return {
          passed: true,
          message: options?.message || `Element has expected text`,
          actual: actualText,
          expected: expectedText
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Element text mismatch`,
          actual: actualText,
          expected: expectedText
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Failed to get element text`,
        actual: 'error',
        expected: expectedText
      };
    }
  }

  /**
   * Verifica que un elemento contiene texto
   */
  static async toContainText(
    page: Page,
    locator: ElementLocator,
    text: string,
    options?: { timeout?: number; message?: string; ignoreCase?: boolean }
  ): Promise<ValidationResult> {
    return this.toHaveText(page, locator, text, {
      ...options,
      exact: false
    });
  }

  /**
   * Verifica que un elemento está habilitado
   */
  static async toBeEnabled(
    page: Page,
    locator: ElementLocator,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      const manager = new ElementManager(page);
      const isEnabled = await manager.isEnabled(locator, { 
        timeout: options?.timeout 
      });

      if (isEnabled) {
        return {
          passed: true,
          message: options?.message || `Element is enabled`,
          actual: 'enabled',
          expected: 'enabled'
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Element is disabled`,
          actual: 'disabled',
          expected: 'enabled'
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Failed to check if element is enabled`,
        actual: 'error',
        expected: 'enabled'
      };
    }
  }

  /**
   * Verifica que un elemento está deshabilitado
   */
  static async toBeDisabled(
    page: Page,
    locator: ElementLocator,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      const manager = new ElementManager(page);
      const isEnabled = await manager.isEnabled(locator, {
        timeout: options?.timeout
      });

      if (!isEnabled) {
        return {
          passed: true,
          message: options?.message || `Element is disabled`,
          actual: 'disabled',
          expected: 'disabled'
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Element is enabled`,
          actual: 'enabled',
          expected: 'disabled'
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Failed to check if element is disabled`,
        actual: 'error',
        expected: 'disabled'
      };
    }
  }

  /**
   * Verifica que un checkbox está marcado
   */
  static async toBeChecked(
    page: Page,
    locator: ElementLocator,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      const manager = new ElementManager(page);
      const isChecked = await manager.isChecked(locator, {
        timeout: options?.timeout
      });

      if (isChecked) {
        return {
          passed: true,
          message: options?.message || `Checkbox is checked`,
          actual: 'checked',
          expected: 'checked'
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Checkbox is not checked`,
          actual: 'unchecked',
          expected: 'checked'
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Failed to check checkbox state`,
        actual: 'error',
        expected: 'checked'
      };
    }
  }

  /**
   * Verifica que un elemento tiene un atributo con valor específico
   */
  static async toHaveAttribute(
    page: Page,
    locator: ElementLocator,
    attributeName: string,
    expectedValue?: string,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      const manager = new ElementManager(page);
      const actualValue = await manager.getAttribute(locator, attributeName, {
        timeout: options?.timeout
      });

      if (expectedValue === undefined) {
        // Solo verificar que el atributo existe
        if (actualValue !== null) {
          return {
            passed: true,
            message: options?.message || `Element has attribute: ${attributeName}`,
            actual: actualValue,
            expected: 'exists'
          };
        } else {
          return {
            passed: false,
            message: options?.message || `Element does not have attribute: ${attributeName}`,
            actual: 'null',
            expected: 'exists'
          };
        }
      } else {
        // Verificar el valor del atributo
        if (actualValue === expectedValue) {
          return {
            passed: true,
            message: options?.message || `Attribute has expected value`,
            actual: actualValue,
            expected: expectedValue
          };
        } else {
          return {
            passed: false,
            message: options?.message || `Attribute value mismatch`,
            actual: actualValue || 'null',
            expected: expectedValue
          };
        }
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Failed to get attribute`,
        actual: 'error',
        expected: expectedValue || 'exists'
      };
    }
  }

  /**
   * Verifica que un elemento tiene una clase CSS
   */
  static async toHaveClass(
    page: Page,
    locator: ElementLocator,
    className: string,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      const manager = new ElementManager(page);
      const classes = await manager.getAttribute(locator, 'class', {
        timeout: options?.timeout
      });

      const classList = classes?.split(/\s+/) || [];
      
      if (classList.includes(className)) {
        return {
          passed: true,
          message: options?.message || `Element has class: ${className}`,
          actual: classes || '',
          expected: className
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Element does not have class: ${className}`,
          actual: classes || '',
          expected: className
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Failed to check class`,
        actual: 'error',
        expected: className
      };
    }
  }

  /**
   * Verifica el número de elementos que coinciden con un localizador
   */
  static async toHaveCount(
    page: Page,
    locator: ElementLocator,
    expectedCount: number,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      const manager = new ElementManager(page);
      const actualCount = await manager.count(locator);

      if (actualCount === expectedCount) {
        return {
          passed: true,
          message: options?.message || `Element count matches`,
          actual: actualCount,
          expected: expectedCount
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Element count mismatch`,
          actual: actualCount,
          expected: expectedCount
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Failed to count elements`,
        actual: 'error',
        expected: expectedCount
      };
    }
  }

  /**
   * Verifica que el valor de un input coincide
   */
  static async toHaveValue(
    page: Page,
    locator: ElementLocator,
    expectedValue: string,
    options?: { timeout?: number; message?: string }
  ): Promise<ValidationResult> {
    try {
      const element = await WaitStrategies.waitForVisible(page, locator, {
        timeout: options?.timeout
      });

      const actualValue = await element.inputValue();

      if (actualValue === expectedValue) {
        return {
          passed: true,
          message: options?.message || `Input has expected value`,
          actual: actualValue,
          expected: expectedValue
        };
      } else {
        return {
          passed: false,
          message: options?.message || `Input value mismatch`,
          actual: actualValue,
          expected: expectedValue
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Failed to get input value`,
        actual: 'error',
        expected: expectedValue
      };
    }
  }
}