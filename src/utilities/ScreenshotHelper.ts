// src/utilities/ScreenshotHelper.ts

import { Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { ScreenshotOptions } from '../types/FrameworkTypes';
import { ConfigManager } from '../core/config/ConfigManager';
import { LoggerFactory } from '../core/logging/LoggerFactory';

/**
 * Helper para captura y gestión de screenshots
 * Maneja la captura automática en casos de error y éxito
 */
export class ScreenshotHelper {
  private static logger = LoggerFactory.getLogger('ScreenshotHelper');
  private static screenshotPath: string;
  private static isInitialized: boolean = false;

  /**
   * Inicializa el helper con la configuración
   */
  static initialize(): void {
    if (this.isInitialized) return;
    
    try {
      const config = ConfigManager.getInstance().getConfig();
      this.screenshotPath = config.screenshots.path;
      this.ensureDirectoryExists(this.screenshotPath);
      this.isInitialized = true;
      
      this.logger.debug('ScreenshotHelper initialized', { 
        path: this.screenshotPath 
      });
    } catch (error) {
      // Usar ruta por defecto si no hay configuración
      this.screenshotPath = path.join(process.cwd(), 'screenshots');
      this.ensureDirectoryExists(this.screenshotPath);
      this.isInitialized = true;
      
      this.logger.warn('Using default screenshot path', { 
        path: this.screenshotPath 
      });
    }
  }

  /**
   * Captura un screenshot de la página
   */
  static async capture(
    page: Page,
    options?: {
      prefix?: string;
      fullPage?: boolean;
      path?: string;
      type?: 'png' | 'jpeg';
      quality?: number;
    }
  ): Promise<string> {
    this.initialize();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = options?.prefix || 'screenshot';
    const fileName = `${prefix}_${timestamp}.${options?.type || 'png'}`;
    const filePath = options?.path || path.join(this.screenshotPath, fileName);
    
    try {
      this.logger.debug('Capturing screenshot', { 
        fileName, 
        fullPage: options?.fullPage 
      });
      
      await page.screenshot({
        path: filePath,
        fullPage: options?.fullPage ?? false,
        type: options?.type || 'png',
        quality: options?.quality
      });
      
      this.logger.info('Screenshot captured successfully', { 
        path: filePath 
      });
      
      return filePath;
    } catch (error) {
      this.logger.error('Failed to capture screenshot', error as Error, {
        fileName
      });
      throw error;
    }
  }

  /**
   * Captura screenshot en caso de error
   */
  static async captureOnError(
    page: Page,
    error: Error,
    testName?: string
  ): Promise<string | undefined> {
    try {
      const screenshotPath = await this.capture(page, {
        prefix: `error_${testName || 'test'}`,
        fullPage: true
      });
      
      this.logger.info('Error screenshot captured', {
        error: error.message,
        screenshot: screenshotPath
      });
      
      return screenshotPath;
    } catch (screenshotError) {
      this.logger.error('Failed to capture error screenshot', screenshotError as Error);
      return undefined;
    }
  }

  /**
   * Captura screenshot de un elemento específico
   */
  static async captureElement(
    page: Page,
    selector: string,
    options?: {
      prefix?: string;
      path?: string;
      type?: 'png' | 'jpeg';
      quality?: number;
    }
  ): Promise<string> {
    this.initialize();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = options?.prefix || 'element';
    const fileName = `${prefix}_${timestamp}.${options?.type || 'png'}`;
    const filePath = options?.path || path.join(this.screenshotPath, fileName);
    
    try {
      this.logger.debug('Capturing element screenshot', { 
        selector, 
        fileName 
      });
      
      const element = await page.locator(selector);
      await element.screenshot({
        path: filePath,
        type: options?.type || 'png',
        quality: options?.quality
      });
      
      this.logger.info('Element screenshot captured', { 
        selector,
        path: filePath 
      });
      
      return filePath;
    } catch (error) {
      this.logger.error('Failed to capture element screenshot', error as Error, {
        selector
      });
      throw error;
    }
  }

  /**
   * Limpia screenshots antiguos
   */
  static async cleanOldScreenshots(daysToKeep: number = 7): Promise<void> {
    this.initialize();
    
    try {
      const files = fs.readdirSync(this.screenshotPath);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.screenshotPath, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        this.logger.info('Cleaned old screenshots', { 
          deletedCount, 
          daysToKeep 
        });
      }
    } catch (error) {
      this.logger.error('Failed to clean old screenshots', error as Error);
    }
  }

  /**
   * Captura una serie de screenshots con intervalo
   */
  static async captureSequence(
    page: Page,
    count: number,
    intervalMs: number,
    prefix: string = 'sequence'
  ): Promise<string[]> {
    this.initialize();
    
    const screenshots: string[] = [];
    
    this.logger.debug('Starting screenshot sequence', { 
      count, 
      intervalMs 
    });
    
    for (let i = 0; i < count; i++) {
      try {
        const screenshotPath = await this.capture(page, {
          prefix: `${prefix}_${i + 1}`,
          fullPage: false
        });
        screenshots.push(screenshotPath);
        
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        this.logger.warn(`Failed to capture screenshot ${i + 1} in sequence`, {
          error
        });
      }
    }
    
    this.logger.info('Screenshot sequence completed', { 
      captured: screenshots.length,
      requested: count 
    });
    
    return screenshots;
  }

  /**
   * Compara dos screenshots (básico - solo tamaño de archivo)
   */
  static async compareScreenshots(
    path1: string,
    path2: string
  ): Promise<boolean> {
    try {
      const stats1 = fs.statSync(path1);
      const stats2 = fs.statSync(path2);
      
      // Comparación básica por tamaño
      const areSimilar = Math.abs(stats1.size - stats2.size) < 1000;
      
      this.logger.debug('Screenshots compared', {
        path1,
        path2,
        size1: stats1.size,
        size2: stats2.size,
        areSimilar
      });
      
      return areSimilar;
    } catch (error) {
      this.logger.error('Failed to compare screenshots', error as Error);
      return false;
    }
  }

  /**
   * Obtiene la lista de screenshots en el directorio
   */
  static getScreenshotsList(): string[] {
    this.initialize();
    
    try {
      const files = fs.readdirSync(this.screenshotPath);
      return files
        .filter(file => file.endsWith('.png') || file.endsWith('.jpeg') || file.endsWith('.jpg'))
        .map(file => path.join(this.screenshotPath, file));
    } catch (error) {
      this.logger.error('Failed to get screenshots list', error as Error);
      return [];
    }
  }

  /**
   * Asegura que el directorio existe
   */
  private static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.debug('Created screenshot directory', { path: dirPath });
    }
  }

  /**
   * Obtiene el path configurado para screenshots
   */
  static getScreenshotPath(): string {
    this.initialize();
    return this.screenshotPath;
  }
}