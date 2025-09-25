// src/core/browsers/BrowserFactory.ts
import type { Browser, LaunchOptions, BrowserType } from 'playwright';
import { chromium, firefox, webkit } from 'playwright';
import type { BrowserOptions, BrowserChannel } from './BrowserOptions';

/**
 * Fábrica de navegadores (bajo nivel).
 * Regla: el JSON gobierna. ENV (HEADLESS) solo override si tú lo defines.
 * Se respetan channel/firefox/webkit y se fusionan args/launchOptions.
 */
export class BrowserFactory {
  static async launch(
    options: Partial<BrowserOptions> = {}
  ): Promise<Browser> {
    // 1) Headless — prioridad: opciones (JSON) > ENV explícito > default(true)
    const envHeadless = process.env.HEADLESS;
    const headless =
      options.headless !== undefined
        ? options.headless
        : (typeof envHeadless !== 'undefined'
            ? envHeadless === 'true' || envHeadless === '1'
            : true);

    // 2) Canal — respeta lo que venga del JSON/options; no forzamos nada
    const channel = (options.channel ?? 'chromium') as BrowserChannel;

    // 3) slowMo para depuración
    const slowMo = options.slowMo ?? 0;

    // 4) Mezcla de argumentos/LaunchOptions provenientes del JSON
    const extraArgs: string[] | undefined = options.args;
    const extraLaunch: LaunchOptions | undefined = options.launchOptions;

    const { type, launchOpts } = this.#resolveTypeAndOptions({
      headless,
      slowMo,
      channel,
      extraArgs,
      extraLaunch,
    });

    return await type.launch(launchOpts);
  }

  // Alias ergonómicos
  static create(o?: Partial<BrowserOptions>) { return this.launch(o ?? {}); }
  static start (o?: Partial<BrowserOptions>) { return this.launch(o ?? {}); }
  static open  (o?: Partial<BrowserOptions>) { return this.launch(o ?? {}); }

  // -------------------- internos --------------------
  static #resolveTypeAndOptions(input: {
    headless: boolean;
    slowMo: number;
    channel: BrowserChannel;
    extraArgs?: string[];
    extraLaunch?: LaunchOptions;
  }): { type: BrowserType<Browser>; launchOpts: LaunchOptions } {
    const { headless, slowMo, channel, extraArgs, extraLaunch } = input;

    const common: LaunchOptions = {
      headless,
      slowMo,
      ...(extraArgs && extraArgs.length ? { args: extraArgs } : {}),
      ...(extraLaunch ?? {}),
    };

    switch (channel) {
      case 'chrome':   return { type: chromium, launchOpts: { ...common, channel: 'chrome' } };
      case 'msedge':   return { type: chromium, launchOpts: { ...common, channel: 'msedge' } };
      case 'chromium': return { type: chromium, launchOpts: { ...common } };
      case 'firefox':  return { type: firefox,  launchOpts: { ...common } };
      case 'webkit':   return { type: webkit,   launchOpts: { ...common } };
      default:         return { type: chromium, launchOpts: { ...common } };
    }
  }
}

export default BrowserFactory;
