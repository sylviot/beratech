/**
 * LineRenderer - Renderizador de LineStrings para BeraMap
 *
 * Responsável por renderizar linhas como polylines Leaflet
 */

import { BaseRenderer } from './BaseRenderer.js';

export class LineRenderer extends BaseRenderer {
  constructor(beraMap, options = {}) {
    super(beraMap, 'LineString', {
      ...options,
      defaultStyle: {
        color: options.defaultColor || '#d61ab8',
        weight: options.defaultWeight || 5,
        opacity: options.defaultOpacity || 0.8,
        lineCap: options.lineCap || 'round',
        lineJoin: options.lineJoin || 'round'
      }
    });
  }
  
  /**
   * Renderiza uma linha
   * @param {string} uuid - UUID da geometria
   * @param {Object} feature - Feature GeoJSON
   * @param {Object} style - Estilo customizado
   * @returns {Object} Polyline renderizado
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
      const latLngs = coordinates.map(coord => [coord[1], coord[0]]);
      
      const finalStyle = Object.assign({}, this.defaultStyle, style);
      
      const L = window.L;
      const polyline = L.polyline(latLngs, {
        color: finalStyle.color,
        weight: finalStyle.weight,
        opacity: finalStyle.opacity,
        lineCap: finalStyle.lineCap,
        lineJoin: finalStyle.lineJoin
      });
      
      const layerGroup = this.beraMap._layerGroups[this.geometryType];
      if (layerGroup) {
        polyline.addTo(layerGroup);
      }
      
      this.renderedLayers[uuid] = polyline;
      this.beraMap._geoManager.setLeafletLayer(uuid, polyline);
      
      // Armazenar metadados
      polyline._beraMetadata = {
        uuid: uuid,
        feature: feature,
        style: finalStyle,
        length: this._calculateLength(latLngs)
      };
      
      this._attachEventListeners(polyline, uuid, feature);
      
      this._log(`LineString renderizado: ${uuid}`);
      return polyline;
    } catch (error) {
      this._logError(`Erro ao renderizar: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Renderiza múltiplas linhas
   * @param {Array} geometries - Array de { uuid, feature }
   * @param {Object} style - Estilo customizado
   * @returns {Array} Polylines renderizados
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
   * Atualiza uma linha
   * @param {string} uuid - UUID
   * @param {Object} feature - Nova feature
   * @param {Object} style - Novo estilo
   * @returns {Object} Polyline atualizado
   */
  update(uuid, feature, style = {}) {
    this.remove(uuid);
    return this.render(uuid, feature, style);
  }
  
  /**
   * Obtém o comprimento de uma linha
   * @param {string} uuid - UUID
   * @returns {number|null} Comprimento em metros
   */
  getLength(uuid) {
    if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
      return this.renderedLayers[uuid]._beraMetadata.length;
    }
    return null;
  }
  
  /**
   * Obtém metadados da linha
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
  
  _attachEventListeners(polyline, uuid, feature) {
    // Click - Exibir popup
    polyline.on('click', (e) => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      const metadata = polyline._beraMetadata || {};
      
      // Criar e abrir popup
      if (this.config.enablePopup) {
        const popupContent = this._createPopupContent(feature, metadata);
        polyline.bindPopup(popupContent).openPopup(e.latlng);
      }
      
      this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
      this._log(`LineString clicado: ${uuid}`);
    });
    
    // Mouseover
    polyline.on('mouseover', () => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
      polyline.setStyle({
        weight: this.defaultStyle.weight + 2,
        opacity: 1
      });
    });
    
    // Mouseout
    polyline.on('mouseout', () => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
      polyline.setStyle({
        weight: this.defaultStyle.weight,
        opacity: this.defaultStyle.opacity
      });
    });
  }
  
  _calculateLength(latLngs) {
    let totalDistance = 0;
    
    for (let i = 0; i < latLngs.length - 1; i++) {
      totalDistance += this._haversineDistance(latLngs[i], latLngs[i + 1]);
    }
    
    return totalDistance;
  }
}

export default LineRenderer;
