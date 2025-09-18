// src/index.ts - Punto de entrada principal del framework

// ============================================
// CORE - BROWSERS
// ============================================
export { BrowserFactory } from './core/browsers/BrowserFactory';
export { BrowserOptionsBuilder } from './core/browsers/BrowserOptions';

// ============================================
// CORE - CONFIG
// ============================================
export { ConfigManager } from './core/config/ConfigManager';
export { DefaultConfig } from './core/config/DefaultConfig';

// ============================================
// CORE - LOGGING
// ============================================
export { Logger } from './core/logging/Logger';
export { LoggerFactory } from './core/logging/LoggerFactory';

// ============================================
// ELEMENTS
// ============================================
export { ElementManager } from './elements/ElementManager';
export { ElementActions } from './elements/ElementActions';
export { Locators } from './elements/Locators';
export { WaitStrategies } from './elements/WaitStrategies';

// ============================================
// INTERACTIONS
// ============================================
export { NavigationActions } from './interactions/NavigationActions';
export { GestureActions } from './interactions/GestureActions';
export { InputActions } from './interactions/InputActions';

// ============================================
// VALIDATIONS
// ============================================
export { AssertionHelpers } from './validations/AssertionHelpers';
export { ValidationStrategies } from './validations/ValidationStrategies';
export { CustomMatchers } from './validations/CustomMatchers';

// ============================================
// UTILITIES
// ============================================
export { ScreenshotHelper } from './utilities/ScreenshotHelper';
export { DataManager } from './utilities/DataManager';
export { FileUtils } from './utilities/FileUtils';

// ============================================
// SESSION
// ============================================
export { SessionManager } from './session/SessionManager';

// ============================================
// TYPES - Framework Types
// ============================================
export type {
  BrowserType,
  BrowserOptions,
  LocatorStrategy,
  ElementLocator,
  WaitOptions,
  ActionOptions,
  NavigationOptions,
  ValidationResult,
  SessionContext,
  ScreenshotOptions,
  CSVData,
  LogLevel,
  LogContext,
  GestureOptions,
  ScrollOptions,
  InputOptions,
  ActionResult
} from './types/FrameworkTypes';

// ============================================
// TYPES - Config Types
// ============================================
export type {
  FrameworkConfig,
  TimeoutConfig,
  ScreenshotConfig,
  LoggingConfig,
  PathConfig,
  RetryConfig,
  ParallelConfig,
  EnvironmentConfig,
  ConfigSource,
  PartialConfig,
  ConfigFile
} from './types/ConfigTypes';

// ============================================
// PLAYWRIGHT TYPES - Re-exportados para conveniencia del usuario
// ============================================
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
} from 'playwright';