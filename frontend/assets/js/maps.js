/**
 * BeraMap - Arquivo de entrada principal
 *
 * Exporta todos os módulos e a função factory para inicialização
 * Também expõe como variável global window.BeraMap para uso sem módulos
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
function init(containerId, options = {}) {
  return new BeraMap(containerId, options);
}

// ===================================================================
// EXPORTAR COMO MÓDULO ES6 (para import)
// ===================================================================

export {
  init,
  BeraMap,
  GeoManager,
  EventManager,
  BaseRenderer,
  PointRenderer,
  LineRenderer,
  PolygonRenderer,
  CircleRenderer,
  DrawingRenderer,
  GEOMETRY_TYPES,
  EVENTS,
  DEFAULT_CONFIG,
  STYLE_PRESETS,
  VERSION
};

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

// ===================================================================
// EXPORTAR COMO VARIÁVEL GLOBAL (para scripts normais)
// ===================================================================

if (typeof window !== 'undefined') {
  window.BeraMap = {
    init: init,
    version: VERSION,
    BeraMap: BeraMap,
    GeoManager: GeoManager,
    EventManager: EventManager,
    Renderers: {
      BaseRenderer: BaseRenderer,
      PointRenderer: PointRenderer,
      LineRenderer: LineRenderer,
      PolygonRenderer: PolygonRenderer,
      CircleRenderer: CircleRenderer,
      DrawingRenderer: DrawingRenderer
    },
    Constants: {
      GEOMETRY_TYPES: GEOMETRY_TYPES,
      EVENTS: EVENTS,
      DEFAULT_CONFIG: DEFAULT_CONFIG,
      STYLE_PRESETS: STYLE_PRESETS
    }
  };
}
