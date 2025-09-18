// src/interactions/GestureActions.ts

import { Page, Locator } from 'playwright';
import { ElementLocator, GestureOptions, ScrollOptions } from '../types/FrameworkTypes';
import { Locators } from '../elements/Locators';
import { WaitStrategies } from '../elements/WaitStrategies';
import { LoggerFactory } from '../core/logging/LoggerFactory';

/**
 * Acciones de gestos para aplicaciones web
 * Maneja scroll, swipe, zoom y otros gestos
 */
export class GestureActions {
  private static logger = LoggerFactory.getLogger('GestureActions');

  /**
   * Realiza scroll en la página o elemento
   */
  static async scroll(
    page: Page,
    options: ScrollOptions
  ): Promise<void> {
    try {
      this.logger.debug('Performing scroll', options);

      if (options.element) {
        // Scroll en un elemento específico
        const element = await WaitStrategies.waitForVisible(page, options.element);
        await this.scrollElement(element, options);
      } else {
        // Scroll en la página
        await this.scrollPage(page, options);
      }

      this.logger.debug('Scroll completed');
    } catch (error) {
      this.logger.error('Scroll failed', error as Error);
      throw error;
    }
  }

  /**
   * Scroll en la página completa
   */
  private static async scrollPage(
    page: Page,
    options: ScrollOptions
  ): Promise<void> {
    const distance = options.distance || 300;
    const direction = options.direction || 'down';
    const steps = options.steps || 1;
    const duration = options.duration || 0;

    const stepDelay = duration / steps;

    for (let i = 0; i < steps; i++) {
      switch (direction) {
        case 'down':
          await page.evaluate((d) => window.scrollBy(0, d), distance / steps);
          break;
        case 'up':
          await page.evaluate((d) => window.scrollBy(0, -d), distance / steps);
          break;
        case 'right':
          await page.evaluate((d) => window.scrollBy(d, 0), distance / steps);
          break;
        case 'left':
          await page.evaluate((d) => window.scrollBy(-d, 0), distance / steps);
          break;
      }

      if (stepDelay > 0) {
        await WaitStrategies.sleep(stepDelay);
      }
    }
  }

  /**
   * Scroll en un elemento específico
   */
  private static async scrollElement(
    element: Locator,
    options: ScrollOptions
  ): Promise<void> {
    const distance = options.distance || 300;
    const direction = options.direction || 'down';

    await element.evaluate((el, opts) => {
      const elem = el as HTMLElement;
      switch (opts.direction) {
        case 'down':
          elem.scrollTop += opts.distance;
          break;
        case 'up':
          elem.scrollTop -= opts.distance;
          break;
        case 'right':
          elem.scrollLeft += opts.distance;
          break;
        case 'left':
          elem.scrollLeft -= opts.distance;
          break;
      }
    }, { direction, distance });
  }

  /**
   * Scroll hasta que un elemento sea visible
   */
  static async scrollToElement(
    page: Page,
    locator: ElementLocator,
    options?: { 
      behavior?: 'smooth' | 'instant'; 
      block?: 'start' | 'center' | 'end';
      inline?: 'start' | 'center' | 'end';
    }
  ): Promise<void> {
    try {
      this.logger.debug('Scrolling to element', { 
        locator: locator.description 
      });

      const element = await WaitStrategies.waitForElement(page, locator);
      
      await element.scrollIntoViewIfNeeded();
      
      // Opcionalmente, usar scrollIntoView con opciones
      if (options) {
        await element.evaluate((el, opts) => {
          el.scrollIntoView(opts);
        }, options);
      }

      this.logger.debug('Scrolled to element successfully');
    } catch (error) {
      this.logger.error('Failed to scroll to element', error as Error);
      throw error;
    }
  }

  /**
   * Swipe (deslizar) - simulado con mouse para web
   */
  static async swipe(
    page: Page,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    options?: GestureOptions
  ): Promise<void> {
    try {
      this.logger.debug('Performing swipe', {
        start: { x: startX, y: startY },
        end: { x: endX, y: endY }
      });

      const duration = options?.duration || 300;
      const steps = options?.steps || 10;

      await page.mouse.move(startX, startY);
      await page.mouse.down();

      // Mover el mouse en pasos para simular un swipe suave
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        
        await page.mouse.move(x, y);
        
        if (duration > 0) {
          await WaitStrategies.sleep(duration / steps);
        }
      }

      await page.mouse.up();

      this.logger.debug('Swipe completed');
    } catch (error) {
      this.logger.error('Swipe failed', error as Error);
      throw error;
    }
  }

  /**
   * Pinch (zoom) - simulado con wheel para web
   */
  static async pinch(
    page: Page,
    centerX: number,
    centerY: number,
    scale: number
  ): Promise<void> {
    try {
      this.logger.debug('Performing pinch/zoom', {
        center: { x: centerX, y: centerY },
        scale
      });

      // En web, simular zoom con Ctrl + wheel
      await page.keyboard.down('Control');
      
      // Mover el mouse al centro antes de hacer wheel
      await page.mouse.move(centerX, centerY);
      
      // El deltaY negativo hace zoom in, positivo hace zoom out
      const deltaY = scale > 1 ? -100 : 100;
      await page.mouse.wheel(0, deltaY);
      
      await page.keyboard.up('Control');

      this.logger.debug('Pinch/zoom completed');
    } catch (error) {
      this.logger.error('Pinch failed', error as Error);
      throw error;
    }
  }

  /**
   * Long press (mantener presionado)
   */
  static async longPress(
    page: Page,
    locator: ElementLocator,
    duration: number = 1000
  ): Promise<void> {
    try {
      this.logger.debug('Performing long press', {
        locator: locator.description,
        duration
      });

      const element = await WaitStrategies.waitForVisible(page, locator);
      
      // Obtener la posición del elemento
      const box = await element.boundingBox();
      if (!box) {
        throw new Error('Element has no bounding box');
      }

      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      // Mantener presionado
      await page.mouse.move(x, y);
      await page.mouse.down();
      await WaitStrategies.sleep(duration);
      await page.mouse.up();

      this.logger.debug('Long press completed');
    } catch (error) {
      this.logger.error('Long press failed', error as Error);
      throw error;
    }
  }

  /**
   * Doble tap (doble toque) - equivalente a doble click
   */
  static async doubleTap(
    page: Page,
    locator: ElementLocator
  ): Promise<void> {
    try {
      this.logger.debug('Performing double tap', {
        locator: locator.description
      });

      const element = await WaitStrategies.waitForVisible(page, locator);
      await element.dblclick();

      this.logger.debug('Double tap completed');
    } catch (error) {
      this.logger.error('Double tap failed', error as Error);
      throw error;
    }
  }

  /**
   * Drag (arrastrar) con opciones avanzadas
   */
  static async drag(
    page: Page,
    sourceLocator: ElementLocator,
    deltaX: number,
    deltaY: number,
    options?: GestureOptions
  ): Promise<void> {
    try {
      this.logger.debug('Performing drag', {
        source: sourceLocator.description,
        delta: { x: deltaX, y: deltaY }
      });

      const element = await WaitStrategies.waitForVisible(page, sourceLocator);
      const box = await element.boundingBox();
      
      if (!box) {
        throw new Error('Source element has no bounding box');
      }

      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      const endX = startX + deltaX;
      const endY = startY + deltaY;

      await this.swipe(page, startX, startY, endX, endY, options);

      this.logger.debug('Drag completed');
    } catch (error) {
      this.logger.error('Drag failed', error as Error);
      throw error;
    }
  }

  /**
   * Scroll infinito (para páginas con lazy loading)
   */
  static async infiniteScroll(
    page: Page,
    options?: {
      maxScrolls?: number;
      scrollDelay?: number;
      stopCondition?: () => Promise<boolean>;
    }
  ): Promise<void> {
    try {
      const maxScrolls = options?.maxScrolls || 10;
      const scrollDelay = options?.scrollDelay || 1000;
      
      this.logger.debug('Starting infinite scroll', { maxScrolls });

      let previousHeight = 0;
      let scrollCount = 0;

      while (scrollCount < maxScrolls) {
        // Obtener altura actual
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        
        // Si la altura no ha cambiado, hemos llegado al final
        if (currentHeight === previousHeight) {
          this.logger.debug('Reached end of scrollable content');
          break;
        }

        // Verificar condición de parada personalizada
        if (options?.stopCondition) {
          const shouldStop = await options.stopCondition();
          if (shouldStop) {
            this.logger.debug('Stop condition met');
            break;
          }
        }

        // Scroll al final
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await WaitStrategies.sleep(scrollDelay);
        
        previousHeight = currentHeight;
        scrollCount++;
      }

      this.logger.info('Infinite scroll completed', { 
        scrolls: scrollCount 
      });
    } catch (error) {
      this.logger.error('Infinite scroll failed', error as Error);
      throw error;
    }
  }

  /**
   * Scroll horizontal
   */
  static async horizontalScroll(
    page: Page,
    distance: number,
    smooth: boolean = true
  ): Promise<void> {
    try {
      this.logger.debug('Performing horizontal scroll', { distance, smooth });

      if (smooth) {
        await this.scroll(page, {
          direction: distance > 0 ? 'right' : 'left',
          distance: Math.abs(distance),
          steps: 10,
          duration: 300
        });
      } else {
        await page.evaluate((d) => {
          window.scrollBy(d, 0);
        }, distance);
      }

      this.logger.debug('Horizontal scroll completed');
    } catch (error) {
      this.logger.error('Horizontal scroll failed', error as Error);
      throw error;
    }
  }

  /**
   * Obtiene la posición actual del scroll
   */
  static async getScrollPosition(page: Page): Promise<{ x: number; y: number }> {
    return await page.evaluate(() => ({
      x: window.pageXOffset || document.documentElement.scrollLeft,
      y: window.pageYOffset || document.documentElement.scrollTop
    }));
  }

  /**
   * Verifica si un elemento es scrollable
   */
  static async isScrollable(
    page: Page,
    locator: ElementLocator
  ): Promise<boolean> {
    try {
      const element = await WaitStrategies.waitForElement(page, locator);
      
      return await element.evaluate((el) => {
        const elem = el as HTMLElement;
        return elem.scrollHeight > elem.clientHeight || 
               elem.scrollWidth > elem.clientWidth;
      });
    } catch (error) {
      this.logger.error('Failed to check if scrollable', error as Error);
      return false;
    }
  }
}