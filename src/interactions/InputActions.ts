/**
 * ⌨️ InputActions.ts
 * 
 * Gestiona todas las acciones relacionadas con entrada de texto y teclado.
 * Incluye escritura, limpieza, validación y manejo especial de inputs.
 * 
 * ¿Qué acciones maneja?
 * - typeText(): Escribir texto en campos
 * - clearText(): Limpiar campos de texto
 * - hideKeyboard(): Ocultar teclado virtual (si aplica)
 * - Manejo de teclas especiales
 * - Validación de entrada
 * - Formateo automático
 */

import { Page, Locator, Keyboard } from '@playwright/test';
import {
  ActionResult,
  FrameworkError,
  ErrorCode,
  TypeOptions
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../core/logging/LoggerFactory';
import { ElementManager } from '../elements/ElementManager';
import { WaitManager } from '../elements/WaitStrategies';

/**
 * 📋 Opciones avanzadas para entrada de texto
 */
export interface AdvancedTypeOptions extends TypeOptions {
  validateInput?: boolean;          // Validar después de escribir
  maskInput?: boolean;              // Ocultar texto (para passwords)
  formatAs?: 'email' | 'phone' | 'date' | 'currency' | 'number'; // Formato automático
  maxLength?: number;               // Longitud máxima
  allowedChars?: RegExp;           // Caracteres permitidos
  typeSpeed?: 'instant' | 'fast' | 'normal' | 'slow' | 'human'; // Velocidad de escritura
  simulateTypos?: boolean;         // Simular errores humanos
  autoCorrect?: boolean;           // Auto-corregir mientras escribe
}

/**
 * 📋 Opciones para limpiar texto
 */
export interface ClearOptions {
  method?: 'clear' | 'selectAll' | 'backspace' | 'javascript'; // Método de limpieza
  verify?: boolean;                 // Verificar que se limpió
}

/**
 * 📋 Información de validación de input
 */
export interface InputValidation {
  isValid: boolean;
  value: string;
  errors?: string[];
  warnings?: string[];
  formatted?: string;
}

/**
 * ⌨️ Clase InputActions - Maneja entrada de texto
 */
export class InputActions {
  private page: Page;
  private keyboard: Keyboard;
  private logger = LoggerFactory.forComponent(ComponentType.INPUT);
  private elementManager: ElementManager;
  private waitManager: WaitManager;
  
  // Mapeo de teclas especiales
  private readonly specialKeys = {
    enter: 'Enter',
    tab: 'Tab',
    escape: 'Escape',
    backspace: 'Backspace',
    delete: 'Delete',
    space: 'Space',
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    home: 'Home',
    end: 'End',
    pageUp: 'PageUp',
    pageDown: 'PageDown',
    ctrl: 'Control',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Meta',
    cmd: 'Meta' // Alias para Mac
  };
  
  constructor(page: Page) {
    this.page = page;
    this.keyboard = page.keyboard;
    this.elementManager = new ElementManager({ page });
    this.waitManager = new WaitManager(page);
  }
  
  /**
   * ⌨️ Escribir texto en un campo
   */
  public async typeText(
    locator: Locator,
    text: string,
    options?: AdvancedTypeOptions
  ): Promise<ActionResult> {
    this.logger.start(`Escribiendo texto: ${this.maskText(text, options?.maskInput)}`);
    const startTime = Date.now();
    
    try {
      // Limpiar primero si está configurado
      if (options?.clearFirst) {
        await this.clearText(locator);
      }
      
      // Focus en el elemento
      await locator.focus();
      
      // Formatear texto si es necesario
      let finalText = text;
      if (options?.formatAs) {
        finalText = this.formatText(text, options.formatAs);
      }
      
      // Aplicar restricciones
      if (options?.maxLength && finalText.length > options.maxLength) {
        finalText = finalText.substring(0, options.maxLength);
        this.logger.warn(`Texto truncado a ${options.maxLength} caracteres`);
      }
      
      if (options?.allowedChars) {
        finalText = this.filterAllowedChars(finalText, options.allowedChars);
      }
      
      // Escribir según la velocidad configurada
      await this.typeWithSpeed(locator, finalText, options?.typeSpeed, options?.delay);
      
      // Simular errores humanos si está configurado
      if (options?.simulateTypos) {
        await this.simulateTypos(locator);
      }
      
      // Auto-corregir si está configurado
      if (options?.autoCorrect) {
        await this.autoCorrect(locator, finalText);
      }
      
      // Presionar Enter si está configurado
      if (options?.pressEnter) {
        await this.keyboard.press('Enter');
        this.logger.trace('Enter presionado');
      }
      
      // Validar entrada si está configurado
      let validation: InputValidation | undefined;
      if (options?.validateInput) {
        validation = await this.validateInput(locator, finalText, options.formatAs);
        if (!validation.isValid) {
          this.logger.warn('Validación de entrada falló', validation);
        }
      }
      
      const result: ActionResult = {
        success: true,
        data: { 
          text: options?.maskInput ? '***' : finalText,
          validation 
        },
        duration: Date.now() - startTime,
        timestamp: new Date(),
        details: `Texto escrito exitosamente`
      };
      
      this.logger.success('Texto escrito', result);
      return result;
      
    } catch (error) {
      this.logger.fail('Error escribiendo texto', error as Error);
      throw new FrameworkError(
        `No se pudo escribir texto: ${(error as Error).message}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { text: options?.maskInput ? '***' : text }
      );
    }
  }
  
  /**
   * 🧹 Limpiar campo de texto
   */
  public async clearText(
    locator: Locator,
    options?: ClearOptions
  ): Promise<ActionResult> {
    this.logger.start('Limpiando campo de texto');
    
    try {
      const method = options?.method || 'clear';
      
      switch (method) {
        case 'clear':
          // Método estándar de Playwright
          await locator.clear();
          break;
          
        case 'selectAll':
          // Seleccionar todo y borrar
          await locator.focus();
          await this.keyboard.press('Control+A');
          await this.keyboard.press('Delete');
          break;
          
        case 'backspace':
          // Borrar carácter por carácter
          await locator.focus();
          const currentValue = await locator.inputValue();
          for (let i = 0; i < currentValue.length; i++) {
            await this.keyboard.press('Backspace');
          }
          break;
          
        case 'javascript':
          // Limpiar con JavaScript
          await locator.evaluate(el => {
            (el as HTMLInputElement).value = '';
            // Disparar eventos para frameworks reactivos
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });
          break;
      }
      
      // Verificar que se limpió
      if (options?.verify) {
        const value = await locator.inputValue();
        if (value !== '') {
          throw new Error(`Campo no se limpió completamente. Valor actual: "${value}"`);
        }
      }
      
      this.logger.success('Campo limpiado');
      return {
        success: true,
        timestamp: new Date(),
        details: `Campo limpiado con método: ${method}`
      };
      
    } catch (error) {
      throw new FrameworkError(
        'No se pudo limpiar el campo',
        ErrorCode.ELEMENT_NOT_FOUND
      );
    }
  }
  
  /**
   * 📱 Ocultar teclado virtual (principalmente para web mobile)
   */
  public async hideKeyboard(): Promise<ActionResult> {
    this.logger.debug('Ocultando teclado');
    
    try {
      // Método 1: Quitar focus del elemento actual
      await this.page.evaluate(() => {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
          activeElement.blur();
        }
      });
      
      // Método 2: Presionar Escape
      await this.keyboard.press('Escape');
      
      // Método 3: Click fuera del elemento
      await this.page.mouse.click(0, 0);
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Teclado ocultado'
      };
      
    } catch (error) {
      this.logger.warn('No se pudo ocultar el teclado', { error });
      return {
        success: false,
        error: error as Error,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * ⌨️ Presionar tecla especial
   */
  public async pressSpecialKey(
    key: keyof typeof InputActions.prototype.specialKeys,
    options?: {
      count?: number;
      delay?: number;
      modifiers?: Array<'Control' | 'Alt' | 'Shift' | 'Meta'>;
    }
  ): Promise<ActionResult> {
    const keyName = this.specialKeys[key];
    const count = options?.count || 1;
    
    this.logger.debug(`Presionando tecla especial: ${keyName} x${count}`);
    
    try {
      // Presionar modificadores si hay
      if (options?.modifiers) {
        for (const modifier of options.modifiers) {
          await this.keyboard.down(modifier);
        }
      }
      
      // Presionar la tecla
      for (let i = 0; i < count; i++) {
        await this.keyboard.press(keyName);
        if (options?.delay && i < count - 1) {
          await this.page.waitForTimeout(options.delay);
        }
      }
      
      // Soltar modificadores
      if (options?.modifiers) {
        for (const modifier of options.modifiers.reverse()) {
          await this.keyboard.up(modifier);
        }
      }
      
      return {
        success: true,
        data: { key: keyName, count },
        timestamp: new Date(),
        details: `Tecla ${keyName} presionada ${count} veces`
      };
      
    } catch (error) {
      throw new FrameworkError(
        `Error presionando tecla ${keyName}`,
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * ⌨️ Escribir combinación de teclas
   */
  public async typeKeyCombo(combo: string): Promise<ActionResult> {
    this.logger.debug(`Ejecutando combo: ${combo}`);
    
    try {
      await this.keyboard.press(combo);
      
      return {
        success: true,
        data: { combo },
        timestamp: new Date(),
        details: `Combo ejecutado: ${combo}`
      };
      
    } catch (error) {
      throw new FrameworkError(
        `Error ejecutando combo ${combo}`,
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * 📋 Pegar desde portapapeles
   */
  public async paste(locator: Locator): Promise<ActionResult> {
    this.logger.debug('Pegando desde portapapeles');
    
    try {
      await locator.focus();
      await this.keyboard.press('Control+V');
      
      const value = await locator.inputValue();
      
      return {
        success: true,
        data: { pasted: value },
        timestamp: new Date(),
        details: 'Contenido pegado desde portapapeles'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error pegando desde portapapeles',
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * 📋 Copiar texto al portapapeles
   */
  public async copy(locator: Locator): Promise<ActionResult> {
    this.logger.debug('Copiando al portapapeles');
    
    try {
      await locator.focus();
      await this.keyboard.press('Control+A');
      await this.keyboard.press('Control+C');
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Texto copiado al portapapeles'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error copiando al portapapeles',
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * 📋 Cortar texto
   */
  public async cut(locator: Locator): Promise<ActionResult> {
    this.logger.debug('Cortando texto');
    
    try {
      await locator.focus();
      await this.keyboard.press('Control+A');
      await this.keyboard.press('Control+X');
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Texto cortado'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error cortando texto',
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * 🔄 Deshacer última acción
   */
  public async undo(): Promise<ActionResult> {
    this.logger.debug('Deshaciendo última acción');
    
    try {
      await this.keyboard.press('Control+Z');
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Acción deshecha'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error deshaciendo acción',
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * 🔄 Rehacer acción
   */
  public async redo(): Promise<ActionResult> {
    this.logger.debug('Rehaciendo acción');
    
    try {
      await this.keyboard.press('Control+Y');
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Acción rehecha'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error rehaciendo acción',
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * 📝 Escribir en campo con formato específico
   */
  public async typeFormatted(
    locator: Locator,
    value: string,
    format: 'email' | 'phone' | 'date' | 'currency' | 'creditCard'
  ): Promise<ActionResult> {
    this.logger.debug(`Escribiendo con formato ${format}: ${value}`);
    
    const formatted = this.formatText(value, format);
    return await this.typeText(locator, formatted, { formatAs: format, validateInput: true });
  }
  
  /**
   * 🔢 Escribir solo números
   */
  public async typeNumbers(
    locator: Locator,
    value: string | number,
    options?: {
      allowDecimal?: boolean;
      allowNegative?: boolean;
      maxDigits?: number;
    }
  ): Promise<ActionResult> {
    this.logger.debug(`Escribiendo números: ${value}`);
    
    let text = value.toString();
    
    // Filtrar solo números
    let pattern = options?.allowNegative ? '-?' : '';
    pattern += '\\d+';
    if (options?.allowDecimal) {
      pattern += '(\\.\\d+)?';
    }
    
    const regex = new RegExp(`^${pattern}$`);
    if (!regex.test(text)) {
      text = text.replace(/[^\d.-]/g, '');
    }
    
    if (options?.maxDigits && text.replace(/[.-]/g, '').length > options.maxDigits) {
      text = text.substring(0, options.maxDigits);
    }
    
    return await this.typeText(locator, text, {
      allowedChars: /[\d.-]/,
      formatAs: 'number'
    });
  }
  
  // 🔧 Métodos privados de utilidad
  
  /**
   * Escribir con velocidad específica
   */
  private async typeWithSpeed(
    locator: Locator,
    text: string,
    speed?: string,
    customDelay?: number
  ): Promise<void> {
    let delay = customDelay;
    
    if (!delay && speed) {
      switch (speed) {
        case 'instant':
          delay = 0;
          break;
        case 'fast':
          delay = 10;
          break;
        case 'normal':
          delay = 50;
          break;
        case 'slow':
          delay = 100;
          break;
        case 'human':
          // Velocidad variable para simular escritura humana
          for (const char of text) {
            await locator.type(char, { delay: Math.random() * 100 + 50 });
          }
          return;
      }
    }
    
    await locator.type(text, { delay: delay || 0 });
  }
  
  /**
   * Formatear texto según tipo
   */
  private formatText(text: string, format: string): string {
    switch (format) {
      case 'email':
        return text.toLowerCase().trim();
        
      case 'phone':
        // Formato: (123) 456-7890
        const phone = text.replace(/\D/g, '');
        if (phone.length === 10) {
          return `(${phone.substr(0, 3)}) ${phone.substr(3, 3)}-${phone.substr(6)}`;
        }
        return phone;
        
      case 'date':
        // Formato: MM/DD/YYYY
        const date = text.replace(/\D/g, '');
        if (date.length === 8) {
          return `${date.substr(0, 2)}/${date.substr(2, 2)}/${date.substr(4)}`;
        }
        return text;
        
      case 'currency':
        // Formato: $1,234.56
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
        return text;
        
      case 'creditCard':
        // Formato: 1234 5678 9012 3456
        const card = text.replace(/\D/g, '');
        const chunks = card.match(/.{1,4}/g) || [];
        return chunks.join(' ');
        
      default:
        return text;
    }
  }
  
  /**
   * Filtrar caracteres permitidos
   */
  private filterAllowedChars(text: string, allowedChars: RegExp): string {
    return text.split('').filter(char => allowedChars.test(char)).join('');
  }
  
  /**
   * Ocultar texto sensible
   */
  private maskText(text: string, mask?: boolean): string {
    return mask ? '***' : text.substring(0, 20) + (text.length > 20 ? '...' : '');
  }
  
  /**
   * Simular errores de escritura humanos
   */
  private async simulateTypos(locator: Locator): Promise<void> {
    const typoChance = 0.05; // 5% de probabilidad
    
    if (Math.random() < typoChance) {
      // Agregar carácter aleatorio
      const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      await locator.type(randomChar);
      await this.page.waitForTimeout(200);
      
      // Borrar el error
      await this.keyboard.press('Backspace');
      this.logger.trace('Error de escritura simulado y corregido');
    }
  }
  
  /**
   * Auto-corregir texto
   */
  private async autoCorrect(locator: Locator, expectedText: string): Promise<void> {
    const actualText = await locator.inputValue();
    
    if (actualText !== expectedText) {
      this.logger.debug('Auto-corrigiendo texto');
      await locator.clear();
      await locator.type(expectedText);
    }
  }
  
  /**
   * Validar entrada según formato
   */
  private async validateInput(
    locator: Locator,
    expectedValue: string,
    format?: string
  ): Promise<InputValidation> {
    const actualValue = await locator.inputValue();
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;
    
    // Validación básica
    if (actualValue !== expectedValue) {
      warnings.push(`Valor esperado: "${expectedValue}", actual: "${actualValue}"`);
    }
    
    // Validaciones específicas por formato
    if (format) {
      switch (format) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actualValue)) {
            errors.push('Email inválido');
            isValid = false;
          }
          break;
          
        case 'phone':
          if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(actualValue)) {
            warnings.push('Formato de teléfono no estándar');
          }
          break;
          
        case 'date':
          if (!/^\d{2}\/\d{2}\/\d{4}$/.test(actualValue)) {
            errors.push('Formato de fecha inválido (MM/DD/YYYY)');
            isValid = false;
          }
          break;
          
        case 'number':
          if (isNaN(parseFloat(actualValue))) {
            errors.push('No es un número válido');
            isValid = false;
          }
          break;
      }
    }
    
    return {
      isValid,
      value: actualValue,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      formatted: this.formatText(actualValue, format || '')
    };
  }
}