// src/utilities/DataManager.ts

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { CSVData } from '../types/FrameworkTypes';
import { LoggerFactory } from '../core/logging/LoggerFactory';
import { ConfigManager } from '../core/config/ConfigManager';

/**
 * Gestor de datos de prueba
 * Maneja la carga y procesamiento de datos CSV y JSON
 */
export class DataManager {
  private static logger = LoggerFactory.getLogger('DataManager');
  private static dataPath: string;
  private static cache: Map<string, any> = new Map();

  /**
   * Inicializa el DataManager con la ruta de datos
   */
  static initialize(): void {
    try {
      const config = ConfigManager.getInstance().getConfig();
      this.dataPath = config.paths.data;
    } catch {
      this.dataPath = path.join(process.cwd(), 'data');
    }
    
    this.ensureDirectoryExists(this.dataPath);
    this.logger.debug('DataManager initialized', { path: this.dataPath });
  }

  /**
   * Carga datos desde un archivo CSV
   */
  static async loadCSV<T = Record<string, string>>(
    fileName: string,
    options?: {
      delimiter?: string;
      skipHeaders?: boolean;
      columns?: string[] | boolean;
      fromLine?: number;
      toLine?: number;
    }
  ): Promise<T[]> {
    this.initialize();
    
    const filePath = path.isAbsolute(fileName) 
      ? fileName 
      : path.join(this.dataPath, fileName);
    
    // Verificar cache
    const cacheKey = `csv_${filePath}_${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      this.logger.debug('Returning cached CSV data', { fileName });
      return this.cache.get(cacheKey);
    }
    
    try {
      this.logger.debug('Loading CSV file', { filePath });
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`CSV file not found: ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      const records = parse(fileContent, {
        delimiter: options?.delimiter || ',',
        columns: options?.columns ?? true,
        skip_empty_lines: true,
        from_line: options?.fromLine,
        to_line: options?.toLine,
        trim: true,
        cast: true,
        cast_date: true
      }) as T[];
      
      this.cache.set(cacheKey, records);
      
      this.logger.info('CSV loaded successfully', {
        fileName,
        records: records.length
      });
      
      return records;
    } catch (error) {
      this.logger.error('Failed to load CSV', error as Error, { fileName });
      throw error;
    }
  }

  /**
   * Carga datos desde un archivo JSON
   */
  static async loadJSON<T = any>(fileName: string): Promise<T> {
    this.initialize();
    
    const filePath = path.isAbsolute(fileName) 
      ? fileName 
      : path.join(this.dataPath, fileName);
    
    // Verificar cache
    const cacheKey = `json_${filePath}`;
    if (this.cache.has(cacheKey)) {
      this.logger.debug('Returning cached JSON data', { fileName });
      return this.cache.get(cacheKey);
    }
    
    try {
      this.logger.debug('Loading JSON file', { filePath });
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`JSON file not found: ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as T;
      
      this.cache.set(cacheKey, data);
      
      this.logger.info('JSON loaded successfully', { fileName });
      
      return data;
    } catch (error) {
      this.logger.error('Failed to load JSON', error as Error, { fileName });
      throw error;
    }
  }

  /**
   * Guarda datos en un archivo CSV
   */
  static async saveCSV<T = Record<string, any>>(
    fileName: string,
    data: T[],
    options?: {
      delimiter?: string;
      headers?: boolean;
    }
  ): Promise<void> {
    this.initialize();
    
    const filePath = path.isAbsolute(fileName) 
      ? fileName 
      : path.join(this.dataPath, fileName);
    
    try {
      this.logger.debug('Saving data to CSV', { 
        filePath, 
        records: data.length 
      });
      
      if (data.length === 0) {
        fs.writeFileSync(filePath, '');
        return;
      }
      
      const headers = Object.keys(data[0] as any);
      const delimiter = options?.delimiter || ',';
      
      let csvContent = '';
      
      // Agregar headers si se solicita
      if (options?.headers !== false) {
        csvContent = headers.join(delimiter) + '\n';
      }
      
      // Agregar filas
      for (const row of data) {
        const values = headers.map(header => {
          const value = (row as any)[header];
          // Escapar valores que contienen el delimitador o comillas
          if (typeof value === 'string' && 
              (value.includes(delimiter) || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        csvContent += values.join(delimiter) + '\n';
      }
      
      fs.writeFileSync(filePath, csvContent);
      
      // Invalidar cache
      this.clearCache(`csv_${filePath}`);
      
      this.logger.info('CSV saved successfully', { 
        fileName, 
        records: data.length 
      });
    } catch (error) {
      this.logger.error('Failed to save CSV', error as Error, { fileName });
      throw error;
    }
  }

  /**
   * Guarda datos en un archivo JSON
   */
  static async saveJSON<T = any>(
    fileName: string,
    data: T,
    options?: {
      pretty?: boolean;
    }
  ): Promise<void> {
    this.initialize();
    
    const filePath = path.isAbsolute(fileName) 
      ? fileName 
      : path.join(this.dataPath, fileName);
    
    try {
      this.logger.debug('Saving data to JSON', { filePath });
      
      const jsonContent = options?.pretty 
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);
      
      fs.writeFileSync(filePath, jsonContent);
      
      // Invalidar cache
      this.clearCache(`json_${filePath}`);
      
      this.logger.info('JSON saved successfully', { fileName });
    } catch (error) {
      this.logger.error('Failed to save JSON', error as Error, { fileName });
      throw error;
    }
  }

  /**
   * Obtiene un valor aleatorio de una columna CSV
   */
  static async getRandomValue<T = string>(
    fileName: string,
    columnName: string
  ): Promise<T | undefined> {
    const data = await this.loadCSV(fileName);
    
    if (data.length === 0) {
      return undefined;
    }
    
    const randomIndex = Math.floor(Math.random() * data.length);
    return (data[randomIndex] as any)[columnName] as T;
  }

  /**
   * Filtra datos CSV por criterio
   */
  static async filterCSV<T = Record<string, string>>(
    fileName: string,
    filterFn: (row: T) => boolean
  ): Promise<T[]> {
    const data = await this.loadCSV<T>(fileName);
    return data.filter(filterFn);
  }

  /**
   * Obtiene información sobre un archivo CSV
   */
  static async getCSVInfo(fileName: string): Promise<CSVData> {
    const data = await this.loadCSV(fileName);
    
    if (data.length === 0) {
      return {
        headers: [],
        rows: [],
        rowCount: 0
      };
    }
    
    return {
      headers: Object.keys(data[0]),
      rows: data,
      rowCount: data.length
    };
  }

  /**
   * Combina múltiples archivos CSV
   */
  static async mergeCSVFiles(
    fileNames: string[],
    outputFileName: string
  ): Promise<void> {
    const allData: any[] = [];
    
    for (const fileName of fileNames) {
      const data = await this.loadCSV(fileName);
      allData.push(...data);
    }
    
    await this.saveCSV(outputFileName, allData);
    
    this.logger.info('CSV files merged', {
      input: fileNames,
      output: outputFileName,
      totalRecords: allData.length
    });
  }

  /**
   * Limpia el cache de datos
   */
  static clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
      this.logger.debug('Cache cleared for pattern', { pattern });
    } else {
      this.cache.clear();
      this.logger.debug('All cache cleared');
    }
  }

  /**
   * Verifica si un archivo existe
   */
  static fileExists(fileName: string): boolean {
    this.initialize();
    
    const filePath = path.isAbsolute(fileName) 
      ? fileName 
      : path.join(this.dataPath, fileName);
    
    return fs.existsSync(filePath);
  }

  /**
   * Lista archivos en el directorio de datos
   */
  static listDataFiles(extension?: string): string[] {
    this.initialize();
    
    try {
      const files = fs.readdirSync(this.dataPath);
      
      if (extension) {
        return files.filter(file => file.endsWith(extension));
      }
      
      return files;
    } catch (error) {
      this.logger.error('Failed to list data files', error as Error);
      return [];
    }
  }

  /**
   * Asegura que el directorio existe
   */
  private static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.debug('Created data directory', { path: dirPath });
    }
  }

  /**
   * Obtiene el path del directorio de datos
   */
  static getDataPath(): string {
    this.initialize();
    return this.dataPath;
  }
}