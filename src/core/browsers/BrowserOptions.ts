// src/core/browsers/BrowserOptions.ts
import type { LaunchOptions } from 'playwright';

export type BrowserChannel = 'chromium' | 'chrome' | 'msedge' | 'firefox' | 'webkit';

/**
 * Opciones de navegador que el framework entiende.
 * Pueden venir de tu JSON (config/<ENV>.json) o de la solución.
 */
export interface BrowserOptions {
  headless?: boolean;               // ← JSON gobierna (true/false)
  channel?: BrowserChannel;         // ← 'chromium' | 'chrome' | 'msedge' | 'firefox' | 'webkit'
  viewport?: { width: number; height: number };
  slowMo?: number;
  downloadsPath?: string;

  // Extensiones flexibles traídas desde tu JSON:
  args?: string[];                  // ← se fusiona en LaunchOptions
  launchOptions?: LaunchOptions;    // ← idem (ej. executablePath, env, devtools, etc.)
}
