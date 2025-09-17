// src/elements/Locators.ts

import { Page, Locator as PlaywrightLocator } from 'playwright';
import { ElementLocator, LocatorStrategy } from '../types/FrameworkTypes';
import { LoggerFactory } from '../core/logging/LoggerFactory';

/**
 * Gestiona las estrategias de localización de elementos
 * Proporciona métodos unificados para encontrar elementos usando diferentes estrategias
 */
export class Locators {
  private static logger = LoggerFactory.getLogger('Locators');

  /**
   * Crea un localizador de Playwright basado en la estrategia especificada
   */
  static getLocator(page: Page, locator: ElementLocator): PlaywrightLocator {
    this.logger.debug('Creating locator', { 
      strategy: locator.strategy, 
      value: locator.value 
    });

    let element: PlaywrightLocator;

    // Si hay un padre, primero localizar el padre
    if (locator.parent) {
      const parentLocator = this.getLocator(page, locator.parent);
      element = this.createChildLocator(parentLocator, locator);
    } else {
      element = this.createLocator(page, locator);
    }

    this.logger.trace('Locator created successfully', { 
      description: locator.description 
    });

    return element;
  }

  /**
   * Crea un localizador basado en la estrategia
   */
  private static createLocator(
    page: Page, 
    locator: ElementLocator
  ): PlaywrightLocator {
    switch (locator.strategy) {
      case 'id':
        return page.locator(`#${locator.value}`);
      
      case 'css':
        return page.locator(locator.value);
      
      case 'xpath':
        return page.locator(`xpath=${locator.value}`);
      
      case 'text':
        return page.getByText(locator.value, { exact: true });
      
      case 'role':
        const [role, name] = locator.value.split(':');
        return name 
          ? page.getByRole(role as any, { name: name.trim() })
          : page.getByRole(role as any);
      
      case 'testid':
        return page.getByTestId(locator.value);
      
      case 'placeholder':
        return page.getByPlaceholder(locator.value);
      
      case 'alt':
        return page.getByAltText(locator.value);
      
      case 'title':
        return page.getByTitle(locator.value);
      
      case 'label':
        return page.getByLabel(locator.value);
      
      default:
        throw new Error(`Unsupported locator strategy: ${locator.strategy}`);
    }
  }

  /**
   * Crea un localizador hijo basado en un padre
   */
  private static createChildLocator(
    parent: PlaywrightLocator, 
    locator: ElementLocator
  ): PlaywrightLocator {
    switch (locator.strategy) {
      case 'id':
        return parent.locator(`#${locator.value}`);
      
      case 'css':
        return parent.locator(locator.value);
      
      case 'xpath':
        return parent.locator(`xpath=${locator.value}`);
      
      case 'text':
        return parent.getByText(locator.value, { exact: true });
      
      case 'role':
        const [role, name] = locator.value.split(':');
        return name 
          ? parent.getByRole(role as any, { name: name.trim() })
          : parent.getByRole(role as any);
      
      case 'testid':
        return parent.getByTestId(locator.value);
      
      case 'placeholder':
        return parent.getByPlaceholder(locator.value);
      
      case 'alt':
        return parent.getByAltText(locator.value);
      
      case 'title':
        return parent.getByTitle(locator.value);
      
      case 'label':
        return parent.getByLabel(locator.value);
      
      default:
        throw new Error(`Unsupported locator strategy: ${locator.strategy}`);
    }
  }

  /**
   * Crea un ElementLocator a partir de un string y estrategia
   */
  static create(
    strategy: LocatorStrategy, 
    value: string, 
    description?: string
  ): ElementLocator {
    return {
      strategy,
      value,
      description: description || `${strategy}=${value}`
    };
  }

  /**
   * Helpers para crear localizadores comunes
   */
  static byId(id: string, description?: string): ElementLocator {
    return this.create('id', id, description || `ID: ${id}`);
  }

  static byCss(selector: string, description?: string): ElementLocator {
    return this.create('css', selector, description || `CSS: ${selector}`);
  }

  static byXpath(xpath: string, description?: string): ElementLocator {
    return this.create('xpath', xpath, description || `XPath: ${xpath}`);
  }

  static byText(text: string, description?: string): ElementLocator {
    return this.create('text', text, description || `Text: ${text}`);
  }

  static byRole(role: string, name?: string, description?: string): ElementLocator {
    const value = name ? `${role}:${name}` : role;
    return this.create('role', value, description || `Role: ${value}`);
  }

  static byTestId(testId: string, description?: string): ElementLocator {
    return this.create('testid', testId, description || `TestId: ${testId}`);
  }

  static byPlaceholder(placeholder: string, description?: string): ElementLocator {
    return this.create('placeholder', placeholder, description || `Placeholder: ${placeholder}`);
  }

  static byAlt(altText: string, description?: string): ElementLocator {
    return this.create('alt', altText, description || `Alt: ${altText}`);
  }

  static byTitle(title: string, description?: string): ElementLocator {
    return this.create('title', title, description || `Title: ${title}`);
  }

  static byLabel(label: string, description?: string): ElementLocator {
    return this.create('label', label, description || `Label: ${label}`);
  }

  /**
   * Combina múltiples localizadores (útil para elementos complejos)
   */
  static combine(...locators: ElementLocator[]): ElementLocator {
    if (locators.length === 0) {
      throw new Error('At least one locator is required');
    }

    if (locators.length === 1) {
      return locators[0];
    }

    // Encadenar localizadores como padre-hijo
    let result = locators[0];
    for (let i = 1; i < locators.length; i++) {
      locators[i].parent = result;
      result = locators[i];
    }

    return result;
  }

  /**
   * Valida si un localizador es válido
   */
  static validate(locator: ElementLocator): boolean {
    if (!locator.strategy || !locator.value) {
      this.logger.warn('Invalid locator: missing strategy or value', { locator });
      return false;
    }

    const validStrategies: LocatorStrategy[] = [
      'id', 'css', 'xpath', 'text', 'role', 
      'testid', 'placeholder', 'alt', 'title', 'label'
    ];

    if (!validStrategies.includes(locator.strategy)) {
      this.logger.warn('Invalid locator strategy', { 
        strategy: locator.strategy, 
        valid: validStrategies 
      });
      return false;
    }

    return true;
  }
}