/**
 * Constants - Constantes globais do BeraMap
 *
 * Centraliza todas as constantes para fácil acesso e manutenção
 */

export const GEOMETRY_TYPES = {
  POINT: 'Point',
  LINE_STRING: 'LineString',
  POLYGON: 'Polygon',
  CIRCLE: 'Circle',
  DRAWING: 'Drawing'
};

export const EVENTS = {
  // Geometrias
  GEOMETRY_ADDED: 'bera:geometryAdded',
  GEOMETRY_UPDATED: 'bera:geometryUpdated',
  GEOMETRY_REMOVED: 'bera:geometryRemoved',
  GEOMETRY_CLICKED: 'bera:geometryClicked',
  GEOMETRY_HOVERED: 'bera:geometryHovered',
  GEOMETRY_UNHOVERED: 'bera:geometryUnhovered',
  
  // Mapa
  MAP_CLEARED: 'bera:cleared',
  MAP_READY: 'bera:mapReady',
  
  // Tema
  THEME_CHANGED: 'bera:themeChanged',
  STYLE_CHANGED: 'bera:styleChanged',
  
  // Seleção
  SELECTION_CHANGED: 'bera:selectionChanged',
  
  // Erro
  ERROR: 'bera:error'
};

export const DEFAULT_CONFIG = {
  center: [-8.7619, -63.9039], // Porto Velho, RO
  zoom: 13,
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

export const STYLE_PRESETS = {
  POINT: {
    color: '#3388ff',
    radius: 5,
    fillOpacity: 0.8
  },
  LINE_STRING: {
    color: '#d61ab8',
    weight: 5,
    opacity: 0.8
  },
  POLYGON: {
    color: '#3388ff',
    weight: 2,
    opacity: 0.8,
    fillColor: '#3388ff',
    fillOpacity: 0.2
  },
  CIRCLE: {
    color: '#ff0000',
    weight: 2,
    opacity: 0.8,
    fillColor: '#ff0000',
    fillOpacity: 0.2
  },
  DRAWING: {
    color: '#9c27b0',
    weight: 2,
    opacity: 0.9,
    dashArray: '5, 5'
  }
};

export const VERSION = '2.0.0-modular';
