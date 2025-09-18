# Web Automation Framework

Framework de automatización web profesional construido con Playwright y TypeScript.

## 🚀 Características

- **🎭 Basado en Playwright**: Soporte completo para Chrome, Firefox, Safari y Edge
- **📝 TypeScript**: Type-safe con IntelliSense completo
- **🔧 Configurable**: Sistema de configuración flexible con soporte para JSON, YAML y variables de entorno
- **📊 Logging Avanzado**: Sistema de logging estructurado con Pino
- **📸 Screenshots**: Captura automática en errores y bajo demanda
- **♻️ Reintentos**: Sistema de reintentos inteligente con backoff
- **📂 Gestión de Datos**: Soporte para CSV y JSON
- **🔄 Gestión de Sesiones**: Control completo del ciclo de vida de sesiones

## 📦 Instalación

```bash
npm install @automation/web-automation-framework
```

## 🏁 Inicio Rápido

```typescript
import {
  SessionManager,
  ElementManager,
  NavigationActions,
  AssertionHelpers
} from '@automation/web-automation-framework';

// Crear una sesión
const session = await SessionManager.createSession({
  browserOptions: {
    browserType: 'chromium',
    headless: false
  }
});

// Navegar a una página
await NavigationActions.goto(session.page, 'https://example.com');

// Interactuar con elementos
const elementManager = new ElementManager(session.page);
await elementManager.click({ strategy: 'id', value: 'submit-button' });

// Validar resultados
const result = await AssertionHelpers.toHaveText(
  session.page,
  { strategy: 'css', value: '.success-message' },
  'Operation successful'
);

// Cerrar sesión
await SessionManager.closeSession(session.id);
```

## 📚 Estructura del Framework

```
src/
├── core/           # Componentes fundamentales
├── elements/       # Gestión de elementos web
├── interactions/   # Acciones de interacción
├── validations/    # Sistema de validaciones
├── utilities/      # Utilidades reutilizables
├── session/        # Gestión de sesiones
└── types/          # Definiciones TypeScript
```

## ⚙️ Configuración

### Archivo de configuración (framework.config.json)

```json
{
  "browser": {
    "browserType": "chromium",
    "headless": true,
    "viewport": { "width": 1920, "height": 1080 }
  },
  "timeouts": {
    "default": 30000,
    "navigation": 30000,
    "element": 10000
  },
  "screenshots": {
    "enabled": true,
    "onFailure": true,
    "path": "screenshots"
  },
  "logging": {
    "level": "info",
    "console": true,
    "file": true,
    "path": "logs"
  }
}
```

### Variables de entorno

```bash
BROWSER_TYPE=chromium
HEADLESS=true
BASE_URL=https://example.com
LOG_LEVEL=debug
```

## 🔍 Ejemplos de Uso

### Gestión de Elementos

```typescript
import { ElementManager, Locators } from '@automation/web-automation-framework';

const manager = new ElementManager(page);

// Diferentes estrategias de localización
const locator = Locators.byId('user-input');
await manager.type(locator, 'test@example.com');

// Esperar por elementos
await manager.waitForVisible(
  Locators.byCss('.loading-spinner'),
  { timeout: 5000 }
);

// Acciones con reintentos
await manager.withRetry(
  () => manager.click(Locators.byText('Submit')),
  { maxAttempts: 3, delay: 1000 }
);
```

### Validaciones

```typescript
import { 
  AssertionHelpers, 
  ValidationStrategies,
  CustomMatchers 
} from '@automation/web-automation-framework';

// Validaciones básicas
await AssertionHelpers.toExist(page, locator);
await AssertionHelpers.toBeVisible(page, locator);
await AssertionHelpers.toHaveText(page, locator, 'Expected text');

// Validaciones de aplicación
await ValidationStrategies.validateURL(page, /dashboard/);
await ValidationStrategies.validatePageLoaded(page);

// Matchers personalizados
await CustomMatchers.toBeValidEmail('user@example.com');
await CustomMatchers.toBeInRange(value, 1, 100);
```

### Gestión de Datos

```typescript
import { DataManager } from '@automation/web-automation-framework';

// Cargar datos de prueba
const users = await DataManager.loadCSV('test-users.csv');
const config = await DataManager.loadJSON('test-config.json');

// Usar datos en pruebas
for (const user of users) {
  await elementManager.type(emailLocator, user.email);
  await elementManager.type(passwordLocator, user.password);
}
```

## 🛠️ Scripts Disponibles

```bash
# Compilar el proyecto
npm run build

# Limpiar archivos compilados
npm run clean

# Ejecutar linting
npm run lint

# Generar documentación
npm run docs
```

## 📖 API Documentation

La documentación completa de la API está disponible en `docs/api/index.html` después de ejecutar `npm run docs`.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - vea el archivo `LICENSE` para más detalles.

## 🔗 Enlaces

- [Playwright Documentation](https://playwright.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [Pino Logger](https://getpino.io)

## 💡 Soporte

Para reportar bugs o solicitar features, por favor abra un issue en el repositorio.