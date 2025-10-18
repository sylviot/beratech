/**
 * GeoManager - Gerenciador de Geometrias para BeraMap
 *
 * Responsável por:
 * - Armazenar e rastrear todas as geometrias por UUID
 * - Manter referências às camadas Leaflet renderizadas
 * - Fornecer interface de busca e query
 * - Gerenciar metadados de geometrias
 * - Validar dados de entrada
 *
 * @version 1.0.0
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    global.GeoManager = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  
  /**
   * Classe GeoManager
   * Gerencia o estado e armazenamento de todas as geometrias
   */
  class GeoManager {
    /**
     * Constructor
     * @param {Object} beraMap - Referência à instância BeraMap
     */
    constructor(beraMap) {
      this.beraMap = beraMap;
      
      // Armazenamento principal de geometrias por UUID
      // Estrutura: { uuid: GeometryData }
      this.geometries = {};
      
      // Índices para performance
      this.indexByType = {};      // { 'Point': [uuid1, uuid2], ... }
      this.indexByUUID = {};      // { uuid: GeometryData } (referência rápida)
      
      // Metadados
      this.stats = {
        totalCount: 0,
        countByType: {}
      };
      
      // Cache de bounds
      this._boundsCache = null;
      this._boundsCacheDirty = true;
      
      this._initialize();
    }
    
    /**
     * Inicializa os índices
     * @private
     */
    _initialize() {
      const geometryTypes = ['Point', 'LineString', 'Polygon', 'Circle', 'Drawing'];
      
      geometryTypes.forEach(type => {
        this.indexByType[type] = [];
        this.stats.countByType[type] = 0;
      });
      
      console.log('✅ GeoManager inicializado');
    }
    
    // ===================================================================
    // MÉTODOS: CRUD - CREATE
    // ===================================================================
    
    /**
     * Adiciona uma geometria ao gerenciador
     * @param {Object} feature - Feature GeoJSON
     * @param {Object} options - Opções adicionais
     * @returns {string} UUID da geometria adicionada
     */
    addGeometry(feature, options = {}) {
      // Validar feature
      if (!this._validateFeature(feature)) {
        console.error('❌ GeoManager: Feature inválida');
        return null;
      }
      
      // Gerar UUID
      const uuid = options.uuid || this._generateUUID();
      
      // Verificar se UUID já existe
      if (this.geometries[uuid]) {
        console.warn('⚠️ GeoManager: UUID já existe, atualizando:', uuid);
        return this._updateExistingGeometry(uuid, feature, options);
      }
      
      const geometryType = feature.geometry.type;
      
      // Criar estrutura de dados
      const geometryData = {
        uuid: uuid,
        feature: this._deepClone(feature),
        type: geometryType,
        leafletLayer: null,                    // Será preenchido pelo renderer
        style: options.style || {},            // Estilos customizados
        metadata: options.metadata || {},      // Metadados adicionais
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: feature.properties || {}
      };
      
      // Armazenar
      this.geometries[uuid] = geometryData;
      this.indexByUUID[uuid] = geometryData;
      
      // Atualizar índices
      this._addToTypeIndex(geometryType, uuid);
      
      // Atualizar stats
      this.stats.totalCount++;
      this.stats.countByType[geometryType]++;
      
      // Marcar cache como inválido
      this._boundsCacheDirty = true;
      
      return uuid;
    }
    
    /**
     * Adiciona múltiplas geometrias em batch
     * @param {Array} features - Array de Features GeoJSON
     * @param {Object} options - Opções adicionais
     * @returns {Array} Array de UUIDs adicionados
     */
    addGeometriesBatch(features, options = {}) {
      if (!Array.isArray(features)) {
        console.error('❌ GeoManager: features deve ser um array');
        return [];
      }
      
      const addedUUIDs = [];
      const startTime = performance.now();
      
      features.forEach((feature, index) => {
        try {
          const uuid = this.addGeometry(feature, options);
          if (uuid) {
            addedUUIDs.push(uuid);
          }
        } catch (error) {
          console.error('❌ GeoManager: erro ao adicionar feature ' + index + ':', error);
        }
      });
      
      const duration = (performance.now() - startTime).toFixed(2);
      console.log('✅ GeoManager: ' + addedUUIDs.length + ' geometrias adicionadas em ' + duration + 'ms');
      
      return addedUUIDs;
    }
    
    // ===================================================================
    // MÉTODOS: CRUD - READ
    // ===================================================================
    
    /**
     * Obtém uma geometria pelo UUID
     * @param {string} uuid - UUID da geometria
     * @returns {Object|null} Dados da geometria ou null
     */
    getGeometryByUUID(uuid) {
      return this.geometries[uuid] || null;
    }
    
    /**
     * Obtém todas as geometrias
     * @param {Object} options - Opções de filtro
     * @returns {Array} Array de todos os dados de geometrias
     */
    getAllGeometries(options = {}) {
      let geometries = Object.values(this.geometries);
      
      // Filtrar por tipo se especificado
      if (options.type) {
        geometries = geometries.filter(g => g.type === options.type);
      }
      
      // Ordenar por data se especificado
      if (options.sortBy === 'createdAt') {
        geometries.sort((a, b) =>
          new Date(a.createdAt) - new Date(b.createdAt)
        );
      }
      
      // Limitar resultados se especificado
      if (options.limit) {
        geometries = geometries.slice(0, options.limit);
      }
      
      return geometries;
    }
    
    /**
     * Obtém geometrias filtradas por tipo
     * @param {string} type - Tipo de geometria (Point, LineString, Polygon, etc)
     * @returns {Array} Array de geometrias do tipo especificado
     */
    getGeometriesByType(type) {
      const uuids = this.indexByType[type] || [];
      return uuids.map(uuid => this.geometries[uuid]).filter(g => g);
    }
    
    /**
     * Obtém UUIDs de todas as geometrias
     * @param {string} type - Tipo opcional para filtrar
     * @returns {Array} Array de UUIDs
     */
    getUUIDs(type = null) {
      if (type) {
        return this.indexByType[type] || [];
      }
      return Object.keys(this.geometries);
    }
    
    /**
     * Obtém geometrias por propriedade
     * @param {string} propertyKey - Chave da propriedade
     * @param {*} propertyValue - Valor da propriedade
     * @returns {Array} Array de geometrias que correspondem
     */
    getGeometriesByProperty(propertyKey, propertyValue) {
      return Object.values(this.geometries).filter(g => {
        return g.properties && g.properties[propertyKey] === propertyValue;
      });
    }
    
    /**
     * Busca geometrias por regex em propriedades
     * @param {string} searchTerm - Termo de busca
     * @returns {Array} Array de geometrias encontradas
     */
    searchByProperties(searchTerm) {
      const regex = new RegExp(searchTerm, 'i');
      return Object.values(this.geometries).filter(g => {
        if (g.properties) {
          return Object.values(g.properties).some(val =>
            regex.test(String(val))
          );
        }
        return false;
      });
    }
    
    // ===================================================================
    // MÉTODOS: CRUD - UPDATE
    // ===================================================================
    
    /**
     * Atualiza uma geometria existente
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Nova feature GeoJSON
     * @param {Object} options - Opções adicionais
     * @returns {boolean} Sucesso da operação
     */
    updateGeometry(uuid, feature, options = {}) {
      if (!this.geometries[uuid]) {
        console.warn('⚠️ GeoManager: UUID não encontrado:', uuid);
        return false;
      }
      
      if (!this._validateFeature(feature)) {
        console.error('❌ GeoManager: Feature inválida para update');
        return false;
      }
      
      const oldType = this.geometries[uuid].type;
      const newType = feature.geometry.type;
      
      // Se o tipo mudou, atualizar índices
      if (oldType !== newType) {
        this._removeFromTypeIndex(oldType, uuid);
        this._addToTypeIndex(newType, uuid);
        this.stats.countByType[oldType]--;
        this.stats.countByType[newType]++;
      }
      
      // Atualizar dados
      this.geometries[uuid].feature = this._deepClone(feature);
      this.geometries[uuid].type = newType;
      this.geometries[uuid].properties = feature.properties || {};
      this.geometries[uuid].updatedAt = new Date().toISOString();
      
      // Manter leafletLayer se não foi removida
      if (options.preserveLayer !== false && this.geometries[uuid].leafletLayer) {
        // Renderer será responsável por re-renderizar
      }
      
      // Marcar cache como inválido
      this._boundsCacheDirty = true;
      
      return true;
    }
    
    /**
     * Atualiza metadados de uma geometria
     * @param {string} uuid - UUID da geometria
     * @param {Object} metadata - Metadados a mesclar
     * @returns {boolean} Sucesso da operação
     */
    updateMetadata(uuid, metadata) {
      if (!this.geometries[uuid]) {
        console.warn('⚠️ GeoManager: UUID não encontrado:', uuid);
        return false;
      }
      
      this.geometries[uuid].metadata = Object.assign(
        {},
        this.geometries[uuid].metadata,
        metadata
      );
      this.geometries[uuid].updatedAt = new Date().toISOString();
      
      return true;
    }
    
    /**
     * Atualiza estilo de uma geometria
     * @param {string} uuid - UUID da geometria
     * @param {Object} style - Estilo a mesclar
     * @returns {boolean} Sucesso da operação
     */
    updateStyle(uuid, style) {
      if (!this.geometries[uuid]) {
        console.warn('⚠️ GeoManager: UUID não encontrado:', uuid);
        return false;
      }
      
      this.geometries[uuid].style = Object.assign(
        {},
        this.geometries[uuid].style,
        style
      );
      this.geometries[uuid].updatedAt = new Date().toISOString();
      
      return true;
    }
    
    /**
     * Atualiza referência à camada Leaflet
     * @param {string} uuid - UUID da geometria
     * @param {Object} leafletLayer - Camada Leaflet
     * @returns {boolean} Sucesso da operação
     */
    setLeafletLayer(uuid, leafletLayer) {
      if (!this.geometries[uuid]) {
        console.warn('⚠️ GeoManager: UUID não encontrado:', uuid);
        return false;
      }
      
      this.geometries[uuid].leafletLayer = leafletLayer;
      return true;
    }
    
    /**
     * Atualiza uma geometria existente (uso interno)
     * @private
     */
    _updateExistingGeometry(uuid, feature, options) {
      this.updateGeometry(uuid, feature, options);
      return uuid;
    }
    
    // ===================================================================
    // MÉTODOS: CRUD - DELETE
    // ===================================================================
    
    /**
     * Remove uma geometria
     * @param {string} uuid - UUID da geometria
     * @returns {boolean} Sucesso da operação
     */
    removeGeometry(uuid) {
      if (!this.geometries[uuid]) {
        console.warn('⚠️ GeoManager: UUID não encontrado:', uuid);
        return false;
      }
      
      const geometryData = this.geometries[uuid];
      const geometryType = geometryData.type;
      
      // Remover da camada Leaflet se estiver renderizada
      if (geometryData.leafletLayer && geometryData.leafletLayer.remove) {
        geometryData.leafletLayer.remove();
      }
      
      // Remover do índice de tipo
      this._removeFromTypeIndex(geometryType, uuid);
      
      // Remover do armazenamento principal
      delete this.geometries[uuid];
      delete this.indexByUUID[uuid];
      
      // Atualizar stats
      this.stats.totalCount--;
      this.stats.countByType[geometryType]--;
      
      // Marcar cache como inválido
      this._boundsCacheDirty = true;
      
      return true;
    }
    
    /**
     * Remove múltiplas geometrias
     * @param {Array} uuids - Array de UUIDs
     * @returns {number} Quantidade removida
     */
    removeGeometriesBatch(uuids) {
      if (!Array.isArray(uuids)) {
        console.error('❌ GeoManager: uuids deve ser um array');
        return 0;
      }
      
      let removedCount = 0;
      uuids.forEach(uuid => {
        if (this.removeGeometry(uuid)) {
          removedCount++;
        }
      });
      
      return removedCount;
    }
    
    /**
     * Remove todas as geometrias
     * @returns {number} Quantidade removida
     */
    clear() {
      const countBefore = this.stats.totalCount;
      
      // Remover camadas Leaflet
      Object.values(this.geometries).forEach(geometryData => {
        if (geometryData.leafletLayer && geometryData.leafletLayer.remove) {
          geometryData.leafletLayer.remove();
        }
      });
      
      // Limpar armazenamento
      this.geometries = {};
      this.indexByUUID = {};
      
      // Limpar índices
      Object.keys(this.indexByType).forEach(type => {
        this.indexByType[type] = [];
      });
      
      // Resetar stats
      this.stats.totalCount = 0;
      Object.keys(this.stats.countByType).forEach(type => {
        this.stats.countByType[type] = 0;
      });
      
      // Marcar cache como inválido
      this._boundsCacheDirty = true;
      
      console.log('✅ GeoManager: ' + countBefore + ' geometrias removidas');
      
      return countBefore;
    }
    
    // ===================================================================
    // MÉTODOS: QUERY E ANÁLISE
    // ===================================================================
    
    /**
     * Obtém contagem total de geometrias
     * @returns {number}
     */
    getCount() {
      return this.stats.totalCount;
    }
    
    /**
     * Obtém contagem por tipo
     * @returns {Object} { 'Point': count, 'LineString': count, ... }
     */
    getCountByType() {
      return Object.assign({}, this.stats.countByType);
    }
    
    /**
     * Obtém estatísticas completas
     * @returns {Object} Objeto com estatísticas
     */
    getStats() {
      return {
        totalCount: this.stats.totalCount,
        countByType: Object.assign({}, this.stats.countByType),
        geometryTypes: Object.keys(this.indexByType).filter(
          type => this.stats.countByType[type] > 0
        )
      };
    }
    
    /**
     * Verifica se um UUID existe
     * @param {string} uuid - UUID a verificar
     * @returns {boolean}
     */
    hasGeometry(uuid) {
      return !!this.geometries[uuid];
    }
    
    /**
     * Obtém UUIDs de geometrias que contêm um ponto (lógica simplificada)
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Array} UUIDs de geometrias no ponto
     */
    getGeometriesAtPoint(lat, lng) {
      // Esta é uma implementação simplificada
      // Busca apenas por Points exatos
      return Object.values(this.geometries)
        .filter(g => {
          if (g.type === 'Point') {
            const coords = g.feature.geometry.coordinates;
            return coords[1] === lat && coords[0] === lng;
          }
          return false;
        })
        .map(g => g.uuid);
    }
    
    // ===================================================================
    // MÉTODOS: EXPORTAÇÃO E SERIALIZAÇÃO
    // ===================================================================
    
    /**
     * Exporta todas as geometrias como GeoJSON FeatureCollection
     * @param {Object} options - Opções de exportação
     * @returns {Object} FeatureCollection
     */
    exportAsGeoJSON(options = {}) {
      let geometries = Object.values(this.geometries);
      
      // Filtrar por tipo se especificado
      if (options.type) {
        geometries = geometries.filter(g => g.type === options.type);
      }
      
      const features = geometries.map(g => {
        // Opcionalmente incluir metadados nas properties
        if (options.includeMetadata) {
          return Object.assign({}, g.feature, {
            properties: Object.assign({}, g.feature.properties || {}, {
              _beraMapUUID: g.uuid,
              _beraMapType: g.type,
              _beraMapMetadata: g.metadata
            })
          });
        }
        
        return g.feature;
      });
      
      return {
        type: 'FeatureCollection',
        features: features,
        metadata: {
          exportedAt: new Date().toISOString(),
          count: features.length,
          generatedBy: 'BeraMap GeoManager'
        }
      };
    }
    
    /**
     * Exporta como JSON completo (inclui metadados internos)
     * @returns {Object} Dados completos para backup
     */
    exportComplete() {
      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        stats: this.stats,
        geometries: Object.assign({}, this.geometries)
      };
    }
    
    // ===================================================================
    // MÉTODOS: BOUNDS
    // ===================================================================
    
    /**
     * Calcula bounds de todas as geometrias (com cache)
     * @returns {Object|null} { minLat, minLng, maxLat, maxLng } ou null se vazio
     */
    calculateBounds() {
      if (!this._boundsCacheDirty && this._boundsCache) {
        return this._boundsCache;
      }
      
      if (this.stats.totalCount === 0) {
        return null;
      }
      
      let minLat = Infinity,
        minLng = Infinity,
        maxLat = -Infinity,
        maxLng = -Infinity;
      
      Object.values(this.geometries).forEach(g => {
        const coords = g.feature.geometry.coordinates;
        
        if (g.type === 'Point') {
          // [lng, lat]
          minLng = Math.min(minLng, coords[0]);
          maxLng = Math.max(maxLng, coords[0]);
          minLat = Math.min(minLat, coords[1]);
          maxLat = Math.max(maxLat, coords[1]);
        } else if (g.type === 'LineString') {
          coords.forEach(coord => {
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
          });
        } else if (g.type === 'Polygon') {
          g.feature.geometry.coordinates[0].forEach(coord => {
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
          });
        }
      });
      
      this._boundsCache = {
        minLat: minLat,
        minLng: minLng,
        maxLat: maxLat,
        maxLng: maxLng
      };
      
      this._boundsCacheDirty = false;
      
      return this._boundsCache;
    }
    
    // ===================================================================
    // MÉTODOS: VALIDAÇÃO
    // ===================================================================
    
    /**
     * Valida uma Feature GeoJSON
     * @private
     * @param {Object} feature - Feature a validar
     * @returns {boolean}
     */
    _validateFeature(feature) {
      if (!feature || typeof feature !== 'object') {
        return false;
      }
      
      if (feature.type !== 'Feature') {
        return false;
      }
      
      if (!feature.geometry || !feature.geometry.type) {
        return false;
      }
      
      const validTypes = ['Point', 'LineString', 'Polygon', 'Circle', 'Drawing'];
      if (!validTypes.includes(feature.geometry.type)) {
        return false;
      }
      
      if (!feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) {
        return false;
      }
      
      return true;
    }
    
    // ===================================================================
    // MÉTODOS: UTILITÁRIOS PRIVADOS
    // ===================================================================
    
    /**
     * Gera um UUID v4
     * @private
     * @returns {string} UUID
     */
    _generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    /**
     * Clone profundo de objetos
     * @private
     * @param {Object} obj - Objeto a clonar
     * @returns {Object} Objeto clonado
     */
    _deepClone(obj) {
      return JSON.parse(JSON.stringify(obj));
    }
    
    /**
     * Adiciona UUID ao índice de tipo
     * @private
     */
    _addToTypeIndex(type, uuid) {
      if (!this.indexByType[type]) {
        this.indexByType[type] = [];
      }
      if (!this.indexByType[type].includes(uuid)) {
        this.indexByType[type].push(uuid);
      }
    }
    
    /**
     * Remove UUID do índice de tipo
     * @private
     */
    _removeFromTypeIndex(type, uuid) {
      if (this.indexByType[type]) {
        const index = this.indexByType[type].indexOf(uuid);
        if (index > -1) {
          this.indexByType[type].splice(index, 1);
        }
      }
    }
  }
  
  // ===================================================================
  // EXPORTAÇÃO
  // ===================================================================
  
  return GeoManager;
}));
