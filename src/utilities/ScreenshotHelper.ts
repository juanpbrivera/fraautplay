/**
 * 📸 ScreenshotHelper.ts
 * 
 * Gestiona la captura automática de screenshots durante las pruebas.
 * Proporciona evidencia visual del estado de la aplicación.
 * 
 * ¿Por qué son importantes los screenshots?
 * - Evidencia visual de errores
 * - Documentación de flujos
 * - Debugging más rápido
 * - Reportes más completos
 * 
 * ¿Cuándo tomar screenshots?
 * - En errores/fallos
 * - En puntos críticos del flujo
 * - Antes/después de acciones importantes
 * - Al final de cada test
 */

import { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  ScreenshotOptions,
  FrameworkError,
  ErrorCode
} from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../logging/LoggerFactory';
import { ConfigManager } from '../core/config/ConfigManager';

/**
 * 📋 Opciones avanzadas para screenshots
 */
export interface AdvancedScreenshotOptions extends ScreenshotOptions {
  name?: string;                   // Nombre personalizado
  folder?: string;                 // Carpeta específica
  timestamp?: boolean;             // Agregar timestamp al nombre
  highlight?: Locator | string;    // Elemento a resaltar
  annotate?: {                     // Anotaciones en la imagen
    text: string;
    position: 'top' | 'bottom';
    color?: string;
    fontSize?: number;
  };
  comparison?: {                    // Para comparación visual
    baseline?: string;              // Imagen base para comparar
    threshold?: number;             // Umbral de diferencia (0-1)
  };
  metadata?: Record<string, any>;  // Metadata adicional
}

/**
 * 📋 Resultado de screenshot
 */
export interface ScreenshotResult {
  path: string;                     // Ruta del archivo
  filename: string;                 // Nombre del archivo
  size: number;                     // Tamaño en bytes
  dimensions?: {                    // Dimensiones de la imagen
    width: number;
    height: number;
  };
  timestamp: Date;                  // Cuándo se tomó
  metadata?: Record<string, any>;  // Metadata adicional
}

/**
 * 📸 Clase ScreenshotHelper - Gestión de screenshots
 */
export class ScreenshotHelper {
  private page: Page;
  private logger = LoggerFactory.forComponent(ComponentType.UTILITIES);
  private config = ConfigManager.getInstance();
  private screenshotPath: string;
  private screenshotCount = 0;
  private screenshots: ScreenshotResult[] = [];
  
  constructor(page: Page, screenshotPath?: string) {
    this.page = page;
    this.screenshotPath = screenshotPath || 
                         this.config.get('screenshots.path') || 
                         './screenshots';
    
    // Crear directorio si no existe
    this.ensureDirectory(this.screenshotPath);
  }
  
  /**
   * 📸 Capturar screenshot básico
   */
  public async capture(
    name?: string,
    options?: ScreenshotOptions
  ): Promise<string> {
    const filename = this.generateFilename(name);
    const filePath = path.join(this.screenshotPath, filename);
    
    this.logger.debug(`Capturando screenshot: ${filename}`);
    
    try {
      await this.page.screenshot({
        path: filePath,
        fullPage: options?.fullPage || this.config.get('screenshots.fullPage'),
        quality: options?.quality || this.config.get('screenshots.quality'),
        type: options?.type || this.config.get('screenshots.type') || 'png',
        omitBackground: options?.omitBackground,
        clip: options?.clip,
        timeout: options?.timeout || 30000
      });
      
      // Registrar screenshot
      const stats = fs.statSync(filePath);
      const result: ScreenshotResult = {
        path: filePath,
        filename,
        size: stats.size,
        timestamp: new Date()
      };
      
      this.screenshots.push(result);
      this.screenshotCount++;
      
      this.logger.screenshot(filePath);
      return filePath;
      
    } catch (error) {
      this.logger.error('Error capturando screenshot', error as Error);
      throw new FrameworkError(
        'No se pudo capturar screenshot',
        ErrorCode.BROWSER_ERROR,
        { name, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📸 Capturar screenshot avanzado
   */
  public async captureAdvanced(
    options: AdvancedScreenshotOptions
  ): Promise<ScreenshotResult> {
    this.logger.debug('Capturando screenshot avanzado');
    
    // Resaltar elemento si se especifica
    if (options.highlight) {
      await this.highlightElement(options.highlight);
    }
    
    // Agregar anotaciones si se especifican
    if (options.annotate) {
      await this.addAnnotation(options.annotate);
    }
    
    // Generar nombre con opciones
    const filename = this.generateFilename(
      options.name,
      options.timestamp !== false,
      options.folder
    );
    
    const filePath = path.join(
      options.folder || this.screenshotPath,
      filename
    );
    
    // Asegurar que existe el directorio
    this.ensureDirectory(path.dirname(filePath));
    
    try {
      // Tomar screenshot
      const buffer = await this.page.screenshot({
        fullPage: options.fullPage,
        quality: options.quality,
        type: options.type || 'png',
        omitBackground: options.omitBackground,
        clip: options.clip,
        timeout: options.timeout || 30000
      });
      
      // Guardar archivo
      fs.writeFileSync(filePath, buffer);
      
      // Si hay comparación visual
      if (options.comparison?.baseline) {
        const comparisonResult = await this.compareImages(
          filePath,
          options.comparison.baseline,
          options.comparison.threshold
        );
        
        if (!comparisonResult.match) {
          this.logger.warn('Screenshot difiere de la imagen base', {
            difference: comparisonResult.difference
          });
        }
      }
      
      // Obtener dimensiones
      const dimensions = await this.getImageDimensions(buffer);
      
      // Crear resultado
      const result: ScreenshotResult = {
        path: filePath,
        filename,
        size: buffer.length,
        dimensions,
        timestamp: new Date(),
        metadata: options.metadata
      };
      
      this.screenshots.push(result);
      this.screenshotCount++;
      
      // Quitar resaltado si se agregó
      if (options.highlight) {
        await this.removeHighlight(options.highlight);
      }
      
      // Quitar anotación si se agregó
      if (options.annotate) {
        await this.removeAnnotation();
      }
      
      this.logger.info('Screenshot avanzado capturado', result);
      return result;
      
    } catch (error) {
      throw new FrameworkError(
        'Error en screenshot avanzado',
        ErrorCode.BROWSER_ERROR,
        { options, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📸 Capturar screenshot de elemento específico
   */
  public async captureElement(
    locator: Locator | string,
    name?: string,
    options?: ScreenshotOptions
  ): Promise<string> {
    this.logger.debug('Capturando screenshot de elemento');
    
    try {
      const element = typeof locator === 'string' 
        ? this.page.locator(locator)
        : locator;
      
      const filename = this.generateFilename(name || 'element');
      const filePath = path.join(this.screenshotPath, filename);
      
      await element.screenshot({
        path: filePath,
        quality: options?.quality,
        type: options?.type || 'png',
        omitBackground: options?.omitBackground,
        timeout: options?.timeout || 30000
      });
      
      this.screenshots.push({
        path: filePath,
        filename,
        size: fs.statSync(filePath).size,
        timestamp: new Date()
      });
      
      this.logger.screenshot(filePath, 'Elemento capturado');
      return filePath;
      
    } catch (error) {
      throw new FrameworkError(
        'Error capturando screenshot de elemento',
        ErrorCode.ELEMENT_NOT_FOUND,
        { locator: locator.toString(), error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📸 Capturar screenshot en error
   */
  public async captureError(
    errorName: string,
    error?: Error
  ): Promise<string> {
    this.logger.debug('Capturando screenshot de error');
    
    const filename = this.generateFilename(`error-${errorName}`, true, 'errors');
    const errorPath = path.join(this.screenshotPath, 'errors');
    this.ensureDirectory(errorPath);
    
    const filePath = path.join(errorPath, filename);
    
    try {
      // Agregar información del error en la página si es posible
      if (error) {
        await this.addErrorInfo(error);
      }
      
      await this.page.screenshot({
        path: filePath,
        fullPage: true,
        type: 'png'
      });
      
      // Quitar información del error
      if (error) {
        await this.removeErrorInfo();
      }
      
      this.logger.error(`Screenshot de error guardado: ${filePath}`);
      return filePath;
      
    } catch (screenshotError) {
      this.logger.error('No se pudo capturar screenshot de error', screenshotError as Error);
      return '';
    }
  }
  
  /**
   * 📸 Capturar serie de screenshots (para GIF/video)
   */
  public async captureSeries(
    name: string,
    count: number,
    interval: number,
    options?: ScreenshotOptions
  ): Promise<string[]> {
    this.logger.debug(`Capturando serie de ${count} screenshots`);
    
    const paths: string[] = [];
    const seriesFolder = path.join(this.screenshotPath, 'series', name);
    this.ensureDirectory(seriesFolder);
    
    for (let i = 0; i < count; i++) {
      const filename = `${name}-${String(i).padStart(3, '0')}.png`;
      const filePath = path.join(seriesFolder, filename);
      
      await this.page.screenshot({
        path: filePath,
        ...options
      });
      
      paths.push(filePath);
      
      if (i < count - 1) {
        await this.page.waitForTimeout(interval);
      }
    }
    
    this.logger.info(`Serie de screenshots capturada: ${count} imágenes`);
    return paths;
  }
  
  /**
   * 📸 Capturar antes y después
   */
  public async captureBeforeAfter(
    action: () => Promise<void>,
    name: string
  ): Promise<{ before: string; after: string }> {
    this.logger.debug('Capturando antes/después');
    
    // Capturar antes
    const beforePath = await this.capture(`${name}-before`);
    
    // Ejecutar acción
    await action();
    
    // Pequeña espera para que se complete cualquier animación
    await this.page.waitForTimeout(500);
    
    // Capturar después
    const afterPath = await this.capture(`${name}-after`);
    
    return { before: beforePath, after: afterPath };
  }
  
  /**
   * 🖼️ Comparar imágenes (básico)
   */
  private async compareImages(
    imagePath1: string,
    imagePath2: string,
    threshold = 0.1
  ): Promise<{ match: boolean; difference?: number }> {
    // Implementación básica - en producción usar librería como pixelmatch
    try {
      const img1 = fs.readFileSync(imagePath1);
      const img2 = fs.readFileSync(imagePath2);
      
      // Comparación simple por tamaño
      if (img1.length === img2.length) {
        return { match: true, difference: 0 };
      }
      
      const difference = Math.abs(img1.length - img2.length) / Math.max(img1.length, img2.length);
      
      return {
        match: difference <= threshold,
        difference
      };
      
    } catch (error) {
      this.logger.warn('Error comparando imágenes', { error });
      return { match: false };
    }
  }
  
  /**
   * 📏 Obtener dimensiones de imagen
   */
  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | undefined> {
    // PNG signature check y dimensiones
    if (buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    
    // JPEG check (simplificado)
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      // Implementación simplificada, en producción usar librería
      return undefined;
    }
    
    return undefined;
  }
  
  /**
   * 🎨 Resaltar elemento
   */
  private async highlightElement(locator: Locator | string): Promise<void> {
    const element = typeof locator === 'string' 
      ? this.page.locator(locator)
      : locator;
    
    await element.evaluate(el => {
      (el as HTMLElement).style.outline = '3px solid red';
      (el as HTMLElement).style.outlineOffset = '2px';
      (el as HTMLElement).setAttribute('data-screenshot-highlight', 'true');
    });
  }
  
  /**
   * 🎨 Quitar resaltado
   */
  private async removeHighlight(locator: Locator | string): Promise<void> {
    const element = typeof locator === 'string' 
      ? this.page.locator(locator)
      : locator;
    
    await element.evaluate(el => {
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
      (el as HTMLElement).removeAttribute('data-screenshot-highlight');
    });
  }
  
  /**
   * 📝 Agregar anotación
   */
  private async addAnnotation(options: { text: string; position: string; color?: string; fontSize?: number }): Promise<void> {
    await this.page.evaluate(opts => {
      const div = document.createElement('div');
      div.id = 'screenshot-annotation';
      div.textContent = opts.text;
      div.style.cssText = `
        position: fixed;
        ${opts.position === 'top' ? 'top: 10px' : 'bottom: 10px'};
        left: 50%;
        transform: translateX(-50%);
        background: ${opts.color || 'red'};
        color: white;
        padding: 10px 20px;
        font-size: ${opts.fontSize || 16}px;
        font-weight: bold;
        border-radius: 5px;
        z-index: 999999;
        font-family: Arial, sans-serif;
      `;
      document.body.appendChild(div);
    }, options);
  }
  
  /**
   * 📝 Quitar anotación
   */
  private async removeAnnotation(): Promise<void> {
    await this.page.evaluate(() => {
      const annotation = document.getElementById('screenshot-annotation');
      if (annotation) {
        annotation.remove();
      }
    });
  }
  
  /**
   * ❌ Agregar información de error
   */
  private async addErrorInfo(error: Error): Promise<void> {
    await this.page.evaluate(err => {
      const div = document.createElement('div');
      div.id = 'screenshot-error-info';
      div.innerHTML = `
        <div style="
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(255, 0, 0, 0.9);
          color: white;
          padding: 15px;
          max-width: 400px;
          border-radius: 5px;
          font-family: monospace;
          font-size: 12px;
          z-index: 999999;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        ">
          <strong>ERROR:</strong><br>
          ${err.message}<br>
          <small>${new Date().toISOString()}</small>
        </div>
      `;
      document.body.appendChild(div);
    }, { message: error.message });
  }
  
  /**
   * ❌ Quitar información de error
   */
  private async removeErrorInfo(): Promise<void> {
    await this.page.evaluate(() => {
      const errorInfo = document.getElementById('screenshot-error-info');
      if (errorInfo) {
        errorInfo.remove();
      }
    });
  }
  
  /**
   * 📁 Asegurar que existe directorio
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  /**
   * 🏷️ Generar nombre de archivo
   */
  private generateFilename(
    name?: string,
    includeTimestamp = true,
    folder?: string
  ): string {
    const timestamp = includeTimestamp 
      ? `_${new Date().toISOString().replace(/[:.]/g, '-')}`
      : '';
    
    const counter = String(this.screenshotCount).padStart(3, '0');
    const baseName = name || `screenshot`;
    
    return `${baseName}_${counter}${timestamp}.png`;
  }
  
  /**
   * 📊 Obtener estadísticas de screenshots
   */
  public getStats(): {
    total: number;
    totalSize: number;
    screenshots: ScreenshotResult[];
  } {
    const totalSize = this.screenshots.reduce((sum, s) => sum + s.size, 0);
    
    return {
      total: this.screenshots.length,
      totalSize,
      screenshots: [...this.screenshots]
    };
  }
  
  /**
   * 🧹 Limpiar screenshots antiguos
   */
  public cleanOldScreenshots(daysOld = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    
    const files = fs.readdirSync(this.screenshotPath);
    for (const file of files) {
      const filePath = path.join(this.screenshotPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile() && stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    this.logger.info(`Screenshots antiguos eliminados: ${deletedCount}`);
    return deletedCount;
  }
}