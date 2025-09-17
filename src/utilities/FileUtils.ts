/**
 * 📁 FileUtils.ts
 * 
 * Utilidades para gestión de archivos y directorios.
 * Maneja archivos temporales, descargas, uploads y limpieza.
 * 
 * ¿Por qué necesitamos utilidades de archivos?
 * - Gestionar archivos de prueba (uploads)
 * - Verificar descargas
 * - Limpiar archivos temporales
 * - Leer/escribir configuraciones
 * - Gestionar evidencias de pruebas
 * 
 * Funciones clave:
 * - Crear/eliminar archivos y directorios
 * - Monitorear descargas
 * - Generar archivos temporales
 * - Comprimir/descomprimir archivos
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { Page } from '@playwright/test';
import { FrameworkError, ErrorCode, FileOptions } from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../logging/LoggerFactory';
import { ConfigManager } from '../core/config/ConfigManager';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const rmdir = promisify(fs.rmdir);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

/**
 * 📋 Información de archivo
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  isDirectory: boolean;
  createdAt: Date;
  modifiedAt: Date;
  checksum?: string;
}

/**
 * 📋 Opciones para monitorear descargas
 */
export interface DownloadMonitorOptions {
  timeout?: number;                // Timeout máximo para la descarga
  expectedName?: string | RegExp;  // Nombre esperado del archivo
  expectedSize?: number;           // Tamaño esperado
  saveAs?: string;                // Guardar con otro nombre
  validateContent?: (content: Buffer) => boolean; // Validar contenido
}

/**
 * 📋 Resultado de descarga
 */
export interface DownloadResult {
  success: boolean;
  fileName: string;
  filePath: string;
  size: number;
  duration: number;
  error?: string;
}

/**
 * 📁 Clase FileUtils - Utilidades de archivos
 */
export class FileUtils {
  private logger = LoggerFactory.forComponent(ComponentType.UTILITIES);
  private config = ConfigManager.getInstance();
  private tempFiles: string[] = [];
  private downloadPath: string;
  private tempPath: string;
  
  constructor() {
    this.downloadPath = this.config.get('paths.downloads') || './downloads';
    this.tempPath = this.config.get('paths.temp') || './temp';
    
    // Asegurar que existen los directorios
    this.ensureDirectory(this.downloadPath);
    this.ensureDirectory(this.tempPath);
  }
  
  /**
   * 📁 Crear directorio si no existe
   */
  public async ensureDirectory(dirPath: string): Promise<void> {
    try {
      if (!fs.existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
        this.logger.debug(`Directorio creado: ${dirPath}`);
      }
    } catch (error) {
      throw new FrameworkError(
        `No se pudo crear directorio: ${dirPath}`,
        ErrorCode.FILE_ERROR,
        { error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📁 Verificar si archivo/directorio existe
   */
  public async exists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 📄 Leer archivo
   */
  public async readFile(
    filePath: string,
    options?: FileOptions
  ): Promise<string | Buffer> {
    this.logger.debug(`Leyendo archivo: ${filePath}`);
    
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(filePath);
      
      if (!await this.exists(absolutePath)) {
        throw new Error(`Archivo no encontrado: ${absolutePath}`);
      }
      
      const content = await readFile(absolutePath, options?.encoding);
      
      this.logger.trace(`Archivo leído: ${path.basename(filePath)} (${content.length} bytes)`);
      return content;
      
    } catch (error) {
      throw new FrameworkError(
        `Error leyendo archivo: ${filePath}`,
        ErrorCode.FILE_ERROR,
        { error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📝 Escribir archivo
   */
  public async writeFile(
    filePath: string,
    content: string | Buffer,
    options?: FileOptions
  ): Promise<void> {
    this.logger.debug(`Escribiendo archivo: ${filePath}`);
    
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(filePath);
      
      // Asegurar que existe el directorio
      const dir = path.dirname(absolutePath);
      await this.ensureDirectory(dir);
      
      await writeFile(absolutePath, content, {
        encoding: options?.encoding,
        flag: options?.flag || 'w',
        mode: options?.mode
      });
      
      this.logger.trace(`Archivo escrito: ${path.basename(filePath)}`);
      
    } catch (error) {
      throw new FrameworkError(
        `Error escribiendo archivo: ${filePath}`,
        ErrorCode.FILE_ERROR,
        { error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📝 Agregar contenido a archivo
   */
  public async appendFile(
    filePath: string,
    content: string | Buffer,
    options?: FileOptions
  ): Promise<void> {
    await this.writeFile(filePath, content, {
      ...options,
      flag: 'a'
    });
  }
  
  /**
   * 🗑️ Eliminar archivo
   */
  public async deleteFile(filePath: string): Promise<void> {
    this.logger.debug(`Eliminando archivo: ${filePath}`);
    
    try {
      if (await this.exists(filePath)) {
        await unlink(filePath);
        this.logger.trace(`Archivo eliminado: ${path.basename(filePath)}`);
      }
    } catch (error) {
      throw new FrameworkError(
        `Error eliminando archivo: ${filePath}`,
        ErrorCode.FILE_ERROR,
        { error: (error as Error).message }
      );
    }
  }
  
  /**
   * 🗑️ Eliminar directorio
   */
  public async deleteDirectory(dirPath: string, recursive = true): Promise<void> {
    this.logger.debug(`Eliminando directorio: ${dirPath}`);
    
    try {
      if (await this.exists(dirPath)) {
        if (recursive) {
          // Eliminar contenido recursivamente
          await this.deleteFolderRecursive(dirPath);
        } else {
          await rmdir(dirPath);
        }
        this.logger.trace(`Directorio eliminado: ${dirPath}`);
      }
    } catch (error) {
      throw new FrameworkError(
        `Error eliminando directorio: ${dirPath}`,
        ErrorCode.FILE_ERROR,
        { error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📋 Copiar archivo
   */
  public async copyFile(source: string, destination: string): Promise<void> {
    this.logger.debug(`Copiando archivo: ${source} -> ${destination}`);
    
    try {
      // Asegurar directorio destino
      const destDir = path.dirname(destination);
      await this.ensureDirectory(destDir);
      
      await fs.promises.copyFile(source, destination);
      this.logger.trace('Archivo copiado exitosamente');
      
    } catch (error) {
      throw new FrameworkError(
        `Error copiando archivo`,
        ErrorCode.FILE_ERROR,
        { source, destination, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📋 Mover archivo
   */
  public async moveFile(source: string, destination: string): Promise<void> {
    this.logger.debug(`Moviendo archivo: ${source} -> ${destination}`);
    
    try {
      await this.copyFile(source, destination);
      await this.deleteFile(source);
      this.logger.trace('Archivo movido exitosamente');
      
    } catch (error) {
      throw new FrameworkError(
        `Error moviendo archivo`,
        ErrorCode.FILE_ERROR,
        { source, destination, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📊 Obtener información de archivo
   */
  public async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const stats = await stat(filePath);
      const name = path.basename(filePath);
      const extension = path.extname(filePath);
      
      return {
        name,
        path: filePath,
        size: stats.size,
        extension,
        isDirectory: stats.isDirectory(),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
      
    } catch (error) {
      throw new FrameworkError(
        `Error obteniendo información del archivo`,
        ErrorCode.FILE_ERROR,
        { filePath, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📁 Listar archivos en directorio
   */
  public async listFiles(
    dirPath: string,
    options?: {
      recursive?: boolean;
      filter?: RegExp | ((file: string) => boolean);
      includeDirectories?: boolean;
    }
  ): Promise<FileInfo[]> {
    this.logger.debug(`Listando archivos en: ${dirPath}`);
    
    try {
      const files: FileInfo[] = [];
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (options?.includeDirectories) {
            files.push(await this.getFileInfo(fullPath));
          }
          
          if (options?.recursive) {
            const subFiles = await this.listFiles(fullPath, options);
            files.push(...subFiles);
          }
        } else {
          // Aplicar filtro si existe
          if (options?.filter) {
            const matchesFilter = typeof options.filter === 'function'
              ? options.filter(entry.name)
              : options.filter.test(entry.name);
              
            if (!matchesFilter) continue;
          }
          
          files.push(await this.getFileInfo(fullPath));
        }
      }
      
      return files;
      
    } catch (error) {
      throw new FrameworkError(
        `Error listando archivos`,
        ErrorCode.FILE_ERROR,
        { dirPath, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 🔄 Crear archivo temporal
   */
  public async createTempFile(
    prefix = 'temp',
    extension = '.tmp',
    content?: string | Buffer
  ): Promise<string> {
    const fileName = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${extension}`;
    const filePath = path.join(this.tempPath, fileName);
    
    if (content) {
      await this.writeFile(filePath, content);
    } else {
      await this.writeFile(filePath, '');
    }
    
    this.tempFiles.push(filePath);
    this.logger.debug(`Archivo temporal creado: ${fileName}`);
    
    return filePath;
  }
  
  /**
   * 🧹 Limpiar archivos temporales
   */
  public async cleanTempFiles(): Promise<void> {
    this.logger.debug('Limpiando archivos temporales');
    
    for (const file of this.tempFiles) {
      try {
        await this.deleteFile(file);
      } catch {
        // Ignorar si ya fue eliminado
      }
    }
    
    this.tempFiles = [];
    this.logger.trace('Archivos temporales limpiados');
  }
  
  /**
   * 📥 Monitorear descarga
   */
  public async monitorDownload(
    page: Page,
    triggerDownload: () => Promise<void>,
    options?: DownloadMonitorOptions
  ): Promise<DownloadResult> {
    this.logger.start('Monitoreando descarga');
    const startTime = Date.now();
    
    try {
      // Esperar por el evento de descarga
      const downloadPromise = page.waitForEvent('download', {
        timeout: options?.timeout || 30000
      });
      
      // Disparar la descarga
      await triggerDownload();
      
      // Obtener el objeto download
      const download = await downloadPromise;
      
      // Obtener nombre del archivo
      const suggestedFilename = download.suggestedFilename();
      
      // Validar nombre si se especificó
      if (options?.expectedName) {
        const nameMatches = typeof options.expectedName === 'string'
          ? suggestedFilename === options.expectedName
          : options.expectedName.test(suggestedFilename);
          
        if (!nameMatches) {
          throw new Error(`Nombre de archivo no coincide. Esperado: ${options.expectedName}, Recibido: ${suggestedFilename}`);
        }
      }
      
      // Determinar path de guardado
      const fileName = options?.saveAs || suggestedFilename;
      const savePath = path.join(this.downloadPath, fileName);
      
      // Guardar archivo
      await download.saveAs(savePath);
      
      // Obtener información del archivo
      const fileInfo = await this.getFileInfo(savePath);
      
      // Validar tamaño si se especificó
      if (options?.expectedSize && fileInfo.size !== options.expectedSize) {
        this.logger.warn(`Tamaño de archivo no coincide. Esperado: ${options.expectedSize}, Recibido: ${fileInfo.size}`);
      }
      
      // Validar contenido si se especificó
      if (options?.validateContent) {
        const content = await this.readFile(savePath) as Buffer;
        if (!options.validateContent(content)) {
          throw new Error('Validación de contenido falló');
        }
      }
      
      const result: DownloadResult = {
        success: true,
        fileName,
        filePath: savePath,
        size: fileInfo.size,
        duration: Date.now() - startTime
      };
      
      this.logger.success('Descarga completada', result);
      return result;
      
    } catch (error) {
      const result: DownloadResult = {
        success: false,
        fileName: '',
        filePath: '',
        size: 0,
        duration: Date.now() - startTime,
        error: (error as Error).message
      };
      
      this.logger.fail('Descarga falló', error as Error);
      throw new FrameworkError(
        'Error en descarga',
        ErrorCode.FILE_ERROR,
        result
      );
    }
  }
  
  /**
   * 📤 Preparar archivo para upload
   */
  public async prepareUploadFile(
    content: string | Buffer,
    fileName: string
  ): Promise<string> {
    const uploadPath = path.join(this.tempPath, 'uploads');
    await this.ensureDirectory(uploadPath);
    
    const filePath = path.join(uploadPath, fileName);
    await this.writeFile(filePath, content);
    
    this.tempFiles.push(filePath);
    this.logger.debug(`Archivo preparado para upload: ${fileName}`);
    
    return filePath;
  }
  
  /**
   * 🔐 Calcular checksum de archivo
   */
  public async calculateChecksum(
    filePath: string,
    algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'
  ): Promise<string> {
    try {
      const content = await readFile(filePath);
      const hash = crypto.createHash(algorithm);
      hash.update(content);
      return hash.digest('hex');
      
    } catch (error) {
      throw new FrameworkError(
        'Error calculando checksum',
        ErrorCode.FILE_ERROR,
        { filePath, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📊 Comparar archivos
   */
  public async compareFiles(
    file1: string,
    file2: string,
    options?: {
      checkContent?: boolean;
      checkSize?: boolean;
      checkChecksum?: boolean;
    }
  ): Promise<boolean> {
    try {
      const info1 = await this.getFileInfo(file1);
      const info2 = await this.getFileInfo(file2);
      
      // Comparar tamaño
      if (options?.checkSize !== false && info1.size !== info2.size) {
        return false;
      }
      
      // Comparar checksum
      if (options?.checkChecksum) {
        const checksum1 = await this.calculateChecksum(file1);
        const checksum2 = await this.calculateChecksum(file2);
        return checksum1 === checksum2;
      }
      
      // Comparar contenido
      if (options?.checkContent !== false) {
        const content1 = await this.readFile(file1);
        const content2 = await this.readFile(file2);
        return content1.toString() === content2.toString();
      }
      
      return true;
      
    } catch (error) {
      this.logger.error('Error comparando archivos', error as Error);
      return false;
    }
  }
  
  /**
   * 🗜️ Comprimir archivos (crear ZIP simple)
   */
  public async createArchive(
    files: string[],
    outputPath: string
  ): Promise<void> {
    // Implementación simplificada - en producción usar librería como archiver
    this.logger.debug(`Creando archivo: ${outputPath}`);
    
    try {
      // Por ahora solo concatenar archivos (simplificado)
      let content = '';
      for (const file of files) {
        const fileContent = await this.readFile(file);
        content += `\n--- ${path.basename(file)} ---\n`;
        content += fileContent.toString();
      }
      
      await this.writeFile(outputPath, content);
      this.logger.trace('Archivo creado');
      
    } catch (error) {
      throw new FrameworkError(
        'Error creando archivo',
        ErrorCode.FILE_ERROR,
        { error: (error as Error).message }
      );
    }
  }
  
  /**
   * 🧹 Limpiar directorio de descargas
   */
  public async cleanDownloads(): Promise<number> {
    this.logger.debug('Limpiando directorio de descargas');
    
    const files = await this.listFiles(this.downloadPath);
    let deletedCount = 0;
    
    for (const file of files) {
      try {
        await this.deleteFile(file.path);
        deletedCount++;
      } catch {
        // Ignorar errores
      }
    }
    
    this.logger.info(`Archivos eliminados: ${deletedCount}`);
    return deletedCount;
  }
  
  // 🔧 Métodos privados
  
  /**
   * Eliminar carpeta recursivamente
   */
  private async deleteFolderRecursive(dirPath: string): Promise<void> {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const curPath = path.join(dirPath, file);
        
        if (fs.lstatSync(curPath).isDirectory()) {
          await this.deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      }
      
      fs.rmdirSync(dirPath);
    }
  }
}