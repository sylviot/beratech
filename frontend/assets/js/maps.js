/**
 * BeraMap - Arquivo de entrada principal
 *
 * Exporta todos os módulos e a função factory para inicialização
 */

import { BeraMap } from './core/BeraMap.js';
import { GeoManager } from './managers/GeoManager.js';
import { EventManager } from './managers/EventManager.js';
import { BaseRenderer } from './renderers/BaseRenderer.js';
import { PointRenderer } from './renderers/PointRenderer.js';
import { LineRenderer } from './renderers/LineRenderer.js';
import { PolygonRenderer } from './renderers/PolygonRenderer.js';
import { CircleRenderer } from './renderers/CircleRenderer.js';
import { DrawingRenderer } from './renderers/DrawingRenderer.js';
import {
  GEOMETRY_TYPES,
  EVENTS,
  DEFAULT_CONFIG,
  STYLE_PRESETS,
  VERSION
} from './utils/constants.js';

/**
 * Factory function para inicializar BeraMap
 * @param {string} containerId - ID do container
 * @param {Object} options - Opções de configuração
 * @returns {BeraMap} Instância do BeraMap
 */
export function init(containerId, options = {}) {
  return new BeraMap(containerId, options);
}

// Exportar tudo para acesso direto
export {
  // Core
  BeraMap,
  // Managers
  GeoManager,
  EventManager,
  // Renderers
  BaseRenderer,
  PointRenderer,
  LineRenderer,
  PolygonRenderer,
  CircleRenderer,
  DrawingRenderer,
  // Constants
  GEOMETRY_TYPES,
  EVENTS,
  DEFAULT_CONFIG,
  STYLE_PRESETS,
  VERSION
};

// Exportação padrão com função factory
export default {
  init,
  version: VERSION,
  BeraMap,
  GeoManager,
  EventManager,
  Renderers: {
    BaseRenderer,
    PointRenderer,
    LineRenderer,
    PolygonRenderer,
    CircleRenderer,
    DrawingRenderer
  },
  Constants: {
    GEOMETRY_TYPES,
    EVENTS,
    DEFAULT_CONFIG,
    STYLE_PRESETS
  }
};
