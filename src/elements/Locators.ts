/**
 * 🔍 Locators.ts
 * 
 * Constructor de localizadores para encontrar elementos en la página.
 * Soporta múltiples estrategias de localización y búsquedas complejas.
 * 
 * ¿Qué es un Locator?
 * Es una forma de identificar elementos en una página web.
 * Como una dirección que le dice al framework dónde encontrar un botón, campo, etc.
 * 
 * ¿Por qué múltiples estrategias?
 * - CSS: Rápido y potente
 * - XPath: Búsquedas complejas
 * - Text: Búsqueda por texto visible
 * - TestID: Más confiable para testing
 * - ARIA: Accesibilidad
 */

import { Page, Locator, FrameLocator } from '@playwright/test';
import { 
  LocatorOptions, 
  LocatorStrategy,
  FrameworkError,
  ErrorCode 
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../core/logging/LoggerFactory';

/**
 * 📋 Opciones avanzadas para construcción de locators
 */
export interface AdvancedLocatorOptions extends LocatorOptions {
  frame?: string;                  // Selector del iframe
  shadowRoot?: string;             // Selector del shadow root
  hasText?: string;                // Filtrar por texto contenido
  hasNotText?: string;             // Filtrar por texto NO contenido
  nth?: number;                    // Índice del elemento (alias de index)
  first?: boolean;                 // Tomar el primer elemento
  last?: boolean;                  // Tomar el último elemento
  filter?: {                       // Filtros adicionales
    hasChild?: string;             // Tiene hijo con selector
    hasParent?: string;            // Tiene padre con selector
    visible?: boolean;             // Solo visibles
    enabled?: boolean;             // Solo habilitados
  };
}

/**
 * 🏗️ Clase LocatorBuilder - Construye localizadores
 */
export class LocatorBuilder {
  private page: Page;
  private logger = LoggerFactory.forComponent(ComponentType.ELEMENT_MANAGER);
  private frameContext?: FrameLocator;
  
  // Cache de selectores para mejorar rendimiento
  private selectorCache: Map<string, string> = new Map();
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * 🎯 Construir un locator según las opciones
   */
  public async build(options: AdvancedLocatorOptions): Promise<Locator> {
    this.logger.debug('Construyendo locator', {
      strategy: options.strategy,
      value: options.value
    });
    
    try {
      // Si hay un frame, cambiar contexto
      if (options.frame) {
        this.frameContext = this.page.frameLocator(options.frame);
        this.logger.debug(`Contexto cambiado a frame: ${options.frame}`);
      }
      
      // Obtener el locator base según la estrategia
      let locator = await this.buildBaseLocator(options);
      
      // Aplicar filtros adicionales
      locator = this.applyFilters(locator, options);
      
      // Aplicar índice o posición
      locator = this.applyPosition(locator, options);
      
      return locator;
      
    } catch (error) {
      this.logger.error('Error construyendo locator', error as Error, { options });
      throw new FrameworkError(
        `No se pudo construir el locator: ${(error as Error).message}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { options }
      );
    } finally {
      // Limpiar contexto de frame
      this.frameContext = undefined;
    }
  }
  
  /**
   * 🔨 Construir locator base según estrategia
   */
  private async buildBaseLocator(options: LocatorOptions): Promise<Locator> {
    const context = this.frameContext || this.page;
    
    switch (options.strategy) {
      case LocatorStrategy.CSS:
        return this.buildCssLocator(context, options.value);
        
      case LocatorStrategy.XPATH:
        return this.buildXPathLocator(context, options.value);
        
      case LocatorStrategy.TEXT:
        return this.buildTextLocator(context, options.value);
        
      case LocatorStrategy.ROLE:
        return this.buildRoleLocator(context, options.value);
        
      case LocatorStrategy.TEST_ID:
        return this.buildTestIdLocator(context, options.value);
        
      case LocatorStrategy.PLACEHOLDER:
        return this.buildPlaceholderLocator(context, options.value);
        
      case LocatorStrategy.ALT_TEXT:
        return this.buildAltTextLocator(context, options.value);
        
      case LocatorStrategy.TITLE:
        return this.buildTitleLocator(context, options.value);
        
      case LocatorStrategy.LABEL:
        return this.buildLabelLocator(context, options.value);
        
      default:
        throw new Error(`Estrategia no soportada: ${options.strategy}`);
    }
  }
  
  /**
   * 🎨 Construir locator CSS
   */
  private buildCssLocator(context: Page | FrameLocator, selector: string): Locator {
    // Optimizar selectores comunes
    const optimizedSelector = this.optimizeCssSelector(selector);
    this.logger.trace(`CSS Selector: ${optimizedSelector}`);
    return context.locator(optimizedSelector);
  }
  
  /**
   * 🔍 Construir locator XPath
   */
  private buildXPathLocator(context: Page | FrameLocator, xpath: string): Locator {
    // Asegurar que el XPath comience con // o /
    const normalizedXPath = xpath.startsWith('/') ? xpath : `//${xpath}`;
    this.logger.trace(`XPath: ${normalizedXPath}`);
    return context.locator(`xpath=${normalizedXPath}`);
  }
  
  /**
   * 📝 Construir locator por texto
   */
  private buildTextLocator(context: Page | FrameLocator, text: string): Locator {
    // Soportar texto exacto y parcial
    const isExact = text.startsWith('=');
    const actualText = isExact ? text.substring(1) : text;
    
    this.logger.trace(`Text Locator: "${actualText}" (exact: ${isExact})`);
    
    if (isExact) {
      return context.locator(`text="${actualText}"`);
    } else {
      return context.locator(`text=${actualText}`);
    }
  }
  
  /**
   * 🎭 Construir locator por ARIA role
   */
  private buildRoleLocator(context: Page | FrameLocator, role: string): Locator {
    // Parsear role y opciones
    const [roleName, ...options] = role.split(':');
    
    this.logger.trace(`Role Locator: ${roleName}`);
    
    // Si hay opciones adicionales (ej: "button:Submit")
    if (options.length > 0) {
      const name = options.join(':');
      return context.getByRole(roleName as any, { name });
    }
    
    return context.getByRole(roleName as any);
  }
  
  /**
   * 🏷️ Construir locator por data-testid
   */
  private buildTestIdLocator(context: Page | FrameLocator, testId: string): Locator {
    this.logger.trace(`TestID Locator: ${testId}`);
    return context.getByTestId(testId);
  }
  
  /**
   * 💬 Construir locator por placeholder
   */
  private buildPlaceholderLocator(context: Page | FrameLocator, placeholder: string): Locator {
    this.logger.trace(`Placeholder Locator: ${placeholder}`);
    return context.getByPlaceholder(placeholder);
  }
  
  /**
   * 🖼️ Construir locator por alt text
   */
  private buildAltTextLocator(context: Page | FrameLocator, altText: string): Locator {
    this.logger.trace(`Alt Text Locator: ${altText}`);
    return context.getByAltText(altText);
  }
  
  /**
   * 📌 Construir locator por title
   */
  private buildTitleLocator(context: Page | FrameLocator, title: string): Locator {
    this.logger.trace(`Title Locator: ${title}`);
    return context.getByTitle(title);
  }
  
  /**
   * 🏷️ Construir locator por label
   */
  private buildLabelLocator(context: Page | FrameLocator, label: string): Locator {
    this.logger.trace(`Label Locator: ${label}`);
    return context.getByLabel(label);
  }
  
  /**
   * 🔧 Aplicar filtros adicionales al locator
   */
  private applyFilters(locator: Locator, options: AdvancedLocatorOptions): Locator {
    let filtered = locator;
    
    // Filtrar por texto contenido
    if (options.hasText) {
      filtered = filtered.filter({ hasText: options.hasText });
      this.logger.trace(`Filtrado por texto: "${options.hasText}"`);
    }
    
    // Filtrar por texto NO contenido
    if (options.hasNotText) {
      filtered = filtered.filter({ hasNotText: options.hasNotText });
      this.logger.trace(`Filtrado por NO texto: "${options.hasNotText}"`);
    }
    
    // Aplicar filtros adicionales
    if (options.filter) {
      // Filtrar por hijo
      if (options.filter.hasChild) {
        filtered = filtered.filter({ has: this.page.locator(options.filter.hasChild) });
        this.logger.trace(`Filtrado por hijo: ${options.filter.hasChild}`);
      }
      
      // Filtrar por visibilidad
      if (options.filter.visible !== undefined) {
        filtered = filtered.locator(':visible');
        this.logger.trace('Filtrado por elementos visibles');
      }
      
      // Filtrar por habilitado
      if (options.filter.enabled !== undefined) {
        filtered = filtered.locator(':enabled');
        this.logger.trace('Filtrado por elementos habilitados');
      }
    }
    
    return filtered;
  }
  
  /**
   * 📍 Aplicar posición (índice, primero, último)
   */
  private applyPosition(locator: Locator, options: AdvancedLocatorOptions): Locator {
    // Primero
    if (options.first) {
      this.logger.trace('Seleccionando primer elemento');
      return locator.first();
    }
    
    // Último
    if (options.last) {
      this.logger.trace('Seleccionando último elemento');
      return locator.last();
    }
    
    // Índice específico
    const index = options.index ?? options.nth;
    if (index !== undefined) {
      this.logger.trace(`Seleccionando elemento en índice: ${index}`);
      return locator.nth(index);
    }
    
    return locator;
  }
  
  /**
   * 🚀 Optimizar selectores CSS comunes
   */
  private optimizeCssSelector(selector: string): string {
    // Cache de selectores optimizados
    if (this.selectorCache.has(selector)) {
      return this.selectorCache.get(selector)!;
    }
    
    let optimized = selector;
    
    // Optimizaciones comunes
    // ID: #id es más rápido que [id="..."]
    optimized = optimized.replace(/\[id="([^"]+)"\]/g, '#$1');
    
    // Class: .class es más rápido que [class="..."]
    optimized = optimized.replace(/\[class="([^"]+)"\]/g, '.$1');
    
    // Remover espacios innecesarios
    optimized = optimized.trim().replace(/\s+/g, ' ');
    
    this.selectorCache.set(selector, optimized);
    return optimized;
  }
  
  /**
   * 🔄 Combinar múltiples estrategias (OR)
   */
  public buildMultiStrategy(options: LocatorOptions[]): Locator {
    if (options.length === 0) {
      throw new Error('Se requiere al menos una opción de localización');
    }
    
    // Construir selectores para cada estrategia
    const selectors = options.map(opt => {
      switch (opt.strategy) {
        case LocatorStrategy.CSS:
          return opt.value;
        case LocatorStrategy.XPATH:
          return `xpath=${opt.value}`;
        case LocatorStrategy.TEXT:
          return `text=${opt.value}`;
        case LocatorStrategy.TEST_ID:
          return `[data-testid="${opt.value}"]`;
        default:
          return opt.value;
      }
    });
    
    // Combinar con coma (OR en CSS)
    const combinedSelector = selectors.join(', ');
    this.logger.debug(`Multi-strategy selector: ${combinedSelector}`);
    
    return this.page.locator(combinedSelector);
  }
  
  /**
   * 🎯 Construir locator relativo (desde un elemento padre)
   */
  public buildRelative(parent: Locator, child: LocatorOptions): Locator {
    this.logger.trace('Construyendo locator relativo', {
      parent: parent.toString(),
      child: child.value
    });
    
    switch (child.strategy) {
      case LocatorStrategy.CSS:
        return parent.locator(child.value);
        
      case LocatorStrategy.XPATH:
        // XPath relativo comienza con .
        const relativeXPath = child.value.startsWith('.') ? child.value : `.${child.value}`;
        return parent.locator(`xpath=${relativeXPath}`);
        
      case LocatorStrategy.TEXT:
        return parent.locator(`text=${child.value}`);
        
      default:
        return parent.locator(child.value);
    }
  }
  
  /**
   * 🎨 Construir selector dinámico con parámetros
   */
  public buildDynamic(template: string, params: Record<string, string>): string {
    let selector = template;
    
    // Reemplazar parámetros en el template
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      selector = selector.replace(new RegExp(placeholder, 'g'), value);
    });
    
    this.logger.trace(`Selector dinámico: ${selector}`);
    return selector;
  }
  
  /**
   * 🔍 Validar que un selector es válido
   */
  public async validateSelector(selector: string, strategy: LocatorStrategy): Promise<boolean> {
    try {
      const options: LocatorOptions = { strategy, value: selector };
      const locator = await this.build(options);
      const count = await locator.count();
      
      this.logger.debug(`Selector válido. Elementos encontrados: ${count}`, {
        strategy,
        selector
      });
      
      return count > 0;
    } catch (error) {
      this.logger.warn(`Selector inválido: ${selector}`, { strategy });
      return false;
    }
  }
  
  /**
   * 📊 Obtener información sobre elementos encontrados
   */
  public async getLocatorInfo(locator: Locator): Promise<LocatorInfo> {
    const count = await locator.count();
    const elements: ElementInfo[] = [];
    
    for (let i = 0; i < Math.min(count, 10); i++) { // Máximo 10 elementos
      const element = locator.nth(i);
      
      elements.push({
        index: i,
        visible: await element.isVisible(),
        enabled: await element.isEnabled(),
        text: await element.textContent() || '',
        tagName: await element.evaluate(el => el.tagName.toLowerCase()),
        id: await element.getAttribute('id'),
        classes: await element.getAttribute('class')
      });
    }
    
    return {
      count,
      elements
    };
  }
}

/**
 * 📊 Información sobre un locator
 */
export interface LocatorInfo {
  count: number;
  elements: ElementInfo[];
}

/**
 * 📋 Información sobre un elemento
 */
export interface ElementInfo {
  index: number;
  visible: boolean;
  enabled: boolean;
  text: string;
  tagName: string;
  id: string | null;
  classes: string | null;
}

/**
 * 🎯 Helper class para selectores comunes
 */
export class CommonSelectors {
  // Botones
  static button = (text?: string) => text ? `button:has-text("${text}")` : 'button';
  static submitButton = () => 'button[type="submit"]';
  static resetButton = () => 'button[type="reset"]';
  
  // Inputs
  static input = (type?: string) => type ? `input[type="${type}"]` : 'input';
  static textInput = () => 'input[type="text"]';
  static emailInput = () => 'input[type="email"]';
  static passwordInput = () => 'input[type="password"]';
  static checkbox = () => 'input[type="checkbox"]';
  static radio = () => 'input[type="radio"]';
  
  // Links
  static link = (text?: string) => text ? `a:has-text("${text}")` : 'a';
  static linkWithHref = (href: string) => `a[href="${href}"]`;
  
  // Formularios
  static form = (name?: string) => name ? `form[name="${name}"]` : 'form';
  static label = (text: string) => `label:has-text("${text}")`;
  static select = (name?: string) => name ? `select[name="${name}"]` : 'select';
  static textarea = (name?: string) => name ? `textarea[name="${name}"]` : 'textarea';
  
  // Contenedores
  static div = (className?: string) => className ? `div.${className}` : 'div';
  static span = (text?: string) => text ? `span:has-text("${text}")` : 'span';
  static section = (id?: string) => id ? `section#${id}` : 'section';
  
  // Tablas
  static table = () => 'table';
  static tableRow = (index?: number) => index !== undefined ? `tr:nth-child(${index + 1})` : 'tr';
  static tableCell = (text?: string) => text ? `td:has-text("${text}")` : 'td';
  static tableHeader = (text?: string) => text ? `th:has-text("${text}")` : 'th';
  
  // Navegación
  static nav = () => 'nav';
  static menu = () => '[role="menu"]';
  static menuItem = (text?: string) => text ? `[role="menuitem"]:has-text("${text}")` : '[role="menuitem"]';
  
  // Modales y diálogos
  static modal = () => '[role="dialog"], .modal';
  static modalClose = () => '[aria-label="Close"], .close, .modal-close';
  
  // Mensajes y alertas
  static alert = () => '[role="alert"], .alert';
  static error = () => '.error, .error-message, [role="alert"]';
  static success = () => '.success, .success-message';
  static warning = () => '.warning, .warning-message';
}