// src/core/browsers/BrowserOptions.ts

import { BrowserOptions, BrowserType } from '../../types/FrameworkTypes';

/**
 * Clase que proporciona configuraciones predefinidas para navegadores
 * Facilita la creación de opciones comunes y personalizadas
 */
export class BrowserOptionsBuilder {
  private options: BrowserOptions;

  constructor(browserType: BrowserType = 'chromium') {
    this.options = {
      browserType,
      headless: true,
      viewport: { width: 1920, height: 1080 },
      timeout: 30000,
      ignoreHTTPSErrors: false
    };
  }

  /**
   * Configura el tipo de navegador
   */
  withBrowserType(type: BrowserType): this {
    this.options.browserType = type;
    return this;
  }

  /**
   * Configura si el navegador se ejecuta en modo headless
   */
  withHeadless(headless: boolean): this {
    this.options.headless = headless;
    return this;
  }

  /**
   * Configura el viewport del navegador
   */
  withViewport(width: number, height: number): this {
    this.options.viewport = { width, height };
    return this;
  }

  /**
   * Configura el timeout general
   */
  withTimeout(timeout: number): this {
    this.options.timeout = timeout;
    return this;
  }

  /**
   * Configura si ignorar errores HTTPS
   */
  withIgnoreHTTPSErrors(ignore: boolean): this {
    this.options.ignoreHTTPSErrors = ignore;
    return this;
  }

  /**
   * Configura argumentos adicionales del navegador
   */
  withArgs(args: string[]): this {
    this.options.args = args;
    return this;
  }

  /**
   * Configura la ruta de descargas
   */
  withDownloadsPath(path: string): this {
    this.options.downloadsPath = path;
    return this;
  }

  /**
   * Configura el locale del navegador
   */
  withLocale(locale: string): this {
    this.options.locale = locale;
    return this;
  }

  /**
   * Configura la zona horaria
   */
  withTimezone(timezone: string): this {
    this.options.timezone = timezone;
    return this;
  }

  /**
   * Configura slowMo para debugging
   */
  withSlowMo(slowMo: number): this {
    this.options.slowMo = slowMo;
    return this;
  }

  /**
   * Construye y retorna las opciones
   */
  build(): BrowserOptions {
    return { ...this.options };
  }

  /**
   * Opciones preconfiguradas para Chrome
   */
  static chrome(): BrowserOptionsBuilder {
    return new BrowserOptionsBuilder('chrome')
      .withArgs(['--disable-blink-features=AutomationControlled']);
  }

  /**
   * Opciones preconfiguradas para Firefox
   */
  static firefox(): BrowserOptionsBuilder {
    return new BrowserOptionsBuilder('firefox');
  }

  /**
   * Opciones preconfiguradas para Safari
   */
  static webkit(): BrowserOptionsBuilder {
    return new BrowserOptionsBuilder('webkit');
  }

  /**
   * Opciones preconfiguradas para Edge
   */
  static edge(): BrowserOptionsBuilder {
    return new BrowserOptionsBuilder('edge');
  }

  /**
   * Opciones para testing móvil
   */
  static mobile(): BrowserOptionsBuilder {
    return new BrowserOptionsBuilder('chromium')
      .withViewport(390, 844); // iPhone 14
  }

  /**
   * Opciones para testing de tablet
   */
  static tablet(): BrowserOptionsBuilder {
    return new BrowserOptionsBuilder('chromium')
      .withViewport(820, 1180); // iPad Air
  }

  /**
   * Opciones para debugging (visible y lento)
   */
  static debug(): BrowserOptionsBuilder {
    return new BrowserOptionsBuilder('chromium')
      .withHeadless(false)
      .withSlowMo(1000);
  }

  /**
   * Opciones para CI/CD
   */
  static ci(): BrowserOptionsBuilder {
    return new BrowserOptionsBuilder('chromium')
      .withHeadless(true)
      .withArgs(['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']);
  }
}