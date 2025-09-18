// src/utilities/FileUtils.ts

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { LoggerFactory } from '../core/logging/LoggerFactory';
import { ConfigManager } from '../core/config/ConfigManager';

/**
 * Utilidades para gestión de archivos y directorios
 * Maneja archivos temporales, downloads y operaciones de archivo
 */
export class FileUtils {
  private static logger = LoggerFactory.getLogger('FileUtils');
  private static tempPath: string;
  private static downloadsPath: string;

  /**
   * Inicializa las rutas de trabajo
   */
  static initialize(): void {
    try {
      const config = ConfigManager.getInstance().getConfig();
      this.tempPath = config.paths.temp;
      this.downloadsPath = config.paths.downloads;
    } catch {
      this.tempPath = path.join(process.cwd(), '.tmp');
      this.downloadsPath = path.join(process.cwd(), 'downloads');
    }
    
    this.ensureDirectoryExists(this.tempPath);
    this.ensureDirectoryExists(this.downloadsPath);
    
    this.logger.debug('FileUtils initialized', {
      tempPath: this.tempPath,
      downloadsPath: this.downloadsPath
    });
  }

  /**
   * Crea un archivo temporal con contenido
   */
  static createTempFile(
    content: string,
    extension: string = 'txt',
    prefix: string = 'temp'
  ): string {
    this.initialize();
    
    const fileName = `${prefix}_${Date.now()}_${this.generateRandomString(6)}.${extension}`;
    const filePath = path.join(this.tempPath, fileName);
    
    try {
      fs.writeFileSync(filePath, content);
      
      this.logger.debug('Temp file created', { 
        path: filePath,
        size: content.length 
      });
      
      return filePath;
    } catch (error) {
      this.logger.error('Failed to create temp file', error as Error);
      throw error;
    }
  }

  /**
   * Lee el contenido de un archivo
   */
  static readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
    try {
      this.logger.debug('Reading file', { filePath });
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      this.logger.error('Failed to read file', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Escribe contenido en un archivo
   */
  static writeFile(
    filePath: string,
    content: string | Buffer,
    options?: {
      encoding?: BufferEncoding;
      createDir?: boolean;
    }
  ): void {
    try {
      if (options?.createDir) {
        const dir = path.dirname(filePath);
        this.ensureDirectoryExists(dir);
      }
      
      fs.writeFileSync(filePath, content, {
        encoding: options?.encoding || 'utf-8'
      });
      
      this.logger.debug('File written', { 
        path: filePath,
        size: Buffer.isBuffer(content) ? content.length : content.length 
      });
    } catch (error) {
      this.logger.error('Failed to write file', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Copia un archivo
   */
  static copyFile(source: string, destination: string): void {
    try {
      this.logger.debug('Copying file', { source, destination });
      
      if (!fs.existsSync(source)) {
        throw new Error(`Source file not found: ${source}`);
      }
      
      // Asegurar que el directorio destino existe
      const destDir = path.dirname(destination);
      this.ensureDirectoryExists(destDir);
      
      fs.copyFileSync(source, destination);
      
      this.logger.info('File copied successfully', { 
        source, 
        destination 
      });
    } catch (error) {
      this.logger.error('Failed to copy file', error as Error, {
        source,
        destination
      });
      throw error;
    }
  }

  /**
   * Mueve un archivo
   */
  static moveFile(source: string, destination: string): void {
    try {
      this.copyFile(source, destination);
      fs.unlinkSync(source);
      
      this.logger.info('File moved successfully', { 
        source, 
        destination 
      });
    } catch (error) {
      this.logger.error('Failed to move file', error as Error, {
        source,
        destination
      });
      throw error;
    }
  }

  /**
   * Elimina un archivo
   */
  static deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug('File deleted', { path: filePath });
      }
    } catch (error) {
      this.logger.error('Failed to delete file', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Verifica si un archivo existe
   */
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Obtiene información de un archivo
   */
  static getFileInfo(filePath: string): {
    size: number;
    created: Date;
    modified: Date;
    isDirectory: boolean;
    extension: string;
  } {
    try {
      const stats = fs.statSync(filePath);
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        extension: path.extname(filePath)
      };
    } catch (error) {
      this.logger.error('Failed to get file info', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Lista archivos en un directorio
   */
  static listFiles(
    dirPath: string,
    options?: {
      recursive?: boolean;
      filter?: (fileName: string) => boolean;
    }
  ): string[] {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }
      
      let files: string[] = [];
      
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory() && options?.recursive) {
          files = files.concat(this.listFiles(fullPath, options));
        } else if (!stats.isDirectory()) {
          if (!options?.filter || options.filter(item)) {
            files.push(fullPath);
          }
        }
      }
      
      return files;
    } catch (error) {
      this.logger.error('Failed to list files', error as Error, { dirPath });
      return [];
    }
  }

  /**
   * Limpia archivos temporales
   */
  static cleanTempFiles(olderThanMs?: number): number {
    this.initialize();
    
    try {
      const files = this.listFiles(this.tempPath);
      const now = Date.now();
      const maxAge = olderThanMs || 24 * 60 * 60 * 1000; // 24 horas por defecto
      let deletedCount = 0;
      
      for (const file of files) {
        const stats = fs.statSync(file);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(file);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        this.logger.info('Cleaned temp files', { 
          deletedCount,
          olderThanMs: maxAge 
        });
      }
      
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to clean temp files', error as Error);
      return 0;
    }
  }

  /**
   * Espera a que un archivo exista
   */
  static async waitForFile(
    filePath: string,
    timeoutMs: number = 30000,
    intervalMs: number = 500
  ): Promise<boolean> {
    const startTime = Date.now();
    
    this.logger.debug('Waiting for file', { 
      path: filePath,
      timeout: timeoutMs 
    });
    
    while (Date.now() - startTime < timeoutMs) {
      if (fs.existsSync(filePath)) {
        this.logger.debug('File found', { 
          path: filePath,
          waitTime: Date.now() - startTime 
        });
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    this.logger.warn('File not found within timeout', { 
      path: filePath,
      timeout: timeoutMs 
    });
    
    return false;
  }

  /**
   * Obtiene el último archivo descargado
   */
  static getLatestDownload(extension?: string): string | null {
    this.initialize();
    
    try {
      const files = this.listFiles(this.downloadsPath, {
        filter: extension ? (name) => name.endsWith(extension) : undefined
      });
      
      if (files.length === 0) {
        return null;
      }
      
      // Ordenar por fecha de modificación
      files.sort((a, b) => {
        const statsA = fs.statSync(a);
        const statsB = fs.statSync(b);
        return statsB.mtime.getTime() - statsA.mtime.getTime();
      });
      
      return files[0];
    } catch (error) {
      this.logger.error('Failed to get latest download', error as Error);
      return null;
    }
  }

  /**
   * Calcula el hash de un archivo
   */
  static getFileHash(filePath: string, algorithm: string = 'md5'): string {
    try {
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash(algorithm);
      hash.update(content);
      
      return hash.digest('hex');
    } catch (error) {
      this.logger.error('Failed to calculate file hash', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Compara dos archivos
   */
  static compareFiles(file1: string, file2: string): boolean {
    try {
      if (!fs.existsSync(file1) || !fs.existsSync(file2)) {
        return false;
      }
      
      const hash1 = this.getFileHash(file1);
      const hash2 = this.getFileHash(file2);
      
      return hash1 === hash2;
    } catch (error) {
      this.logger.error('Failed to compare files', error as Error, {
        file1,
        file2
      });
      return false;
    }
  }

  /**
   * Crea un directorio
   */
  static createDirectory(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.logger.debug('Directory created', { path: dirPath });
      }
    } catch (error) {
      this.logger.error('Failed to create directory', error as Error, { dirPath });
      throw error;
    }
  }

  /**
   * Elimina un directorio
   */
  static deleteDirectory(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        this.logger.debug('Directory deleted', { path: dirPath });
      }
    } catch (error) {
      this.logger.error('Failed to delete directory', error as Error, { dirPath });
      throw error;
    }
  }

  /**
   * Asegura que un directorio existe
   */
  private static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Genera una cadena aleatoria
   */
  private static generateRandomString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Obtiene las rutas de trabajo
   */
  static getPaths(): {
    temp: string;
    downloads: string;
  } {
    this.initialize();
    return {
      temp: this.tempPath,
      downloads: this.downloadsPath
    };
  }
}