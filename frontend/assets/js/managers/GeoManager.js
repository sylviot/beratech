/**
 * GeoManager - Gerenciador de Geometrias para BeraMap
 *
 * Responsável por:
 * - Armazenar e rastrear todas as geometrias por UUID
 * - Manter referências às camadas Leaflet renderizadas
 * - Fornecer interface de busca e query
 * - Gerenciar metadados de geometrias
 * - Validar dados de entrada
 */

import { GEOMETRY_TYPES } from '../utils/constants.js';

export class GeoManager {
  constructor(beraMap) {
    this.beraMap = beraMap;
    this.geometries = {};
    this.indexByType = {};
    this.indexByUUID = {};
    this.stats = {
      totalCount: 0,
      countByType: {}
    };
    this._boundsCache = null;
    this._boundsCacheDirty = true;
    this._initialize();
  }
  
  _initialize() {
    const geometryTypes = Object.values(GEOMETRY_TYPES);
    geometryTypes.forEach(type => {
      this.indexByType[type] = [];
      this.stats.countByType[type] = 0;
    });
    console.log('✅ GeoManager inicializado');
  }
  
  /**
   * Adiciona uma geometria
   * @param {Object} feature - Feature GeoJSON
   * @param {Object} options - Opções adicionais
   * @returns {string|null} UUID da geometria ou null se inválida
   */
  addGeometry(feature, options = {}) {
    if (!this._validateFeature(feature)) {
      console.error('❌ GeoManager: Feature inválida');
      return null;
    }
    
    const uuid = options.uuid || this._generateUUID();
    
    if (this.geometries[uuid]) {
      return this._updateExistingGeometry(uuid, feature, options);
    }
    
    const geometryType = feature.geometry.type;
    const geometryData = {
      uuid: uuid,
      feature: this._deepClone(feature),
      type: geometryType,
      leafletLayer: null,
      style: options.style || {},
      metadata: options.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      properties: feature.properties || {}
    };
    
    this.geometries[uuid] = geometryData;
    this.indexByUUID[uuid] = geometryData;
    this._addToTypeIndex(geometryType, uuid);
    
    this.stats.totalCount++;
    this.stats.countByType[geometryType]++;
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
    if (!Array.isArray(features)) return [];
    const addedUUIDs = [];
    features.forEach(feature => {
      const uuid = this.addGeometry(feature, options);
      if (uuid) addedUUIDs.push(uuid);
    });
    return addedUUIDs;
  }
  
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
   * @returns {Array} Array de geometrias
   */
  getAllGeometries(options = {}) {
    let geometries = Object.values(this.geometries);
    if (options.type) {
      geometries = geometries.filter(g => g.type === options.type);
    }
    if (options.sortBy === 'createdAt') {
      geometries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    if (options.limit) {
      geometries = geometries.slice(0, options.limit);
    }
    return geometries;
  }
  
  /**
   * Obtém geometrias filtradas por tipo
   * @param {string} type - Tipo de geometria
   * @returns {Array} Array de geometrias do tipo
   */
  getGeometriesByType(type) {
    const uuids = this.indexByType[type] || [];
    return uuids.map(uuid => this.geometries[uuid]).filter(g => g);
  }
  
  /**
   * Obtém UUIDs
   * @param {string} type - Tipo opcional
   * @returns {Array} Array de UUIDs
   */
  getUUIDs(type = null) {
    if (type) return this.indexByType[type] || [];
    return Object.keys(this.geometries);
  }
  
  /**
   * Obtém geometrias por propriedade
   * @param {string} propertyKey - Chave
   * @param {*} propertyValue - Valor
   * @returns {Array} Array de geometrias
   */
  getGeometriesByProperty(propertyKey, propertyValue) {
    return Object.values(this.geometries).filter(g => {
      return g.properties && g.properties[propertyKey] === propertyValue;
    });
  }
  
  /**
   * Busca geometrias por regex
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
  
  /**
   * Atualiza uma geometria
   * @param {string} uuid - UUID
   * @param {Object} feature - Nova feature
   * @param {Object} options - Opções
   * @returns {boolean} Sucesso
   */
  updateGeometry(uuid, feature, options = {}) {
    if (!this.geometries[uuid]) return false;
    if (!this._validateFeature(feature)) return false;
    
    const oldType = this.geometries[uuid].type;
    const newType = feature.geometry.type;
    
    if (oldType !== newType) {
      this._removeFromTypeIndex(oldType, uuid);
      this._addToTypeIndex(newType, uuid);
      this.stats.countByType[oldType]--;
      this.stats.countByType[newType]++;
    }
    
    this.geometries[uuid].feature = this._deepClone(feature);
    this.geometries[uuid].type = newType;
    this.geometries[uuid].properties = feature.properties || {};
    this.geometries[uuid].updatedAt = new Date().toISOString();
    this._boundsCacheDirty = true;
    
    return true;
  }
  
  /**
   * Remove uma geometria
   * @param {string} uuid - UUID
   * @returns {boolean} Sucesso
   */
  removeGeometry(uuid) {
    if (!this.geometries[uuid]) return false;
    
    const geometryData = this.geometries[uuid];
    const geometryType = geometryData.type;
    
    if (geometryData.leafletLayer && geometryData.leafletLayer.remove) {
      geometryData.leafletLayer.remove();
    }
    
    this._removeFromTypeIndex(geometryType, uuid);
    delete this.geometries[uuid];
    delete this.indexByUUID[uuid];
    
    this.stats.totalCount--;
    this.stats.countByType[geometryType]--;
    this._boundsCacheDirty = true;
    
    return true;
  }
  
  /**
   * Remove múltiplas geometrias em batch
   * @param {Array} uuids - Array de UUIDs
   * @returns {number} Quantidade removida
   */
  removeGeometriesBatch(uuids) {
    if (!Array.isArray(uuids)) return 0;
    let removedCount = 0;
    uuids.forEach(uuid => {
      if (this.removeGeometry(uuid)) removedCount++;
    });
    return removedCount;
  }
  
  /**
   * Limpa todas as geometrias
   * @returns {number} Quantidade removida
   */
  clear() {
    Object.values(this.geometries).forEach(geometryData => {
      if (geometryData.leafletLayer && geometryData.leafletLayer.remove) {
        geometryData.leafletLayer.remove();
      }
    });
    
    this.geometries = {};
    this.indexByUUID = {};
    
    Object.keys(this.indexByType).forEach(type => {
      this.indexByType[type] = [];
    });
    
    this.stats.totalCount = 0;
    Object.keys(this.stats.countByType).forEach(type => {
      this.stats.countByType[type] = 0;
    });
    
    this._boundsCacheDirty = true;
    return Object.keys(this.geometries).length;
  }
  
  /**
   * Obtém contagem total
   * @returns {number} Quantidade
   */
  getCount() {
    return this.stats.totalCount;
  }
  
  /**
   * Obtém contagem por tipo
   * @returns {Object} Contagem por tipo
   */
  getCountByType() {
    return Object.assign({}, this.stats.countByType);
  }
  
  /**
   * Obtém estatísticas
   * @returns {Object} Estatísticas
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
   * Verifica se UUID existe
   * @param {string} uuid - UUID
   * @returns {boolean}
   */
  hasGeometry(uuid) {
    return !!this.geometries[uuid];
  }
  
  /**
   * Exporta como GeoJSON
   * @param {Object} options - Opções
   * @returns {Object} FeatureCollection
   */
  exportAsGeoJSON(options = {}) {
    let geometries = Object.values(this.geometries);
    if (options.type) {
      geometries = geometries.filter(g => g.type === options.type);
    }
    
    const features = geometries.map(g => {
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
   * Calcula bounds
   * @returns {Object|null} Bounds ou null
   */
  calculateBounds() {
    if (!this._boundsCacheDirty && this._boundsCache) {
      return this._boundsCache;
    }
    
    if (this.stats.totalCount === 0) return null;
    
    let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
    
    Object.values(this.geometries).forEach(g => {
      const coords = g.feature.geometry.coordinates;
      
      if (g.type === GEOMETRY_TYPES.POINT) {
        minLng = Math.min(minLng, coords[0]);
        maxLng = Math.max(maxLng, coords[0]);
        minLat = Math.min(minLat, coords[1]);
        maxLat = Math.max(maxLat, coords[1]);
      } else if (g.type === GEOMETRY_TYPES.LINE_STRING || g.type === GEOMETRY_TYPES.DRAWING) {
        coords.forEach(coord => {
          minLng = Math.min(minLng, coord[0]);
          maxLng = Math.max(maxLng, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLat = Math.max(maxLat, coord[1]);
        });
      } else if (g.type === GEOMETRY_TYPES.POLYGON) {
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
  
  /**
   * Define a camada Leaflet para uma geometria
   * @param {string} uuid - UUID
   * @param {Object} leafletLayer - Camada Leaflet
   * @returns {boolean} Sucesso
   */
  setLeafletLayer(uuid, leafletLayer) {
    if (!this.geometries[uuid]) return false;
    this.geometries[uuid].leafletLayer = leafletLayer;
    return true;
  }
  
  // ===================================================================
  // MÉTODOS PRIVADOS
  // ===================================================================
  
  _validateFeature(feature) {
    if (!feature || typeof feature !== 'object') return false;
    if (feature.type !== 'Feature') return false;
    if (!feature.geometry || !feature.geometry.type) return false;
    
    const validTypes = Object.values(GEOMETRY_TYPES);
    if (!validTypes.includes(feature.geometry.type)) return false;
    if (!feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) return false;
    
    return true;
  }
  
  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  _addToTypeIndex(type, uuid) {
    if (!this.indexByType[type]) {
      this.indexByType[type] = [];
    }
    if (!this.indexByType[type].includes(uuid)) {
      this.indexByType[type].push(uuid);
    }
  }
  
  _removeFromTypeIndex(type, uuid) {
    if (this.indexByType[type]) {
      const index = this.indexByType[type].indexOf(uuid);
      if (index > -1) {
        this.indexByType[type].splice(index, 1);
      }
    }
  }
  
  _updateExistingGeometry(uuid, feature, options) {
    this.updateGeometry(uuid, feature, options);
    return uuid;
  }
}

export default GeoManager;
