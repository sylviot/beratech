/**
 * BeraMap - Plugin Leaflet para Porto Velho, Rondônia
 *
 * Um plugin modular para visualizar e gerenciar geometrias GeoJSON
 * com suporte a atualização dinâmica on-the-fly.
 *
 * @version 1.0.0
 * @author Desenvolvedor Hackathon
 */

(function (global, factory) {
  // Suporte UMD para diferentes ambientes (CommonJS, AMD, Global)
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory(global.L, global.jQuery);
  } else if (typeof define === 'function' && define.amd) {
    define(['leaflet', 'jquery'], factory);
  } else {
    global.BeraMap = factory(global.L, global.jQuery);
  }
}(typeof self !== 'undefined' ? self : this, function (L, $) {
  'use strict';
  
  // ===================================================================
  // CLASSE PRINCIPAL: BeraMap
  // ===================================================================
  
  class BeraMap {
    /**
     * Constructor
     * @param {string} containerId - ID do elemento HTML para o mapa
     * @param {Object} options - Opções de configuração
     */
    constructor(containerId, options) {
      // Validações iniciais
      if (!containerId) {
        throw new Error('BeraMap: containerId é obrigatório');
      }
      if (!$('#' + containerId).length) {
        throw new Error('BeraMap: elemento com ID "' + containerId + '" não encontrado');
      }
      if (!L) {
        throw new Error('BeraMap: Leaflet.js não foi carregado');
      }
      if (!$) {
        throw new Error('BeraMap: jQuery não foi carregado');
      }
      
      // ===================================================================
      // PROPRIEDADES PRIVADAS
      // ===================================================================
      
      this._initialized = false;
      this._containerId = containerId;
      this._map = null;
      this._geoManager = null;
      this._eventManager = null;
      this._renderers = {};
      this._layerGroups = {};
      
      // Estado de configuração
      this._config = this._mergeOptions(options);
      
      // ===================================================================
      // INICIALIZAÇÃO
      // ===================================================================
      
      this._initialize();
    }
    
    /**
     * Mescla opções fornecidas com configuração padrão
     * @private
     */
    _mergeOptions(options) {
      const defaults = {
        center: [-8.76, -63.89],      // Porto Velho, RO
        zoom: 13,
        zoomControl: true,
        attribution: true,
        theme: 'default',
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        tileAttribution: '&copy; OpenStreetMap contributors',
        animateUpdates: true,
        autoBounds: false
      };
      
      return Object.assign({}, defaults, options || {});
    }
    
    /**
     * Inicializa o plugin
     * @private
     */
    _initialize() {
      try {
        // Criar mapa Leaflet
        this._map = L.map(this._containerId).setView(
          this._config.center,
          this._config.zoom
        );
        
        // Adicionar tile layer
        L.tileLayer(this._config.tileLayer, {
          attribution: this._config.tileAttribution
        }).addTo(this._map);
        
        // Inicializar layer groups para cada tipo de geometria
        this._initializeLayerGroups();
        
        // Inicializar gerenciadores (stubs por enquanto)
        this._initializeManagers();
        
        this._initialized = true;
        
        console.log('✅ BeraMap inicializado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao inicializar BeraMap:', error);
        throw error;
      }
    }
    
    /**
     * Inicializa layer groups para cada tipo de geometria
     * @private
     */
    _initializeLayerGroups() {
      const geometryTypes = ['Point', 'LineString', 'Polygon', 'Circle', 'Drawing'];
      
      geometryTypes.forEach(type => {
        this._layerGroups[type] = L.layerGroup().addTo(this._map);
      });
    }
    
    /**
     * Inicializa gerenciadores do plugin
     * @private
     */
    _initializeManagers() {
      // EventManager será instanciado aqui
      // Por enquanto, usando evento simples jQuery
      this._eventManager = new EventManager(this);
      
      // GeoManager será instanciado aqui
      // Por enquanto, usando storage simples
      this._geoManager = new GeoManager(this);
      
      // Renderers serão instanciados aqui
      this._renderers = {
        Point: new PointRenderer(this),
        LineString: new LineRenderer(this),
        Polygon: new PolygonRenderer(this),
        Circle: new CircleRenderer(this),
        Drawing: new DrawingRenderer(this)
      };
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Gerenciamento de Geometrias
    // ===================================================================
    
    /**
     * Adiciona geometrias ao mapa
     * @param {Object} geojson - FeatureCollection ou Feature
     * @param {Object} options - Opções adicionais
     * @returns {Array} Array de UUIDs das geometrias adicionadas
     */
    addGeometries(geojson, options = {}) {
      if (!this._initialized) {
        console.error('BeraMap: plugin não inicializado');
        return [];
      }
      
      try {
        // Validar GeoJSON
        const features = this._normalizeFeatures(geojson);
        if (!features || features.length === 0) {
          console.warn('BeraMap: nenhuma feature para adicionar');
          return [];
        }
        
        const addedUUIDs = [];
        
        // Processar cada feature
        features.forEach(feature => {
          const uuid = this._geoManager.addGeometry(feature);
          const geometryType = feature.geometry.type;
          
          if (this._renderers[geometryType]) {
            this._renderers[geometryType].render(uuid, feature);
          }
          
          addedUUIDs.push(uuid);
        });
        
        // Disparar evento
        this._eventManager.trigger('bera:geometryAdded', {
          uuids: addedUUIDs,
          count: addedUUIDs.length
        });
        
        // Auto-fit bounds se configurado
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
     * Atualiza geometrias existentes
     * @param {Object} geojson - FeatureCollection ou Feature
     * @param {Object} options - Opções adicionais
     * @returns {Array} Array de UUIDs das geometrias atualizadas
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
        
        // Se clearPrevious, limpar antes de adicionar
        if (options.clearPrevious) {
          this.clearAll();
        }
        
        const updatedUUIDs = this.addGeometries(geojson, options);
        
        // Disparar evento de update
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
     * Remove geometrias pelo UUID
     * @param {string|Array} uuids - UUID ou array de UUIDs
     * @returns {boolean} Sucesso da operação
     */
    removeGeometries(uuids) {
      if (!this._initialized) {
        console.error('BeraMap: plugin não inicializado');
        return false;
      }
      
      // Normalizar para array
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
     * Remove todas as geometrias do mapa
     * @returns {void}
     */
    clearAll() {
      if (!this._initialized) {
        console.error('BeraMap: plugin não inicializado');
        return;
      }
      
      try {
        // Limpar todos os layer groups
        Object.values(this._layerGroups).forEach(layerGroup => {
          layerGroup.clearLayers();
        });
        
        // Limpar estado do GeoManager
        this._geoManager.clear();
        
        this._eventManager.trigger('bera:cleared', {});
        
        console.log('✅ Todas as geometrias foram removidas');
      } catch (error) {
        console.error('❌ Erro ao limpar mapa:', error);
      }
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Estilo e Tema
    // ===================================================================
    
    /**
     * Define o estilo para um tipo de geometria
     * @param {string} geometryType - Tipo de geometria
     * @param {Object} styleObj - Objeto com propriedades de estilo
     * @returns {void}
     */
    setStyle(geometryType, styleObj) {
      if (!this._renderers[geometryType]) {
        console.warn('BeraMap: tipo de geometria não suportado:', geometryType);
        return;
      }
      
      this._renderers[geometryType].setDefaultStyle(styleObj);
    }
    
    /**
     * Obtém o estilo de um tipo de geometria
     * @param {string} geometryType - Tipo de geometria
     * @returns {Object} Objeto com estilo
     */
    getStyle(geometryType) {
      if (!this._renderers[geometryType]) {
        console.warn('BeraMap: tipo de geometria não suportado:', geometryType);
        return null;
      }
      
      return this._renderers[geometryType].getDefaultStyle();
    }
    
    /**
     * Aplica um tema pré-definido
     * @param {string} themeName - Nome do tema
     * @returns {void}
     */
    applyTheme(themeName) {
      // Será implementado no arquivo de temas
      console.log('BeraMap: tema "' + themeName + '" aplicado');
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Queries e Busca
    // ===================================================================
    
    /**
     * Obtém uma geometria pelo UUID
     * @param {string} uuid - UUID da geometria
     * @returns {Object|null} Dados da geometria ou null
     */
    getGeometryByUUID(uuid) {
      return this._geoManager.getGeometryByUUID(uuid);
    }
    
    /**
     * Obtém todas as geometrias
     * @returns {Array} Array de todas as geometrias
     */
    getAllGeometries() {
      return this._geoManager.getAllGeometries();
    }
    
    /**
     * Obtém geometrias filtradas por tipo
     * @param {string} type - Tipo de geometria (Point, LineString, Polygon, etc)
     * @returns {Array} Array de geometrias do tipo especificado
     */
    getGeometriesByType(type) {
      return this._geoManager.getGeometriesByType(type);
    }
    
    /**
     * Obtém contagem de geometrias
     * @returns {number} Total de geometrias no mapa
     */
    getGeometriesCount() {
      return this._geoManager.getCount();
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Eventos
    // ===================================================================
    
    /**
     * Registra listener para evento
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função callback
     * @returns {void}
     */
    on(eventName, callback) {
      this._eventManager.on(eventName, callback);
    }
    
    /**
     * Remove listener de evento
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função callback
     * @returns {void}
     */
    off(eventName, callback) {
      this._eventManager.off(eventName, callback);
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Utilidades
    // ===================================================================
    
    /**
     * Encaixa o mapa aos limites de geometrias
     * @param {Array} uuids - Array de UUIDs para encaixar (opcional)
     * @returns {void}
     */
    fitBounds(uuids) {
      if (!uuids || uuids.length === 0) {
        // Se nenhum UUID, usar todas as geometrias
        uuids = this._geoManager.getAllUUIDs();
      }
      
      if (uuids.length === 0) {
        console.warn('BeraMap: nenhuma geometria para encaixar');
        return;
      }
      
      const bounds = L.latLngBounds([]);
      
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
     * Exporta todas as geometrias como GeoJSON
     * @returns {Object} FeatureCollection em formato GeoJSON
     */
    exportGeoJSON() {
      return this._geoManager.exportAsGeoJSON();
    }
    
    /**
     * Obtém referência ao mapa Leaflet
     * @returns {Object} Instância do Leaflet.Map
     */
    getLeafletMap() {
      return this._map;
    }
    
    /**
     * Verifica se o plugin foi inicializado
     * @returns {boolean}
     */
    isInitialized() {
      return this._initialized;
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Utilitários
    // ===================================================================
    
    /**
     * Normaliza entrada GeoJSON para array de Features
     * @private
     */
    _normalizeFeatures(geojson) {
      if (!geojson) return [];
      
      // Se é FeatureCollection
      if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        return geojson.features;
      }
      
      // Se é Feature única
      if (geojson.type === 'Feature') {
        return [geojson];
      }
      
      return [];
    }
  }
  
  // ===================================================================
  // CLASSE: GeoManager (STUB)
  // ===================================================================
  
  class GeoManager {
    constructor(beraMap) {
      this.beraMap = beraMap;
      this.geometries = {}; // Armazenamento de geometrias por UUID
    }
    
    addGeometry(feature) {
      const uuid = this._generateUUID();
      this.geometries[uuid] = {
        uuid: uuid,
        feature: feature,
        type: feature.geometry.type,
        leafletLayer: null,
        style: {}
      };
      return uuid;
    }
    
    getGeometryByUUID(uuid) {
      return this.geometries[uuid] || null;
    }
    
    getAllGeometries() {
      return Object.values(this.geometries);
    }
    
    getGeometriesByType(type) {
      return Object.values(this.geometries).filter(g => g.type === type);
    }
    
    removeGeometry(uuid) {
      delete this.geometries[uuid];
    }
    
    getAllUUIDs() {
      return Object.keys(this.geometries);
    }
    
    getCount() {
      return Object.keys(this.geometries).length;
    }
    
    clear() {
      this.geometries = {};
    }
    
    exportAsGeoJSON() {
      return {
        type: 'FeatureCollection',
        features: Object.values(this.geometries).map(g => g.feature)
      };
    }
    
    _generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }
  
  // ===================================================================
  // CLASSE: EventManager (STUB)
  // ===================================================================
  
  class EventManager {
    constructor(beraMap) {
      this.beraMap = beraMap;
      this.$document = $(document);
    }
    
    on(eventName, callback) {
      this.$document.on(eventName, callback);
    }
    
    off(eventName, callback) {
      this.$document.off(eventName, callback);
    }
    
    trigger(eventName, data) {
      this.$document.trigger(eventName, [data]);
    }
  }
  
  // ===================================================================
  // CLASSES: Renderers (STUBS)
  // ===================================================================
  
  class PointRenderer {
    constructor(beraMap) {
      this.beraMap = beraMap;
      this.defaultStyle = {
        color: '#3388ff',
        radius: 5
      };
    }
    
    render(uuid, feature) {
      // Será implementado
    }
    
    remove(uuid) {
      // Será implementado
    }
    
    setDefaultStyle(styleObj) {
      this.defaultStyle = Object.assign({}, this.defaultStyle, styleObj);
    }
    
    getDefaultStyle() {
      return this.defaultStyle;
    }
  }
  
  class LineRenderer {
    constructor(beraMap) {
      this.beraMap = beraMap;
      this.defaultStyle = {
        color: '#ff7800',
        weight: 3,
        opacity: 0.8
      };
    }
    
    render(uuid, feature) {
      // Será implementado
    }
    
    remove(uuid) {
      // Será implementado
    }
    
    setDefaultStyle(styleObj) {
      this.defaultStyle = Object.assign({}, this.defaultStyle, styleObj);
    }
    
    getDefaultStyle() {
      return this.defaultStyle;
    }
  }
  
  class PolygonRenderer {
    constructor(beraMap) {
      this.beraMap = beraMap;
      this.defaultStyle = {
        color: '#3388ff',
        weight: 2,
        opacity: 0.8,
        fillColor: '#3388ff',
        fillOpacity: 0.2
      };
    }
    
    render(uuid, feature) {
      // Será implementado
    }
    
    remove(uuid) {
      // Será implementado
    }
    
    setDefaultStyle(styleObj) {
      this.defaultStyle = Object.assign({}, this.defaultStyle, styleObj);
    }
    
    getDefaultStyle() {
      return this.defaultStyle;
    }
  }
  
  class CircleRenderer {
    constructor(beraMap) {
      this.beraMap = beraMap;
      this.defaultStyle = {
        color: '#ff7800',
        weight: 2,
        opacity: 0.8,
        fillColor: '#ff7800',
        fillOpacity: 0.2
      };
    }
    
    render(uuid, feature) {
      // Será implementado no futuro
    }
    
    remove(uuid) {
      // Será implementado
    }
    
    setDefaultStyle(styleObj) {
      this.defaultStyle = Object.assign({}, this.defaultStyle, styleObj);
    }
    
    getDefaultStyle() {
      return this.defaultStyle;
    }
  }
  
  class DrawingRenderer {
    constructor(beraMap) {
      this.beraMap = beraMap;
      this.defaultStyle = {
        color: '#9c27b0',
        weight: 2,
        opacity: 0.9,
        dashArray: '5, 5'
      };
    }
    
    render(uuid, feature) {
      // Será implementado
    }
    
    remove(uuid) {
      // Será implementado
    }
    
    setDefaultStyle(styleObj) {
      this.defaultStyle = Object.assign({}, this.defaultStyle, styleObj);
    }
    
    getDefaultStyle() {
      return this.defaultStyle;
    }
  }
  
  // ===================================================================
  // EXPORTAÇÃO
  // ===================================================================
  
  return {
    init: function(containerId, options) {
      return new BeraMap(containerId, options);
    },
    version: '1.0.0'
  };
}));
