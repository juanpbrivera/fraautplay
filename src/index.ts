// src/index.ts
// Usa exportaciones nombradas, NO export *
export { BrowserFactory } from './core/browsers/BrowserFactory';
export { BrowserOptionsBuilder } from './core/browsers/BrowserOptions';
export { ConfigManager } from './core/config/ConfigManager';
export { DefaultConfig } from './core/config/DefaultConfig';
export { Logger } from './core/logging/Logger';
export { LoggerFactory } from './core/logging/LoggerFactory';
export { ElementManager } from './elements/ElementManager';
export { ElementActions } from './elements/ElementActions';
export { Locators } from './elements/Locators';
export { WaitStrategies } from './elements/WaitStrategies';
export { NavigationActions } from './interactions/NavigationActions';
export { GestureActions } from './interactions/GestureActions';
export { InputActions } from './interactions/InputActions';
export { AssertionHelpers } from './validations/AssertionHelpers';
export { ValidationStrategies } from './validations/ValidationStrategies';
export { CustomMatchers } from './validations/CustomMatchers';
export { ScreenshotHelper } from './utilities/ScreenshotHelper';
export { DataManager } from './utilities/DataManager';
export { FileUtils } from './utilities/FileUtils';
export { SessionManager } from './session/SessionManager';

// Exporta tipos
export type * from './types/FrameworkTypes';
export type * from './types/ConfigTypes';