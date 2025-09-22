// src/core/config/ConfigManager.ts

import {
  FrameworkConfig,
  PartialConfig,
  ConfigSource
} from '../../types/ConfigTypes';
import { DefaultConfig } from './DefaultConfig';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Logger } from '../logging/Logger';

/**
 * Gestor de configuración del framework
 * Maneja la carga y merge de configuraciones desde JSON y variables de entorno
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

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

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
      await this.loadDefaultConfigFiles();
    }

    // 4. Merge de todas las configuraciones
    this.mergeConfigurations();

    // 5. Validar configuración final
    this.validateConfiguration();

    this.logger.info('Configuration initialized successfully');
  }

  // src/core/config/ConfigManager.ts

  private loadEnvironmentVariables(): void {
    // Cargar archivo .env si existe
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      this.logger.debug('Loaded .env file');
    }

    const envConfig: PartialConfig = {};

    // Función helper para asegurar que un objeto existe
    const ensureObject = <K extends keyof PartialConfig>(
      key: K
    ): NonNullable<PartialConfig[K]> => {
      if (!envConfig[key]) {
        envConfig[key] = {} as any;
      }
      return envConfig[key]!;
    };

    // Mapear variables de entorno a configuración
    if (process.env.BROWSER_TYPE) {
      ensureObject('browser').browserType = process.env.BROWSER_TYPE as any;
    }

    if (process.env.HEADLESS) {
      ensureObject('browser').headless = process.env.HEADLESS === 'true';
    }

    if (process.env.BASE_URL) {
      ensureObject('environment').baseUrl = process.env.BASE_URL;
    }

    if (process.env.LOG_LEVEL) {
      ensureObject('logging').level = process.env.LOG_LEVEL as any;
    }

    if (process.env.PARALLEL_WORKERS) {
      ensureObject('parallel').workers = parseInt(process.env.PARALLEL_WORKERS);
    }

    if (process.env.RETRY_ATTEMPTS) {
      ensureObject('retry').maxAttempts = parseInt(process.env.RETRY_ATTEMPTS);
    }

    if (process.env.TIMEOUT) {
      const timeout = parseInt(process.env.TIMEOUT);
      const timeouts = ensureObject('timeouts');
      timeouts.default = timeout;
      timeouts.navigation = timeout;
      timeouts.element = timeout;
      timeouts.action = timeout;
      timeouts.assertion = timeout;
    }

    // Configuración de screenshots
    if (process.env.SCREENSHOTS_ENABLED) {
      ensureObject('screenshots').enabled = process.env.SCREENSHOTS_ENABLED === 'true';
    }

    if (process.env.SCREENSHOTS_PATH) {
      ensureObject('screenshots').path = process.env.SCREENSHOTS_PATH;
    }

    // Configuración de paths
    if (process.env.DATA_PATH) {
      ensureObject('paths').data = process.env.DATA_PATH;
    }

    if (process.env.DOWNLOADS_PATH) {
      ensureObject('paths').downloads = process.env.DOWNLOADS_PATH;
    }

    if (process.env.REPORTS_PATH) {
      ensureObject('paths').reports = process.env.REPORTS_PATH;
    }

    if (process.env.TEMP_PATH) {
      ensureObject('paths').temp = process.env.TEMP_PATH;
    }

    // Configuración de ambiente
    if (process.env.ENVIRONMENT_NAME) {
      ensureObject('environment').name = process.env.ENVIRONMENT_NAME;
    }

    if (process.env.API_URL) {
      ensureObject('environment').apiUrl = process.env.API_URL;
    }

    if (Object.keys(envConfig).length > 0) {
      this.configSources.set('env', envConfig);
      this.logger.debug('Loaded environment variables', { keys: Object.keys(envConfig) });
    }
  }
  private async loadConfigFile(configPath: string): Promise<void> {
    if (!fs.existsSync(configPath)) {
      this.logger.warn(`Configuration file not found: ${configPath}`);
      return;
    }

    const ext = path.extname(configPath).toLowerCase();

    if (ext !== '.json') {
      this.logger.warn(`Only JSON configuration files are supported. Found: ${ext}`);
      return;
    }

    try {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(fileContent);

      this.configSources.set('file', fileConfig);
      this.logger.info(`Loaded configuration from ${configPath}`);
    } catch (error) {
      this.logger.error('Failed to load configuration file', error as Error);
      throw new Error(`Failed to load config from ${configPath}: ${(error as Error).message}`);
    }
  }

  private async loadDefaultConfigFiles(): Promise<void> {
    const possibleFiles = [
      'framework.config.json',
      '.frameworkrc.json'
    ];

    for (const file of possibleFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        await this.loadConfigFile(filePath);
        break;
      }
    }
  }

  private mergeConfigurations(): void {
    let mergedConfig = DefaultConfig.getDefaultConfig();
    const sources: ConfigSource[] = ['default', 'file', 'env', 'runtime'];

    for (const source of sources) {
      const sourceConfig = this.configSources.get(source);
      if (sourceConfig) {
        mergedConfig = DefaultConfig.mergeConfig(mergedConfig, sourceConfig);
      }
    }

    this.config = mergedConfig;
  }

  private validateConfiguration(): void {
    try {
      DefaultConfig.validateConfig(this.config);
      this.logger.debug('Configuration validation passed');
    } catch (error) {
      this.logger.error('Configuration validation failed', error as Error);
      throw error;
    }
  }

  getConfig(): FrameworkConfig {
    return { ...this.config };
  }

  updateConfig(partialConfig: PartialConfig): void {
    this.logger.info('Updating configuration at runtime');
    DefaultConfig.validateConfig(partialConfig);
    this.configSources.set('runtime', partialConfig);
    this.mergeConfigurations();
    this.logger.info('Configuration updated successfully');
  }

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

  reset(): void {
    this.logger.info('Resetting configuration to defaults');
    this.configSources.clear();
    this.config = DefaultConfig.getDefaultConfig();
  }

  exportConfig(filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();

    if (ext !== '.json') {
      throw new Error(`Only JSON export is supported. Requested: ${ext}`);
    }

    const content = JSON.stringify(this.config, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    this.logger.info(`Configuration exported to ${filePath}`);
  }

  getConfigSources(): ConfigSource[] {
    return Array.from(this.configSources.keys());
  }
}