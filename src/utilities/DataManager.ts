/**
 * 📊 DataManager.ts
 * 
 * Gestiona la carga, procesamiento y tipado de datos desde archivos CSV.
 * Proporciona datos de prueba para automatización de forma estructurada.
 * 
 * ¿Por qué CSV para datos de prueba?
 * - Formato simple y universal
 * - Fácil de editar por no-técnicos
 * - Compatible con Excel
 * - Versionable en Git
 * 
 * ¿Qué hace este módulo?
 * - Carga archivos CSV con tipado TypeScript
 * - Valida estructura de datos
 * - Proporciona iteradores para data-driven testing
 * - Cachea datos para mejor rendimiento
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { CSVData, FrameworkError, ErrorCode } from '../types/FrameworkTypes';
import { LoggerFactory, ComponentType } from '../logging/LoggerFactory';
import { ConfigManager } from '../core/config/ConfigManager';

/**
 * 📋 Opciones para cargar CSV
 */
export interface CSVLoadOptions {
  delimiter?: string;              // Delimitador (default: ',')
  quote?: string;                  // Caracter de quote (default: '"')
  escape?: string;                 // Caracter de escape
  columns?: boolean | string[];    // true = primera fila como headers
  skip_empty_lines?: boolean;      // Saltar líneas vacías
  trim?: boolean;                  // Limpiar espacios
  cast?: boolean;                  // Convertir tipos automáticamente
  encoding?: BufferEncoding;       // Codificación del archivo
}

/**
 * 📋 Opciones de filtrado de datos
 */
export interface DataFilterOptions {
  where?: Record<string, any>;     // Condiciones de filtrado
  limit?: number;                  // Límite de registros
  offset?: number;                 // Saltar registros
  orderBy?: string;                // Campo para ordenar
  orderDirection?: 'asc' | 'desc'; // Dirección del orden
}

/**
 * 📋 Esquema de validación para datos
 */
export interface DataSchema {
  columns: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
    required?: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    enum?: any[];
    transform?: (value: any) => any;
  }[];
}

/**
 * 📊 Clase DataManager - Gestión de datos CSV
 */
export class DataManager {
  private logger = LoggerFactory.forComponent(ComponentType.UTILITIES);
  private dataPath: string;
  private cache: Map<string, CSVData> = new Map();
  private config = ConfigManager.getInstance();
  
  constructor(dataPath?: string) {
    this.dataPath = dataPath || this.config.get('paths.data') || './data';
    
    // Crear directorio si no existe
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
      this.logger.debug(`Directorio de datos creado: ${this.dataPath}`);
    }
  }
  
  /**
   * 📁 Cargar archivo CSV
   */
  public async loadCSV<T = any>(
    filename: string,
    options?: CSVLoadOptions
  ): Promise<CSVData & { data: T[] }> {
    this.logger.start(`Cargando CSV: ${filename}`);
    
    // Verificar caché
    const cacheKey = `${filename}_${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      this.logger.debug('Datos obtenidos desde caché');
      return this.cache.get(cacheKey) as CSVData & { data: T[] };
    }
    
    try {
      // Construir path completo
      const filePath = path.isAbsolute(filename) 
        ? filename 
        : path.join(this.dataPath, filename);
      
      // Verificar que archivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }
      
      // Leer archivo
      const fileContent = fs.readFileSync(filePath, options?.encoding || 'utf-8');
      
      // Parsear CSV
      const records = parse(fileContent, {
        delimiter: options?.delimiter || ',',
        quote: options?.quote || '"',
        escape: options?.escape || '"',
        columns: options?.columns !== undefined ? options.columns : true,
        skip_empty_lines: options?.skip_empty_lines !== false,
        trim: options?.trim !== false,
        cast: options?.cast !== false,
        cast_date: true,
        relax_column_count: true,
        skip_records_with_error: false
      });
      
      // Obtener headers
      const headers = options?.columns === true || options?.columns === undefined
        ? Object.keys(records[0] || {})
        : options?.columns || [];
      
      // Crear objeto de datos
      const csvData: CSVData & { data: T[] } = {
        headers,
        rows: records,
        data: records as T[],
        totalRows: records.length,
        source: filePath
      };
      
      // Guardar en caché
      this.cache.set(cacheKey, csvData);
      
      this.logger.success(`CSV cargado: ${records.length} registros`, {
        file: filename,
        rows: records.length,
        columns: headers.length
      });
      
      return csvData;
      
    } catch (error) {
      this.logger.fail('Error cargando CSV', error as Error);
      throw new FrameworkError(
        `No se pudo cargar el archivo CSV: ${(error as Error).message}`,
        ErrorCode.FILE_ERROR,
        { filename, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 📁 Cargar múltiples archivos CSV
   */
  public async loadMultipleCSV(
    files: Array<{ name: string; filename: string; options?: CSVLoadOptions }>
  ): Promise<Record<string, CSVData>> {
    this.logger.debug(`Cargando ${files.length} archivos CSV`);
    
    const result: Record<string, CSVData> = {};
    
    for (const file of files) {
      try {
        result[file.name] = await this.loadCSV(file.filename, file.options);
      } catch (error) {
        this.logger.error(`Error cargando ${file.filename}`, error as Error);
        throw error;
      }
    }
    
    return result;
  }
  
  /**
   * 🔍 Filtrar datos
   */
  public filterData<T = any>(
    data: T[],
    options: DataFilterOptions
  ): T[] {
    let filtered = [...data];
    
    // Aplicar condiciones WHERE
    if (options.where) {
      filtered = filtered.filter(row => {
        for (const [key, value] of Object.entries(options.where!)) {
          if (Array.isArray(value)) {
            // Si el valor es un array, verificar si el campo está en el array (IN)
            if (!value.includes((row as any)[key])) return false;
          } else if (typeof value === 'object' && value !== null) {
            // Si es un objeto, puede tener operadores
            const operators = value as any;
            const fieldValue = (row as any)[key];
            
            if ('gt' in operators && fieldValue <= operators.gt) return false;
            if ('gte' in operators && fieldValue < operators.gte) return false;
            if ('lt' in operators && fieldValue >= operators.lt) return false;
            if ('lte' in operators && fieldValue > operators.lte) return false;
            if ('ne' in operators && fieldValue === operators.ne) return false;
            if ('like' in operators && !fieldValue?.includes(operators.like)) return false;
          } else {
            // Comparación simple
            if ((row as any)[key] !== value) return false;
          }
        }
        return true;
      });
    }
    
    // Ordenar
    if (options.orderBy) {
      const field = options.orderBy;
      const direction = options.orderDirection || 'asc';
      
      filtered.sort((a, b) => {
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = aVal < bVal ? -1 : 1;
        return direction === 'asc' ? comparison : -comparison;
      });
    }
    
    // Aplicar offset
    if (options.offset) {
      filtered = filtered.slice(options.offset);
    }
    
    // Aplicar límite
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    this.logger.debug(`Datos filtrados: ${filtered.length} registros`);
    return filtered;
  }
  
  /**
   * ✅ Validar datos contra esquema
   */
  public validateData<T = any>(
    data: T[],
    schema: DataSchema
  ): {
    valid: boolean;
    errors: Array<{ row: number; column: string; error: string }>;
    validData: T[];
  } {
    this.logger.debug('Validando datos contra esquema');
    
    const errors: Array<{ row: number; column: string; error: string }> = [];
    const validData: T[] = [];
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex] as any;
      let rowValid = true;
      
      for (const column of schema.columns) {
        const value = row[column.name];
        
        // Validar requerido
        if (column.required && (value === null || value === undefined || value === '')) {
          errors.push({
            row: rowIndex,
            column: column.name,
            error: 'Campo requerido'
          });
          rowValid = false;
          continue;
        }
        
        // Si no hay valor y no es requerido, continuar
        if (value === null || value === undefined || value === '') continue;
        
        // Validar tipo
        switch (column.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push({
                row: rowIndex,
                column: column.name,
                error: `Tipo incorrecto: esperado string, recibido ${typeof value}`
              });
              rowValid = false;
            }
            break;
            
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors.push({
                row: rowIndex,
                column: column.name,
                error: 'No es un número válido'
              });
              rowValid = false;
            }
            break;
            
          case 'boolean':
            if (typeof value !== 'boolean' && !['true', 'false', '0', '1'].includes(value.toString())) {
              errors.push({
                row: rowIndex,
                column: column.name,
                error: 'No es un booleano válido'
              });
              rowValid = false;
            }
            break;
            
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push({
                row: rowIndex,
                column: column.name,
                error: 'Email inválido'
              });
              rowValid = false;
            }
            break;
            
          case 'url':
            try {
              new URL(value);
            } catch {
              errors.push({
                row: rowIndex,
                column: column.name,
                error: 'URL inválida'
              });
              rowValid = false;
            }
            break;
        }
        
        // Validaciones adicionales
        if (column.pattern && !column.pattern.test(value)) {
          errors.push({
            row: rowIndex,
            column: column.name,
            error: 'No cumple con el patrón requerido'
          });
          rowValid = false;
        }
        
        if (column.minLength && value.length < column.minLength) {
          errors.push({
            row: rowIndex,
            column: column.name,
            error: `Longitud mínima: ${column.minLength}`
          });
          rowValid = false;
        }
        
        if (column.maxLength && value.length > column.maxLength) {
          errors.push({
            row: rowIndex,
            column: column.name,
            error: `Longitud máxima: ${column.maxLength}`
          });
          rowValid = false;
        }
        
        if (column.enum && !column.enum.includes(value)) {
          errors.push({
            row: rowIndex,
            column: column.name,
            error: `Valor no permitido. Valores válidos: ${column.enum.join(', ')}`
          });
          rowValid = false;
        }
        
        // Aplicar transformación si existe
        if (column.transform && rowValid) {
          row[column.name] = column.transform(value);
        }
      }
      
      if (rowValid) {
        validData.push(row);
      }
    }
    
    const valid = errors.length === 0;
    
    this.logger.info(`Validación completada: ${validData.length}/${data.length} registros válidos`);
    
    if (!valid) {
      this.logger.warn(`Se encontraron ${errors.length} errores de validación`);
    }
    
    return { valid, errors, validData };
  }
  
  /**
   * 🔄 Obtener iterador para data-driven testing
   */
  public async* getDataIterator<T = any>(
    filename: string,
    options?: CSVLoadOptions & DataFilterOptions
  ): AsyncGenerator<{ data: T; index: number; isFirst: boolean; isLast: boolean }> {
    const csvData = await this.loadCSV<T>(filename, options);
    const filteredData = this.filterData(csvData.data, options || {});
    
    for (let i = 0; i < filteredData.length; i++) {
      yield {
        data: filteredData[i],
        index: i,
        isFirst: i === 0,
        isLast: i === filteredData.length - 1
      };
    }
  }
  
  /**
   * 🔄 Obtener datos aleatorios
   */
  public getRandomData<T = any>(
    data: T[],
    count = 1
  ): T[] {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, data.length));
  }
  
  /**
   * 📝 Guardar datos en CSV
   */
  public async saveCSV(
    filename: string,
    data: any[],
    options?: {
      headers?: string[];
      delimiter?: string;
      append?: boolean;
    }
  ): Promise<void> {
    this.logger.debug(`Guardando datos en CSV: ${filename}`);
    
    try {
      const filePath = path.join(this.dataPath, filename);
      
      // Construir contenido CSV
      let content = '';
      
      // Headers
      const headers = options?.headers || (data.length > 0 ? Object.keys(data[0]) : []);
      if (!options?.append || !fs.existsSync(filePath)) {
        content += headers.join(options?.delimiter || ',') + '\n';
      }
      
      // Datos
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          // Escapar valores que contienen delimitador o comillas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        content += values.join(options?.delimiter || ',') + '\n';
      }
      
      // Guardar archivo
      if (options?.append) {
        fs.appendFileSync(filePath, content);
      } else {
        fs.writeFileSync(filePath, content);
      }
      
      this.logger.success(`CSV guardado: ${data.length} registros`);
      
    } catch (error) {
      throw new FrameworkError(
        'Error guardando CSV',
        ErrorCode.FILE_ERROR,
        { filename, error: (error as Error).message }
      );
    }
  }
  
  /**
   * 🔄 Transformar datos
   */
  public transformData<T = any, R = any>(
    data: T[],
    transformer: (row: T, index: number) => R
  ): R[] {
    return data.map((row, index) => transformer(row, index));
  }
  
  /**
   * 📊 Agrupar datos
   */
  public groupBy<T = any>(
    data: T[],
    key: keyof T | ((item: T) => string)
  ): Record<string, T[]> {
    return data.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
  
  /**
   * 🔄 Unir datos (JOIN)
   */
  public joinData<T = any, U = any>(
    leftData: T[],
    rightData: U[],
    leftKey: keyof T,
    rightKey: keyof U,
    type: 'inner' | 'left' | 'right' | 'full' = 'inner'
  ): Array<T & U> {
    const result: Array<T & U> = [];
    
    // Crear índice para optimizar búsqueda
    const rightIndex = new Map<any, U[]>();
    for (const rightRow of rightData) {
      const key = rightRow[rightKey];
      if (!rightIndex.has(key)) {
        rightIndex.set(key, []);
      }
      rightIndex.get(key)!.push(rightRow);
    }
    
    // Inner join o left join
    if (type === 'inner' || type === 'left' || type === 'full') {
      for (const leftRow of leftData) {
        const key = leftRow[leftKey];
        const matches = rightIndex.get(key) || [];
        
        if (matches.length > 0) {
          for (const rightRow of matches) {
            result.push({ ...leftRow, ...rightRow });
          }
        } else if (type === 'left' || type === 'full') {
          result.push({ ...leftRow } as T & U);
        }
      }
    }
    
    // Right join o full join (agregar filas no matcheadas de rightData)
    if (type === 'right' || type === 'full') {
      const leftKeys = new Set(leftData.map(row => row[leftKey]));
      
      for (const rightRow of rightData) {
        if (!leftKeys.has(rightRow[rightKey])) {
          result.push({ ...rightRow } as T & U);
        }
      }
    }
    
    return result;
  }
  
  /**
   * 📊 Obtener estadísticas de datos numéricos
   */
  public getStatistics(
    data: any[],
    field: string
  ): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    median: number;
    stdDev: number;
  } {
    const values = data
      .map(row => parseFloat(row[field]))
      .filter(val => !isNaN(val))
      .sort((a, b) => a - b);
    
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        median: 0,
        stdDev: 0
      };
    }
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const median = values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      count: values.length,
      sum,
      avg,
      min: values[0],
      max: values[values.length - 1],
      median,
      stdDev
    };
  }
  
  /**
   * 🧹 Limpiar caché
   */
  public clearCache(filename?: string): void {
    if (filename) {
      // Limpiar caché específico
      for (const key of this.cache.keys()) {
        if (key.startsWith(filename)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Limpiar todo el caché
      this.cache.clear();
    }
    
    this.logger.debug('Caché limpiado');
  }
  
  /**
   * 📊 Obtener información del caché
   */
  public getCacheInfo(): {
    size: number;
    files: string[];
    totalRows: number;
  } {
    const files: string[] = [];
    let totalRows = 0;
    
    for (const [key, data] of this.cache.entries()) {
      files.push(key.split('_')[0]);
      totalRows += data.totalRows;
    }
    
    return {
      size: this.cache.size,
      files: [...new Set(files)],
      totalRows
    };
  }
}