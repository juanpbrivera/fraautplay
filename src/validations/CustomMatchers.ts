/**
 * 🎯 CustomMatchers.ts
 * 
 * Define matchers personalizados que extienden las capacidades de Playwright.
 * Estos matchers se integran con expect() para validaciones más expresivas.
 * 
 * ¿Qué son matchers?
 * Son funciones que verifican condiciones específicas.
 * Permiten escribir assertions más legibles y específicas del dominio.
 * 
 * ¿Por qué crear matchers personalizados?
 * - Validaciones específicas del negocio
 * - Reutilización de lógica compleja
 * - Mensajes de error más claros
 * - Código de test más expresivo
 * 
 * Nota: Usamos Playwright's expect API en lugar de Jest
 */

import { expect as baseExpect, Locator, Page, APIResponse } from '@playwright/test';
import { LoggerFactory, ComponentType } from '../core/logging/LoggerFactory';

// Extender los tipos de expect para incluir nuestros matchers
declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      // Matchers para elementos
      toBeClickable(): Promise<R>;
      toHaveExactText(text: string): Promise<R>;
      toHaveTextIgnoreCase(text: string): Promise<R>;
      toHavePartialText(text: string): Promise<R>;
      toBeWithinViewport(): Promise<R>;
      toHaveChildren(count?: number): Promise<R>;
      toHaveNthChild(n: number): Promise<R>;
      toHaveParent(selector: string): Promise<R>;
      toHaveSibling(selector: string): Promise<R>;
      toBeAbove(locator: Locator): Promise<R>;
      toBeBelow(locator: Locator): Promise<R>;
      toBeLeftOf(locator: Locator): Promise<R>;
      toBeRightOf(locator: Locator): Promise<R>;
      
      // Matchers para formularios
      toBeValidEmail(): Promise<R>;
      toBeValidPhone(): Promise<R>;
      toBeValidDate(format?: string): Promise<R>;
      toBeValidURL(): Promise<R>;
      toBeInRange(min: number, max: number): Promise<R>;
      toMatchPattern(pattern: RegExp): Promise<R>;
      toHaveMinLength(length: number): Promise<R>;
      toHaveMaxLength(length: number): Promise<R>;
      
      // Matchers para estilos
      toHaveBackgroundColor(color: string): Promise<R>;
      toHaveColor(color: string): Promise<R>;
      toHaveFontSize(size: string): Promise<R>;
      toHaveStyle(property: string, value: string): Promise<R>;
      toBeHorizontallyCentered(): Promise<R>;
      toBeVerticallyCentered(): Promise<R>;
      
      // Matchers para estado
      toBeLoading(): Promise<R>;
      toBeComplete(): Promise<R>;
      toHaveError(message?: string): Promise<R>;
      toHaveSuccess(message?: string): Promise<R>;
      toHaveWarning(message?: string): Promise<R>;
      
      // Matchers para accesibilidad
      toBeAccessible(): Promise<R>;
      toHaveAriaLabel(label: string): Promise<R>;
      toHaveAriaRole(role: string): Promise<R>;
      toBeKeyboardNavigable(): Promise<R>;
      toHaveMinimumContrast(ratio?: number): Promise<R>;
      
      // Matchers para páginas
      toHaveMetaTag(name: string, content?: string): Promise<R>;
      toHaveCanonicalURL(url: string): Promise<R>;
      toBeResponsive(): Promise<R>;
      toLoadWithinTime(milliseconds: number): Promise<R>;
      
      // Matchers para APIs
      toHaveStatusCode(code: number): Promise<R>;
      toHaveResponseTime(maxMs: number): Promise<R>;
      toHaveHeader(header: string, value?: string): Promise<R>;
      toHaveJsonSchema(schema: any): Promise<R>;
    }
  }
}

const logger = LoggerFactory.forComponent(ComponentType.VALIDATION);

/**
 * 🎯 Configurar matchers personalizados
 */
export function setupCustomMatchers() {
  
  // 🖱️ toBeClickable - Verificar que elemento es clickeable
  baseExpect.extend({
    async toBeClickable(locator: Locator) {
      const isVisible = await locator.isVisible();
      const isEnabled = await locator.isEnabled();
      const isClickable = isVisible && isEnabled;
      
      return {
        pass: isClickable,
        message: () => isClickable
          ? `Expected element not to be clickable`
          : `Expected element to be clickable (visible: ${isVisible}, enabled: ${isEnabled})`
      };
    }
  });
  
  // 📝 toHaveExactText - Texto exacto (sin espacios extra)
  baseExpect.extend({
    async toHaveExactText(locator: Locator, expectedText: string) {
      const actualText = (await locator.textContent() || '').trim();
      const matches = actualText === expectedText.trim();
      
      return {
        pass: matches,
        message: () => matches
          ? `Expected text not to be "${expectedText}"`
          : `Expected text to be "${expectedText}", but got "${actualText}"`
      };
    }
  });
  
  // 📝 toHaveTextIgnoreCase - Texto ignorando mayúsculas
  baseExpect.extend({
    async toHaveTextIgnoreCase(locator: Locator, expectedText: string) {
      const actualText = (await locator.textContent() || '').toLowerCase().trim();
      const expected = expectedText.toLowerCase().trim();
      const matches = actualText === expected;
      
      return {
        pass: matches,
        message: () => matches
          ? `Expected text not to match "${expectedText}" (case insensitive)`
          : `Expected text to match "${expectedText}" (case insensitive), but got "${actualText}"`
      };
    }
  });
  
  // 📝 toHavePartialText - Contiene texto parcial
  baseExpect.extend({
    async toHavePartialText(locator: Locator, partialText: string) {
      const actualText = await locator.textContent() || '';
      const contains = actualText.includes(partialText);
      
      return {
        pass: contains,
        message: () => contains
          ? `Expected not to contain "${partialText}"`
          : `Expected to contain "${partialText}", but text was "${actualText}"`
      };
    }
  });
  
  // 🖼️ toBeWithinViewport - Elemento visible en viewport
  baseExpect.extend({
    async toBeWithinViewport(locator: Locator) {
      const box = await locator.boundingBox();
      if (!box) {
        return {
          pass: false,
          message: () => `Element not found or has no bounding box`
        };
      }
      
      const viewport = await locator.page().viewportSize();
      if (!viewport) {
        return {
          pass: false,
          message: () => `No viewport size available`
        };
      }
      
      const isWithin = 
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewport.width &&
        box.y + box.height <= viewport.height;
      
      return {
        pass: isWithin,
        message: () => isWithin
          ? `Expected element to be outside viewport`
          : `Expected element to be within viewport (element: ${JSON.stringify(box)}, viewport: ${JSON.stringify(viewport)})`
      };
    }
  });
  
  // 👶 toHaveChildren - Verificar hijos
  baseExpect.extend({
    async toHaveChildren(locator: Locator, expectedCount?: number) {
      const children = await locator.locator('> *').count();
      const hasChildren = children > 0;
      const correctCount = expectedCount === undefined || children === expectedCount;
      const passes = hasChildren && correctCount;
      
      return {
        pass: passes,
        message: () => {
          if (expectedCount !== undefined) {
            return passes
              ? `Expected not to have ${expectedCount} children`
              : `Expected to have ${expectedCount} children, but has ${children}`;
          }
          return passes
            ? `Expected not to have children`
            : `Expected to have children, but has none`;
        }
      };
    }
  });
  
  // 📧 toBeValidEmail - Validar formato email
  baseExpect.extend({
    async toBeValidEmail(locator: Locator) {
      const value = await locator.inputValue();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(value);
      
      return {
        pass: isValid,
        message: () => isValid
          ? `Expected "${value}" not to be a valid email`
          : `Expected "${value}" to be a valid email address`
      };
    }
  });
  
  // 📱 toBeValidPhone - Validar formato teléfono
  baseExpect.extend({
    async toBeValidPhone(locator: Locator) {
      const value = await locator.inputValue();
      // Formato US: (123) 456-7890 o 123-456-7890 o 1234567890
      const phoneRegex = /^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
      const isValid = phoneRegex.test(value.replace(/\s/g, ''));
      
      return {
        pass: isValid,
        message: () => isValid
          ? `Expected "${value}" not to be a valid phone number`
          : `Expected "${value}" to be a valid phone number`
      };
    }
  });
  
  // 📅 toBeValidDate - Validar formato fecha
  baseExpect.extend({
    async toBeValidDate(locator: Locator, format = 'MM/DD/YYYY') {
      const value = await locator.inputValue();
      let regex: RegExp;
      
      switch (format) {
        case 'MM/DD/YYYY':
          regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
          break;
        case 'DD/MM/YYYY':
          regex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
          break;
        case 'YYYY-MM-DD':
          regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
          break;
        default:
          regex = /^\d{2}\/\d{2}\/\d{4}$/;
      }
      
      const isValid = regex.test(value);
      
      return {
        pass: isValid,
        message: () => isValid
          ? `Expected "${value}" not to be a valid date (${format})`
          : `Expected "${value}" to be a valid date in format ${format}`
      };
    }
  });
  
  // 🔗 toBeValidURL - Validar formato URL
  baseExpect.extend({
    async toBeValidURL(locator: Locator) {
      const value = await locator.inputValue() || await locator.getAttribute('href') || '';
      
      try {
        new URL(value);
        return {
          pass: true,
          message: () => `Expected "${value}" not to be a valid URL`
        };
      } catch {
        return {
          pass: false,
          message: () => `Expected "${value}" to be a valid URL`
        };
      }
    }
  });
  
  // 🎨 toHaveBackgroundColor - Verificar color de fondo
  baseExpect.extend({
    async toHaveBackgroundColor(locator: Locator, expectedColor: string) {
      const actualColor = await locator.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // Normalizar colores (convertir rgb a hex si es necesario)
      const normalizedActual = normalizeColor(actualColor);
      const normalizedExpected = normalizeColor(expectedColor);
      const matches = normalizedActual === normalizedExpected;
      
      return {
        pass: matches,
        message: () => matches
          ? `Expected background color not to be ${expectedColor}`
          : `Expected background color to be ${expectedColor}, but got ${actualColor}`
      };
    }
  });
  
  // 🎨 toHaveStyle - Verificar estilo CSS
  baseExpect.extend({
    async toHaveStyle(locator: Locator, property: string, expectedValue: string) {
      const actualValue = await locator.evaluate((el, prop) => 
        window.getComputedStyle(el).getPropertyValue(prop),
        property
      );
      
      const matches = actualValue === expectedValue;
      
      return {
        pass: matches,
        message: () => matches
          ? `Expected ${property} not to be ${expectedValue}`
          : `Expected ${property} to be ${expectedValue}, but got ${actualValue}`
      };
    }
  });
  
  // ♿ toBeAccessible - Verificación básica de accesibilidad
  baseExpect.extend({
    async toBeAccessible(locator: Locator) {
      const violations: string[] = [];
      
      // Verificar alt text en imágenes
      const images = await locator.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        if (!alt) {
          violations.push('Image without alt text');
        }
      }
      
      // Verificar labels en inputs
      const inputs = await locator.locator('input, select, textarea').all();
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = await locator.page().locator(`label[for="${id}"]`).count();
          if (label === 0 && !ariaLabel && !ariaLabelledby) {
            violations.push(`Input without label: ${id || 'unnamed'}`);
          }
        }
      }
      
      // Verificar roles ARIA
      const buttons = await locator.locator('div[onclick], span[onclick]').all();
      for (const button of buttons) {
        const role = await button.getAttribute('role');
        if (role !== 'button') {
          violations.push('Clickable element without proper role');
        }
      }
      
      const isAccessible = violations.length === 0;
      
      return {
        pass: isAccessible,
        message: () => isAccessible
          ? `Expected element not to be accessible`
          : `Accessibility violations found: ${violations.join(', ')}`
      };
    }
  });
  
  // ⏱️ toLoadWithinTime - Verificar tiempo de carga
  baseExpect.extend({
    async toLoadWithinTime(page: Page, maxMilliseconds: number) {
      const startTime = Date.now();
      
      try {
        await page.waitForLoadState('networkidle', { timeout: maxMilliseconds });
        const loadTime = Date.now() - startTime;
        const withinTime = loadTime <= maxMilliseconds;
        
        return {
          pass: withinTime,
          message: () => withinTime
            ? `Expected page to take more than ${maxMilliseconds}ms to load`
            : `Expected page to load within ${maxMilliseconds}ms, but took ${loadTime}ms`
        };
      } catch {
        return {
          pass: false,
          message: () => `Page did not finish loading within ${maxMilliseconds}ms`
        };
      }
    }
  });
  
  // 🔢 toBeInRange - Verificar que valor está en rango
  baseExpect.extend({
    async toBeInRange(locator: Locator, min: number, max: number) {
      const value = parseFloat(await locator.inputValue());
      const inRange = value >= min && value <= max;
      
      return {
        pass: inRange,
        message: () => inRange
          ? `Expected ${value} not to be between ${min} and ${max}`
          : `Expected ${value} to be between ${min} and ${max}`
      };
    }
  });
  
  // 📏 toHaveMinLength - Verificar longitud mínima
  baseExpect.extend({
    async toHaveMinLength(locator: Locator, minLength: number) {
      const value = await locator.inputValue() || await locator.textContent() || '';
      const hasMinLength = value.length >= minLength;
      
      return {
        pass: hasMinLength,
        message: () => hasMinLength
          ? `Expected length to be less than ${minLength}`
          : `Expected minimum length ${minLength}, but got ${value.length}`
      };
    }
  });
  
  // 📏 toHaveMaxLength - Verificar longitud máxima
  baseExpect.extend({
    async toHaveMaxLength(locator: Locator, maxLength: number) {
      const value = await locator.inputValue() || await locator.textContent() || '';
      const hasMaxLength = value.length <= maxLength;
      
      return {
        pass: hasMaxLength,
        message: () => hasMaxLength
          ? `Expected length to be more than ${maxLength}`
          : `Expected maximum length ${maxLength}, but got ${value.length}`
      };
    }
  });
  
  logger.info('Matchers personalizados configurados exitosamente');
}

// 🔧 Funciones auxiliares

/**
 * Normalizar color (convertir rgb a hex)
 */
function normalizeColor(color: string): string {
  // Si ya es hex, devolver tal cual
  if (color.startsWith('#')) {
    return color.toLowerCase();
  }
  
  // Convertir rgb(r, g, b) a hex
  const rgb = color.match(/\d+/g);
  if (rgb && rgb.length >= 3) {
    const hex = '#' + rgb.slice(0, 3).map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    return hex.toLowerCase();
  }
  
  return color.toLowerCase();
}

/**
 * 🎯 Exportar expect con matchers personalizados
 */
export const expect = baseExpect;

// Inicializar matchers al importar
setupCustomMatchers();