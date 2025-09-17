/**
 * 🎯 ElementManager.ts
 * 
 * API principal para interactuar con elementos web.
 * Este es el componente CENTRAL para todas las operaciones con elementos.
 * 
 * ¿Qué hace?
 * - Localiza elementos usando diferentes estrategias
 * - Espera inteligentemente a que los elementos estén listos
 * - Proporciona métodos para interactuar con elementos
 * - Maneja errores y reintentos automáticamente
 * 
 * ¿Por qué es importante?
 * - Abstrae la complejidad de Playwright
 * - Proporciona una API consistente y fácil de usar
 * - Agrega logging y screenshots automáticos
 * - Maneja timeouts y reintentos
 */

import { Page, Locator, FrameLocator, Frame } from '@playwright/test';
import {
  LocatorOptions,
  LocatorStrategy,
  WaitStrategy,
  ElementState,
  ClickOptions,
  TypeOptions,
  FrameworkError,
  ErrorCode,
  ActionResult
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../core/logging/LoggerFactory';
import { WaitManager } from './WaitStrategies';
import { LocatorBuilder } from './Locators';
import { ElementActions } from './ElementActions';
import { ScreenshotHelper } from '../utilities/ScreenshotHelper';

/**
 * 📋 Opciones para el ElementManager
 */
export interface ElementManagerOptions {
  page: Page;                      // Página de Playwright
  sessionId?: string;              // ID de la sesión
  defaultTimeout?: number;         // Timeout por defecto
  autoScreenshot?: boolean;        // Screenshots automáticos en errores
  autoHighlight?: boolean;         // Resaltar elementos antes de interactuar
  autoScroll?: boolean;            // Scroll automático a elementos
  strictMode?: boolean;            // Modo estricto (falla si hay múltiples elementos)
}

/**
 * 🎯 Clase ElementManager - Gestiona todos los elementos web
 */
export class ElementManager {
  private page: Page;
  private logger = LoggerFactory.forComponent(ComponentType.ELEMENT_MANAGER);
  private waitManager: WaitManager;
  private locatorBuilder: LocatorBuilder;
  private elementActions: ElementActions;
  private screenshotHelper: ScreenshotHelper;
  private options: ElementManagerOptions;
  private currentFrame?: FrameLocator | Frame;
  
  constructor(options: ElementManagerOptions) {
    this.options = options;
    this.page = options.page;
    
    // Inicializar componentes auxiliares
    this.waitManager = new WaitManager(this.page, options.defaultTimeout);
    this.locatorBuilder = new LocatorBuilder(this.page);
    this.elementActions = new ElementActions(this.page);
    this.screenshotHelper = new ScreenshotHelper(this.page);
    
    // Configurar contexto del logger
    this.logger.setContext({
      sessionId: options.sessionId,
      page: this.page.url()
    });
  }
  
  /**
   * 🔍 Encontrar un elemento usando diferentes estrategias
   * Este es el método principal para localizar elementos
   */
  public async find(options: LocatorOptions): Promise<Locator> {
    this.logger.start(`Buscando elemento: ${options.description || options.value}`);
    
    try {
      // Construir el locator según la estrategia
      let locator = await this.locatorBuilder.build(options);
      
      // Si estamos en un frame, ajustar el locator
      if (this.currentFrame) {
        locator = this.adjustLocatorForFrame(locator, options);
      }
      
      // Esperar a que el elemento esté disponible según la estrategia de espera
      if (options.waitStrategy) {
        await this.waitManager.waitFor(locator, options.waitStrategy, options.timeout);
      }
      
      // Verificar que el elemento existe
      const count = await locator.count();
      if (count === 0) {
        throw new FrameworkError(
          `Elemento no encontrado: ${options.description || options.value}`,
          ErrorCode.ELEMENT_NOT_FOUND,
          { strategy: options.strategy, value: options.value }
        );
      }
      
      // En modo estricto, verificar que solo hay un elemento
      if (this.options.strictMode && count > 1 && options.index === undefined) {
        throw new FrameworkError(
          `Se encontraron ${count} elementos cuando se esperaba solo uno: ${options.value}`,
          ErrorCode.ELEMENT_NOT_FOUND,
          { count, strategy: options.strategy, value: options.value }
        );
      }
      
      // Si hay múltiples elementos y se especificó un índice, tomar ese
      if (options.index !== undefined && count > options.index) {
        locator = locator.nth(options.index);
      }
      
      // Resaltar el elemento si está configurado
      if (this.options.autoHighlight) {
        await this.highlightElement(locator);
      }
      
      // Hacer scroll si está configurado
      if (this.options.autoScroll) {
        await this.scrollToElement(locator);
      }
      
      this.logger.success(`Elemento encontrado`, {
        strategy: options.strategy,
        value: options.value,
        count
      });
      
      return locator;
      
    } catch (error) {
      this.logger.fail('No se pudo encontrar el elemento', error as Error);
      
      // Tomar screenshot si está configurado
      if (this.options.autoScreenshot) {
        const screenshotPath = await this.screenshotHelper.captureError(
          `element-not-found-${Date.now()}`
        );
        (error as FrameworkError).screenshot = screenshotPath;
      }
      
      throw error;
    }
  }
  
  /**
   * 🔍 Encontrar múltiples elementos
   */
  public async findAll(options: LocatorOptions): Promise<Locator> {
    this.logger.debug(`Buscando todos los elementos: ${options.value}`);
    
    const locator = await this.locatorBuilder.build(options);
    const count = await locator.count();
    
    this.logger.info(`Encontrados ${count} elementos`, {
      strategy: options.strategy,
      value: options.value
    });
    
    return locator;
  }
  
  /**
   * 🔍 Verificar si un elemento existe
   */
  public async exists(options: LocatorOptions): Promise<boolean> {
    try {
      const locator = await this.find({ ...options, waitStrategy: undefined });
      const count = await locator.count();
      return count > 0;
    } catch {
      return false;
    }
  }
  
  /**
   * 👁️ Verificar si un elemento es visible
   */
  public async isVisible(options: LocatorOptions): Promise<boolean> {
    try {
      const locator = await this.find(options);
      return await locator.isVisible();
    } catch {
      return false;
    }
  }
  
  /**
   * ✅ Verificar si un elemento está habilitado
   */
  public async isEnabled(options: LocatorOptions): Promise<boolean> {
    try {
      const locator = await this.find(options);
      return await locator.isEnabled();
    } catch {
      return false;
    }
  }
  
  /**
   * 📝 Obtener el texto de un elemento
   */
  public async getText(options: LocatorOptions): Promise<string> {
    const locator = await this.find(options);
    const text = await locator.textContent() || '';
    
    this.logger.debug(`Texto obtenido: "${text}"`, {
      element: options.value
    });
    
    return text.trim();
  }
  
  /**
   * 📝 Obtener el valor de un input
   */
  public async getValue(options: LocatorOptions): Promise<string> {
    const locator = await this.find(options);
    const value = await locator.inputValue();
    
    this.logger.debug(`Valor obtenido: "${value}"`, {
      element: options.value
    });
    
    return value;
  }
  
  /**
   * 📝 Obtener un atributo de un elemento
   */
  public async getAttribute(options: LocatorOptions, attributeName: string): Promise<string | null> {
    const locator = await this.find(options);
    const value = await locator.getAttribute(attributeName);
    
    this.logger.debug(`Atributo ${attributeName} = "${value}"`, {
      element: options.value
    });
    
    return value;
  }
  
  /**
   * 🖱️ Click en un elemento
   */
  public async click(options: LocatorOptions, clickOptions?: ClickOptions): Promise<ActionResult> {
    this.logger.start(`Click en: ${options.description || options.value}`);
    const startTime = Date.now();
    
    try {
      const locator = await this.find(options);
      await this.elementActions.click(locator, clickOptions);
      
      const result: ActionResult = {
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        details: `Click exitoso en ${options.value}`
      };
      
      this.logger.success('Click realizado', result);
      return result;
      
    } catch (error) {
      const result: ActionResult = {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        details: `Error al hacer click en ${options.value}`
      };
      
      if (this.options.autoScreenshot) {
        result.screenshot = await this.screenshotHelper.captureError('click-error');
      }
      
      this.logger.fail('Click fallido', error as Error, result);
      throw error;
    }
  }
  
  /**
   * ⌨️ Escribir texto en un elemento
   */
  public async type(options: LocatorOptions, text: string, typeOptions?: TypeOptions): Promise<ActionResult> {
    this.logger.start(`Escribiendo en: ${options.description || options.value}`);
    const startTime = Date.now();
    
    try {
      const locator = await this.find(options);
      
      // Limpiar primero si está configurado
      if (typeOptions?.clearFirst) {
        await locator.clear();
        this.logger.debug('Campo limpiado antes de escribir');
      }
      
      // Escribir el texto
      await this.elementActions.type(locator, text, typeOptions);
      
      // Presionar Enter si está configurado
      if (typeOptions?.pressEnter) {
        await locator.press('Enter');
        this.logger.debug('Enter presionado');
      }
      
      const result: ActionResult = {
        success: true,
        data: text,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        details: `Texto escrito: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
      };
      
      this.logger.success('Texto escrito', result);
      return result;
      
    } catch (error) {
      const result: ActionResult = {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
      
      if (this.options.autoScreenshot) {
        result.screenshot = await this.screenshotHelper.captureError('type-error');
      }
      
      this.logger.fail('Error al escribir', error as Error, result);
      throw error;
    }
  }
  
  /**
   * 🔄 Limpiar un campo de texto
   */
  public async clear(options: LocatorOptions): Promise<ActionResult> {
    this.logger.debug(`Limpiando campo: ${options.value}`);
    
    try {
      const locator = await this.find(options);
      await locator.clear();
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Campo limpiado'
      };
    } catch (error) {
      throw new FrameworkError(
        `No se pudo limpiar el campo: ${options.value}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { options }
      );
    }
  }
  
  /**
   * ✅ Marcar/desmarcar checkbox
   */
  public async check(options: LocatorOptions, check = true): Promise<ActionResult> {
    const action = check ? 'Marcando' : 'Desmarcando';
    this.logger.debug(`${action} checkbox: ${options.value}`);
    
    try {
      const locator = await this.find(options);
      
      if (check) {
        await locator.check();
      } else {
        await locator.uncheck();
      }
      
      return {
        success: true,
        timestamp: new Date(),
        details: `Checkbox ${check ? 'marcado' : 'desmarcado'}`
      };
    } catch (error) {
      throw new FrameworkError(
        `No se pudo ${check ? 'marcar' : 'desmarcar'} el checkbox`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { options }
      );
    }
  }
  
  /**
   * 📝 Seleccionar opción de un dropdown
   */
  public async selectOption(options: LocatorOptions, value: string | string[]): Promise<ActionResult> {
    this.logger.debug(`Seleccionando opción: ${value}`, { element: options.value });
    
    try {
      const locator = await this.find(options);
      await locator.selectOption(value);
      
      return {
        success: true,
        data: value,
        timestamp: new Date(),
        details: `Opción seleccionada: ${value}`
      };
    } catch (error) {
      throw new FrameworkError(
        `No se pudo seleccionar la opción: ${value}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { options, value }
      );
    }
  }
  
  /**
   * 📁 Subir archivo
   */
  public async uploadFile(options: LocatorOptions, filePath: string | string[]): Promise<ActionResult> {
    this.logger.debug(`Subiendo archivo(s): ${filePath}`, { element: options.value });
    
    try {
      const locator = await this.find(options);
      await locator.setInputFiles(filePath);
      
      return {
        success: true,
        data: filePath,
        timestamp: new Date(),
        details: `Archivo(s) subido(s): ${filePath}`
      };
    } catch (error) {
      throw new FrameworkError(
        `No se pudo subir el archivo: ${filePath}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { options, filePath }
      );
    }
  }
  
  /**
   * 🖼️ Cambiar a un iframe
   */
  public async switchToFrame(options: LocatorOptions): Promise<void> {
    this.logger.debug(`Cambiando a iframe: ${options.value}`);
    
    try {
      const locator = await this.find(options);
      this.currentFrame = this.page.frameLocator(options.value);
      this.logger.info('Cambiado a iframe exitosamente');
    } catch (error) {
      throw new FrameworkError(
        `No se pudo cambiar al iframe: ${options.value}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { options }
      );
    }
  }
  
  /**
   * 🔙 Volver al contexto principal (salir de iframe)
   */
  public async switchToMainFrame(): Promise<void> {
    this.currentFrame = undefined;
    this.logger.debug('Vuelto al contexto principal');
  }
  
  /**
   * 📊 Obtener el estado completo de un elemento
   */
  public async getElementState(options: LocatorOptions): Promise<ElementState> {
    const locator = await this.find(options);
    
    const state: ElementState = {
      exists: await locator.count() > 0,
      visible: await locator.isVisible(),
      enabled: await locator.isEnabled(),
      text: await locator.textContent() || undefined,
      tagName: await locator.evaluate(el => el.tagName.toLowerCase()),
      
      // Atributos comunes
      id: await locator.getAttribute('id') || undefined,
      className: await locator.getAttribute('class') || undefined,
      href: await locator.getAttribute('href') || undefined,
      src: await locator.getAttribute('src') || undefined,
      alt: await locator.getAttribute('alt') || undefined,
      title: await locator.getAttribute('title') || undefined,
      placeholder: await locator.getAttribute('placeholder') || undefined,
      value: await locator.getAttribute('value') || undefined,
      
      // ARIA
      role: await locator.getAttribute('role') || undefined,
      ariaLabel: await locator.getAttribute('aria-label') || undefined,
      
      // Estado para inputs específicos
      checked: await this.isChecked(locator),
      selected: await this.isSelected(locator),
      focused: await locator.evaluate(el => el === document.activeElement),
      editable: await locator.isEditable(),
      
      // Posición y tamaño
      boundingBox: await locator.boundingBox() || undefined,
      
      // Todos los atributos
      attributes: await locator.evaluate(el => {
        const attrs: Record<string, string> = {};
        for (const attr of el.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      })
    };
    
    this.logger.debug('Estado del elemento obtenido', state);
    return state;
  }
  
  /**
   * 🎯 Hacer hover sobre un elemento
   */
  public async hover(options: LocatorOptions): Promise<ActionResult> {
    this.logger.debug(`Hover sobre: ${options.value}`);
    
    try {
      const locator = await this.find(options);
      await locator.hover();
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Hover realizado'
      };
    } catch (error) {
      throw new FrameworkError(
        `No se pudo hacer hover sobre: ${options.value}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { options }
      );
    }
  }
  
  /**
   * 🎯 Hacer foco en un elemento
   */
  public async focus(options: LocatorOptions): Promise<ActionResult> {
    this.logger.debug(`Focus en: ${options.value}`);
    
    try {
      const locator = await this.find(options);
      await locator.focus();
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Focus realizado'
      };
    } catch (error) {
      throw new FrameworkError(
        `No se pudo hacer focus en: ${options.value}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { options }
      );
    }
  }
  
  /**
   * 📸 Tomar screenshot de un elemento específico
   */
  public async screenshot(options: LocatorOptions, path?: string): Promise<string> {
    const locator = await this.find(options);
    const screenshotPath = path || `element-${Date.now()}.png`;
    
    await locator.screenshot({ path: screenshotPath });
    this.logger.debug(`Screenshot del elemento guardado: ${screenshotPath}`);
    
    return screenshotPath;
  }
  
  /**
   * 🔄 Esperar a que un elemento desaparezca
   */
  public async waitToDisappear(options: LocatorOptions, timeout?: number): Promise<void> {
    this.logger.debug(`Esperando que desaparezca: ${options.value}`);
    
    const locator = await this.locatorBuilder.build(options);
    await locator.waitFor({ 
      state: 'hidden', 
      timeout: timeout || this.options.defaultTimeout 
    });
    
    this.logger.debug('Elemento desapareció');
  }
  
  // 🔧 Métodos privados de utilidad
  
  /**
   * Ajustar locator para frames
   */
  private adjustLocatorForFrame(locator: Locator, options: LocatorOptions): Locator {
    // Si estamos en un frame, el locator ya está ajustado por el LocatorBuilder
    return locator;
  }
  
  /**
   * Resaltar un elemento visualmente
   */
  private async highlightElement(locator: Locator): Promise<void> {
    try {
      await locator.evaluate(el => {
        const originalStyle = el.getAttribute('style') || '';
        el.setAttribute('style', `${originalStyle}; border: 2px solid red !important; background-color: rgba(255,0,0,0.1) !important;`);
        
        // Quitar el resaltado después de 2 segundos
        setTimeout(() => {
          el.setAttribute('style', originalStyle);
        }, 2000);
      });
    } catch {
      // Ignorar errores de resaltado
    }
  }
  
  /**
   * Hacer scroll hasta un elemento
   */
  private async scrollToElement(locator: Locator): Promise<void> {
    try {
      await locator.scrollIntoViewIfNeeded();
    } catch {
      // Ignorar errores de scroll
    }
  }
  
  /**
   * Verificar si un checkbox está marcado
   */
  private async isChecked(locator: Locator): Promise<boolean | undefined> {
    try {
      const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'input') {
        const type = await locator.getAttribute('type');
        if (type === 'checkbox' || type === 'radio') {
          return await locator.isChecked();
        }
      }
    } catch {
      // No es un checkbox/radio
    }
    return undefined;
  }
  
  /**
   * Verificar si una opción está seleccionada
   */
  private async isSelected(locator: Locator): Promise<boolean | undefined> {
    try {
      const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'option') {
        return await locator.evaluate(el => (el as HTMLOptionElement).selected);
      }
    } catch {
      // No es una opción
    }
    return undefined;
  }
  
  /**
   * 🔄 Actualizar la página actual (para logging)
   */
  public updatePage(page: Page): void {
    this.page = page;
    this.waitManager = new WaitManager(page, this.options.defaultTimeout);
    this.locatorBuilder = new LocatorBuilder(page);
    this.elementActions = new ElementActions(page);
    this.screenshotHelper = new ScreenshotHelper(page);
    
    this.logger.setContext({ page: page.url() });
  }
}