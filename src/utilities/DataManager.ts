// src/utilities/DataManager.ts
import * as fs from 'fs';
import * as path from 'path';
import { LoggerFactory } from '../core/logging/LoggerFactory';
import { ConfigManager } from '../core/config/ConfigManager';

// Import compatible con proyectos con o sin esModuleInterop
// (toma default si existe, si no usa el módulo tal cual)
import * as CsvParser from 'csv-parser';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const csv: any = (CsvParser as any).default ?? (CsvParser as any);

type CSVRow = Record<string, string>;

// Opciones mínimas que realmente se usan en csv-parser (sin depender de sus tipos)
export type CSVOptions = Partial<{
  separator: string;              // delim, ej: ','
  headers: string[] | boolean;    // true = usa primera fila, array = tus headers, false = genera headers
  skipLines: number;              // salta N líneas
  mapHeaders: (args: { header: string; index: number }) => string | null;
  mapValues: (args: { header: string; index: number; value: string }) => any;
  skipComments: boolean | string; // p.ej '#'
  maxRowBytes: number;
  strict: boolean;                // default true
}>;

export class DataManager {
  private static logger = LoggerFactory.getLogger('DataManager');
  private static dataDir: string | null = null;
  private static cache = new Map<string, unknown>();

  /** Resuelve el directorio de datos desde config.paths.data o ./data */
  private static getDataDir(): string {
    if (!this.dataDir) {
      try {
        const cfg = ConfigManager.getInstance().getConfig();
        this.dataDir = cfg?.paths?.data ?? path.join(process.cwd(), 'data');
      } catch {
        this.dataDir = path.join(process.cwd(), 'data');
      }
      this.logger.debug('Data dir resolved', { dataDir: this.dataDir });
    }
    return this.dataDir!;
  }

  /** Construye path absoluto respetando paths.data */
  private static resolvePath(fileName: string): string {
    return path.isAbsolute(fileName)
      ? fileName
      : path.join(this.getDataDir(), fileName);
  }

  /** Lee un CSV completo a memoria */
  static async loadCSV<T extends Record<string, any> = CSVRow>(
    fileName: string,
    options?: CSVOptions
  ): Promise<T[]> {
    const filePath = this.resolvePath(fileName);
    const cacheKey = `csv|${filePath}|${JSON.stringify(options ?? {})}`;

    if (this.cache.has(cacheKey)) {
      this.logger.debug('CSV from cache', { fileName });
      return this.cache.get(cacheKey) as T[];
    }
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV not found: ${filePath}`);
    }

    this.logger.debug('Loading CSV', { filePath });
    const rows: T[] = [];

    const parserOpts: CSVOptions = {
      strict: true,
      ...options,
    };

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv(parserOpts))
        .on('data', (row: unknown) => rows.push(row as T))
        .once('end', () => resolve())
        .once('error', (err: Error) => reject(err));
    });

    this.cache.set(cacheKey, rows);
    this.logger.info('CSV loaded', { fileName, records: rows.length });
    return rows;
  }

  /** Lee un JSON (y lo cachea) */
  static async loadJSON<T = unknown>(fileName: string): Promise<T> {
    const filePath = this.resolvePath(fileName);
    const cacheKey = `json|${filePath}`;

    if (this.cache.has(cacheKey)) {
      this.logger.debug('JSON from cache', { fileName });
      return this.cache.get(cacheKey) as T;
    }
    if (!fs.existsSync(filePath)) {
      throw new Error(`JSON not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as T;
    this.cache.set(cacheKey, data);
    this.logger.info('JSON loaded', { fileName });
    return data;
  }

  /** Utilidades pequeñas pero útiles en pruebas */
  static async filterCSV<T extends Record<string, any> = CSVRow>(
    fileName: string,
    predicate: (row: T) => boolean,
    options?: CSVOptions
  ): Promise<T[]> {
    const data = await this.loadCSV<T>(fileName, options);
    return data.filter(predicate);
  }

  static async getRandomValue<T = string>(
    fileName: string,
    columnName: string,
    options?: CSVOptions
  ): Promise<T | undefined> {
    const data = await this.loadCSV<Record<string, any>>(fileName, options);
    if (!data.length) return undefined;
    const n = Math.floor(Math.random() * data.length);
    return data[n]?.[columnName] as T | undefined;
  }

  /** Helpers mínimos de archivos */
  static fileExists(fileName: string): boolean {
    return fs.existsSync(this.resolvePath(fileName));
  }

  static listDataFiles(ext?: string): string[] {
    const dir = this.getDataDir();
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir);
    return ext ? files.filter(f => f.toLowerCase().endsWith(ext.toLowerCase())) : files;
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static getDataPath(): string {
    return this.getDataDir();
  }
}
