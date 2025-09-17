/**
 * 🎯 FrameworkTypes.ts
 * 
 * Este archivo contiene TODOS los tipos e interfaces que usará nuestro framework.
 * Es como un diccionario que define qué forma tienen nuestros datos.
 * 
 * ¿Por qué es importante?
 * - TypeScript nos ayuda a prevenir errores antes de ejecutar el código
 * - Hace que nuestro código sea más fácil de entender y mantener
 * - Proporciona autocompletado en el IDE
 */

import { Page, Browser, BrowserContext, Locator } from '@playwright/test';

/**
 * 🌐 Tipos de navegadores soportados
 * Estos son los navegadores que nuestro framework puede automatizar
 */
export type BrowserType = 'chromium' | 'firefox' | 'webkit' | 'chrome' | 'edge';

/**
 * 📱 Tipos de dispositivos para emulación
 * Permite simular diferentes dispositivos móviles y tablets
 */
export type DeviceType = 'Desktop' | 'iPhone 12' | 'iPhone 13' | 'Pixel 5' | 'iPad Pro' | 'Galaxy S21';

/**
 * 🔍 Estrategias de localización de elementos
 * Diferentes formas de encontrar elementos en la página
 */
export enum LocatorStrategy {
    CSS = 'css',              // Selector CSS: '#id', '.class', 'button[type="submit"]'
    XPATH = 'xpath',          // XPath: '//button[@id="submit"]'
    TEXT = 'text',            // Texto visible: 'Click me'
    ROLE = 'role',            // ARIA role: 'button', 'navigation'
    TEST_ID = 'data-testid',  // Data attribute para testing: 'submit-button'
    PLACEHOLDER = 'placeholder', // Placeholder de inputs: 'Enter email'
    ALT_TEXT = 'alt',         // Alt text de imágenes
    TITLE = 'title',          // Title attribute
    LABEL = 'label'           // Label de formularios
}

/**
 * ⏱️ Estrategias de espera
 * Define cómo esperamos a que los elementos estén listos
 */
export enum WaitStrategy {
    VISIBLE = 'visible',           // Espera a que sea visible
    HIDDEN = 'hidden',             // Espera a que esté oculto
    ATTACHED = 'attached',         // Espera a que esté en el DOM
    DETACHED = 'detached',         // Espera a que NO esté en el DOM
    ENABLED = 'enabled',           // Espera a que esté habilitado
    DISABLED = 'disabled',         // Espera a que esté deshabilitado
    STABLE = 'stable',            // Espera a que no haya animaciones
    NETWORK_IDLE = 'networkidle'  // Espera a que no haya llamadas de red
}

/**
 * 📊 Niveles de log para el sistema de logging
 */
export enum LogLevel {
    TRACE = 'trace',    // Información súper detallada
    DEBUG = 'debug',    // Información de debugging
    INFO = 'info',      // Información general
    WARN = 'warn',      // Advertencias
    ERROR = 'error',    // Errores
    FATAL = 'fatal'     // Errores críticos que detienen la ejecución
}

/**
 * 🎯 Opciones para localizar elementos
 */
export interface LocatorOptions {
    strategy: LocatorStrategy;      // Cómo buscar el elemento
    value: string;                   // Valor para buscar
    index?: number;                  // Si hay múltiples, cuál tomar (0-based)
    timeout?: number;                // Tiempo máximo de espera (ms)
    waitStrategy?: WaitStrategy;    // Estrategia de espera
    description?: string;            // Descripción legible del elemento
    parent?: LocatorOptions;        // Elemento padre (para búsquedas anidadas)
}

/**
 * 🖱️ Opciones para acciones de click
 */
export interface ClickOptions {
    button?: 'left' | 'right' | 'middle';  // Botón del mouse
    clickCount?: number;                   // Número de clicks (doble click = 2)
    delay?: number;                         // Demora entre clicks (ms)
    force?: boolean;                        // Forzar click aunque no sea clickeable
    modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>; // Teclas modificadoras
    position?: { x: number; y: number };   // Posición específica para clickear
    timeout?: number;                       // Tiempo máximo de espera
    trial?: boolean;                        // Solo simular, no ejecutar
}

/**
 * ⌨️ Opciones para escribir texto
 */
export interface TypeOptions {
    delay?: number;           // Demora entre cada tecla (ms)
    timeout?: number;         // Tiempo máximo de espera
    clearFirst?: boolean;     // Limpiar el campo antes de escribir
    pressEnter?: boolean;     // Presionar Enter al final
}

/**
 * 📸 Opciones para screenshots
 */
export interface ScreenshotOptions {
    fullPage?: boolean;              // Capturar página completa
    clip?: {                         // Capturar solo una región
        x: number;
        y: number;
        width: number;
        height: number;
    };
    quality?: number;                // Calidad para JPEG (0-100)
    type?: 'png' | 'jpeg';          // Formato de imagen
    omitBackground?: boolean;        // Omitir fondo (para PNG)
    path?: string;                   // Ruta donde guardar
    timeout?: number;                // Tiempo máximo de espera
}

/**
 * 🔄 Opciones de navegación
 */
export interface NavigationOptions {
    timeout?: number;                    // Tiempo máximo de espera
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; // Cuándo considerar cargada la página
    referer?: string;                    // Referer header
}

/**
 * 🎯 Resultado de una acción
 */
export interface ActionResult<T = any> {
    success: boolean;        // Si la acción fue exitosa
    data?: T;               // Datos devueltos (si aplica)
    error?: Error;          // Error (si falló)
    duration?: number;      // Tiempo que tomó (ms)
    screenshot?: string;    // Path del screenshot (si se tomó)
    timestamp: Date;        // Cuándo ocurrió
    details?: string;       // Detalles adicionales
}

/**
 * 📋 Contexto de la sesión actual
 */
export interface SessionContext {
    id: string;                     // ID único de la sesión
    browser: Browser;                // Instancia del navegador
    context: BrowserContext;         // Contexto del navegador
    page: Page;                      // Página actual
    startTime: Date;                 // Hora de inicio
    metadata?: Record<string, any>; // Metadata adicional
    screenshots: string[];           // Screenshots tomados
    videos?: string[];               // Videos grabados
}

/**
 * 🔧 Configuración del navegador
 */
export interface BrowserConfig {
    type: BrowserType;              // Tipo de navegador
    headless?: boolean;             // Modo headless (sin UI)
    slowMo?: number;                // Ralentizar acciones (ms)
    timeout?: number;               // Timeout global
    viewport?: {                    // Tamaño de ventana
        width: number;
        height: number;
    };
    deviceScaleFactor?: number;     // Factor de escala (para HiDPI)
    isMobile?: boolean;             // Emular dispositivo móvil
    hasTouch?: boolean;             // Soportar eventos touch
    locale?: string;                // Idioma (ej: 'es-ES')
    timezoneId?: string;            // Zona horaria
    geolocation?: {                 // Ubicación GPS
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    permissions?: string[];         // Permisos del navegador
    extraHTTPHeaders?: Record<string, string>; // Headers HTTP adicionales
    httpCredentials?: {             // Credenciales HTTP Basic
        username: string;
        password: string;
    };
    proxy?: {                       // Configuración de proxy
        server: string;
        username?: string;
        password?: string;
        bypass?: string;
    };
    recordVideo?: {                 // Grabar video
        dir: string;
        size?: { width: number; height: number };
    };
    userAgent?: string;             // User agent personalizado
    bypassCSP?: boolean;            // Ignorar Content Security Policy
    javaScriptEnabled?: boolean;    // Habilitar JavaScript
    acceptDownloads?: boolean;      // Aceptar descargas
    ignoreHTTPSErrors?: boolean;    // Ignorar errores HTTPS
    offline?: boolean;              // Simular modo offline
    colorScheme?: 'light' | 'dark' | 'no-preference'; // Tema
}

/**
 * 🎯 Opciones para validaciones
 */
export interface ValidationOptions {
    timeout?: number;               // Tiempo máximo de espera
    interval?: number;              // Intervalo entre reintentos
    message?: string;               // Mensaje personalizado de error
    screenshot?: boolean;           // Tomar screenshot si falla
    soft?: boolean;                 // No detener la ejecución si falla
}

/**
 * 📊 Resultado de validación
 */
export interface ValidationResult {
    passed: boolean;                // Si pasó la validación
    actual: any;                    // Valor actual encontrado
    expected: any;                  // Valor esperado
    message?: string;               // Mensaje descriptivo
    screenshot?: string;            // Path del screenshot
    duration: number;               // Tiempo que tomó (ms)
}

/**
 * 🔄 Estado del elemento
 */
export interface ElementState {
    exists: boolean;                // Si existe en el DOM
    visible: boolean;               // Si es visible
    enabled: boolean;               // Si está habilitado
    checked?: boolean;              // Si está marcado (checkbox/radio)
    selected?: boolean;             // Si está seleccionado (option)
    focused?: boolean;              // Si tiene el foco
    editable?: boolean;             // Si es editable
    text?: string;                  // Texto contenido
    value?: string;                 // Valor (inputs)
    placeholder?: string;           // Placeholder
    href?: string;                  // URL (links)
    src?: string;                   // Source (images/videos)
    alt?: string;                   // Alt text
    title?: string;                 // Title attribute
    role?: string;                  // ARIA role
    ariaLabel?: string;             // ARIA label
    tagName?: string;               // Nombre del tag HTML
    className?: string;             // Clases CSS
    id?: string;                    // ID del elemento
    attributes?: Record<string, string>; // Todos los atributos
    boundingBox?: {                 // Posición y tamaño
        x: number;
        y: number;
        width: number;
        height: number;
    };
    styles?: Record<string, string>; // Estilos computados
}

/**
 * 📁 Opciones para manejo de archivos
 */
export interface FileOptions {
    encoding?: BufferEncoding;      // Codificación del archivo
    flag?: string;                   // Flags de apertura
    mode?: number;                   // Permisos del archivo
}

/**
 * 📊 Datos CSV parseados
 */
export interface CSVData {
    headers: string[];              // Nombres de las columnas
    rows: Record<string, any>[];    // Filas como objetos
    totalRows: number;              // Total de filas
    source: string;                 // Path del archivo fuente
}

/**
 * 🎨 Opciones de formato para logs
 */
export interface LogFormatOptions {
    colorize?: boolean;             // Usar colores
    translateTime?: boolean | string; // Formato de tiempo
    ignore?: string;                // Campos a ignorar
    messageKey?: string;            // Key del mensaje
    levelKey?: string;              // Key del nivel
    timestampKey?: string;          // Key del timestamp
    errorLikeObjectKeys?: string[]; // Keys de objetos error
    messageFormat?: string;         // Formato del mensaje
    singleLine?: boolean;           // Todo en una línea
}

/**
 * 🔐 Contexto de seguridad
 */
export interface SecurityContext {
    cookies?: Array<{               // Cookies a establecer
        name: string;
        value: string;
        domain?: string;
        path?: string;
        expires?: number;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'Strict' | 'Lax' | 'None';
    }>;
    localStorage?: Record<string, string>;  // LocalStorage items
    sessionStorage?: Record<string, string>; // SessionStorage items
    permissions?: string[];         // Permisos del navegador
}

/**
 * 📈 Métricas de rendimiento
 */
export interface PerformanceMetrics {
    domContentLoaded?: number;      // Tiempo hasta DOMContentLoaded
    load?: number;                  // Tiempo hasta load event
    firstPaint?: number;            // Tiempo hasta first paint
    firstContentfulPaint?: number;  // Tiempo hasta FCP
    largestContentfulPaint?: number; // Tiempo hasta LCP
    firstInputDelay?: number;       // FID
    cumulativeLayoutShift?: number; // CLS
    timeToInteractive?: number;     // TTI
    totalBlockingTime?: number;     // TBT
    speedIndex?: number;            // Speed Index
    memoryUsage?: {                 // Uso de memoria
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
    };
}

/**
 * 🚨 Tipo de error personalizado del framework
 */
export class FrameworkError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any,
        public screenshot?: string
    ) {
        super(message);
        this.name = 'FrameworkError';
    }
}

/**
 * 🎯 Códigos de error estándar
 */
export enum ErrorCode {
    ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
    TIMEOUT = 'TIMEOUT',
    NAVIGATION_FAILED = 'NAVIGATION_FAILED',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    BROWSER_ERROR = 'BROWSER_ERROR',
    CONFIG_ERROR = 'CONFIG_ERROR',
    FILE_ERROR = 'FILE_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}