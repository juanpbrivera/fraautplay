/**
 * 🖱️ GestureActions.ts
 * 
 * Maneja acciones de gestos y scroll en aplicaciones web.
 * Incluye scroll, zoom, drag & drop, y gestos táctiles para web.
 * 
 * ¿Qué gestos maneja?
 * - Scroll en todas direcciones
 * - Zoom (pinch) para dispositivos táctiles
 * - Long press (mantener presionado)
 * - Drag & Drop avanzado
 * - Gestos personalizados
 * 
 * Nota: Adaptado para WEB con soporte de eventos touch cuando sea necesario
 */

import { Page, Locator, Mouse } from '@playwright/test';
import { 
  ActionResult,
  FrameworkError,
  ErrorCode 
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../core/logging/LoggerFactory';
import { ElementManager } from '../elements/ElementManager';

/**
 * 📋 Opciones para scroll
 */
export interface ScrollOptions {
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;                // Píxeles a desplazar
  speed?: 'slow' | 'normal' | 'fast'; // Velocidad del scroll
  smooth?: boolean;                  // Scroll suave
  element?: Locator;                // Elemento específico para scroll
}

/**
 * 📋 Opciones para zoom/pinch
 */
export interface PinchOptions {
  scale: number;                     // Factor de escala (1 = 100%, 2 = 200%, 0.5 = 50%)
  center?: { x: number; y: number }; // Centro del gesto
  duration?: number;                 // Duración del gesto
}

/**
 * 📋 Opciones para long press
 */
export interface LongPressOptions {
  duration?: number;                 // Duración en milisegundos
  position?: { x: number; y: number }; // Posición específica
}

/**
 * 📋 Opciones para gestos personalizados
 */
export interface CustomGestureOptions {
  points: Array<{ x: number; y: number; delay?: number }>;
  speed?: 'slow' | 'normal' | 'fast';
}

/**
 * 🖱️ Clase GestureActions - Maneja gestos en web
 */
export class GestureActions {
  private page: Page;
  private mouse: Mouse;
  private logger = LoggerFactory.forComponent(ComponentType.GESTURES);
  private elementManager: ElementManager;
  
  constructor(page: Page) {
    this.page = page;
    this.mouse = page.mouse;
    this.elementManager = new ElementManager({ page });
  }
  
  /**
   * 📜 Scroll en la página o elemento
   */
  public async scroll(options: ScrollOptions = {}): Promise<ActionResult> {
    this.logger.start(`Ejecutando scroll ${options.direction || 'down'}`);
    const startTime = Date.now();
    
    try {
      const direction = options.direction || 'down';
      const distance = options.distance || 300;
      const speed = this.getSpeedDelay(options.speed);
      
      if (options.element) {
        // Scroll en elemento específico
        await this.scrollElement(options.element, direction, distance, options.smooth);
      } else {
        // Scroll en página
        await this.scrollPage(direction, distance, options.smooth, speed);
      }
      
      const result: ActionResult = {
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        details: `Scroll ${direction} por ${distance}px`
      };
      
      this.logger.success('Scroll completado', result);
      return result;
      
    } catch (error) {
      this.logger.fail('Scroll falló', error as Error);
      throw new FrameworkError(
        `Error ejecutando scroll: ${(error as Error).message}`,
        ErrorCode.BROWSER_ERROR,
        { options }
      );
    }
  }
  
  /**
   * 📜 Scroll hasta elemento específico
   */
  public async scrollToElement(
    locator: Locator,
    options?: {
      block?: 'start' | 'center' | 'end' | 'nearest';
      inline?: 'start' | 'center' | 'end' | 'nearest';
      smooth?: boolean;
    }
  ): Promise<ActionResult> {
    this.logger.start('Scroll hasta elemento');
    
    try {
      await locator.scrollIntoViewIfNeeded();
      
      // Si se especifican opciones específicas, usar JavaScript
      if (options) {
        await locator.evaluate((element, opts) => {
          element.scrollIntoView({
            behavior: opts.smooth ? 'smooth' : 'auto',
            block: opts.block || 'center',
            inline: opts.inline || 'center'
          });
        }, options);
      }
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Scroll hasta elemento completado'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'No se pudo hacer scroll hasta el elemento',
        ErrorCode.ELEMENT_NOT_FOUND
      );
    }
  }
  
  /**
   * 📜 Scroll infinito (para páginas con carga dinámica)
   */
  public async scrollInfinite(
    options: {
      maxScrolls?: number;           // Máximo número de scrolls
      waitTime?: number;              // Tiempo de espera entre scrolls
      stopCondition?: () => Promise<boolean>; // Condición para parar
    } = {}
  ): Promise<ActionResult> {
    this.logger.start('Iniciando scroll infinito');
    
    const maxScrolls = options.maxScrolls || 10;
    const waitTime = options.waitTime || 1000;
    let scrollCount = 0;
    let previousHeight = 0;
    
    try {
      while (scrollCount < maxScrolls) {
        // Obtener altura actual
        const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
        
        // Si no hay más contenido, parar
        if (currentHeight === previousHeight) {
          this.logger.info('No hay más contenido para cargar');
          break;
        }
        
        // Verificar condición de parada personalizada
        if (options.stopCondition && await options.stopCondition()) {
          this.logger.info('Condición de parada cumplida');
          break;
        }
        
        // Scroll hasta el final
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        
        // Esperar a que cargue contenido nuevo
        await this.page.waitForTimeout(waitTime);
        
        previousHeight = currentHeight;
        scrollCount++;
        
        this.logger.debug(`Scroll ${scrollCount}/${maxScrolls} completado`);
      }
      
      return {
        success: true,
        data: { scrolls: scrollCount },
        timestamp: new Date(),
        details: `Scroll infinito completado con ${scrollCount} scrolls`
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error en scroll infinito',
        ErrorCode.BROWSER_ERROR,
        { scrollCount }
      );
    }
  }
  
  /**
   * 🔍 Zoom/Pinch (principalmente para dispositivos táctiles)
   */
  public async pinch(locator: Locator, options: PinchOptions): Promise<ActionResult> {
    this.logger.start(`Ejecutando pinch con escala ${options.scale}`);
    
    try {
      // Obtener el centro del elemento si no se especifica
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error('No se pudo obtener la posición del elemento');
      }
      
      const center = options.center || {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      };
      
      // Simular pinch con eventos de mouse (para desktop)
      // o touch events (para móvil)
      await this.page.evaluate(({ scale, centerX, centerY }) => {
        const element = document.elementFromPoint(centerX, centerY);
        if (!element) return;
        
        // Crear evento de zoom personalizado
        const event = new WheelEvent('wheel', {
          deltaY: scale > 1 ? -100 : 100,
          ctrlKey: true,
          clientX: centerX,
          clientY: centerY
        });
        
        element.dispatchEvent(event);
      }, { scale: options.scale, centerX: center.x, centerY: center.y });
      
      // Alternativa: usar CSS transform para zoom
      if (options.scale !== 1) {
        await locator.evaluate((el, scale) => {
          (el as HTMLElement).style.transform = `scale(${scale})`;
          (el as HTMLElement).style.transition = 'transform 0.3s ease';
        }, options.scale);
      }
      
      return {
        success: true,
        data: { scale: options.scale },
        timestamp: new Date(),
        details: `Zoom aplicado: ${options.scale}x`
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error ejecutando pinch/zoom',
        ErrorCode.BROWSER_ERROR,
        { options }
      );
    }
  }
  
  /**
   * 👆 Long Press (mantener presionado)
   */
  public async longPress(locator: Locator, options: LongPressOptions = {}): Promise<ActionResult> {
    const duration = options.duration || 1000;
    this.logger.start(`Long press por ${duration}ms`);
    
    try {
      // Obtener posición del elemento
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error('No se pudo obtener la posición del elemento');
      }
      
      const position = options.position || {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      };
      
      // Mover el mouse a la posición
      await this.mouse.move(position.x, position.y);
      
      // Presionar y mantener
      await this.mouse.down();
      
      // Esperar la duración especificada
      await this.page.waitForTimeout(duration);
      
      // Soltar
      await this.mouse.up();
      
      // Alternativa: disparar evento personalizado
      await locator.dispatchEvent('longpress', { duration });
      
      return {
        success: true,
        data: { duration },
        timestamp: new Date(),
        details: `Long press completado (${duration}ms)`
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error ejecutando long press',
        ErrorCode.BROWSER_ERROR,
        { options }
      );
    }
  }
  
  /**
   * 🔄 Drag & Drop avanzado
   */
  public async dragAndDrop(
    source: Locator,
    target: Locator,
    options?: {
      steps?: number;                // Número de pasos intermedios
      duration?: number;              // Duración total del drag
      offsetX?: number;               // Offset X en el target
      offsetY?: number;               // Offset Y en el target
    }
  ): Promise<ActionResult> {
    this.logger.start('Ejecutando drag & drop');
    
    try {
      const sourceBox = await source.boundingBox();
      const targetBox = await target.boundingBox();
      
      if (!sourceBox || !targetBox) {
        throw new Error('No se pudo obtener posición de elementos');
      }
      
      const sourceCenter = {
        x: sourceBox.x + sourceBox.width / 2,
        y: sourceBox.y + sourceBox.height / 2
      };
      
      const targetCenter = {
        x: targetBox.x + targetBox.width / 2 + (options?.offsetX || 0),
        y: targetBox.y + targetBox.height / 2 + (options?.offsetY || 0)
      };
      
      // Mover a la fuente
      await this.mouse.move(sourceCenter.x, sourceCenter.y);
      await this.mouse.down();
      
      // Si se especifican pasos, hacer el movimiento gradual
      if (options?.steps && options.steps > 1) {
        const steps = options.steps;
        const deltaX = (targetCenter.x - sourceCenter.x) / steps;
        const deltaY = (targetCenter.y - sourceCenter.y) / steps;
        const stepDelay = (options.duration || 1000) / steps;
        
        for (let i = 1; i <= steps; i++) {
          await this.mouse.move(
            sourceCenter.x + deltaX * i,
            sourceCenter.y + deltaY * i
          );
          await this.page.waitForTimeout(stepDelay);
        }
      } else {
        // Movimiento directo
        await this.mouse.move(targetCenter.x, targetCenter.y);
      }
      
      // Soltar
      await this.mouse.up();
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Drag & drop completado'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error ejecutando drag & drop',
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * 👆 Swipe (deslizar)
   */
  public async swipe(
    locator: Locator,
    direction: 'left' | 'right' | 'up' | 'down',
    options?: {
      distance?: number;
      duration?: number;
      steps?: number;
    }
  ): Promise<ActionResult> {
    this.logger.start(`Ejecutando swipe ${direction}`);
    
    try {
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error('No se pudo obtener posición del elemento');
      }
      
      const distance = options?.distance || 100;
      const duration = options?.duration || 300;
      const steps = options?.steps || 10;
      
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
      
      // Ejecutar swipe
      await this.mouse.move(startX, startY);
      await this.mouse.down();
      
      // Movimiento gradual
      const deltaX = (endX - startX) / steps;
      const deltaY = (endY - startY) / steps;
      const stepDelay = duration / steps;
      
      for (let i = 1; i <= steps; i++) {
        await this.mouse.move(
          startX + deltaX * i,
          startY + deltaY * i
        );
        await this.page.waitForTimeout(stepDelay);
      }
      
      await this.mouse.up();
      
      return {
        success: true,
        data: { direction, distance },
        timestamp: new Date(),
        details: `Swipe ${direction} completado`
      };
      
    } catch (error) {
      throw new FrameworkError(
        `Error ejecutando swipe ${direction}`,
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * 🎯 Gesto personalizado
   */
  public async customGesture(options: CustomGestureOptions): Promise<ActionResult> {
    this.logger.start('Ejecutando gesto personalizado');
    
    try {
      const speed = this.getSpeedDelay(options.speed);
      
      for (const point of options.points) {
        await this.mouse.move(point.x, point.y);
        
        if (point.delay) {
          await this.page.waitForTimeout(point.delay);
        } else {
          await this.page.waitForTimeout(speed);
        }
      }
      
      return {
        success: true,
        data: { points: options.points.length },
        timestamp: new Date(),
        details: 'Gesto personalizado completado'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error ejecutando gesto personalizado',
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  /**
   * 🔄 Rotar elemento (con CSS)
   */
  public async rotate(locator: Locator, degrees: number): Promise<ActionResult> {
    this.logger.debug(`Rotando elemento ${degrees} grados`);
    
    try {
      await locator.evaluate((el, deg) => {
        (el as HTMLElement).style.transform = `rotate(${deg}deg)`;
        (el as HTMLElement).style.transition = 'transform 0.3s ease';
      }, degrees);
      
      return {
        success: true,
        data: { degrees },
        timestamp: new Date(),
        details: `Elemento rotado ${degrees}°`
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error rotando elemento',
        ErrorCode.ELEMENT_NOT_FOUND
      );
    }
  }
  
  /**
   * 📱 Shake (sacudir - útil para testing de gestos)
   */
  public async shake(locator: Locator, options?: {
    intensity?: number;
    duration?: number;
  }): Promise<ActionResult> {
    this.logger.debug('Ejecutando shake');
    
    try {
      const intensity = options?.intensity || 10;
      const duration = options?.duration || 500;
      const shakes = 5;
      
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error('No se pudo obtener posición');
      }
      
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      
      await this.mouse.move(centerX, centerY);
      await this.mouse.down();
      
      for (let i = 0; i < shakes; i++) {
        const offsetX = (Math.random() - 0.5) * intensity * 2;
        const offsetY = (Math.random() - 0.5) * intensity * 2;
        
        await this.mouse.move(centerX + offsetX, centerY + offsetY);
        await this.page.waitForTimeout(duration / shakes);
      }
      
      await this.mouse.up();
      
      return {
        success: true,
        timestamp: new Date(),
        details: 'Shake completado'
      };
      
    } catch (error) {
      throw new FrameworkError(
        'Error ejecutando shake',
        ErrorCode.BROWSER_ERROR
      );
    }
  }
  
  // 🔧 Métodos privados de utilidad
  
  /**
   * Obtener delay según velocidad
   */
  private getSpeedDelay(speed?: 'slow' | 'normal' | 'fast'): number {
    switch (speed) {
      case 'slow':
        return 100;
      case 'fast':
        return 10;
      default:
        return 50;
    }
  }
  
  /**
   * Scroll en página
   */
  private async scrollPage(
    direction: string,
    distance: number,
    smooth?: boolean,
    delay?: number
  ): Promise<void> {
    const scrollOptions = smooth ? { behavior: 'smooth' as ScrollBehavior } : {};
    
    switch (direction) {
      case 'up':
        await this.page.evaluate(([dist, opts]) => {
          window.scrollBy({ top: -dist, ...(opts as any) });
        }, [distance, scrollOptions]);
        break;
        
      case 'down':
        await this.page.evaluate(([dist, opts]) => {
          window.scrollBy({ top: dist, ...(opts as any) });
        }, [distance, scrollOptions]);
        break;
        
      case 'left':
        await this.page.evaluate(([dist, opts]) => {
          window.scrollBy({ left: -dist, ...(opts as any) });
        }, [distance, scrollOptions]);
        break;
        
      case 'right':
        await this.page.evaluate(([dist, opts]) => {
          window.scrollBy({ left: dist, ...(opts as any) });
        }, [distance, scrollOptions]);
        break;
    }
    
    if (delay) {
      await this.page.waitForTimeout(delay);
    }
  }
  
  /**
   * Scroll en elemento
   */
  private async scrollElement(
    locator: Locator,
    direction: string,
    distance: number,
    smooth?: boolean
  ): Promise<void> {
    await locator.evaluate(([dir, dist, sm]) => {
      const element = this as unknown as HTMLElement;
      const options = sm ? { behavior: 'smooth' as ScrollBehavior } : {};
      
      switch (dir) {
        case 'up':
          element.scrollBy({ top: -dist, ...options });
          break;
        case 'down':
          element.scrollBy({ top: dist, ...options });
          break;
        case 'left':
          element.scrollBy({ left: -dist, ...options });
          break;
        case 'right':
          element.scrollBy({ left: dist, ...options });
          break;
      }
    }, [direction, distance, smooth]);
  }
}