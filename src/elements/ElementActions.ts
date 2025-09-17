/**
 * 🎬 ElementActions.ts
 * 
 * Ejecuta acciones sobre elementos web de forma confiable.
 * Maneja reintentos, validaciones y casos especiales.
 * 
 * ¿Por qué una clase separada para acciones?
 * - Centraliza la lógica de interacción
 * - Maneja casos edge (elementos cubiertos, deshabilitados, etc.)
 * - Agrega reintentos automáticos
 * - Proporciona logging detallado
 * 
 * Cada acción valida que el elemento esté listo antes de interactuar.
 */

import { Page, Locator, Keyboard, Mouse } from '@playwright/test';
import {
  ClickOptions,
  TypeOptions,
  FrameworkError,
  ErrorCode
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../core/logging/LoggerFactory';

/**
 * 📋 Opciones para drag & drop
 */
export interface DragDropOptions {
  sourcePosition?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  force?: boolean;
  timeout?: number;
}

/**
 * 📋 Opciones para scroll
 */
export interface ScrollOptions {
  behavior?: 'auto' | 'smooth';
  block?: 'start' | 'center' | 'end' | 'nearest';
  inline?: 'start' | 'center' | 'end' | 'nearest';
}

/**
 * 🎬 Clase ElementActions - Ejecuta acciones sobre elementos
 */
export class ElementActions {
  private page: Page;
  private keyboard: Keyboard;
  private mouse: Mouse;
  private logger = LoggerFactory.forComponent(ComponentType.ELEMENT_MANAGER);
  
  constructor(page: Page) {
    this.page = page;
    this.keyboard = page.keyboard;
    this.mouse = page.mouse;
  }
  
  /**
   * 🖱️ Click en un elemento con validaciones
   */
  public async click(locator: Locator, options?: ClickOptions): Promise<void> {
    await this.ensureElementReady(locator, 'click');
    
    try {
      // Click con opciones
      await locator.click({
        button: options?.button || 'left',
        clickCount: options?.clickCount || 1,
        delay: options?.delay,
        force: options?.force,
        modifiers: options?.modifiers,
        position: options?.position,
        timeout: options?.timeout,
        trial: options?.trial
      });
      
      this.logger.trace('Click ejecutado', { 
        button: options?.button,
        clickCount: options?.clickCount 
      });
      
    } catch (error) {
      // Si falla, intentar con JavaScript como fallback
      if (!options?.trial && !options?.force) {
        this.logger.debug('Click normal falló, intentando con JavaScript');
        await this.clickWithJavaScript(locator);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * 🖱️ Doble click
   */
  public async doubleClick(locator: Locator, options?: Omit<ClickOptions, 'clickCount'>): Promise<void> {
    await this.click(locator, { ...options, clickCount: 2 });
  }
  
  /**
   * 🖱️ Click derecho
   */
  public async rightClick(locator: Locator, options?: Omit<ClickOptions, 'button'>): Promise<void> {
    await this.click(locator, { ...options, button: 'right' });
  }
  
  /**
   * 🖱️ Click con JavaScript (fallback)
   */
  private async clickWithJavaScript(locator: Locator): Promise<void> {
    await locator.evaluate(element => {
      (element as HTMLElement).click();
    });
    this.logger.debug('Click ejecutado con JavaScript');
  }
  
  /**
   * ⌨️ Escribir texto con validaciones
   */
  public async type(locator: Locator, text: string, options?: TypeOptions): Promise<void> {
    await this.ensureElementReady(locator, 'type');
    
    // Limpiar si está configurado
    if (options?.clearFirst) {
      await this.clear(locator);
    }
    
    // Escribir el texto
    await locator.type(text, {
      delay: options?.delay,
      timeout: options?.timeout
    });
    
    // Presionar Enter si está configurado
    if (options?.pressEnter) {
      await locator.press('Enter');
    }
    
    this.logger.trace(`Texto escrito: ${text.substring(0, 20)}...`);
  }
  
  /**
   * ⌨️ Escribir texto carácter por carácter (simula escritura humana)
   */
  public async typeSlowly(locator: Locator, text: string, delayMs = 100): Promise<void> {
    await this.ensureElementReady(locator, 'type');
    await locator.focus();
    
    for (const char of text) {
      await this.keyboard.type(char);
      await this.page.waitForTimeout(delayMs);
    }
    
    this.logger.trace('Texto escrito lentamente');
  }
  
  /**
   * 🧹 Limpiar campo de texto
   */
  public async clear(locator: Locator): Promise<void> {
    await this.ensureElementReady(locator, 'clear');
    
    // Método 1: clear() de Playwright
    try {
      await locator.clear();
      return;
    } catch {
      // Continuar con métodos alternativos
    }
    
    // Método 2: Seleccionar todo y borrar
    try {
      await locator.click();
      await this.keyboard.press('Control+A');
      await this.keyboard.press('Delete');
      return;
    } catch {
      // Continuar con método 3
    }
    
    // Método 3: JavaScript
    await locator.evaluate(element => {
      (element as HTMLInputElement).value = '';
    });
    
    this.logger.trace('Campo limpiado');
  }
  
  /**
   * ⌨️ Presionar una tecla
   */
  public async pressKey(key: string, options?: { delay?: number }): Promise<void> {
    await this.keyboard.press(key, options);
    this.logger.trace(`Tecla presionada: ${key}`);
  }
  
  /**
   * ⌨️ Presionar múltiples teclas (combo)
   */
  public async pressKeys(keys: string[], options?: { delay?: number }): Promise<void> {
    for (const key of keys) {
      await this.keyboard.down(key);
      if (options?.delay) {
        await this.page.waitForTimeout(options.delay);
      }
    }
    
    // Soltar en orden inverso
    for (const key of keys.reverse()) {
      await this.keyboard.up(key);
    }
    
    this.logger.trace(`Combo de teclas: ${keys.join('+')}`);
  }
  
  /**
   * 🖱️ Hover sobre elemento
   */
  public async hover(locator: Locator, options?: { force?: boolean; timeout?: number }): Promise<void> {
    await this.ensureElementReady(locator, 'hover');
    await locator.hover(options);
    this.logger.trace('Hover ejecutado');
  }
  
  /**
   * 🎯 Focus en elemento
   */
  public async focus(locator: Locator): Promise<void> {
    await this.ensureElementReady(locator, 'focus');
    await locator.focus();
    this.logger.trace('Focus ejecutado');
  }
  
  /**
   * 🎯 Blur (quitar focus)
   */
  public async blur(locator: Locator): Promise<void> {
    await locator.evaluate(element => {
      (element as HTMLElement).blur();
    });
    this.logger.trace('Blur ejecutado');
  }
  
  /**
   * 📜 Scroll a elemento
   */
  public async scrollIntoView(locator: Locator, options?: ScrollOptions): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    
    // Si hay opciones específicas, usar JavaScript
    if (options) {
      await locator.evaluate((element, opts) => {
        element.scrollIntoView(opts);
      }, options);
    }
    
    this.logger.trace('Scroll a elemento ejecutado');
  }
  
  /**
   * 📜 Scroll en página
   */
  public async scrollPage(direction: 'up' | 'down' | 'top' | 'bottom', pixels?: number): Promise<void> {
    switch (direction) {
      case 'up':
        await this.page.evaluate((px) => window.scrollBy(0, -(px || 100)), pixels);
        break;
      case 'down':
        await this.page.evaluate((px) => window.scrollBy(0, px || 100), pixels);
        break;
      case 'top':
        await this.page.evaluate(() => window.scrollTo(0, 0));
        break;
      case 'bottom':
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        break;
    }
    
    this.logger.trace(`Scroll ${direction} ejecutado`);
  }
  
  /**
   * 🔄 Drag & Drop
   */
  public async dragAndDrop(
    source: Locator,
    target: Locator,
    options?: DragDropOptions
  ): Promise<void> {
    await this.ensureElementReady(source, 'drag');
    await this.ensureElementReady(target, 'drop');
    
    await source.dragTo(target, {
      force: options?.force,
      sourcePosition: options?.sourcePosition,
      targetPosition: options?.targetPosition,
      timeout: options?.timeout
    });
    
    this.logger.trace('Drag & Drop ejecutado');
  }
  
  /**
   * 📋 Seleccionar texto
   */
  public async selectText(locator: Locator): Promise<void> {
    await this.ensureElementReady(locator, 'select');
    
    await locator.evaluate(element => {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.select();
      } else {
        // Para otros elementos, usar Selection API
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
    
    this.logger.trace('Texto seleccionado');
  }
  
  /**
   * 📋 Copiar al portapapeles
   */
  public async copyToClipboard(text: string): Promise<void> {
    await this.page.evaluate(async (txt) => {
      await navigator.clipboard.writeText(txt);
    }, text);
    
    this.logger.trace('Texto copiado al portapapeles');
  }
  
  /**
   * 📋 Pegar desde portapapeles
   */
  public async pasteFromClipboard(locator: Locator): Promise<void> {
    await this.focus(locator);
    await this.keyboard.press('Control+V');
    this.logger.trace('Pegado desde portapapeles');
  }
  
  /**
   * 📁 Subir archivo
   */
  public async uploadFile(locator: Locator, filePath: string | string[]): Promise<void> {
    await locator.setInputFiles(filePath);
    this.logger.trace(`Archivo(s) subido(s): ${Array.isArray(filePath) ? filePath.length : 1}`);
  }
  
  /**
   * ✅ Marcar checkbox
   */
  public async check(locator: Locator, force?: boolean): Promise<void> {
    const isChecked = await locator.isChecked();
    if (!isChecked) {
      await locator.check({ force });
      this.logger.trace('Checkbox marcado');
    } else {
      this.logger.trace('Checkbox ya estaba marcado');
    }
  }
  
  /**
   * ❌ Desmarcar checkbox
   */
  public async uncheck(locator: Locator, force?: boolean): Promise<void> {
    const isChecked = await locator.isChecked();
    if (isChecked) {
      await locator.uncheck({ force });
      this.logger.trace('Checkbox desmarcado');
    } else {
      this.logger.trace('Checkbox ya estaba desmarcado');
    }
  }
  
  /**
   * 🔘 Seleccionar radio button
   */
  public async selectRadio(locator: Locator, force?: boolean): Promise<void> {
    await locator.check({ force });
    this.logger.trace('Radio button seleccionado');
  }
  
  /**
   * 📝 Seleccionar opción de dropdown
   */
  public async selectOption(
    locator: Locator,
    values: string | string[] | { label?: string; value?: string; index?: number }
  ): Promise<string[]> {
    const selected = await locator.selectOption(values);
    this.logger.trace(`Opción(es) seleccionada(s): ${selected.join(', ')}`);
    return selected;
  }
  
  /**
   * 👁️ Hacer elemento visible si está oculto
   */
  public async makeVisible(locator: Locator): Promise<void> {
    await locator.evaluate(element => {
      (element as HTMLElement).style.display = 'block';
      (element as HTMLElement).style.visibility = 'visible';
      (element as HTMLElement).style.opacity = '1';
    });
    this.logger.trace('Elemento hecho visible');
  }
  
  /**
   * 🎯 Disparar evento personalizado
   */
  public async triggerEvent(locator: Locator, eventName: string, eventData?: any): Promise<void> {
    await locator.dispatchEvent(eventName, eventData);
    this.logger.trace(`Evento disparado: ${eventName}`);
  }
  
  /**
   * 📏 Obtener dimensiones del elemento
   */
  public async getBoundingBox(locator: Locator): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> {
    const box = await locator.boundingBox();
    if (box) {
      this.logger.trace('Dimensiones obtenidas', box);
    }
    return box;
  }
  
  /**
   * 🎨 Cambiar estilo CSS
   */
  public async setStyle(locator: Locator, styles: Record<string, string>): Promise<void> {
    await locator.evaluate((element, css) => {
      Object.entries(css).forEach(([property, value]) => {
        (element as HTMLElement).style.setProperty(property, value);
      });
    }, styles);
    
    this.logger.trace('Estilos aplicados', styles);
  }
  
  /**
   * 🎨 Agregar clase CSS
   */
  public async addClass(locator: Locator, className: string): Promise<void> {
    await locator.evaluate((element, cls) => {
      element.classList.add(cls);
    }, className);
    
    this.logger.trace(`Clase agregada: ${className}`);
  }
  
  /**
   * 🎨 Remover clase CSS
   */
  public async removeClass(locator: Locator, className: string): Promise<void> {
    await locator.evaluate((element, cls) => {
      element.classList.remove(cls);
    }, className);
    
    this.logger.trace(`Clase removida: ${className}`);
  }
  
  /**
   * 🔄 Toggle clase CSS
   */
  public async toggleClass(locator: Locator, className: string): Promise<boolean> {
    const hasClass = await locator.evaluate((element, cls) => {
      return element.classList.toggle(cls);
    }, className);
    
    this.logger.trace(`Clase toggled: ${className} (${hasClass ? 'agregada' : 'removida'})`);
    return hasClass;
  }
  
  /**
   * 📝 Establecer atributo
   */
  public async setAttribute(locator: Locator, name: string, value: string): Promise<void> {
    await locator.evaluate((element, [attr, val]) => {
      element.setAttribute(attr, val);
    }, [name, value]);
    
    this.logger.trace(`Atributo establecido: ${name}="${value}"`);
  }
  
  /**
   * 📝 Remover atributo
   */
  public async removeAttribute(locator: Locator, name: string): Promise<void> {
    await locator.evaluate((element, attr) => {
      element.removeAttribute(attr);
    }, name);
    
    this.logger.trace(`Atributo removido: ${name}`);
  }
  
  /**
   * ✅ Validar que elemento esté listo para interacción
   */
  private async ensureElementReady(locator: Locator, action: string): Promise<void> {
    try {
      // Verificar que existe
      const count = await locator.count();
      if (count === 0) {
        throw new Error('Elemento no encontrado');
      }
      
      // Verificar que es visible (para la mayoría de acciones)
      if (!['focus', 'hover'].includes(action)) {
        const isVisible = await locator.isVisible();
        if (!isVisible) {
          throw new Error('Elemento no visible');
        }
      }
      
      // Verificar que está habilitado (para acciones de interacción)
      if (['click', 'type', 'clear', 'check', 'uncheck'].includes(action)) {
        const isEnabled = await locator.isEnabled();
        if (!isEnabled) {
          throw new Error('Elemento deshabilitado');
        }
      }
      
    } catch (error) {
      throw new FrameworkError(
        `Elemento no está listo para ${action}: ${(error as Error).message}`,
        ErrorCode.ELEMENT_NOT_FOUND,
        { action }
      );
    }
  }
  
  /**
   * 🎯 Simular evento de mouse
   */
  public async mouseEvent(
    locator: Locator,
    event: 'mouseenter' | 'mouseleave' | 'mouseover' | 'mouseout' | 'mousedown' | 'mouseup'
  ): Promise<void> {
    await locator.dispatchEvent(event);
    this.logger.trace(`Evento de mouse: ${event}`);
  }
  
  /**
   * 📱 Simular evento touch (para testing mobile)
   */
  public async tap(locator: Locator, options?: { force?: boolean }): Promise<void> {
    await locator.tap(options);
    this.logger.trace('Tap ejecutado');
  }
  
  /**
   * 📱 Simular swipe
   */
  public async swipe(
    locator: Locator,
    direction: 'left' | 'right' | 'up' | 'down',
    distance = 100
  ): Promise<void> {
    const box = await locator.boundingBox();
    if (!box) throw new Error('No se pudo obtener posición del elemento');
    
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    
    let endX = startX;
    let endY = startY;
    
    switch (direction) {
      case 'left':
        endX = startX - distance;
        break;
      case 'right':
        endX = startX + distance;
        break;
      case 'up':
        endY = startY - distance;
        break;
      case 'down':
        endY = startY + distance;
        break;
    }
    
    await this.mouse.move(startX, startY);
    await this.mouse.down();
    await this.mouse.move(endX, endY);
    await this.mouse.up();
    
    this.logger.trace(`Swipe ${direction} ejecutado`);
  }
}