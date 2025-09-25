// src/elements/ElementManager.ts

import { Page, Locator } from 'playwright';
import { expect } from '@playwright/test';
import { Locators } from './Locators';
import { LoggerFactory } from '../core/logging/LoggerFactory';

export class ElementManager {
  private page: Page;
  private logger = LoggerFactory.getLogger('ElementManager');
  private defaultTimeout: number = 30000;

  constructor(page: Page, options?: { defaultTimeout?: number }) {
    this.page = page;
    this.defaultTimeout = options?.defaultTimeout ?? 30000;
  }

  /**
   * Convierte cualquier locator al formato de Playwright
   */
  private obtenerElemento(locator: any): Locator {
    return Locators.getLocator(this.page, locator);
  }

  // ═══════════════════════════════════════════════════════════════════
  // ACCIONES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Hacer clic en un elemento
   */
  async hacerClic(locator: any): Promise<void> {
    await this.obtenerElemento(locator).click({ timeout: this.defaultTimeout });
  }

  /**
   * Hacer doble clic en un elemento
   */
  async dobleClic(locator: any): Promise<void> {
    await this.obtenerElemento(locator).dblclick({ timeout: this.defaultTimeout });
  }

  /**
   * Hacer clic derecho en un elemento
   */
  async clicDerecho(locator: any): Promise<void> {
    await this.obtenerElemento(locator).click({ button: 'right', timeout: this.defaultTimeout });
  }

  /**
   * Escribir texto en un campo
   * @param locator - Elemento donde escribir
   * @param texto - Texto a escribir
   * @param limpiarPrimero - Si se debe limpiar el campo antes de escribir
   */
  async escribir(locator: any, texto: string, limpiarPrimero?: boolean): Promise<void> {
    const element = this.obtenerElemento(locator);
    if (limpiarPrimero) {
      await element.clear();
    }
    await element.type(texto, { timeout: this.defaultTimeout });
  }

  /**
   * Llenar un campo de texto (reemplaza todo el contenido)
   */
  async llenar(locator: any, texto: string): Promise<void> {
    await this.obtenerElemento(locator).fill(texto);
  }

  /**
   * Limpiar el contenido de un campo
   */
  async limpiar(locator: any): Promise<void> {
    await this.obtenerElemento(locator).clear();
  }

  /**
   * Seleccionar una o varias opciones de un menú desplegable
   */
  async seleccionarOpcion(locator: any, valor: string | string[]): Promise<void> {
    await this.obtenerElemento(locator).selectOption(valor);
  }

  /**
   * Marcar una casilla de verificación
   */
  async marcar(locator: any): Promise<void> {
    await this.obtenerElemento(locator).check();
  }

  /**
   * Desmarcar una casilla de verificación
   */
  async desmarcar(locator: any): Promise<void> {
    await this.obtenerElemento(locator).uncheck();
  }

  /**
   * Posicionar el cursor sobre un elemento (hover)
   */
  async posicionarSobre(locator: any): Promise<void> {
    await this.obtenerElemento(locator).hover();
  }

  /**
   * Presionar una tecla en un elemento
   */
  async presionarTecla(locator: any, tecla: string): Promise<void> {
    await this.obtenerElemento(locator).press(tecla);
  }

  /**
   * Subir uno o varios archivos
   */
  async subirArchivo(locator: any, rutaArchivo: string | string[]): Promise<void> {
    await this.obtenerElemento(locator).setInputFiles(rutaArchivo);
  }

  /**
   * Arrastrar un elemento hasta otro
   */
  async arrastrarHasta(elementoOrigen: any, elementoDestino: any): Promise<void> {
    await this.obtenerElemento(elementoOrigen).dragTo(this.obtenerElemento(elementoDestino));
  }

  /**
   * Desplazar la vista hasta un elemento
   */
  async desplazarHasta(locator: any): Promise<void> {
    await this.obtenerElemento(locator).scrollIntoViewIfNeeded();
  }

  // ═══════════════════════════════════════════════════════════════════
  // OBTENER INFORMACIÓN
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Obtener el texto de un elemento
   */
  async obtenerTexto(locator: any): Promise<string> {
    return await this.obtenerElemento(locator).textContent() ?? '';
  }

  /**
   * Obtener el valor de un campo de entrada
   */
  async obtenerValor(locator: any): Promise<string> {
    return await this.obtenerElemento(locator).inputValue();
  }

  /**
   * Obtener el valor de un atributo
   */
  async obtenerAtributo(locator: any, nombreAtributo: string): Promise<string | null> {
    return await this.obtenerElemento(locator).getAttribute(nombreAtributo);
  }

  /**
   * Contar cuántos elementos coinciden con el localizador
   */
  async contar(locator: any): Promise<number> {
    return await this.obtenerElemento(locator).count();
  }

  /**
   * Verificar si existe al menos un elemento
   */
  async existe(locator: any): Promise<boolean> {
    return await this.contar(locator) > 0;
  }

  /**
   * Verificar si un elemento es visible
   */
  async esVisible(locator: any): Promise<boolean> {
    return await this.obtenerElemento(locator).isVisible();
  }

  /**
   * Verificar si un elemento está habilitado
   */
  async estaHabilitado(locator: any): Promise<boolean> {
    return await this.obtenerElemento(locator).isEnabled();
  }

  /**
   * Verificar si una casilla está marcada
   */
  async estaMarcado(locator: any): Promise<boolean> {
    return await this.obtenerElemento(locator).isChecked();
  }

  /**
   * Capturar imagen de un elemento
   */
  async capturarImagen(locator: any, opciones?: any): Promise<Buffer> {
    return await this.obtenerElemento(locator).screenshot(opciones);
  }

  // ═══════════════════════════════════════════════════════════════════
  // ESPERAS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Esperar a que un elemento sea visible
   */
  async esperarVisible(locator: any): Promise<void> {
    await this.obtenerElemento(locator).waitFor({ 
      state: 'visible', 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Esperar a que un elemento esté oculto
   */
  async esperarOculto(locator: any): Promise<void> {
    await this.obtenerElemento(locator).waitFor({ 
      state: 'hidden', 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Esperar a que un elemento esté habilitado
   */
  async esperarHabilitado(locator: any): Promise<void> {
    const element = this.obtenerElemento(locator);
    await element.waitFor({ state: 'visible', timeout: this.defaultTimeout });
    await expect(element).toBeEnabled({ timeout: this.defaultTimeout });
  }

  /**
   * Esperar a que un elemento esté presente en el DOM
   */
  async esperarPresente(locator: any): Promise<void> {
    await this.obtenerElemento(locator).waitFor({ 
      state: 'attached', 
      timeout: this.defaultTimeout 
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // VALIDACIONES (ASSERTIONS)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Validar que el elemento está visible
   */
  async validarVisible(locator: any): Promise<void> {
    await expect(this.obtenerElemento(locator)).toBeVisible({ 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar que el elemento está oculto
   */
  async validarOculto(locator: any): Promise<void> {
    await expect(this.obtenerElemento(locator)).toBeHidden({ 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar que el elemento tiene el texto exacto esperado
   */
  async validarTexto(locator: any, textoEsperado: string | RegExp): Promise<void> {
    await expect(this.obtenerElemento(locator)).toHaveText(textoEsperado, { 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar que el elemento contiene el texto
   */
  async validarContieneTexto(locator: any, texto: string): Promise<void> {
    await expect(this.obtenerElemento(locator)).toContainText(texto, { 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar que el campo tiene el valor esperado
   */
  async validarValor(locator: any, valorEsperado: string | RegExp): Promise<void> {
    await expect(this.obtenerElemento(locator)).toHaveValue(valorEsperado, { 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar que el elemento está habilitado
   */
  async validarHabilitado(locator: any): Promise<void> {
    await expect(this.obtenerElemento(locator)).toBeEnabled({ 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar que el elemento está deshabilitado
   */
  async validarDeshabilitado(locator: any): Promise<void> {
    await expect(this.obtenerElemento(locator)).toBeDisabled({ 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar que la casilla está marcada
   */
  async validarMarcado(locator: any): Promise<void> {
    await expect(this.obtenerElemento(locator)).toBeChecked({ 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar cantidad de elementos
   */
  async validarCantidad(locator: any, cantidadEsperada: number): Promise<void> {
    await expect(this.obtenerElemento(locator)).toHaveCount(cantidadEsperada, { 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar que el elemento tiene un atributo con valor específico
   */
  async validarAtributo(locator: any, nombreAtributo: string, valorEsperado: string | RegExp): Promise<void> {
    await expect(this.obtenerElemento(locator)).toHaveAttribute(nombreAtributo, valorEsperado, { 
      timeout: this.defaultTimeout 
    });
  }

  /**
   * Validar que el elemento tiene una clase CSS
   */
  async validarClase(locator: any, claseEsperada: string | RegExp): Promise<void> {
    await expect(this.obtenerElemento(locator)).toHaveClass(claseEsperada, { 
      timeout: this.defaultTimeout 
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Buscar un elemento (retorna el primer match)
   */
  async buscar(locator: any): Promise<Locator> {
    const elemento = this.obtenerElemento(locator);
    await elemento.waitFor({ state: 'attached', timeout: this.defaultTimeout });
    return elemento;
  }

  /**
   * Buscar todos los elementos que coincidan
   */
  async buscarTodos(locator: any): Promise<Locator[]> {
    const elementos = this.obtenerElemento(locator);
    const cantidad = await elementos.count();
    const resultado: Locator[] = [];
    
    for (let i = 0; i < cantidad; i++) {
      resultado.push(elementos.nth(i));
    }
    
    return resultado;
  }

  /**
   * Obtener la página actual (para casos especiales)
   */
  obtenerPagina(): Page {
    return this.page;
  }

  /**
   * Actualizar el timeout por defecto
   */
  establecerTimeout(nuevoTimeout: number): void {
    this.defaultTimeout = nuevoTimeout;
    this.logger.debug('Timeout actualizado', { nuevoTimeout });
  }
}