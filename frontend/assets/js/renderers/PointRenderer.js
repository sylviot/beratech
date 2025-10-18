/**
 * PointRenderer - Renderizador de Points para BeraMap
 *
 * Responsável por renderizar pontos como markers Leaflet com
 * interatividade e estilos configuráveis
 */

import { BaseRenderer } from './BaseRenderer.js';

export class PointRenderer extends BaseRenderer {
  constructor(beraMap, options = {}) {
    super(beraMap, 'Point', {
      ...options,
      defaultStyle: {
        color: options.defaultColor || '#3388ff',
        radius: options.defaultRadius || 5,
        fillOpacity: options.fillOpacity || 0.8
      }
    });
  }
  
  /**
   * Renderiza um ponto
   * @param {string} uuid - UUID da geometria
   * @param {Object} feature - Feature GeoJSON
   * @param {Object} style - Estilo customizado
   * @returns {Object} Marker renderizado
   */
  render(uuid, feature, style = {}) {
    if (!uuid || !feature) {
      this._logError('uuid e feature obrigatórios');
      return null;
    }
    
    try {
      if (this.renderedLayers[uuid]) {
        this.remove(uuid);
      }
      
      const coordinates = feature.geometry.coordinates;
      const latLng = [coordinates[1], coordinates[0]]; // [lng, lat] → [lat, lng]
      
      const L = window.L;
      const marker = L.marker(latLng);
      
      const layerGroup = this.beraMap._layerGroups[this.geometryType];
      if (layerGroup) {
        marker.addTo(layerGroup);
      }
      
      this.renderedLayers[uuid] = marker;
      this.beraMap._geoManager.setLeafletLayer(uuid, marker);
      
      // Armazenar metadados
      marker._beraMetadata = {
        uuid: uuid,
        feature: feature,
        latLng: latLng
      };
      
      this._attachEventListeners(marker, uuid, feature);
      
      this._log(`Point renderizado: ${uuid}`);
      return marker;
    } catch (error) {
      this._logError(`Erro ao renderizar: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Renderiza múltiplos pontos
   * @param {Array} geometries - Array de { uuid, feature }
   * @param {Object} style - Estilo customizado
   * @returns {Array} Markers renderizados
   */
  renderBatch(geometries, style = {}) {
    const rendered = [];
    geometries.forEach(({ uuid, feature }) => {
      const layer = this.render(uuid, feature, style);
      if (layer) rendered.push(layer);
    });
    return rendered;
  }
  
  /**
   * Atualiza um ponto
   * @param {string} uuid - UUID
   * @param {Object} feature - Nova feature
   * @param {Object} style - Novo estilo
   * @returns {Object} Marker atualizado
   */
  update(uuid, feature, style = {}) {
    this.remove(uuid);
    return this.render(uuid, feature, style);
  }
  
  /**
   * Obtém metadados do ponto
   * @param {string} uuid - UUID
   * @returns {Object|null} Metadados
   */
  getMetadata(uuid) {
    if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
      return Object.assign({}, this.renderedLayers[uuid]._beraMetadata);
    }
    return null;
  }
  
  // ===================================================================
  // MÉTODOS PRIVADOS
  // ===================================================================
  
  _attachEventListeners(marker, uuid, feature) {
    // Click
    marker.on('click', (e) => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
      this._log(`Point clicado: ${uuid}`);
    });
    
    // Mouseover
    marker.on('mouseover', (e) => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
      marker.setOpacity(0.7);
    });
    
    // Mouseout
    marker.on('mouseout', (e) => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
      marker.setOpacity(1);
    });
  }
}

export default PointRenderer;
