// src/validations/CustomMatchers.ts

import { Page } from 'playwright';
import { ValidationResult } from '../types/FrameworkTypes';
import { LoggerFactory } from '../core/logging/LoggerFactory';

/**
 * Matchers personalizados para validaciones específicas
 * Extiende las capacidades de validación con lógica personalizada
 */
export class CustomMatchers {
  private static logger = LoggerFactory.getLogger('CustomMatchers');

  /**
   * Valida que un valor está dentro de un rango
   */
  static async toBeInRange(
    actual: number,
    min: number,
    max: number,
    options?: { message?: string }
  ): Promise<ValidationResult> {
    const inRange = actual >= min && actual <= max;

    return {
      passed: inRange,
      message: options?.message || 
        (inRange 
          ? `Value ${actual} is in range [${min}, ${max}]`
          : `Value ${actual} is not in range [${min}, ${max}]`),
      actual,
      expected: `[${min}, ${max}]`
    };
  }

  /**
   * Valida que una fecha es válida y está en formato esperado
   */
  static async toBeValidDate(
    dateString: string,
    format?: string,
    options?: { message?: string }
  ): Promise<ValidationResult> {
    try {
      const date = new Date(dateString);
      const isValid = !isNaN(date.getTime());

      if (!isValid) {
        return {
          passed: false,
          message: options?.message || `Invalid date: ${dateString}`,
          actual: dateString,
          expected: 'valid date'
        };
      }

      if (format) {
        // Validación básica de formato
        const formatPatterns: Record<string, RegExp> = {
          'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/,
          'DD/MM/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
          'MM/DD/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
          'ISO': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        };

        const pattern = formatPatterns[format];
        if (pattern && !pattern.test(dateString)) {
          return {
            passed: false,
            message: options?.message || `Date format mismatch`,
            actual: dateString,
            expected: format
          };
        }
      }

      return {
        passed: true,
        message: options?.message || `Valid date: ${dateString}`,
        actual: dateString,
        expected: 'valid date'
      };
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Invalid date: ${dateString}`,
        actual: dateString,
        expected: 'valid date'
      };
    }
  }

  /**
   * Valida que un email tiene formato válido
   */
  static async toBeValidEmail(
    email: string,
    options?: { message?: string }
  ): Promise<ValidationResult> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    return {
      passed: isValid,
      message: options?.message || 
        (isValid 
          ? `Valid email: ${email}`
          : `Invalid email format: ${email}`),
      actual: email,
      expected: 'valid email format'
    };
  }

  /**
   * Valida que una URL es válida
   */
  static async toBeValidURL(
    url: string,
    options?: { 
      protocols?: string[];
      message?: string 
    }
  ): Promise<ValidationResult> {
    try {
      const urlObj = new URL(url);
      
      if (options?.protocols) {
        const protocolValid = options.protocols.some(p => 
          urlObj.protocol === `${p}:`
        );
        
        if (!protocolValid) {
          return {
            passed: false,
            message: options?.message || `Invalid protocol: ${urlObj.protocol}`,
            actual: url,
            expected: `protocols: ${options.protocols.join(', ')}`
          };
        }
      }

      return {
        passed: true,
        message: options?.message || `Valid URL: ${url}`,
        actual: url,
        expected: 'valid URL'
      };
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Invalid URL: ${url}`,
        actual: url,
        expected: 'valid URL'
      };
    }
  }

  /**
   * Valida que un número de teléfono tiene formato válido
   */
  static async toBeValidPhone(
    phone: string,
    options?: {
      country?: 'US' | 'UK' | 'ES' | 'MX';
      message?: string;
    }
  ): Promise<ValidationResult> {
    const phonePatterns: Record<string, RegExp> = {
      'US': /^(\+1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
      'UK': /^(\+44)?[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/,
      'ES': /^(\+34)?[-.\s]?\d{9}$/,
      'MX': /^(\+52)?[-.\s]?\d{10}$/,
      'DEFAULT': /^\+?\d{7,15}$/
    };

    const pattern = phonePatterns[options?.country || 'DEFAULT'];
    const isValid = pattern.test(phone.replace(/\s/g, ''));

    return {
      passed: isValid,
      message: options?.message || 
        (isValid 
          ? `Valid phone: ${phone}`
          : `Invalid phone format: ${phone}`),
      actual: phone,
      expected: `valid ${options?.country || 'international'} phone`
    };
  }

  /**
   * Valida que un string cumple con un patrón regex
   */
  static async toMatchPattern(
    text: string,
    pattern: RegExp,
    options?: { message?: string }
  ): Promise<ValidationResult> {
    const matches = pattern.test(text);

    return {
      passed: matches,
      message: options?.message || 
        (matches 
          ? `Text matches pattern`
          : `Text does not match pattern`),
      actual: text,
      expected: pattern.toString()
    };
  }

  /**
   * Valida que un array contiene elementos específicos
   */
  static async toContainAll<T>(
    array: T[],
    expectedElements: T[],
    options?: { message?: string }
  ): Promise<ValidationResult> {
    const containsAll = expectedElements.every(elem => 
      array.includes(elem)
    );

    const missing = expectedElements.filter(elem => 
      !array.includes(elem)
    );

    return {
      passed: containsAll,
      message: options?.message || 
        (containsAll 
          ? `Array contains all expected elements`
          : `Array missing elements: ${JSON.stringify(missing)}`),
      actual: array,
      expected: expectedElements
    };
  }

  /**
   * Valida que un objeto tiene propiedades específicas
   */
  static async toHaveProperties(
    obj: any,
    properties: string[],
    options?: { message?: string }
  ): Promise<ValidationResult> {
    const missing = properties.filter(prop => 
      !(prop in obj)
    );

    const hasAll = missing.length === 0;

    return {
      passed: hasAll,
      message: options?.message || 
        (hasAll 
          ? `Object has all required properties`
          : `Object missing properties: ${missing.join(', ')}`),
      actual: Object.keys(obj),
      expected: properties
    };
  }

  /**
   * Valida que un string es JSON válido
   */
  static async toBeValidJSON(
    jsonString: string,
    options?: { 
      schema?: any;
      message?: string 
    }
  ): Promise<ValidationResult> {
    try {
      const parsed = JSON.parse(jsonString);
      
      if (options?.schema) {
        // Validación básica de schema
        const schemaValid = this.validateJSONSchema(parsed, options.schema);
        if (!schemaValid) {
          return {
            passed: false,
            message: options?.message || `JSON does not match schema`,
            actual: parsed,
            expected: 'match schema'
          };
        }
      }

      return {
        passed: true,
        message: options?.message || `Valid JSON`,
        actual: 'valid JSON',
        expected: 'valid JSON'
      };
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Invalid JSON: ${(error as Error).message}`,
        actual: jsonString,
        expected: 'valid JSON'
      };
    }
  }

  /**
   * Valida que dos valores son aproximadamente iguales (para números decimales)
   */
  static async toBeCloseTo(
    actual: number,
    expected: number,
    precision: number = 2,
    options?: { message?: string }
  ): Promise<ValidationResult> {
    const diff = Math.abs(actual - expected);
    const threshold = Math.pow(10, -precision) / 2;
    const isClose = diff < threshold;

    return {
      passed: isClose,
      message: options?.message || 
        (isClose 
          ? `${actual} is close to ${expected} (precision: ${precision})`
          : `${actual} is not close to ${expected} (diff: ${diff})`),
      actual,
      expected
    };
  }

  /**
   * Valida que un elemento está en viewport
   */
  static async toBeInViewport(
    page: Page,
    selector: string,
    options?: { message?: string }
  ): Promise<ValidationResult> {
    try {
      const isInViewport = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
      }, selector);

      return {
        passed: isInViewport,
        message: options?.message || 
          (isInViewport 
            ? `Element is in viewport`
            : `Element is not in viewport`),
        actual: isInViewport ? 'in viewport' : 'not in viewport',
        expected: 'in viewport'
      };
    } catch (error) {
      return {
        passed: false,
        message: options?.message || `Failed to check viewport`,
        actual: 'error',
        expected: 'in viewport'
      };
    }
  }

  /**
   * Valida que un color está en formato hexadecimal válido
   */
  static async toBeValidHexColor(
    color: string,
    options?: { message?: string }
  ): Promise<ValidationResult> {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const isValid = hexPattern.test(color);

    return {
      passed: isValid,
      message: options?.message || 
        (isValid 
          ? `Valid hex color: ${color}`
          : `Invalid hex color: ${color}`),
      actual: color,
      expected: 'valid hex color'
    };
  }

  /**
   * Valida que un string no está vacío
   */
  static async toBeNotEmpty(
    value: string | any[],
    options?: { message?: string }
  ): Promise<ValidationResult> {
    const isEmpty = typeof value === 'string' 
      ? value.trim().length === 0
      : value.length === 0;

    return {
      passed: !isEmpty,
      message: options?.message || 
        (!isEmpty 
          ? `Value is not empty`
          : `Value is empty`),
      actual: value,
      expected: 'not empty'
    };
  }

  /**
   * Validación básica de JSON Schema
   */
  private static validateJSONSchema(data: any, schema: any): boolean {
    // Implementación simplificada de validación de schema
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== schema.type) return false;
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const prop of schema.required) {
        if (!(prop in data)) return false;
      }
    }

    if (schema.properties) {
      for (const prop in schema.properties) {
        if (prop in data) {
          if (!this.validateJSONSchema(data[prop], schema.properties[prop])) {
            return false;
          }
        }
      }
    }

    return true;
  }
}