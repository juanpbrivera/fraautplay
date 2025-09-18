// src/index.ts - Punto de entrada principal del framework

// Re-exportar todo desde los módulos
// Core - Browsers
export * from './core/browsers/BrowserFactory';
export * from './core/browsers/BrowserOptions';

// Core - Config
export * from './core/config/ConfigManager';
export * from './core/config/DefaultConfig';

// Core - Logging
export * from './core/logging/Logger';
export * from './core/logging/LoggerFactory';

// Elements
export * from './elements/ElementManager';
export * from './elements/ElementActions';
export * from './elements/Locators';
export * from './elements/WaitStrategies';

// Interactions
export * from './interactions/NavigationActions';
export * from './interactions/GestureActions';
export * from './interactions/InputActions';

// Validations
export * from './validations/AssertionHelpers';
export * from './validations/ValidationStrategies';
export * from './validations/CustomMatchers';

// Utilities
export * from './utilities/ScreenshotHelper';
export * from './utilities/DataManager';
export * from './utilities/FileUtils';

// Session
export * from './session/SessionManager';

// Types - Exportar todo EXCEPTO los tipos de Playwright que ya están en FrameworkTypes
export * from './types/FrameworkTypes';
export * from './types/ConfigTypes';

// Re-exportar tipos de Playwright para conveniencia (solo los que existen)
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
  Cookie
} from 'playwright';// src/index.ts - Punto de entrada principal del framework

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

// Interactions
export { NavigationActions } from './interactions/NavigationActions';
export { GestureActions } from './interactions/GestureActions';
export { InputActions } from './interactions/InputActions';

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