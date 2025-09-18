// src/interactions/NavigationActions.ts

import { Page, Response } from 'playwright';
import { NavigationOptions } from '../types/FrameworkTypes';
import { LoggerFactory } from '../core/logging/LoggerFactory';
import { WaitStrategies } from '../elements/WaitStrategies';

/**
 * Acciones de navegación para aplicaciones web
 * Maneja navegación, historial y recarga de páginas
 */
export class NavigationActions {
  private static logger = LoggerFactory.getLogger('NavigationActions');

  /**
   * Navega a una URL
   */
  static async goto(
    page: Page,
    url: string,
    options?: NavigationOptions
  ): Promise<Response | null> {
    try {
      this.logger.info('Navigating to URL', { url });
      
      const response = await page.goto(url, {
        waitUntil: options?.waitUntil || 'load',
        timeout: options?.timeout || 30000
      });
      
      this.logger.info('Navigation completed', { 
        url,
        status: response?.status() 
      });
      
      return response;
    } catch (error) {
      this.logger.error('Navigation failed', error as Error, { url });
      throw error;
    }
  }

  /**
   * Navega hacia atrás en el historial
   */
  static async goBack(
    page: Page,
    options?: NavigationOptions
  ): Promise<Response | null> {
    try {
      this.logger.debug('Navigating back');
      
      const response = await page.goBack({
        waitUntil: options?.waitUntil || 'load',
        timeout: options?.timeout || 30000
      });
      
      this.logger.info('Navigated back', { 
        url: page.url() 
      });
      
      return response;
    } catch (error) {
      this.logger.error('Failed to navigate back', error as Error);
      throw error;
    }
  }

  /**
   * Navega hacia adelante en el historial
   */
  static async goForward(
    page: Page,
    options?: NavigationOptions
  ): Promise<Response | null> {
    try {
      this.logger.debug('Navigating forward');
      
      const response = await page.goForward({
        waitUntil: options?.waitUntil || 'load',
        timeout: options?.timeout || 30000
      });
      
      this.logger.info('Navigated forward', { 
        url: page.url() 
      });
      
      return response;
    } catch (error) {
      this.logger.error('Failed to navigate forward', error as Error);
      throw error;
    }
  }

  /**
   * Recarga la página actual
   */
  static async reload(
    page: Page,
    options?: NavigationOptions
  ): Promise<Response | null> {
    try {
      this.logger.debug('Reloading page');
      
      const response = await page.reload({
        waitUntil: options?.waitUntil || 'load',
        timeout: options?.timeout || 30000
      });
      
      this.logger.info('Page reloaded', { 
        url: page.url() 
      });
      
      return response;
    } catch (error) {
      this.logger.error('Failed to reload page', error as Error);
      throw error;
    }
  }

  /**
   * Espera a que la navegación ocurra
   */
  static async waitForNavigation(
    page: Page,
    action: () => Promise<void>,
    options?: NavigationOptions
  ): Promise<Response | null> {
    try {
      this.logger.debug('Waiting for navigation');
      
      const [response] = await Promise.all([
        page.waitForNavigation({
          waitUntil: options?.waitUntil || 'load',
          timeout: options?.timeout || 30000
        }),
        action()
      ]);
      
      this.logger.info('Navigation detected', { 
        url: page.url(),
        status: response?.status()
      });
      
      return response;
    } catch (error) {
      this.logger.error('Navigation wait failed', error as Error);
      throw error;
    }
  }

  /**
   * Espera a que la URL cambie
   */
  static async waitForURLChange(
    page: Page,
    expectedUrl?: string | RegExp,
    options?: { timeout?: number }
  ): Promise<void> {
    const timeout = options?.timeout || 30000;
    const startUrl = page.url();
    
    this.logger.debug('Waiting for URL change', { 
      currentUrl: startUrl,
      expectedUrl 
    });
    
    try {
      await page.waitForURL(expectedUrl || /.*/, { timeout });
      
      this.logger.info('URL changed', {
        from: startUrl,
        to: page.url()
      });
    } catch (error) {
      this.logger.error('URL change timeout', error as Error, {
        currentUrl: page.url(),
        expectedUrl
      });
      throw error;
    }
  }

  /**
   * Navega a una nueva pestaña/ventana
   */
  static async openNewTab(
    page: Page,
    url?: string
  ): Promise<Page> {
    try {
      this.logger.debug('Opening new tab', { url });
      
      const context = page.context();
      const newPage = await context.newPage();
      
      if (url) {
        await newPage.goto(url);
      }
      
      this.logger.info('New tab opened', { 
        url: url || 'blank' 
      });
      
      return newPage;
    } catch (error) {
      this.logger.error('Failed to open new tab', error as Error);
      throw error;
    }
  }

  /**
   * Cierra la pestaña/ventana actual
   */
  static async closeTab(page: Page): Promise<void> {
    try {
      this.logger.debug('Closing tab', { url: page.url() });
      
      await page.close();
      
      this.logger.info('Tab closed');
    } catch (error) {
      this.logger.error('Failed to close tab', error as Error);
      throw error;
    }
  }

  /**
   * Cambia entre pestañas/ventanas
   */
  static async switchToTab(
    page: Page,
    index: number
  ): Promise<Page> {
    try {
      const context = page.context();
      const pages = context.pages();
      
      if (index < 0 || index >= pages.length) {
        throw new Error(`Tab index ${index} out of range (0-${pages.length - 1})`);
      }
      
      const targetPage = pages[index];
      await targetPage.bringToFront();
      
      this.logger.info('Switched to tab', { 
        index, 
        url: targetPage.url() 
      });
      
      return targetPage;
    } catch (error) {
      this.logger.error('Failed to switch tab', error as Error, { index });
      throw error;
    }
  }

  /**
   * Obtiene todas las pestañas abiertas
   */
  static getAllTabs(page: Page): Page[] {
    const context = page.context();
    return context.pages();
  }

  /**
   * Espera y acepta un diálogo (alert, confirm, prompt)
   */
  static async handleDialog(
    page: Page,
    action: 'accept' | 'dismiss',
    promptText?: string
  ): Promise<void> {
    try {
      this.logger.debug('Setting up dialog handler', { action });
      
      page.once('dialog', async dialog => {
        this.logger.info('Dialog detected', {
          type: dialog.type(),
          message: dialog.message()
        });
        
        if (action === 'accept') {
          await dialog.accept(promptText);
        } else {
          await dialog.dismiss();
        }
      });
    } catch (error) {
      this.logger.error('Failed to handle dialog', error as Error);
      throw error;
    }
  }

  /**
   * Scroll a una posición específica
   */
  static async scrollTo(
    page: Page,
    position: 'top' | 'bottom' | 'center' | { x: number; y: number }
  ): Promise<void> {
    try {
      this.logger.debug('Scrolling to position', { position });
      
      if (typeof position === 'string') {
        switch (position) {
          case 'top':
            await page.evaluate(() => window.scrollTo(0, 0));
            break;
          case 'bottom':
            await page.evaluate(() => 
              window.scrollTo(0, document.body.scrollHeight)
            );
            break;
          case 'center':
            await page.evaluate(() => 
              window.scrollTo(0, document.body.scrollHeight / 2)
            );
            break;
        }
      } else {
        await page.evaluate((pos) => 
          window.scrollTo(pos.x, pos.y), 
          position
        );
      }
      
      this.logger.debug('Scrolled to position');
    } catch (error) {
      this.logger.error('Failed to scroll', error as Error);
      throw error;
    }
  }

  /**
   * Obtiene la URL actual
   */
  static getCurrentURL(page: Page): string {
    return page.url();
  }

  /**
   * Obtiene el título de la página
   */
  static async getTitle(page: Page): Promise<string> {
    return await page.title();
  }

  /**
   * Verifica si la página está en una URL específica
   */
  static isAtURL(
    page: Page,
    expectedUrl: string | RegExp
  ): boolean {
    const currentUrl = page.url();
    
    if (typeof expectedUrl === 'string') {
      return currentUrl === expectedUrl || currentUrl.includes(expectedUrl);
    } else {
      return expectedUrl.test(currentUrl);
    }
  }

  /**
   * Espera a que la página esté completamente cargada
   */
  static async waitForPageLoad(
    page: Page,
    options?: {
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
      timeout?: number;
    }
  ): Promise<void> {
    await WaitStrategies.waitForPageLoad(page, options);
  }

  /**
   * Presiona el botón de retroceso del navegador (para aplicaciones SPA)
   */
  static async pressBack(page: Page): Promise<void> {
    try {
      this.logger.debug('Pressing browser back button');
      await page.keyboard.press('Alt+Left');
      await WaitStrategies.sleep(500); // Dar tiempo para la navegación
    } catch (error) {
      this.logger.error('Failed to press back', error as Error);
      throw error;
    }
  }

  /**
   * Presiona el botón home (navega a la página principal)
   */
  static async pressHome(page: Page, homeUrl: string): Promise<void> {
    try {
      this.logger.debug('Navigating to home', { homeUrl });
      await this.goto(page, homeUrl);
    } catch (error) {
      this.logger.error('Failed to navigate home', error as Error);
      throw error;
    }
  }
}