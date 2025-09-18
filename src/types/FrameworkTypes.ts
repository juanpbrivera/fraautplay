// src/types/FrameworkTypes.ts
import { Page, Browser, BrowserContext, Locator, ElementHandle } from 'playwright';

/**
 * Tipos principales del framework de automatización
 */

// Tipos de navegadores soportados
export type BrowserType = 'chromium' | 'firefox' | 'webkit' | 'edge' | 'chrome';

// Opciones para inicializar el navegador
export interface BrowserOptions {
  browserType: BrowserType;
  headless?: boolean;
  slowMo?: number;
  viewport?: { width: number; height: number };
  timeout?: number;
  args?: string[];
  ignoreHTTPSErrors?: boolean;
  downloadsPath?: string;
  locale?: string;
  timezone?: string;
}

// Estrategias de localización de elementos
export type LocatorStrategy = 
  | 'id'
  | 'xpath'
  | 'css'
  | 'text'
  | 'role'
  | 'testid'
  | 'placeholder'
  | 'alt'
  | 'title'
  | 'label';

// Definición de un localizador
export interface ElementLocator {
  strategy: LocatorStrategy;
  value: string;
  description?: string;
  parent?: ElementLocator;
}

// Opciones de espera
export interface WaitOptions {
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  interval?: number;
}

// Opciones para acciones sobre elementos
export interface ActionOptions extends WaitOptions {
  force?: boolean;
  delay?: number;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[];
}

// Opciones para navegación
export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
}

// Resultado de validación
export interface ValidationResult {
  passed: boolean;
  message: string;
  actual?: any;
  expected?: any;
  screenshot?: string;
}

// Contexto de sesión
export interface SessionContext {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  createdAt: Date;
  metadata?: Record<string, any>;
}

// Opciones para captura de pantalla
export interface ScreenshotOptions {
  fullPage?: boolean;
  path?: string;
  type?: 'png' | 'jpeg';
  quality?: number;
  omitBackground?: boolean;
  animations?: 'disabled' | 'allow';
}

// Datos CSV parseados
export interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

// Nivel de logging
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Contexto de logging
export interface LogContext {
  component?: string;
  action?: string;
  sessionId?: string;
  [key: string]: any;
}

// Configuración de gestos
export interface GestureOptions {
  duration?: number;
  steps?: number;
  smooth?: boolean;
}

// Opciones de scroll
export interface ScrollOptions extends GestureOptions {
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  element?: ElementLocator;
}

// Opciones de input
export interface InputOptions extends ActionOptions {
  clearFirst?: boolean;
  selectAll?: boolean;
}

// Resultado de acción
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  duration?: number;
  screenshot?: string;
}

// Tipos de Playwright que usamos internamente - NO re-exportar
export type { Page, Browser, BrowserContext, Locator, ElementHandle };