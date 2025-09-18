// src/index.ts - Punto de entrada principal del framework

// Core - Browsers
export { BrowserFactory } from './core/browsers/BrowserFactory';
export { BrowserOptionsBuilder } from './core/browsers/BrowserOptions';

// Core - Config
export { ConfigManager } from './core/config/ConfigManager';
export { DefaultConfig } from './core/config/DefaultConfig';

// Core - Logging
export { Logger } from './core/logging/Logger';
export { LoggerFactory } from './core/logging/LoggerFactory';

// Elements
export { ElementManager } from './elements/ElementManager';
export { ElementActions } from './elements/ElementActions';
export { Locators } from './elements/Locators';
export { WaitStrategies } from './elements/WaitStrategies';

// Utilities
export { ScreenshotHelper } from './utilities/ScreenshotHelper';
export { DataManager } from './utilities/DataManager';
export { FileUtils } from './utilities/FileUtils';

// Types
export * from './types/FrameworkTypes';
export * from './types/ConfigTypes';

// Re-exportar tipos de Playwright para conveniencia
export type {
  Browser,
  BrowserContext,
  Page,
  Locator,
  ElementHandle,
  Response,
  Request,
  Route,
  Frame,
  Cookie,
  StorageState
} from 'playwright';