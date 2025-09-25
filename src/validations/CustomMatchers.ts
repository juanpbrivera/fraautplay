// src/validations/CustomMatchers.ts

/**
 * Matchers personalizados para validaciones especializadas
 * Complementan ElementManager sin duplicar funcionalidad
 */

// Exportar el tipo CustomMatchers para que index.ts pueda importarlo
export type CustomMatchers = {
  tenerEnUrl(expected: string | RegExp): Promise<any>;
  serFechaValida(formato?: string): Promise<any>;
  estarEnRango(min: number, max: number): Promise<any>;
  serMontoValido(moneda?: string): Promise<any>;
  tenerTextoNormalizado(expected: string): Promise<any>;
  serVisibleEn(timeout?: number): Promise<any>;
  serEmailValido(): Promise<any>;
  serTelefonoValido(pais?: string): Promise<any>;
};

export function registerCustomMatchers(): void {
  const anyExpect: any = (globalThis as any)?.expect;
  if (!anyExpect || typeof anyExpect.extend !== 'function') return;

  anyExpect.extend({
    /**
     * Verifica que la URL de la página contiene una parte específica
     * Útil cuando no necesitas validar la URL completa
     */
    async tenerEnUrl(page: any, expected: string | RegExp) {
      const url = await page.url();
      const contiene = typeof expected === 'string' 
        ? url.includes(expected) 
        : expected.test(url);
      
      return {
        pass: contiene,
        message: () => contiene
          ? `URL "${url}" contiene ${typeof expected === 'string' ? `"${expected}"` : expected}`
          : `URL "${url}" NO contiene ${typeof expected === 'string' ? `"${expected}"` : expected}`
      };
    },

    /**
     * Valida que el texto tenga formato de fecha válido
     */
    async serFechaValida(received: string, formato: string = 'DD/MM/YYYY') {
      const formatos: Record<string, { regex: RegExp; ejemplo: string }> = {
        'DD/MM/YYYY': {
          regex: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d{4}$/,
          ejemplo: '31/12/2024'
        },
        'DD-MM-YYYY': {
          regex: /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/,
          ejemplo: '31-12-2024'
        },
        'YYYY-MM-DD': {
          regex: /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/,
          ejemplo: '2024-12-31'
        },
        'MM/DD/YYYY': {
          regex: /^(0[1-9]|1[012])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/,
          ejemplo: '12/31/2024'
        }
      };
      
      const formatoConfig = formatos[formato] || formatos['DD/MM/YYYY'];
      const esValido = formatoConfig.regex.test(received);
      
      return {
        pass: esValido,
        message: () => esValido
          ? `"${received}" tiene formato de fecha válido (${formato})`
          : `"${received}" NO tiene formato de fecha válido. Formato esperado: ${formato} (ejemplo: ${formatoConfig.ejemplo})`
      };
    },

    /**
     * Compara textos ignorando espacios extras, saltos de línea y mayúsculas
     * Útil cuando el texto puede venir con formato inconsistente
     */
    async tenerTextoNormalizado(received: any, expected: string) {
      // Obtener texto del elemento o string directo
      let textoActual: string;
      if (received && typeof received.textContent === 'function') {
        textoActual = await received.textContent() || '';
      } else if (received && typeof received.innerText === 'function') {
        textoActual = await received.innerText() || '';
      } else {
        textoActual = String(received);
      }
      
      // Normalizar ambos textos (quitar espacios extras y trim)
      const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim().toLowerCase();
      const textoNormalizado = normalizar(textoActual);
      const esperadoNormalizado = normalizar(expected);
      
      const coincide = textoNormalizado === esperadoNormalizado;
      
      return {
        pass: coincide,
        message: () => coincide
          ? `Texto normalizado coincide: "${textoNormalizado}"`
          : `Texto normalizado NO coincide.\n  Actual: "${textoNormalizado}"\n  Esperado: "${esperadoNormalizado}"`
      };
    },

    /**
     * Verifica que un elemento se vuelva visible dentro de un tiempo específico
     * Diferente a verificarVisible porque permite timeout dinámico
     */
    async serVisibleEn(locator: any, timeout: number = 2000) {
      let esVisible = false;
      
      if (locator && typeof locator.waitFor === 'function') {
        try {
          await locator.waitFor({ state: 'visible', timeout });
          esVisible = true;
        } catch {
          esVisible = false;
        }
      }
      
      return {
        pass: esVisible,
        message: () => esVisible
          ? `Elemento se hizo visible dentro de ${timeout}ms`
          : `Elemento NO se hizo visible dentro de ${timeout}ms`
      };
    },

    /**
     * Valida que un texto sea un email válido
     */
    async serEmailValido(received: string) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const esValido = emailRegex.test(received.trim());
      
      return {
        pass: esValido,
        message: () => esValido
          ? `"${received}" es un email válido`
          : `"${received}" NO es un formato de email válido`
      };
    },


  });
}

// ─────────────── Declaración de tipos para autocompletado ───────────────
declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      tenerEnUrl(expected: string | RegExp): Promise<R>;
      serFechaValida(formato?: string): Promise<R>;
      estarEnRango(min: number, max: number): Promise<R>;
      serMontoValido(moneda?: string): Promise<R>;
      tenerTextoNormalizado(expected: string): Promise<R>;
      serVisibleEn(timeout?: number): Promise<R>;
      serEmailValido(): Promise<R>;
      serTelefonoValido(pais?: string): Promise<R>;
    }
  }
}

export {};