// src/interactions/InputActions.ts

import { Page } from 'playwright';
import { ElementLocator, InputOptions } from '../types/FrameworkTypes';
import { WaitStrategies } from '../elements/WaitStrategies';
import { ElementActions } from '../elements/ElementActions';
import { LoggerFactory } from '../core/logging/LoggerFactory';

/**
 * Acciones de entrada de texto y teclado
 * Maneja escritura, borrado y acciones de teclado
 */
export class InputActions {
  private static logger = LoggerFactory.getLogger('InputActions');

  /**
   * Escribe texto en un campo
   */
  static async typeText(
    page: Page,
    locator: ElementLocator,
    text: string,
    options?: InputOptions
  ): Promise<void> {
    try {
      this.logger.debug('Typing text', {
        locator: locator.description,
        textLength: text.length,
        clearFirst: options?.clearFirst
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      
      // Limpiar primero si se solicita
      if (options?.clearFirst) {
        await this.clearText(page, locator);
      }
      
      // Seleccionar todo el texto si se solicita
      if (options?.selectAll) {
        await element.selectText();
      }

      // Escribir el texto
      await element.type(text, {
        delay: options?.delay,
        timeout: options?.timeout
      });

      this.logger.info('Text typed successfully', {
        locator: locator.description
      });
    } catch (error) {
      this.logger.error('Failed to type text', error as Error);
      throw error;
    }
  }

  /**
   * Limpia el texto de un campo
   */
  static async clearText(
    page: Page,
    locator: ElementLocator,
    options?: InputOptions
  ): Promise<void> {
    try {
      this.logger.debug('Clearing text', {
        locator: locator.description
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      
      // Triple click para seleccionar todo
      await element.click({ clickCount: 3 });
      
      // Presionar Delete
      await page.keyboard.press('Delete');
      
      // Verificación alternativa - usar clear()
      const value = await element.inputValue().catch(() => '');
      if (value) {
        await element.clear();
      }

      this.logger.info('Text cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear text', error as Error);
      throw error;
    }
  }

  /**
   * Rellena un campo (clear + type)
   */
  static async fillText(
    page: Page,
    locator: ElementLocator,
    text: string,
    options?: InputOptions
  ): Promise<void> {
    try {
      this.logger.debug('Filling text', {
        locator: locator.description,
        textLength: text.length
      });

      const element = await WaitStrategies.waitForVisible(page, locator, options);
      
      // Usar el método fill de Playwright (más eficiente)
      await element.fill(text);

      this.logger.info('Text filled successfully');
    } catch (error) {
      this.logger.error('Failed to fill text', error as Error);
      throw error;
    }
  }

  /**
   * Presiona una tecla o combinación de teclas
   */
  static async pressKey(
    page: Page,
    key: string,
    options?: { count?: number; delay?: number }
  ): Promise<void> {
    try {
      this.logger.debug('Pressing key', { key, count: options?.count });

      const count = options?.count || 1;
      
      for (let i = 0; i < count; i++) {
        await page.keyboard.press(key, {
          delay: options?.delay
        });
        
        if (options?.delay && i < count - 1) {
          await WaitStrategies.sleep(options.delay);
        }
      }

      this.logger.debug('Key pressed successfully');
    } catch (error) {
      this.logger.error('Failed to press key', error as Error, { key });
      throw error;
    }
  }

  /**
   * Presiona combinación de teclas (atajos)
   */
  static async pressShortcut(
    page: Page,
    ...keys: string[]
  ): Promise<void> {
    try {
      const shortcut = keys.join('+');
      this.logger.debug('Pressing shortcut', { shortcut });

      await page.keyboard.press(shortcut);

      this.logger.debug('Shortcut pressed successfully');
    } catch (error) {
      this.logger.error('Failed to press shortcut', error as Error);
      throw error;
    }
  }

  /**
   * Mantiene presionada una tecla
   */
  static async holdKey(
    page: Page,
    key: string
  ): Promise<void> {
    try {
      this.logger.debug('Holding key', { key });
      
      await page.keyboard.down(key);
      
      this.logger.debug('Key held down');
    } catch (error) {
      this.logger.error('Failed to hold key', error as Error);
      throw error;
    }
  }

  /**
   * Suelta una tecla presionada
   */
  static async releaseKey(
    page: Page,
    key: string
  ): Promise<void> {
    try {
      this.logger.debug('Releasing key', { key });
      
      await page.keyboard.up(key);
      
      this.logger.debug('Key released');
    } catch (error) {
      this.logger.error('Failed to release key', error as Error);
      throw error;
    }
  }

  /**
   * Copia texto al portapapeles
   */
  static async copyToClipboard(
    page: Page,
    text: string
  ): Promise<void> {
    try {
      this.logger.debug('Copying to clipboard', { 
        textLength: text.length 
      });

      await page.evaluate((txt) => {
        navigator.clipboard.writeText(txt);
      }, text);

      this.logger.debug('Text copied to clipboard');
    } catch (error) {
      this.logger.error('Failed to copy to clipboard', error as Error);
      throw error;
    }
  }

  /**
   * Pega desde el portapapeles
   */
  static async pasteFromClipboard(
    page: Page,
    locator: ElementLocator
  ): Promise<void> {
    try {
      this.logger.debug('Pasting from clipboard');

      const element = await WaitStrategies.waitForVisible(page, locator);
      
      // Focus en el elemento
      await element.focus();
      
      // Ctrl+V o Cmd+V según el sistema
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+v`);

      this.logger.debug('Pasted from clipboard');
    } catch (error) {
      this.logger.error('Failed to paste from clipboard', error as Error);
      throw error;
    }
  }

  /**
   * Selecciona todo el texto en un campo
   */
  static async selectAll(
    page: Page,
    locator: ElementLocator
  ): Promise<void> {
    try {
      this.logger.debug('Selecting all text');

      const element = await WaitStrategies.waitForVisible(page, locator);
      await element.selectText();

      this.logger.debug('All text selected');
    } catch (error) {
      this.logger.error('Failed to select all text', error as Error);
      throw error;
    }
  }

  /**
   * Obtiene el valor actual de un campo de entrada
   */
  static async getInputValue(
    page: Page,
    locator: ElementLocator
  ): Promise<string> {
    try {
      const element = await WaitStrategies.waitForVisible(page, locator);
      const value = await element.inputValue();
      
      this.logger.debug('Got input value', { 
        value,
        locator: locator.description 
      });
      
      return value;
    } catch (error) {
      this.logger.error('Failed to get input value', error as Error);
      throw error;
    }
  }

  /**
   * Verifica si un campo está vacío
   */
  static async isFieldEmpty(
    page: Page,
    locator: ElementLocator
  ): Promise<boolean> {
    try {
      const value = await this.getInputValue(page, locator);
      return value === '';
    } catch (error) {
      this.logger.error('Failed to check if field is empty', error as Error);
      return false;
    }
  }

  /**
   * Escribe carácter por carácter con delay
   */
  static async typeSlowly(
    page: Page,
    locator: ElementLocator,
    text: string,
    delayMs: number = 100
  ): Promise<void> {
    try {
      this.logger.debug('Typing slowly', {
        locator: locator.description,
        textLength: text.length,
        delay: delayMs
      });

      const element = await WaitStrategies.waitForVisible(page, locator);
      await element.focus();

      for (const char of text) {
        await page.keyboard.type(char);
        await WaitStrategies.sleep(delayMs);
      }

      this.logger.debug('Slow typing completed');
    } catch (error) {
      this.logger.error('Failed to type slowly', error as Error);
      throw error;
    }
  }

  /**
   * Simula Tab para navegar entre campos
   */
  static async tabToNextField(
    page: Page,
    times: number = 1
  ): Promise<void> {
    try {
      this.logger.debug('Tabbing to next field', { times });

      for (let i = 0; i < times; i++) {
        await page.keyboard.press('Tab');
        await WaitStrategies.sleep(100);
      }

      this.logger.debug('Tab navigation completed');
    } catch (error) {
      this.logger.error('Failed to tab to next field', error as Error);
      throw error;
    }
  }

  /**
   * Simula Shift+Tab para navegar hacia atrás
   */
  static async tabToPreviousField(
    page: Page,
    times: number = 1
  ): Promise<void> {
    try {
      this.logger.debug('Tabbing to previous field', { times });

      for (let i = 0; i < times; i++) {
        await page.keyboard.press('Shift+Tab');
        await WaitStrategies.sleep(100);
      }

      this.logger.debug('Reverse tab navigation completed');
    } catch (error) {
      this.logger.error('Failed to tab to previous field', error as Error);
      throw error;
    }
  }

  /**
   * Presiona Enter para enviar formulario
   */
  static async submitWithEnter(
    page: Page,
    locator?: ElementLocator
  ): Promise<void> {
    try {
      this.logger.debug('Submitting with Enter');

      if (locator) {
        const element = await WaitStrategies.waitForVisible(page, locator);
        await element.press('Enter');
      } else {
        await page.keyboard.press('Enter');
      }

      this.logger.info('Form submitted with Enter');
    } catch (error) {
      this.logger.error('Failed to submit with Enter', error as Error);
      throw error;
    }
  }

  /**
   * Escapa de un campo o diálogo
   */
  static async pressEscape(page: Page): Promise<void> {
    try {
      this.logger.debug('Pressing Escape');
      
      await page.keyboard.press('Escape');
      
      this.logger.debug('Escape pressed');
    } catch (error) {
      this.logger.error('Failed to press Escape', error as Error);
      throw error;
    }
  }

  /**
   * Oculta el teclado (principalmente para contexto móvil, pero puede ser útil)
   */
  static async hideKeyboard(page: Page): Promise<void> {
    try {
      this.logger.debug('Attempting to hide keyboard');
      
      // En web, simplemente hacer click fuera o presionar Escape
      await this.pressEscape(page);
      
      // O hacer click en el body para quitar el focus
      await page.click('body', { position: { x: 0, y: 0 } });
      
      this.logger.debug('Keyboard hidden');
    } catch (error) {
      this.logger.warn('Could not hide keyboard', { error });
    }
  }
}