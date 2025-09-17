# 🚀 Web Automation Framework

<div align="center">
  
[![npm version](https://img.shields.io/npm/v/@banco/web-automation-framework.svg)](https://www.npmjs.com/package/@banco/web-automation-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.48+-green.svg)](https://playwright.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

Framework empresarial de automatización web basado en **Playwright**, diseñado para ser consumido por múltiples soluciones de automatización (Cucumber, Playwright-BDD, etc.).

</div>

## 📋 Tabla de Contenidos

- [✨ Características](#-características)
- [🚀 Inicio Rápido](#-inicio-rápido)
- [📦 Instalación](#-instalación)
- [🔧 Configuración](#-configuración)
- [💻 Uso Básico](#-uso-básico)
- [📚 API Completa](#-api-completa)
- [🏗️ Arquitectura](#️-arquitectura)
- [🧪 Integración con Frameworks de Testing](#-integración-con-frameworks-de-testing)
- [📊 Reportes y Métricas](#-reportes-y-métricas)
- [🤝 Contribución](#-contribución)
- [📄 Licencia](#-licencia)

## ✨ Características

### 🎯 Core Features

- **🌐 Multi-navegador**: Soporte completo para Chrome, Firefox, Safari y Edge
- **📱 Multi-dispositivo**: Emulación de dispositivos móviles y tablets
- **🔄 Gestión de Sesiones**: Manejo aislado de sesiones para ejecución paralela
- **⏱️ Esperas Inteligentes**: Sistema avanzado de esperas y timeouts
- **📸 Screenshots Automáticos**: Captura automática en errores y puntos clave
- **📊 Data-Driven Testing**: Soporte nativo para CSV y datos estructurados
- **🔐 Seguridad**: Configuración segura por defecto, sin vulnerabilidades conocidas

### 🛠️ Características Técnicas

- **TypeScript**: 100% tipado con TypeScript para mejor DX
- **Modular**: Arquitectura modular y extensible
- **Configurable**: Sistema de configuración flexible (JSON/YAML/ENV)
- **Logging**: Sistema de logging estructurado con Pino
- **Sin Dependencias Vulnerables**: Auditoría de seguridad continua
- **Tree-shaking**: Optimizado para incluir solo el código necesario

## 🚀 Inicio Rápido

```typescript
import { WebAutomationFramework } from '@banco/web-automation-framework';

// Inicializar el framework
const framework = await WebAutomationFramework.initialize({
  environment: { 
    name: 'test', 
    baseUrl: 'https://example.com' 
  },
  browser: { 
    type: 'chromium', 
    headless: false 
  }
});

// Crear sesión
const session = await framework.createSession({
  name: 'Mi Primera Prueba'
});

// Navegar y realizar acciones
await session.navigation.goto('https://example.com');
await session.elements.click({ 
  strategy: 'css', 
  value: '#login-button' 
});
await session.input.typeText(
  { strategy: 'css', value: '#username' }, 
  'usuario@ejemplo.com'
);

// Validaciones
await session.assertions.toBeVisible({ 
  strategy: 'css', 
  value: '.dashboard' 
});

// Cerrar sesión
await session.close();
```

## 📦 Instalación

### Requisitos Previos

- Node.js 18 o superior
- npm 9 o superior

### Instalación via NPM

```bash
npm install @banco/web-automation-framework
```

### Instalación via Yarn

```bash
yarn add @banco/web-automation-framework
```

### Instalación de Navegadores

```bash
# Instalar navegadores de Playwright
npx playwright install
```

## 🔧 Configuración

### Archivo de Configuración (framework.config.json)

```json
{
  "browser": {
    "type": "chromium",
    "headless": false,
    "viewport": { "width": 1920, "height": 1080 }
  },
  "timeouts": {
    "default": 30000,
    "navigation": 30000,
    "element": 10000
  },
  "screenshots": {
    "enabled": true,
    "onError": true,
    "path": "./screenshots"
  },
  "logging": {
    "level": "info",
    "console": true,
    "file": true,
    "filePath": "./logs/framework.log"
  },
  "environment": {
    "name": "test",
    "baseUrl": "https://test.example.com"
  }
}
```

### Variables de Entorno

```bash
# .env
FRAMEWORK_BROWSER_TYPE=chromium
FRAMEWORK_BROWSER_HEADLESS=false
FRAMEWORK_BASE_URL=https://test.example.com
FRAMEWORK_LOG_LEVEL=debug
```

### Configuración Programática

```typescript
const framework = await WebAutomationFramework.initialize({
  browser: {
    type: 'firefox',
    headless: true
  },
  timeouts: {
    default: 60000
  }
});
```

## 💻 Uso Básico

### Gestión de Elementos

```typescript
// Buscar elemento por CSS
await session.elements.click({ 
  strategy: 'css', 
  value: '.submit-button' 
});

// Buscar por texto
await session.elements.click({ 
  strategy: 'text', 
  value: 'Enviar' 
});

// Buscar por data-testid
await session.elements.click({ 
  strategy: 'data-testid', 
  value: 'submit-form' 
});

// Esperar elemento
await session.elements.waitToAppear({ 
  strategy: 'css', 
  value: '.loading', 
  timeout: 5000 
});
```

### Navegación

```typescript
// Navegar a URL
await session.navigation.goto('https://example.com');

// Navegar hacia atrás/adelante
await session.navigation.goBack();
await session.navigation.goForward();

// Recargar página
await session.navigation.reload();

// Manejar múltiples pestañas
const newTab = await session.navigation.openNewTab('https://example.com');
await session.navigation.switchToTab(newTab);
await session.navigation.closeTab();
```

### Entrada de Datos

```typescript
// Escribir texto
await session.input.typeText(
  { strategy: 'css', value: '#email' },
  'user@example.com',
  { clearFirst: true }
);

// Limpiar campo
await session.input.clearText({ strategy: 'css', value: '#email' });

// Teclas especiales
await session.input.pressSpecialKey('enter');
await session.input.typeKeyCombo('Control+A');
```

### Validaciones

```typescript
// Verificar visibilidad
await session.assertions.toBeVisible({ 
  strategy: 'css', 
  value: '.success-message' 
});

// Verificar texto
await session.assertions.toHaveText(
  { strategy: 'css', value: 'h1' },
  'Welcome'
);

// Verificar atributo
await session.assertions.toHaveAttribute(
  { strategy: 'css', value: 'input' },
  'disabled'
);

// Validación personalizada
await session.validations.validateForm('#login-form', [
  { field: 'email', selector: '#email', required: true, type: 'email' },
  { field: 'password', selector: '#password', required: true, minLength: 8 }
]);
```

### Screenshots

```typescript
// Screenshot manual
await session.screenshots.capture('estado-inicial');

// Screenshot de elemento específico
await session.screenshots.captureElement(
  { strategy: 'css', value: '.chart' },
  'grafico-ventas'
);

// Screenshot con anotaciones
await session.screenshots.captureAdvanced({
  name: 'error-validacion',
  fullPage: true,
  annotate: {
    text: 'Error detectado aquí',
    position: 'top',
    color: 'red'
  }
});
```

### Gestión de Datos CSV

```typescript
// Cargar datos desde CSV
const usuarios = await session.data.loadCSV('usuarios.csv');

// Iterar sobre datos
for await (const { data, index } of session.data.getDataIterator('usuarios.csv')) {
  await session.input.typeText(
    { strategy: 'css', value: '#username' },
    data.username
  );
  await session.input.typeText(
    { strategy: 'css', value: '#password' },
    data.password
  );
  await session.elements.click({ strategy: 'css', value: '#login' });
}
```

## 📚 API Completa

### SessionManager

```typescript
// Crear sesión
const session = await framework.createSession(options);

// Métodos disponibles
session.navigation    // Acciones de navegación
session.elements      // Gestión de elementos
session.input        // Entrada de datos
session.gestures     // Gestos y scroll
session.assertions   // Validaciones básicas
session.validations  // Validaciones complejas
session.screenshots  // Capturas de pantalla
session.data        // Manejo de datos
session.files       // Gestión de archivos
```

### BrowserFactory

```typescript
// Presets disponibles
BrowserPresets.PERFORMANCE   // Máximo rendimiento
BrowserPresets.DEBUG        // Para debugging
BrowserPresets.CI           // Para CI/CD
BrowserPresets.MOBILE       // Testing móvil

// Device profiles
DeviceProfiles.IPHONE_13
DeviceProfiles.GALAXY_S21
DeviceProfiles.IPAD_PRO
```

## 🏗️ Arquitectura

```
Framework de Automatización
├── Core                    # Componentes fundamentales
│   ├── BrowserFactory     # Gestión de navegadores
│   ├── ConfigManager      # Configuración
│   └── Logger            # Sistema de logging
├── Elements               # Gestión de elementos web
│   ├── ElementManager    # API principal
│   ├── Locators         # Estrategias de localización
│   └── WaitStrategies   # Esperas inteligentes
├── Interactions          # Acciones
│   ├── NavigationActions
│   ├── GestureActions
│   └── InputActions
├── Validations          # Sistema de validaciones
│   ├── AssertionHelpers
│   └── ValidationStrategies
└── Utilities            # Utilidades
    ├── DataManager      # Gestión de datos
    ├── ScreenshotHelper
    └── FileUtils
```

## 🧪 Integración con Frameworks de Testing

### Con Cucumber

```typescript
// steps/login.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { WebAutomationFramework } from '@banco/web-automation-framework';

let session;

Given('que estoy en la página de login', async () => {
  const framework = await WebAutomationFramework.initialize();
  session = await framework.createSession();
  await session.navigation.goto('/login');
});

When('ingreso mis credenciales', async () => {
  await session.input.typeText(
    { strategy: 'css', value: '#username' },
    'usuario'
  );
  await session.input.typeText(
    { strategy: 'css', value: '#password' },
    'password'
  );
});

Then('debería ver el dashboard', async () => {
  await session.assertions.toBeVisible({ 
    strategy: 'css', 
    value: '.dashboard' 
  });
});
```

### Con Playwright Test

```typescript
import { test, expect } from '@playwright/test';
import { WebAutomationFramework } from '@banco/web-automation-framework';

test.describe('Login Tests', () => {
  let framework;
  let session;
  
  test.beforeAll(async () => {
    framework = await WebAutomationFramework.initialize();
  });
  
  test.beforeEach(async () => {
    session = await framework.createSession();
  });
  
  test.afterEach(async () => {
    await session.close();
  });
  
  test('Login exitoso', async () => {
    await session.navigation.goto('/login');
    await session.input.typeText(
      { strategy: 'css', value: '#username' },
      'usuario'
    );
    await session.assertions.toBeVisible({ 
      strategy: 'css', 
      value: '.dashboard' 
    });
  });
});
```

## 📊 Reportes y Métricas

### Métricas de Sesión

```typescript
const metrics = session.getMetrics();
console.log(metrics);
// {
//   pagesVisited: 5,
//   actionsPerformed: 23,
//   assertionsPassed: 10,
//   assertionsFailed: 0,
//   duration: 45000
// }
```

### Estadísticas del Framework

```typescript
const stats = framework.getStats();
console.log(stats);
// {
//   sessions: 3,
//   browsers: { active: 2, total: 5 },
//   config: { environment: 'test', browser: 'chromium' }
// }
```

## 🔒 Mejores Prácticas

1. **Usa data-testid**: Preferir `data-testid` sobre selectores CSS complejos
2. **Esperas explícitas**: Usar `waitFor` en lugar de `sleep`
3. **Manejo de errores**: Siempre manejar errores con try-catch
4. **Screenshots en errores**: Configurar `screenshots.onError = true`
5. **Logging estructurado**: Usar el logger del framework
6. **Sesiones aisladas**: Una sesión por test para evitar interferencias

## 🐛 Debugging

### Modo Debug

```typescript
const framework = await WebAutomationFramework.initialize({
  browser: { headless: false, slowMo: 100 },
  debug: { 
    enabled: true, 
    pauseOnError: true 
  },
  logging: { level: 'debug' }
});
```

### Tracing

```typescript
const session = await framework.createSession({
  tracingEnabled: true
});
// El trace se guardará en ./traces/
```

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Versionado

Usamos [SemVer](http://semver.org/) para el versionado.

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- Equipo de [Playwright](https://playwright.dev/)
- Comunidad de TypeScript
- Todos los contribuidores

## 📞 Soporte

- 📧 Email: automation@banco.com
- 💬 Slack: #web-automation-framework
- 📚 [Documentación completa](https://docs.banco.com/automation)
- 🐛 [Reportar bugs](https://github.com/banco/web-automation-framework/issues)

---

<div align="center">
  Hecho con ❤️ por el Equipo de Automatización
</div>