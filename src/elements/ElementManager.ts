// src/elements/ElementManager.ts

import { Page, Locator } from 'playwright';
import { expect } from '@playwright/test';
import { Locators } from './Locators';
import { LoggerFactory } from '../core/logging/LoggerFactory';

/**
 * ElementManager - API completa en español para automatizadores
 * Centraliza acciones, consultas y verificaciones
 */
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

  async hacerClic(locator: any): Promise<void> {
    await this.obtenerElemento(locator).click({ timeout: this.defaultTimeout });
  }

  async dobleClic(locator: any): Promise<void> {
    await this.obtenerElemento(locator).dblclick({ timeout: this.defaultTimeout });
  }

  async clicDerecho(locator: any): Promise<void> {
    await this.obtenerElemento(locator).click({ button: 'right', timeout: this.defaultTimeout });
  }

  async escribir(locator: any, texto: string, limpiarPrimero?: boolean): Promise<void> {
    const element = this.obtenerElemento(locator);
    if (limpiarPrimero) {
      await element.clear();
    }
    await element.type(texto, { timeout: this.defaultTimeout });
  }

  async llenar(locator: any, texto: string): Promise<void> {
    await this.obtenerElemento(locator).fill(texto);
  }

  async limpiar(locator: any): Promise<void> {
    await this.obtenerElemento(locator).clear();
  }

  async seleccionarOpcion(locator: any, valor: string | string[]): Promise<void> {
    await this.obtenerElemento(locator).selectOption(valor);
  }

  async marcar(locator: any): Promise<void> {
    await this.obtenerElemento(locator).check();
  }

  async desmarcar(locator: any): Promise<void> {
    await this.obtenerElemento(locator).uncheck();
  }

  async posicionarSobre(locator: any): Promise<void> {
    await this.obtenerElemento(locator).hover();
  }

  async presionarTecla(locator: any, tecla: string): Promise<void> {
    await this.obtenerElemento(locator).press(tecla);
  }

  async subirArchivo(locator: any, rutaArchivo: string | string[]): Promise<void> {
    await this.obtenerElemento(locator).setInputFiles(rutaArchivo);
  }

  async arrastrarHasta(elementoOrigen: any, elementoDestino: any): Promise<void> {
    await this.obtenerElemento(elementoOrigen).dragTo(this.obtenerElemento(elementoDestino));
  }

  async desplazarHasta(locator: any): Promise<void> {
    await this.obtenerElemento(locator).scrollIntoViewIfNeeded();
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONSULTAS (Obtener información)
  // ═══════════════════════════════════════════════════════════════════

  async obtenerTexto(locator: any): Promise<string> {
    return await this.obtenerElemento(locator).textContent() ?? '';
  }

  async obtenerValor(locator: any): Promise<string> {
    return await this.obtenerElemento(locator).inputValue();
  }

  async obtenerAtributo(locator: any, nombreAtributo: string): Promise<string | null> {
    return await this.obtenerElemento(locator).getAttribute(nombreAtributo);
  }

  async contar(locator: any): Promise<number> {
    return await this.obtenerElemento(locator).count();
  }

  async existe(locator: any): Promise<boolean> {
    return await this.contar(locator) > 0;
  }

  async esVisible(locator: any): Promise<boolean> {
    return await this.obtenerElemento(locator).isVisible();
  }

  async estaHabilitado(locator: any): Promise<boolean> {
    return await this.obtenerElemento(locator).isEnabled();
  }

  async estaMarcado(locator: any): Promise<boolean> {
    return await this.obtenerElemento(locator).isChecked();
  }

  // ═══════════════════════════════════════════════════════════════════
  // ESPERAS
  // ═══════════════════════════════════════════════════════════════════

  async esperarVisible(locator: any): Promise<void> {
    await this.obtenerElemento(locator).waitFor({ 
      state: 'visible', 
      timeout: this.defaultTimeout 
    });
  }

  async esperarOculto(locator: any): Promise<void> {
    await this.obtenerElemento(locator).waitFor({ 
      state: 'hidden', 
      timeout: this.defaultTimeout 
    });
  }

  async esperarHabilitado(locator: any): Promise<void> {
    const element = this.obtenerElemento(locator);
    await element.waitFor({ state: 'visible', timeout: this.defaultTimeout });
    await expect(element).toBeEnabled({ timeout: this.defaultTimeout });
  }

  async esperarPresente(locator: any): Promise<void> {
    await this.obtenerElemento(locator).waitFor({ 
      state: 'attached', 
      timeout: this.defaultTimeout 
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // VERIFICACIONES (Assertions que detienen la prueba si fallan)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Verifica que el elemento es visible (detiene prueba si falla)
   */
  async verificarVisible(locator: any, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toBeVisible({ timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el elemento está oculto (detiene prueba si falla)
   */
  async verificarOculto(locator: any, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toBeHidden({ timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el elemento tiene texto específico (detiene prueba si falla)
   */
  async verificarTexto(locator: any, textoEsperado: string | RegExp, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toHaveText(textoEsperado, { timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el elemento contiene texto (detiene prueba si falla)
   */
  async verificarContieneTexto(locator: any, texto: string, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toContainText(texto, { timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el elemento está habilitado (detiene prueba si falla)
   */
  async verificarHabilitado(locator: any, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toBeEnabled({ timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el elemento está deshabilitado (detiene prueba si falla)
   */
  async verificarDeshabilitado(locator: any, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toBeDisabled({ timeout: this.defaultTimeout });
  }

  /**
   * Verifica que la casilla está marcada (detiene prueba si falla)
   */
  async verificarMarcado(locator: any, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toBeChecked({ timeout: this.defaultTimeout });
  }

  /**
   * Verifica que la casilla NO está marcada (detiene prueba si falla)
   */
  async verificarNoMarcado(locator: any, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .not.toBeChecked({ timeout: this.defaultTimeout });
  }

  /**
   * Verifica cantidad de elementos (detiene prueba si falla)
   */
  async verificarCantidad(locator: any, cantidadEsperada: number, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toHaveCount(cantidadEsperada, { timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el campo tiene valor específico (detiene prueba si falla)
   */
  async verificarValor(locator: any, valorEsperado: string | RegExp, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toHaveValue(valorEsperado, { timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el elemento tiene atributo con valor (detiene prueba si falla)
   */
  async verificarAtributo(locator: any, nombreAtributo: string, valorEsperado: string | RegExp, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toHaveAttribute(nombreAtributo, valorEsperado, { timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el elemento tiene clase CSS (detiene prueba si falla)
   */
  async verificarClase(locator: any, claseEsperada: string | RegExp, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .toHaveClass(claseEsperada, { timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el elemento NO es visible (detiene prueba si falla)
   */
  async verificarNoVisible(locator: any, mensaje?: string): Promise<void> {
    await expect(this.obtenerElemento(locator))
      .not.toBeVisible({ timeout: this.defaultTimeout });
  }

  /**
   * Verifica que el elemento existe en el DOM (detiene prueba si falla)
   */
  async verificarExiste(locator: any, mensaje?: string): Promise<void> {
    const count = await this.contar(locator);
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Verifica que el elemento NO existe en el DOM (detiene prueba si falla)
   */
  async verificarNoExiste(locator: any, mensaje?: string): Promise<void> {
    const count = await this.contar(locator);
    expect(count).toBe(0);
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════

  async capturarImagen(locator: any, opciones?: any): Promise<Buffer> {
    return await this.obtenerElemento(locator).screenshot(opciones);
  }

  obtenerPagina(): Page {
    return this.page;
  }

  establecerTimeout(nuevoTimeout: number): void {
    this.defaultTimeout = nuevoTimeout;
    this.logger.debug('Timeout actualizado', { nuevoTimeout });
  }
}