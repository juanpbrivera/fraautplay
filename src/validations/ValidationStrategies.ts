/**
 * 📊 ValidationStrategies.ts
 * 
 * Define estrategias complejas de validación para verificar el estado de la aplicación.
 * Va más allá de assertions simples para validar flujos y estados complejos.
 * 
 * ¿Qué son estrategias de validación?
 * Son patrones reutilizables para validar escenarios comunes:
 * - Formularios completos
 * - Estados de la aplicación
 * - Flujos de negocio
 * - Integridad de datos
 * 
 * ¿Por qué son útiles?
 * - Reutilización de validaciones complejas
 * - Consistencia en las verificaciones
 * - Reducción de código duplicado
 * - Validaciones más robustas
 */

import { Page, Locator } from '@playwright/test';
import {
  ValidationResult,
  ElementState,
  FrameworkError,
  ErrorCode
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../logging/LoggerFactory';
import { AssertionHelpers } from './AssertionHelpers';
import { ElementManager } from '../elements/ElementManager';

/**
 * 📋 Estrategia de validación base
 */
export interface ValidationStrategy {
  name: string;
  description?: string;
  validate: () => Promise<ValidationResult>;
}

/**
 * 📋 Resultado de validación de formulario
 */
export interface FormValidationResult extends ValidationResult {
  fields: {
    name: string;
    valid: boolean;
    value?: any;
    error?: string;
  }[];
  formValid: boolean;
  missingRequired: string[];
  invalidFields: string[];
}

/**
 * 📋 Resultado de validación de tabla
 */
export interface TableValidationResult extends ValidationResult {
  rowCount: number;
  columnCount: number;
  headers: string[];
  rowsValidated: number;
  errors: Array<{
    row: number;
    column: string;
    error: string;
  }>;
}

/**
 * 📋 Estado de aplicación
 */
export interface ApplicationState {
  url: string;
  title: string;
  authenticated: boolean;
  userName?: string;
  role?: string;
  permissions?: string[];
  currentPage?: string;
  breadcrumbs?: string[];
  notifications?: number;
  errors?: string[];
}

/**
 * 📊 Clase ValidationStrategies - Estrategias de validación complejas
 */
export class ValidationStrategies {
  private page: Page;
  private logger = LoggerFactory.forComponent(ComponentType.VALIDATION);
  private assertionHelpers: AssertionHelpers;
  private elementManager: ElementManager;
  
  constructor(page: Page) {
    this.page = page;
    this.assertionHelpers = new AssertionHelpers(page);
    this.elementManager = new ElementManager({ page });
  }
  
  /**
   * 📝 Validar formulario completo
   */
  public async validateForm(
    formSelector: string,
    validations: {
      field: string;
      selector: string;
      required?: boolean;
      type?: 'text' | 'email' | 'number' | 'date' | 'select' | 'checkbox' | 'radio';
      pattern?: RegExp;
      minLength?: number;
      maxLength?: number;
      minValue?: number;
      maxValue?: number;
      expectedValue?: any;
      customValidation?: (value: any) => boolean;
    }[]
  ): Promise<FormValidationResult> {
    this.logger.start(`Validando formulario: ${formSelector}`);
    const startTime = Date.now();
    
    const fields: FormValidationResult['fields'] = [];
    const missingRequired: string[] = [];
    const invalidFields: string[] = [];
    
    try {
      // Verificar que el formulario existe
      const formExists = await this.elementManager.exists({
        strategy: 'css' as any,
        value: formSelector
      });
      
      if (!formExists) {
        throw new Error('Formulario no encontrado');
      }
      
      // Validar cada campo
      for (const validation of validations) {
        const fieldResult = await this.validateField(validation);
        fields.push(fieldResult);
        
        if (!fieldResult.valid) {
          if (validation.required && !fieldResult.value) {
            missingRequired.push(validation.field);
          } else {
            invalidFields.push(validation.field);
          }
        }
      }
      
      const formValid = missingRequired.length === 0 && invalidFields.length === 0;
      
      const result: FormValidationResult = {
        passed: formValid,
        fields,
        formValid,
        missingRequired,
        invalidFields,
        actual: `${fields.filter(f => f.valid).length}/${fields.length} campos válidos`,
        expected: 'Todos los campos válidos',
        duration: Date.now() - startTime,
        message: formValid ? 
          'Formulario válido' : 
          `Formulario inválido: ${invalidFields.length} errores, ${missingRequired.length} requeridos faltantes`
      };
      
      this.logger.info('Validación de formulario completada', result);
      return result;
      
    } catch (error) {
      this.logger.error('Error validando formulario', error as Error);
      throw new FrameworkError(
        'Error en validación de formulario',
        ErrorCode.VALIDATION_FAILED,
        { formSelector, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📝 Validar campo individual
   */
  private async validateField(validation: any): Promise<any> {
    const { field, selector, type } = validation;
    
    try {
      const element = this.page.locator(selector);
      let value: any;
      let valid = true;
      let error: string | undefined;
      
      // Obtener valor según tipo
      switch (type) {
        case 'checkbox':
        case 'radio':
          value = await element.isChecked();
          break;
        case 'select':
          value = await element.inputValue();
          break;
        default:
          value = await element.inputValue();
      }
      
      // Validaciones básicas
      if (validation.required && !value) {
        valid = false;
        error = 'Campo requerido';
      }
      
      if (value && validation.pattern && !validation.pattern.test(value)) {
        valid = false;
        error = 'Formato inválido';
      }
      
      if (value && validation.minLength && value.length < validation.minLength) {
        valid = false;
        error = `Mínimo ${validation.minLength} caracteres`;
      }
      
      if (value && validation.maxLength && value.length > validation.maxLength) {
        valid = false;
        error = `Máximo ${validation.maxLength} caracteres`;
      }
      
      if (type === 'number' && value) {
        const numValue = parseFloat(value);
        if (validation.minValue !== undefined && numValue < validation.minValue) {
          valid = false;
          error = `Valor mínimo: ${validation.minValue}`;
        }
        if (validation.maxValue !== undefined && numValue > validation.maxValue) {
          valid = false;
          error = `Valor máximo: ${validation.maxValue}`;
        }
      }
      
      if (validation.expectedValue !== undefined && value !== validation.expectedValue) {
        valid = false;
        error = `Valor esperado: ${validation.expectedValue}`;
      }
      
      if (validation.customValidation && !validation.customValidation(value)) {
        valid = false;
        error = 'Validación personalizada falló';
      }
      
      return { name: field, valid, value, error };
      
    } catch (error) {
      return {
        name: field,
        valid: false,
        error: 'Error obteniendo valor del campo'
      };
    }
  }
  
  /**
   * 📊 Validar tabla de datos
   */
  public async validateTable(
    tableSelector: string,
    options: {
      expectedHeaders?: string[];
      minRows?: number;
      maxRows?: number;
      validateRow?: (row: Record<string, string>, index: number) => boolean;
      validateCell?: (value: string, row: number, column: string) => boolean;
      requiredColumns?: string[];
    } = {}
  ): Promise<TableValidationResult> {
    this.logger.start(`Validando tabla: ${tableSelector}`);
    const startTime = Date.now();
    
    try {
      const table = this.page.locator(tableSelector);
      
      // Obtener headers
      const headers = await table.locator('thead th, th').allTextContents();
      
      // Obtener todas las filas
      const rows = await table.locator('tbody tr, tr').all();
      const rowCount = rows.length;
      const columnCount = headers.length;
      
      const errors: TableValidationResult['errors'] = [];
      let rowsValidated = 0;
      
      // Validar headers si se especificaron
      if (options.expectedHeaders) {
        for (let i = 0; i < options.expectedHeaders.length; i++) {
          if (headers[i] !== options.expectedHeaders[i]) {
            errors.push({
              row: -1,
              column: `header-${i}`,
              error: `Header esperado: ${options.expectedHeaders[i]}, actual: ${headers[i]}`
            });
          }
        }
      }
      
      // Validar número de filas
      if (options.minRows !== undefined && rowCount < options.minRows) {
        errors.push({
          row: -1,
          column: 'table',
          error: `Mínimo ${options.minRows} filas, encontradas: ${rowCount}`
        });
      }
      
      if (options.maxRows !== undefined && rowCount > options.maxRows) {
        errors.push({
          row: -1,
          column: 'table',
          error: `Máximo ${options.maxRows} filas, encontradas: ${rowCount}`
        });
      }
      
      // Validar cada fila
      for (let i = 0; i < Math.min(rowCount, 100); i++) { // Limitar a 100 filas
        const row = rows[i];
        const cells = await row.locator('td').allTextContents();
        const rowData: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          rowData[header] = cells[index] || '';
        });
        
        // Validar fila completa
        if (options.validateRow && !options.validateRow(rowData, i)) {
          errors.push({
            row: i,
            column: 'row',
            error: 'Validación de fila falló'
          });
        }
        
        // Validar celdas individuales
        if (options.validateCell) {
          for (const [header, value] of Object.entries(rowData)) {
            if (!options.validateCell(value, i, header)) {
              errors.push({
                row: i,
                column: header,
                error: 'Validación de celda falló'
              });
            }
          }
        }
        
        // Validar columnas requeridas
        if (options.requiredColumns) {
          for (const column of options.requiredColumns) {
            if (!rowData[column]) {
              errors.push({
                row: i,
                column,
                error: 'Columna requerida vacía'
              });
            }
          }
        }
        
        rowsValidated++;
      }
      
      const result: TableValidationResult = {
        passed: errors.length === 0,
        rowCount,
        columnCount,
        headers,
        rowsValidated,
        errors,
        actual: `${errors.length} errores en tabla`,
        expected: '0 errores',
        duration: Date.now() - startTime,
        message: errors.length === 0 ? 
          'Tabla válida' : 
          `Tabla con ${errors.length} errores`
      };
      
      this.logger.info('Validación de tabla completada', result);
      return result;
      
    } catch (error) {
      throw new FrameworkError(
        'Error validando tabla',
        ErrorCode.VALIDATION_FAILED,
        { tableSelector, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 🔄 Validar estado de aplicación
   */
  public async validateApplicationState(
    expectedState: Partial<ApplicationState>
  ): Promise<ValidationResult> {
    this.logger.start('Validando estado de aplicación');
    const startTime = Date.now();
    
    try {
      const currentState: ApplicationState = {
        url: this.page.url(),
        title: await this.page.title(),
        authenticated: false,
        currentPage: undefined
      };
      
      // Verificar autenticación (personalizar según aplicación)
      const userElement = await this.page.locator('[data-user-name], .user-name, #username').first();
      if (await userElement.isVisible()) {
        currentState.authenticated = true;
        currentState.userName = await userElement.textContent() || undefined;
      }
      
      // Verificar rol (personalizar según aplicación)
      const roleElement = await this.page.locator('[data-user-role], .user-role').first();
      if (await roleElement.isVisible()) {
        currentState.role = await roleElement.textContent() || undefined;
      }
      
      // Obtener breadcrumbs
      const breadcrumbs = await this.page.locator('.breadcrumb li, nav[aria-label="breadcrumb"] a').allTextContents();
      if (breadcrumbs.length > 0) {
        currentState.breadcrumbs = breadcrumbs;
        currentState.currentPage = breadcrumbs[breadcrumbs.length - 1];
      }
      
      // Contar notificaciones
      const notificationBadge = await this.page.locator('.notification-count, .badge').first();
      if (await notificationBadge.isVisible()) {
        const count = await notificationBadge.textContent();
        currentState.notifications = parseInt(count || '0');
      }
      
      // Buscar errores
      const errorElements = await this.page.locator('.error, .alert-danger, [role="alert"]').allTextContents();
      if (errorElements.length > 0) {
        currentState.errors = errorElements;
      }
      
      // Comparar estados
      let isValid = true;
      const differences: string[] = [];
      
      for (const [key, expectedValue] of Object.entries(expectedState)) {
        const actualValue = (currentState as any)[key];
        
        if (Array.isArray(expectedValue)) {
          if (!Array.isArray(actualValue) || 
              expectedValue.length !== actualValue.length ||
              !expectedValue.every((v, i) => v === actualValue[i])) {
            isValid = false;
            differences.push(`${key}: esperado ${JSON.stringify(expectedValue)}, actual ${JSON.stringify(actualValue)}`);
          }
        } else if (expectedValue !== actualValue) {
          isValid = false;
          differences.push(`${key}: esperado ${expectedValue}, actual ${actualValue}`);
        }
      }
      
      const result: ValidationResult = {
        passed: isValid,
        actual: currentState,
        expected: expectedState,
        duration: Date.now() - startTime,
        message: isValid ? 
          'Estado de aplicación correcto' : 
          `Estado incorrecto: ${differences.join(', ')}`
      };
      
      this.logger.info('Validación de estado completada', result);
      return result;
      
    } catch (error) {
      throw new FrameworkError(
        'Error validando estado de aplicación',
        ErrorCode.VALIDATION_FAILED,
        { error: (error as Error).message }
      );
    }
  }
  
  /**
   * 🔄 Validar flujo de navegación
   */
  public async validateNavigationFlow(
    steps: Array<{
      action: () => Promise<void>;
      expectedURL?: string | RegExp;
      expectedTitle?: string;
      expectedElement?: string;
      validation?: () => Promise<boolean>;
    }>
  ): Promise<ValidationResult> {
    this.logger.start('Validando flujo de navegación');
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        this.logger.debug(`Ejecutando paso ${i + 1}/${steps.length}`);
        
        // Ejecutar acción
        await step.action();
        
        // Validar URL
        if (step.expectedURL) {
          const currentURL = this.page.url();
          const urlMatches = typeof step.expectedURL === 'string' ?
            currentURL.includes(step.expectedURL) :
            step.expectedURL.test(currentURL);
            
          if (!urlMatches) {
            errors.push(`Paso ${i + 1}: URL incorrecta. Esperada: ${step.expectedURL}, Actual: ${currentURL}`);
          }
        }
        
        // Validar título
        if (step.expectedTitle) {
          const currentTitle = await this.page.title();
          if (!currentTitle.includes(step.expectedTitle)) {
            errors.push(`Paso ${i + 1}: Título incorrecto. Esperado: ${step.expectedTitle}, Actual: ${currentTitle}`);
          }
        }
        
        // Validar elemento
        if (step.expectedElement) {
          const elementVisible = await this.page.locator(step.expectedElement).isVisible();
          if (!elementVisible) {
            errors.push(`Paso ${i + 1}: Elemento no visible: ${step.expectedElement}`);
          }
        }
        
        // Validación personalizada
        if (step.validation) {
          const isValid = await step.validation();
          if (!isValid) {
            errors.push(`Paso ${i + 1}: Validación personalizada falló`);
          }
        }
      }
      
      const result: ValidationResult = {
        passed: errors.length === 0,
        actual: `${steps.length - errors.length}/${steps.length} pasos correctos`,
        expected: 'Todos los pasos correctos',
        duration: Date.now() - startTime,
        message: errors.length === 0 ? 
          'Flujo de navegación correcto' : 
          `Flujo con errores: ${errors.join('; ')}`
      };
      
      this.logger.info('Validación de flujo completada', result);
      return result;
      
    } catch (error) {
      throw new FrameworkError(
        'Error validando flujo de navegación',
        ErrorCode.VALIDATION_FAILED,
        { error: (error as Error).message, errors }
      );
    }
  }
  
  /**
   * 📊 Validar datos contra API/DB (mock)
   */
  public async validateDataIntegrity(
    pageData: any,
    expectedData: any,
    options: {
      ignoreFields?: string[];
      transformFields?: Record<string, (value: any) => any>;
      allowExtraFields?: boolean;
      caseSensitive?: boolean;
    } = {}
  ): Promise<ValidationResult> {
    this.logger.start('Validando integridad de datos');
    const startTime = Date.now();
    
    try {
      const differences: string[] = [];
      let isValid = true;
      
      // Transformar campos si es necesario
      let actualData = { ...pageData };
      let compareData = { ...expectedData };
      
      if (options.transformFields) {
        for (const [field, transform] of Object.entries(options.transformFields)) {
          if (actualData[field] !== undefined) {
            actualData[field] = transform(actualData[field]);
          }
        }
      }
      
      // Ignorar campos especificados
      if (options.ignoreFields) {
        for (const field of options.ignoreFields) {
          delete actualData[field];
          delete compareData[field];
        }
      }
      
      // Comparar campos
      for (const [key, expectedValue] of Object.entries(compareData)) {
        const actualValue = actualData[key];
        
        let valuesMatch = false;
        
        if (!options.caseSensitive && typeof expectedValue === 'string' && typeof actualValue === 'string') {
          valuesMatch = expectedValue.toLowerCase() === actualValue.toLowerCase();
        } else if (typeof expectedValue === 'object' && typeof actualValue === 'object') {
          valuesMatch = JSON.stringify(expectedValue) === JSON.stringify(actualValue);
        } else {
          valuesMatch = expectedValue === actualValue;
        }
        
        if (!valuesMatch) {
          isValid = false;
          differences.push(`${key}: esperado ${JSON.stringify(expectedValue)}, actual ${JSON.stringify(actualValue)}`);
        }
      }
      
      // Verificar campos extra
      if (!options.allowExtraFields) {
        const extraFields = Object.keys(actualData).filter(key => !(key in compareData));
        if (extraFields.length > 0) {
          isValid = false;
          differences.push(`Campos extra no permitidos: ${extraFields.join(', ')}`);
        }
      }
      
      const result: ValidationResult = {
        passed: isValid,
        actual: actualData,
        expected: compareData,
        duration: Date.now() - startTime,
        message: isValid ? 
          'Datos íntegros' : 
          `Diferencias encontradas: ${differences.join('; ')}`
      };
      
      this.logger.info('Validación de integridad completada', result);
      return result;
      
    } catch (error) {
      throw new FrameworkError(
        'Error validando integridad de datos',
        ErrorCode.VALIDATION_FAILED,
        { error: (error as Error).message }
      );
    }
  }
  
  /**
   * 🎯 Crear estrategia personalizada
   */
  public createStrategy(
    name: string,
    validate: () => Promise<ValidationResult>,
    description?: string
  ): ValidationStrategy {
    return {
      name,
      description,
      validate: async () => {
        this.logger.debug(`Ejecutando estrategia: ${name}`);
        const result = await validate();
        this.logger.info(`Estrategia ${name} completada`, { passed: result.passed });
        return result;
      }
    };
  }
  
  /**
   * 🔄 Ejecutar múltiples estrategias
   */
  public async executeStrategies(
    strategies: ValidationStrategy[]
  ): Promise<{
    passed: boolean;
    results: Record<string, ValidationResult>;
    summary: string;
  }> {
    this.logger.start(`Ejecutando ${strategies.length} estrategias de validación`);
    
    const results: Record<string, ValidationResult> = {};
    let passedCount = 0;
    
    for (const strategy of strategies) {
      try {
        const result = await strategy.validate();
        results[strategy.name] = result;
        if (result.passed) passedCount++;
      } catch (error) {
        results[strategy.name] = {
          passed: false,
          actual: 'error',
          expected: 'success',
          duration: 0,
          message: (error as Error).message
        };
      }
    }
    
    const passed = passedCount === strategies.length;
    const summary = `${passedCount}/${strategies.length} estrategias pasaron`;
    
    this.logger.info('Ejecución de estrategias completada', { passed, summary });
    
    return { passed, results, summary };
  }
}