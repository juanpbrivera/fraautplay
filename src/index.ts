// src/index.ts

// ───────────────────────────── Re-exports públicos ─────────────────────────────
// Elements
export { Locators } from './elements/Locators';
export type { Locator, LocatorBuilder } from './elements/Locators';
export { ElementManager } from './elements/ElementManager';
export { ElementActions } from './elements/ElementActions';
export { WaitStrategies } from './elements/WaitStrategies';

// Interactions
export { NavigationActions } from './interactions/NavigationActions';
export { GestureActions } from './interactions/GestureActions';
export { InputActions } from './interactions/InputActions';

// Validations
export { AssertionHelpers } from './validations/AssertionHelpers';
export { ValidationStrategies } from './validations/ValidationStrategies';
export { registerCustomMatchers } from './validations/CustomMatchers';
export type { CustomMatchers } from './validations/CustomMatchers';

// Core
export { ConfigManager } from './core/config/ConfigManager';
export { DefaultConfig } from './core/config/DefaultConfig';
export { BrowserFactory } from './core/browsers/BrowserFactory';
export type { BrowserOptions } from './core/browsers/BrowserOptions';
export { Logger } from './core/logging/Logger';
export { LoggerFactory } from './core/logging/LoggerFactory';

// Session & Utilities
export { SessionManager } from './session/SessionManager';
export { DataManager } from './utilities/DataManager';
export { FileUtils } from './utilities/FileUtils';
export { ScreenshotHelper } from './utilities/ScreenshotHelper';

// Types (si solo contienen tipos)
export * from './types/ConfigTypes';
export * from './types/FrameworkTypes';

// ───────────────────────────── Facade Web.* (default) ──────────────────────────
import { NavigationActions } from './interactions/NavigationActions';
import { ElementManager } from './elements/ElementManager';
import { AssertionHelpers } from './validations/AssertionHelpers';
import { ConfigManager } from './core/config/ConfigManager';
import { Locators } from './elements/Locators';
import { BrowserFactory } from './core/browsers/BrowserFactory';
import { registerCustomMatchers } from './validations/CustomMatchers';
import { SessionManager } from './session/SessionManager';

export const Actions  = (page: any) => new NavigationActions(page);
export const Elements = (page: any) => new ElementManager(page);
export const Assert   = () => AssertionHelpers;
export const Config   = { ConfigManager };

const Web = {
  Actions,
  Elements,
  Assert,
  Config,
  Locators,
  BrowserFactory,
  registerCustomMatchers,
  Session: SessionManager, // ← acceso directo: Web.Session.start/stop/stopAll
};

export default Web;
