/**
 * ✅ AssertionHelpers.ts
 * 
 * Proporciona métodos de validación y assertion para verificar el estado de la aplicación.
 * Incluye validaciones comunes como existencia, visibilidad, texto, etc.
 * 
 * ¿Qué son assertions?
 * Son verificaciones que confirman que algo es verdadero.
 * Si falla una assertion, la prueba falla.
 * 
 * ¿Por qué son importantes?
 * - Verifican que la aplicación funciona correctamente
 * - Detectan bugs y regresiones
 * - Documentan el comportamiento esperado
 * - Dan confianza en los cambios
 */

import { Page, Locator, expect } from '@playwright/test';
import {
  ValidationOptions,
  ValidationResult,
  ElementState,
  FrameworkError,
  ErrorCode
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../core/logging/LoggerFactory';
import { ElementManager } from '../elements/ElementManager';
import { ScreenshotHelper } from '../utilities/ScreenshotHelper';

/**
 * 📋 Opciones para assertions personalizadas
 */
export interface AssertionOptions extends ValidationOptions {
  retries?: number;                 // Número de reintentos
  retryInterval?: number;          // Intervalo entre reintentos (ms)
  customMessage?: string;          // Mensaje personalizado de error
  continueOnFailure?: boolean;    // Continuar si falla (soft assertion)
  captureState?: boolean;          // Capturar estado del elemento si falla
}

/**
 * 📋 Resultado detallado de assertion
 */
export interface AssertionResult extends ValidationResult {
  assertion: string;               // Tipo de assertion
  locator?: string;               // Selector usado
  elementState?: ElementState;    // Estado del elemento
  retries?: number;               // Reintentos realizados
}

/**
 * ✅ Clase AssertionHelpers - Validaciones y Assertions
 */
export class AssertionHelpers {
  private page: Page;
  private logger = LoggerFactory.forComponent(ComponentType.VALIDATION);
  private elementManager: ElementManager;
  private screenshotHelper: ScreenshotHelper;
  private softAssertions: AssertionResult[] = [];
  
  constructor(page: Page) {
    this.page = page;
    this.elementManager = new ElementManager({ page });
    this.screenshotHelper = new ScreenshotHelper(page);
  }
  
  /**
   * 🔍 Verificar que elemento existe
   */
  public async toExist(
    locator: Locator | string,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug('Verificando que elemento existe', { 
      locator: loc.toString() 
    });
    
    try {
      await this.retryAssertion(async () => {
        const count = await loc.count();
        if (count === 0) {
          throw new Error('Elemento no existe');
        }
        return count > 0;
      }, options);
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toExist',
        locator: loc.toString(),
        actual: 'exists',
        expected: 'exists',
        duration: Date.now() - startTime,
        message: options?.customMessage || 'Elemento existe'
      };
      
      this.logger.assertion('Elemento existe', true);
      return result;
      
    } catch (error) {
      return await this.handleAssertionError(
        'toExist',
        loc,
        'exists',
        'not found',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 🔍 Verificar que elemento NO existe
   */
  public async toNotExist(
    locator: Locator | string,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug('Verificando que elemento NO existe');
    
    try {
      await this.retryAssertion(async () => {
        const count = await loc.count();
        if (count > 0) {
          throw new Error('Elemento existe cuando no debería');
        }
        return count === 0;
      }, options);
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toNotExist',
        locator: loc.toString(),
        actual: 'not exists',
        expected: 'not exists',
        duration: Date.now() - startTime,
        message: 'Elemento no existe (correcto)'
      };
      
      this.logger.assertion('Elemento no existe', true);
      return result;
      
    } catch (error) {
      return await this.handleAssertionError(
        'toNotExist',
        loc,
        'not exists',
        'exists',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 👁️ Verificar que elemento es visible
   */
  public async toBeVisible(
    locator: Locator | string,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug('Verificando visibilidad de elemento');
    
    try {
      await expect(loc).toBeVisible({
        timeout: options?.timeout || 5000
      });
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toBeVisible',
        locator: loc.toString(),
        actual: 'visible',
        expected: 'visible',
        duration: Date.now() - startTime,
        message: 'Elemento es visible'
      };
      
      this.logger.assertion('Elemento visible', true);
      return result;
      
    } catch (error) {
      return await this.handleAssertionError(
        'toBeVisible',
        loc,
        'visible',
        'not visible',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 🙈 Verificar que elemento NO es visible
   */
  public async toBeHidden(
    locator: Locator | string,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug('Verificando que elemento está oculto');
    
    try {
      await expect(loc).toBeHidden({
        timeout: options?.timeout || 5000
      });
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toBeHidden',
        locator: loc.toString(),
        actual: 'hidden',
        expected: 'hidden',
        duration: Date.now() - startTime,
        message: 'Elemento está oculto'
      };
      
      this.logger.assertion('Elemento oculto', true);
      return result;
      
    } catch (error) {
      return await this.handleAssertionError(
        'toBeHidden',
        loc,
        'hidden',
        'visible',
        error as Error,
        options
      );
    }
  }
  
  /**
   * ✅ Verificar que elemento está habilitado
   */
  public async toBeEnabled(
    locator: Locator | string,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug('Verificando que elemento está habilitado');
    
    try {
      await expect(loc).toBeEnabled({
        timeout: options?.timeout || 5000
      });
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toBeEnabled',
        locator: loc.toString(),
        actual: 'enabled',
        expected: 'enabled',
        duration: Date.now() - startTime,
        message: 'Elemento está habilitado'
      };
      
      this.logger.assertion('Elemento habilitado', true);
      return result;
      
    } catch (error) {
      return await this.handleAssertionError(
        'toBeEnabled',
        loc,
        'enabled',
        'disabled',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 🚫 Verificar que elemento está deshabilitado
   */
  public async toBeDisabled(
    locator: Locator | string,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug('Verificando que elemento está deshabilitado');
    
    try {
      await expect(loc).toBeDisabled({
        timeout: options?.timeout || 5000
      });
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toBeDisabled',
        locator: loc.toString(),
        actual: 'disabled',
        expected: 'disabled',
        duration: Date.now() - startTime,
        message: 'Elemento está deshabilitado'
      };
      
      this.logger.assertion('Elemento deshabilitado', true);
      return result;
      
    } catch (error) {
      return await this.handleAssertionError(
        'toBeDisabled',
        loc,
        'disabled',
        'enabled',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 📝 Verificar texto exacto
   */
  public async toHaveText(
    locator: Locator | string,
    expectedText: string | RegExp,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug(`Verificando texto: "${expectedText}"`);
    
    try {
      await expect(loc).toHaveText(expectedText, {
        timeout: options?.timeout || 5000
      });
      
      const actualText = await loc.textContent();
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toHaveText',
        locator: loc.toString(),
        actual: actualText || '',
        expected: expectedText.toString(),
        duration: Date.now() - startTime,
        message: `Texto correcto: "${expectedText}"`
      };
      
      this.logger.assertion('Texto correcto', true, actualText, expectedText);
      return result;
      
    } catch (error) {
      const actualText = await loc.textContent().catch(() => 'N/A');
      return await this.handleAssertionError(
        'toHaveText',
        loc,
        expectedText.toString(),
        actualText || 'empty',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 📝 Verificar que contiene texto
   */
  public async toContainText(
    locator: Locator | string,
    text: string,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug(`Verificando que contiene: "${text}"`);
    
    try {
      await expect(loc).toContainText(text, {
        timeout: options?.timeout || 5000
      });
      
      const actualText = await loc.textContent();
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toContainText',
        locator: loc.toString(),
        actual: actualText || '',
        expected: `contains "${text}"`,
        duration: Date.now() - startTime,
        message: `Contiene texto: "${text}"`
      };
      
      this.logger.assertion('Contiene texto', true);
      return result;
      
    } catch (error) {
      const actualText = await loc.textContent().catch(() => 'N/A');
      return await this.handleAssertionError(
        'toContainText',
        loc,
        `contains "${text}"`,
        actualText || 'empty',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 📝 Verificar valor de input
   */
  public async toHaveValue(
    locator: Locator | string,
    expectedValue: string | RegExp,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug(`Verificando valor: "${expectedValue}"`);
    
    try {
      await expect(loc).toHaveValue(expectedValue, {
        timeout: options?.timeout || 5000
      });
      
      const actualValue = await loc.inputValue();
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toHaveValue',
        locator: loc.toString(),
        actual: actualValue,
        expected: expectedValue.toString(),
        duration: Date.now() - startTime,
        message: `Valor correcto: "${expectedValue}"`
      };
      
      this.logger.assertion('Valor correcto', true, actualValue, expectedValue);
      return result;
      
    } catch (error) {
      const actualValue = await loc.inputValue().catch(() => 'N/A');
      return await this.handleAssertionError(
        'toHaveValue',
        loc,
        expectedValue.toString(),
        actualValue,
        error as Error,
        options
      );
    }
  }
  
  /**
   * 📝 Verificar atributo
   */
  public async toHaveAttribute(
    locator: Locator | string,
    attribute: string,
    value?: string | RegExp,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug(`Verificando atributo ${attribute}="${value}"`);
    
    try {
      if (value !== undefined) {
        await expect(loc).toHaveAttribute(attribute, value, {
          timeout: options?.timeout || 5000
        });
      } else {
        // Solo verificar que el atributo existe
        const attr = await loc.getAttribute(attribute);
        if (attr === null) {
          throw new Error(`Atributo ${attribute} no existe`);
        }
      }
      
      const actualValue = await loc.getAttribute(attribute);
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toHaveAttribute',
        locator: loc.toString(),
        actual: actualValue || '',
        expected: value?.toString() || 'exists',
        duration: Date.now() - startTime,
        message: `Atributo ${attribute} correcto`
      };
      
      this.logger.assertion('Atributo correcto', true);
      return result;
      
    } catch (error) {
      const actualValue = await loc.getAttribute(attribute).catch(() => null);
      return await this.handleAssertionError(
        'toHaveAttribute',
        loc,
        value?.toString() || 'exists',
        actualValue || 'not found',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 🎨 Verificar clase CSS
   */
  public async toHaveClass(
    locator: Locator | string,
    className: string | RegExp,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug(`Verificando clase: ${className}`);
    
    try {
      await expect(loc).toHaveClass(className, {
        timeout: options?.timeout || 5000
      });
      
      const actualClasses = await loc.getAttribute('class');
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toHaveClass',
        locator: loc.toString(),
        actual: actualClasses || '',
        expected: className.toString(),
        duration: Date.now() - startTime,
        message: `Tiene clase: ${className}`
      };
      
      this.logger.assertion('Clase correcta', true);
      return result;
      
    } catch (error) {
      const actualClasses = await loc.getAttribute('class').catch(() => 'none');
      return await this.handleAssertionError(
        'toHaveClass',
        loc,
        className.toString(),
        actualClasses || 'none',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 🔢 Verificar cantidad de elementos
   */
  public async toHaveCount(
    locator: Locator | string,
    expectedCount: number,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug(`Verificando cantidad: ${expectedCount}`);
    
    try {
      await expect(loc).toHaveCount(expectedCount, {
        timeout: options?.timeout || 5000
      });
      
      const actualCount = await loc.count();
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toHaveCount',
        locator: loc.toString(),
        actual: actualCount,
        expected: expectedCount,
        duration: Date.now() - startTime,
        message: `Cantidad correcta: ${expectedCount}`
      };
      
      this.logger.assertion('Cantidad correcta', true, actualCount, expectedCount);
      return result;
      
    } catch (error) {
      const actualCount = await loc.count();
      return await this.handleAssertionError(
        'toHaveCount',
        loc,
        expectedCount,
        actualCount,
        error as Error,
        options
      );
    }
  }
  
  /**
   * ✅ Verificar checkbox marcado
   */
  public async toBeChecked(
    locator: Locator | string,
    checked = true,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    this.logger.debug(`Verificando checkbox ${checked ? 'marcado' : 'desmarcado'}`);
    
    try {
      if (checked) {
        await expect(loc).toBeChecked({ timeout: options?.timeout || 5000 });
      } else {
        await expect(loc).not.toBeChecked({ timeout: options?.timeout || 5000 });
      }
      
      const isChecked = await loc.isChecked();
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toBeChecked',
        locator: loc.toString(),
        actual: isChecked,
        expected: checked,
        duration: Date.now() - startTime,
        message: `Checkbox ${checked ? 'marcado' : 'desmarcado'}`
      };
      
      this.logger.assertion('Estado de checkbox correcto', true);
      return result;
      
    } catch (error) {
      const isChecked = await loc.isChecked().catch(() => false);
      return await this.handleAssertionError(
        'toBeChecked',
        loc,
        checked,
        isChecked,
        error as Error,
        options
      );
    }
  }
  
  /**
   * 🔗 Verificar URL
   */
  public async toHaveURL(
    expected: string | RegExp,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    
    this.logger.debug(`Verificando URL: ${expected}`);
    
    try {
      await expect(this.page).toHaveURL(expected, {
        timeout: options?.timeout || 5000
      });
      
      const actualURL = this.page.url();
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toHaveURL',
        actual: actualURL,
        expected: expected.toString(),
        duration: Date.now() - startTime,
        message: `URL correcta: ${expected}`
      };
      
      this.logger.assertion('URL correcta', true, actualURL, expected);
      return result;
      
    } catch (error) {
      const actualURL = this.page.url();
      return await this.handleAssertionError(
        'toHaveURL',
        undefined,
        expected.toString(),
        actualURL,
        error as Error,
        options
      );
    }
  }
  
  /**
   * 📄 Verificar título de página
   */
  public async toHaveTitle(
    expected: string | RegExp,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    
    this.logger.debug(`Verificando título: ${expected}`);
    
    try {
      await expect(this.page).toHaveTitle(expected, {
        timeout: options?.timeout || 5000
      });
      
      const actualTitle = await this.page.title();
      
      const result: AssertionResult = {
        passed: true,
        assertion: 'toHaveTitle',
        actual: actualTitle,
        expected: expected.toString(),
        duration: Date.now() - startTime,
        message: `Título correcto: ${expected}`
      };
      
      this.logger.assertion('Título correcto', true, actualTitle, expected);
      return result;
      
    } catch (error) {
      const actualTitle = await this.page.title();
      return await this.handleAssertionError(
        'toHaveTitle',
        undefined,
        expected.toString(),
        actualTitle,
        error as Error,
        options
      );
    }
  }
  
  /**
   * 🎯 Assertion personalizada
   */
  public async customAssertion(
    name: string,
    condition: () => Promise<boolean> | boolean,
    options?: AssertionOptions & {
      expected?: any;
      actual?: any;
    }
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    
    this.logger.debug(`Ejecutando assertion personalizada: ${name}`);
    
    try {
      const passed = await this.retryAssertion(condition, options);
      
      if (!passed) {
        throw new Error(`Assertion personalizada falló: ${name}`);
      }
      
      const result: AssertionResult = {
        passed: true,
        assertion: name,
        actual: options?.actual || 'condition met',
        expected: options?.expected || 'condition met',
        duration: Date.now() - startTime,
        message: options?.customMessage || `Assertion ${name} pasó`
      };
      
      this.logger.assertion(name, true);
      return result;
      
    } catch (error) {
      return await this.handleAssertionError(
        name,
        undefined,
        options?.expected || 'true',
        options?.actual || 'false',
        error as Error,
        options
      );
    }
  }
  
  /**
   * 🔄 Ejecutar múltiples assertions
   */
  public async assertAll(
    assertions: Array<() => Promise<AssertionResult>>
  ): Promise<{
    passed: boolean;
    results: AssertionResult[];
    failures: AssertionResult[];
  }> {
    this.logger.debug(`Ejecutando ${assertions.length} assertions`);
    
    const results: AssertionResult[] = [];
    const failures: AssertionResult[] = [];
    
    for (const assertion of assertions) {
      const result = await assertion();
      results.push(result);
      
      if (!result.passed) {
        failures.push(result);
      }
    }
    
    const passed = failures.length === 0;
    
    this.logger.info(`Assertions completadas: ${results.length - failures.length}/${results.length} pasaron`);
    
    return { passed, results, failures };
  }
  
  /**
   * 🔄 Soft assertions (no detienen la ejecución)
   */
  public async softAssert(
    assertion: () => Promise<AssertionResult>
  ): Promise<AssertionResult> {
    const result = await assertion();
    
    this.softAssertions.push(result);
    
    if (!result.passed) {
      this.logger.warn(`Soft assertion falló: ${result.assertion}`, {
        expected: result.expected,
        actual: result.actual
      });
    }
    
    return result;
  }
  
  /**
   * 📊 Obtener resultados de soft assertions
   */
  public getSoftAssertionResults(): {
    total: number;
    passed: number;
    failed: number;
    results: AssertionResult[];
  } {
    const passed = this.softAssertions.filter(r => r.passed).length;
    const failed = this.softAssertions.filter(r => !r.passed).length;
    
    return {
      total: this.softAssertions.length,
      passed,
      failed,
      results: [...this.softAssertions]
    };
  }
  
  /**
   * 🧹 Limpiar soft assertions
   */
  public clearSoftAssertions(): void {
    this.softAssertions = [];
    this.logger.debug('Soft assertions limpiadas');
  }
  
  // 🔧 Métodos privados de utilidad
  
  /**
   * Reintentar assertion
   */
  private async retryAssertion(
    condition: () => Promise<boolean> | boolean,
    options?: AssertionOptions
  ): Promise<boolean> {
    const retries = options?.retries || 0;
    const interval = options?.retryInterval || 1000;
    
    for (let i = 0; i <= retries; i++) {
      try {
        const result = await condition();
        if (result) return true;
      } catch (error) {
        if (i === retries) throw error;
      }
      
      if (i < retries) {
        this.logger.trace(`Reintentando assertion (${i + 1}/${retries})`);
        await this.page.waitForTimeout(interval);
      }
    }
    
    return false;
  }
  
  /**
   * Manejar error de assertion
   */
  private async handleAssertionError(
    assertion: string,
    locator: Locator | undefined,
    expected: any,
    actual: any,
    error: Error,
    options?: AssertionOptions
  ): Promise<AssertionResult> {
    const result: AssertionResult = {
      passed: false,
      assertion,
      locator: locator?.toString(),
      actual,
      expected,
      duration: 0,
      message: options?.customMessage || error.message
    };
    
    // Capturar screenshot si está configurado
    if (options?.screenshot) {
      result.screenshot = await this.screenshotHelper.captureError(
        `assertion-${assertion}-failed`
      );
    }
    
    // Capturar estado del elemento si está configurado
    if (options?.captureState && locator) {
      try {
        result.elementState = await this.elementManager.getElementState({
          strategy: 'css' as any,
          value: locator.toString()
        });
      } catch {
        // Ignorar si no se puede obtener el estado
      }
    }
    
    this.logger.assertion(`${assertion} falló`, false, actual, expected);
    
    // Si es soft assertion, no lanzar error
    if (options?.soft || options?.continueOnFailure) {
      this.softAssertions.push(result);
      return result;
    }
    
    // Lanzar error para assertion normal
    throw new FrameworkError(
      result.message || `Assertion ${assertion} falló`,
      ErrorCode.VALIDATION_FAILED,
      result
    );
  }
}