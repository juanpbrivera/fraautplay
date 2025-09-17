// src/types/ConfigTypes.ts

import { BrowserOptions, LogLevel } from './FrameworkTypes';

/**
 * Definición de tipos para la configuración del framework
 */

// Configuración principal del framework
export interface FrameworkConfig {
  browser: BrowserOptions;
  timeouts: TimeoutConfig;
  screenshots: ScreenshotConfig;
  logging: LoggingConfig;
  paths: PathConfig;
  retry: RetryConfig;
  parallel?: ParallelConfig;
  environment?: EnvironmentConfig;
}

// Configuración de timeouts
export interface TimeoutConfig {
  default: number;
  navigation: number;
  element: number;
  action: number;
  assertion: number;
}

// Configuración de screenshots
export interface ScreenshotConfig {
  enabled: boolean;
  onFailure: boolean;
  onSuccess: boolean;
  path: string;
  fullPage: boolean;
  format: 'png' | 'jpeg';
  quality?: number;
}

// Configuración de logging
export interface LoggingConfig {
  level: LogLevel;
  console: boolean;
  file: boolean;
  path: string;
  prettyPrint: boolean;
  timestamp: boolean;
}

// Configuración de rutas
export interface PathConfig {
  data: string;
  screenshots: string;
  reports: string;
  downloads: string;
  temp: string;
}

// Configuración de reintentos
export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  delay: number;
  backoff: boolean;
}

// Configuración de ejecución paralela
export interface ParallelConfig {
  workers: number;
  fullyParallel: boolean;
  forbidOnly: boolean;
  retries: number;
}

// Configuración de ambiente
export interface EnvironmentConfig {
  name: string;
  baseUrl: string;
  apiUrl?: string;
  variables: Record<string, string>;
}

// Fuente de configuración
export type ConfigSource = 'default' | 'file' | 'env' | 'runtime';

// Configuración parcial (para merge)
export type PartialConfig = Partial<FrameworkConfig>;

// Configuración de archivo
export interface ConfigFile {
  version: string;
  extends?: string;
  config: PartialConfig;
}