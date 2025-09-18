// src/core/config/ConfigManager.ts

import { 
  FrameworkConfig, 
  PartialConfig, 
  ConfigSource,
  ScreenshotConfig,
  LoggingConfig,
  TimeoutConfig,
  PathConfig,
  RetryConfig,
  ParallelConfig,
  EnvironmentConfig
} from '../../types/ConfigTypes';
import { BrowserOptions } from '../../types/FrameworkTypes';
import { DefaultConfig } from './DefaultConfig';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';
import * as dotenv from 'dotenv';
import { Logger } from '../logging/Logger';

/**
 * Gestor de configuración del framework
 * Maneja la carga y merge de configuraciones desde múltiples fuentes
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: FrameworkConfig;
  private logger: Logger;
  private configSources: Map<ConfigSource, PartialConfig> = new Map();

  private constructor() {
    this.config = DefaultConfig.getDefaultConfig();
    this.logger = new Logger(this.config.logging, { component: 'ConfigManager' });
  }

  /**
   * Obtiene la instancia singleton del ConfigManager
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Inicializa la configuración desde múltiples fuentes
   */
  async initialize(configPath?: string): Promise<void> {
    this.logger.info('Initializing configuration');

    // 1. Cargar configuración por defecto
    this.configSources.set('default', DefaultConfig.getDefaultConfig());

    // 2. Cargar variables de entorno
    this.loadEnvironmentVariables();

    // 3. Cargar archivo de configuración si se proporciona
    if (configPath) {
      await this.loadConfigFile(configPath);
    } else {
      // Buscar archivos de configuración por defecto
      await this.loadDefaultConfigFiles();
    }

    // 4. Merge de todas las configuraciones
    this.mergeConfigurations();

    // 5. Validar configuración final
    this.validateConfiguration();

    this.logger.info('Configuration initialized successfully');
  }

  /**
   * Carga variables de entorno
   */
  private loadEnvironmentVariables(): void {
    // Cargar archivo .env si existe
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      this.logger.debug('Loaded .env file');
    }

    const envConfig: PartialConfig = {};

    // Mapear variables de entorno a configuración
    if (process.env.BROWSER_TYPE) {
      if (!envConfig.browser) {
        envConfig.browser = {} as BrowserOptions;
      }
      envConfig.browser.browserType = process.env.BROWSER_TYPE as any;
    }
    
    if (process.env.HEADLESS) {
      if (!envConfig.browser) {
        envConfig.browser = {} as BrowserOptions;
      }
      envConfig.browser.headless = process.env.HEADLESS === 'true';
    }
    
    if (process.env.BASE_URL) {
      if (!envConfig.environment) {
        envConfig.environment = {} as EnvironmentConfig;
      }
      envConfig.environment.baseUrl = process.env.BASE_URL;
    }
    
    if (process.env.LOG_LEVEL) {
      if (!envConfig.logging) {
        envConfig.logging = {} as LoggingConfig;
      }
      envConfig.logging.level = process.env.LOG_LEVEL as any;
    }
    
    if (process.env.PARALLEL_WORKERS) {
      if (!envConfig.parallel) {
        envConfig.parallel = {} as ParallelConfig;
      }
      envConfig.parallel.workers = parseInt(process.env.PARALLEL_WORKERS);
    }
    
    if (process.env.RETRY_ATTEMPTS) {
      if (!envConfig.retry) {
        envConfig.retry = {} as RetryConfig;
      }
      envConfig.retry.maxAttempts = parseInt(process.env.RETRY_ATTEMPTS);
    }

    if (process.env.TIMEOUT) {
      const timeout = parseInt(process.env.TIMEOUT);
      envConfig.timeouts = {
        default: timeout,
        navigation: timeout,
        element: timeout,
        action: timeout,
        assertion: timeout
      };
    }

    if (Object.keys(envConfig).length > 0) {
      this.configSources.set('env', envConfig);
      this.logger.debug('Loaded environment variables', { keys: Object.keys(envConfig) });
    }
  }

  /**
   * Carga archivo de configuración
   */
  private async loadConfigFile(configPath: string): Promise<void> {
    if (!fs.existsSync(configPath)) {
      this.logger.warn(`Configuration file not found: ${configPath}`);
      return;
    }

    const ext = path.extname(configPath).toLowerCase();
    let fileConfig: PartialConfig = {};

    try {
      const fileContent = fs.readFileSync(configPath, 'utf-8');

      switch (ext) {
        case '.json':
          fileConfig = JSON.parse(fileContent);
          break;
        case '.yaml':
        case '.yml':
          fileConfig = yaml.parse(fileContent) as PartialConfig;
          break;
        case '.js':
        case '.ts':
          // Para archivos JS/TS, usar require
          const imported = require(path.resolve(configPath));
          // Verificar si el módulo tiene un export default
          if (imported && typeof imported === 'object') {
            fileConfig = imported.default || imported;
          } else {
            fileConfig = imported;
          }
          break;
        default:
          this.logger.warn(`Unsupported config file format: ${ext}`);
          return;
      }

      this.configSources.set('file', fileConfig);
      this.logger.info(`Loaded configuration from ${configPath}`);
    } catch (error) {
      this.logger.error('Failed to load configuration file', error as Error);
      throw new Error(`Failed to load config from ${configPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Busca y carga archivos de configuración por defecto
   */
  private async loadDefaultConfigFiles(): Promise<void> {
    const possibleFiles = [
      'framework.config.json',
      'framework.config.yaml',
      'framework.config.yml',
      'framework.config.js',
      '.frameworkrc.json',
      '.frameworkrc.yaml',
      '.frameworkrc.yml'
    ];

    for (const file of possibleFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        await this.loadConfigFile(filePath);
        break;
      }
    }
  }

  /**
   * Merge de todas las configuraciones
   */
  private mergeConfigurations(): void {
    let mergedConfig = DefaultConfig.getDefaultConfig();

    // Orden de precedencia: default < file < env < runtime
    const sources: ConfigSource[] = ['default', 'file', 'env', 'runtime'];

    for (const source of sources) {
      const sourceConfig = this.configSources.get(source);
      if (sourceConfig) {
        mergedConfig = DefaultConfig.mergeConfig(mergedConfig, sourceConfig);
      }
    }

    this.config = mergedConfig;
  }

  /**
   * Valida la configuración final
   */
  private validateConfiguration(): void {
    try {
      DefaultConfig.validateConfig(this.config);
      this.logger.debug('Configuration validation passed');
    } catch (error) {
      this.logger.error('Configuration validation failed', error as Error);
      throw error;
    }
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): FrameworkConfig {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración en runtime
   */
  updateConfig(partialConfig: PartialConfig): void {
    this.logger.info('Updating configuration at runtime');
    
    // Validar la configuración parcial
    DefaultConfig.validateConfig(partialConfig);
    
    // Guardar en runtime source
    this.configSources.set('runtime', partialConfig);
    
    // Re-merge configuraciones
    this.mergeConfigurations();
    
    this.logger.info('Configuration updated successfully');
  }

  /**
   * Obtiene un valor específico de la configuración
   */
  get<T>(path: string): T | undefined {
    const keys = path.split('.');
    let current: any = this.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current as T;
  }

  /**
   * Establece un valor específico en la configuración
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current: any = this.config;

    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
    this.logger.debug(`Configuration updated: ${path} = ${JSON.stringify(value)}`);
  }

  /**
   * Resetea la configuración a los valores por defecto
   */
  reset(): void {
    this.logger.info('Resetting configuration to defaults');
    this.configSources.clear();
    this.config = DefaultConfig.getDefaultConfig();
  }

  /**
   * Exporta la configuración actual a un archivo
   */
  exportConfig(filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    let content: string;

    switch (ext) {
      case '.json':
        content = JSON.stringify(this.config, null, 2);
        break;
      case '.yaml':
      case '.yml':
        content = yaml.stringify(this.config);
        break;
      default:
        throw new Error(`Unsupported export format: ${ext}`);
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    this.logger.info(`Configuration exported to ${filePath}`);
  }

  /**
   * Obtiene información sobre las fuentes de configuración activas
   */
  getConfigSources(): ConfigSource[] {
    return Array.from(this.configSources.keys());
  }
}