/**
 * BeraMap - Plugin Leaflet Modular para Porto Velho, Rondônia
 *
 * Classe principal que orquestra:
 * - GeoManager (gerenciar geometrias)
 * - EventManager (gerenciar eventos)
 * - Renderers (renderizar geometrias)
 */

import { GeoManager } from '../managers/GeoManager.js';
import { EventManager } from '../managers/EventManager.js';
import { PointRenderer } from '../renderers/PointRenderer.js';
import { LineRenderer } from '../renderers/LineRenderer.js';
import { PolygonRenderer } from '../renderers/PolygonRenderer.js';
import { CircleRenderer } from '../renderers/CircleRenderer.js';
import { DrawingRenderer } from '../renderers/DrawingRenderer.js';
import { GEOMETRY_TYPES, DEFAULT_CONFIG, VERSION } from '../utils/constants.js';

export class BeraMap {
  /**
   * Constructor
   * @param {string} containerId - ID do container do mapa
   * @param {Object} options - Opções de configuração
   */
  constructor(containerId, options = {}) {
    if (!window.L) {
      throw new Error('BeraMap: Leaflet não foi carregado');
    }
    
    this.L = window.L;
    this._containerId = containerId;
    this._config = this._mergeConfig(DEFAULT_CONFIG, options);
    this._map = null;
    this._layerGroups = {};
    this._geoManager = null;
    this._eventManager = null;
    this._renderers = {};
    this._initialized = false;
    
    this._initialize();
  }
  
  /**
   * Inicializa o mapa e componentes
   * @private
   */
  _initialize() {
    try {
      // Criar mapa Leaflet
      this._map = this.L.map(this._containerId).setView(
        this._config.center,
        this._config.zoom
      );
      
      // Adicionar tile layer
      this.L.tileLayer(this._config.tileLayer, {
        attribution: this._config.tileAttribution
      }).addTo(this._map);
      
      // Inicializar layer groups
      this._initializeLayerGroups();
      
      // Inicializar managers e renderers
      this._initializeManagers();
      
      this._initialized = true;
      console.log('✅ BeraMap v' + VERSION + ' inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar BeraMap:', error);
      throw error;
    }
  }
  
  /**
   * Inicializa os layer groups
   * @private
   */
  _initializeLayerGroups() {
    const geometryTypes = Object.values(GEOMETRY_TYPES);
    geometryTypes.forEach(type => {
      this._layerGroups[type] = this.L.layerGroup().addTo(this._map);
    });
  }
  
  /**
   * Inicializa managers e renderers
   * @private
   */
  _initializeManagers() {
    this._eventManager = new EventManager(this);
    this._geoManager = new GeoManager(this);
    this._renderers = {
      Point: new PointRenderer(this),
      LineString: new LineRenderer(this),
      Polygon: new PolygonRenderer(this),
      Circle: new CircleRenderer(this),
      Drawing: new DrawingRenderer(this)
    };
  }
  
  /**
   * Adiciona geometrias ao mapa
   * @param {Object} geojson - FeatureCollection ou Feature
   * @param {Object} options - Opções adicionais
   * @returns {Array} Array de UUIDs adicionados
   */
  addGeometries(geojson, options = {}) {
    if (!this._initialized) {
      console.error('BeraMap: plugin não inicializado');
      return [];
    }
    
    try {
      const features = this._normalizeFeatures(geojson);
      if (!features || features.length === 0) {
        console.warn('BeraMap: nenhuma feature para adicionar');
        return [];
      }
      
      const addedUUIDs = [];
      
      features.forEach(feature => {
        const uuid = this._geoManager.addGeometry(feature);
        const geometryType = feature.geometry.type;
        
        if (this._renderers[geometryType]) {
          this._renderers[geometryType].render(uuid, feature);
        }
        
        addedUUIDs.push(uuid);
      });
      
      this._eventManager.trigger('bera:geometryAdded', {
        uuids: addedUUIDs,
        count: addedUUIDs.length
      });
      
      if (options.fitBounds) {
        this.fitBounds(addedUUIDs);
      }
      
      return addedUUIDs;
    } catch (error) {
      console.error('❌ Erro ao adicionar geometrias:', error);
      return [];
    }
  }
  
  /**
   * Atualiza geometrias
   * @param {Object} geojson - FeatureCollection ou Feature
   * @param {Object} options - Opções adicionais
   * @returns {Array} Array de UUIDs atualizados
   */
  updateGeometries(geojson, options = {}) {
    if (!this._initialized) {
      console.error('BeraMap: plugin não inicializado');
      return [];
    }
    
    try {
      const features = this._normalizeFeatures(geojson);
      if (!features || features.length === 0) {
        console.warn('BeraMap: nenhuma feature para atualizar');
        return [];
      }
      
      if (options.clearPrevious) {
        this.clearAll();
      }
      
      const updatedUUIDs = this.addGeometries(geojson, options);
      
      this._eventManager.trigger('bera:geometryUpdated', {
        uuids: updatedUUIDs,
        count: updatedUUIDs.length
      });
      
      return updatedUUIDs;
    } catch (error) {
      console.error('❌ Erro ao atualizar geometrias:', error);
      return [];
    }
  }
  
  /**
   * Remove geometrias
   * @param {string|Array} uuids - UUID ou array de UUIDs
   * @returns {boolean} Sucesso
   */
  removeGeometries(uuids) {
    if (!this._initialized) {
      console.error('BeraMap: plugin não inicializado');
      return false;
    }
    
    const uuidArray = Array.isArray(uuids) ? uuids : [uuids];
    
    try {
      const removedUUIDs = [];
      
      uuidArray.forEach(uuid => {
        const geometryData = this._geoManager.getGeometryByUUID(uuid);
        
        if (geometryData) {
          const geometryType = geometryData.feature.geometry.type;
          
          if (this._renderers[geometryType]) {
            this._renderers[geometryType].remove(uuid);
          }
          
          this._geoManager.removeGeometry(uuid);
          removedUUIDs.push(uuid);
        }
      });
      
      if (removedUUIDs.length > 0) {
        this._eventManager.trigger('bera:geometryRemoved', {
          uuids: removedUUIDs,
          count: removedUUIDs.length
        });
      }
      
      return removedUUIDs.length === uuidArray.length;
    } catch (error) {
      console.error('❌ Erro ao remover geometrias:', error);
      return false;
    }
  }
  
  /**
   * Limpa todas as geometrias
   * @returns {void}
   */
  clearAll() {
    if (!this._initialized) {
      console.error('BeraMap: plugin não inicializado');
      return;
    }
    
    try {
      Object.values(this._layerGroups).forEach(layerGroup => {
        layerGroup.clearLayers();
      });
      
      this._geoManager.clear();
      this._eventManager.trigger('bera:cleared', {});
      console.log('✅ Todas as geometrias foram removidas');
    } catch (error) {
      console.error('❌ Erro ao limpar mapa:', error);
    }
  }
  
  /**
   * Encaixa o mapa aos bounds das geometrias
   * @param {Array} uuids - Array de UUIDs (opcional)
   * @returns {void}
   */
  fitBounds(uuids) {
    if (!uuids || uuids.length === 0) {
      uuids = this._geoManager.getUUIDs();
    }
    
    if (uuids.length === 0) {
      console.warn('BeraMap: nenhuma geometria para encaixar');
      return;
    }
    
    const bounds = this.L.latLngBounds([]);
    
    uuids.forEach(uuid => {
      const geometryData = this._geoManager.getGeometryByUUID(uuid);
      if (geometryData && geometryData.leafletLayer) {
        if (typeof geometryData.leafletLayer.getBounds === 'function') {
          bounds.extend(geometryData.leafletLayer.getBounds());
        } else if (typeof geometryData.leafletLayer.getLatLng === 'function') {
          bounds.extend(geometryData.leafletLayer.getLatLng());
        }
      }
    });
    
    if (bounds.isValid()) {
      this._map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
  
  /**
   * Registra um listener de evento
   * @param {string} eventName - Nome do evento
   * @param {Function} callback - Callback
   * @param {Object} context - Contexto (this)
   * @returns {void}
   */
  on(eventName, callback, context) {
    this._eventManager.on(eventName, callback, context);
  }
  
  /**
   * Remove um listener de evento
   * @param {string} eventName - Nome do evento
   * @param {Function} callback - Callback
   * @returns {void}
   */
  off(eventName, callback) {
    this._eventManager.off(eventName, callback);
  }
  
  /**
   * Obtém uma geometria pelo UUID
   * @param {string} uuid - UUID
   * @returns {Object|null} Dados da geometria
   */
  getGeometryByUUID(uuid) {
    return this._geoManager.getGeometryByUUID(uuid);
  }
  
  /**
   * Obtém todas as geometrias
   * @returns {Array} Array de geometrias
   */
  getAllGeometries() {
    return this._geoManager.getAllGeometries();
  }
  
  /**
   * Obtém geometrias filtradas por tipo
   * @param {string} type - Tipo de geometria
   * @returns {Array} Array de geometrias
   */
  getGeometriesByType(type) {
    return this._geoManager.getGeometriesByType(type);
  }
  
  /**
   * Obtém contagem de geometrias
   * @returns {number} Quantidade
   */
  getGeometriesCount() {
    return this._geoManager.getCount();
  }
  
  /**
   * Obtém estatísticas
   * @returns {Object} Estatísticas
   */
  getStats() {
    return this._geoManager.getStats();
  }
  
  /**
   * Exporta como GeoJSON
   * @returns {Object} FeatureCollection
   */
  exportGeoJSON() {
    return this._geoManager.exportAsGeoJSON();
  }
  
  /**
   * Obtém a instância do Leaflet map
   * @returns {Object} Mapa Leaflet
   */
  getLeafletMap() {
    return this._map;
  }
  
  /**
   * Obtém um renderer específico
   * @param {string} geometryType - Tipo de geometria
   * @returns {Object|null} Renderer
   */
  getRenderer(geometryType) {
    return this._renderers[geometryType] || null;
  }
  
  /**
   * Obtém todos os renderers
   * @returns {Object} Objeto com todos os renderers
   */
  getRenderers() {
    return Object.assign({}, this._renderers);
  }
  
  /**
   * Obtém o GeoManager
   * @returns {Object} GeoManager
   */
  getGeoManager() {
    return this._geoManager;
  }
  
  /**
   * Obtém o EventManager
   * @returns {Object} EventManager
   */
  getEventManager() {
    return this._eventManager;
  }
  
  /**
   * Verifica se foi inicializado
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }
  
  /**
   * Obtém versão
   * @returns {string} Versão
   */
  getVersion() {
    return VERSION;
  }
  
  // ===================================================================
  // MÉTODOS PRIVADOS
  // ===================================================================
  
  _normalizeFeatures(geojson) {
    if (!geojson) return [];
    
    if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
      return geojson.features;
    }
    
    if (geojson.type === 'Feature') {
      return [geojson];
    }
    
    return [];
  }
  
  _mergeConfig(defaults, options) {
    return Object.assign({}, defaults, options || {});
  }
}

export default BeraMap;
