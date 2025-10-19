/**
 * DrawingRenderer - Renderizador de Drawings para BeraMap
 *
 * Responsável por renderizar desenhos (linhas abertas ou fechadas)
 */

import { BaseRenderer } from './BaseRenderer.js';

export class DrawingRenderer extends BaseRenderer {
  constructor(beraMap, options = {}) {
    super(beraMap, 'Drawing', {
      ...options,
      defaultStyle: {
        color: options.defaultColor || '#9c27b0',
        weight: options.defaultWeight || 2,
        opacity: options.defaultOpacity || 0.9,
        dashArray: options.defaultDashArray || '5, 5',
        lineCap: options.lineCap || 'round',
        lineJoin: options.lineJoin || 'round'
      }
    });
    this.config.closedLineThreshold = options.closedLineThreshold || 0.00001;
    this.config.autoDetectClosed = options.autoDetectClosed !== false;
  }
  
  /**
   * Renderiza um desenho
   * @param {string} uuid - UUID da geometria
   * @param {Object} feature - Feature GeoJSON
   * @param {Object} style - Estilo customizado
   * @returns {Object} Polyline ou Polygon renderizado
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
      
      // Verificar se é fechado
      const isClosed = this._isClosedLine(latLngs);
      const finalStyle = Object.assign({}, this.defaultStyle, style);
      
      const L = window.L;
      let layer;
      
      if (isClosed && this.config.autoDetectClosed) {
        // Renderizar como polygon se estiver fechado
        layer = L.polygon(latLngs, {
          color: finalStyle.color,
          weight: finalStyle.weight,
          opacity: finalStyle.opacity,
          fillColor: finalStyle.color,
          fillOpacity: 0.2,
          dashArray: finalStyle.dashArray,
          lineCap: finalStyle.lineCap,
          lineJoin: finalStyle.lineJoin
        });
      } else {
        // Renderizar como polyline se estiver aberto
        layer = L.polyline(latLngs, {
          color: finalStyle.color,
          weight: finalStyle.weight,
          opacity: finalStyle.opacity,
          dashArray: finalStyle.dashArray,
          lineCap: finalStyle.lineCap,
          lineJoin: finalStyle.lineJoin
        });
      }
      
      const layerGroup = this.beraMap._layerGroups[this.geometryType];
      if (layerGroup) {
        layer.addTo(layerGroup);
      }
      
      this.renderedLayers[uuid] = layer;
      this.beraMap._geoManager.setLeafletLayer(uuid, layer);
      
      // Armazenar metadados
      layer._beraMetadata = {
        uuid: uuid,
        feature: feature,
        style: finalStyle,
        isClosed: isClosed,
        length: this._calculateLength(latLngs),
        area: isClosed ? this._calculateArea(latLngs) : null,
        type: isClosed ? 'polygon' : 'polyline'
      };
      
      this._attachEventListeners(layer, uuid, feature);
      
      this._log(`Drawing renderizado: ${uuid} (${isClosed ? 'fechado' : 'aberto'})`);
      return layer;
    } catch (error) {
      this._logError(`Erro ao renderizar: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Renderiza múltiplos desenhos
   * @param {Array} geometries - Array de { uuid, feature }
   * @param {Object} style - Estilo customizado
   * @returns {Array} Layers renderizados
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
   * Atualiza um desenho
   * @param {string} uuid - UUID
   * @param {Object} feature - Nova feature
   * @param {Object} style - Novo estilo
   * @returns {Object} Layer atualizado
   */
  update(uuid, feature, style = {}) {
    this.remove(uuid);
    return this.render(uuid, feature, style);
  }
  
  /**
   * Obtém o comprimento de um desenho
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
   * Obtém a área de um desenho (se fechado)
   * @param {string} uuid - UUID
   * @returns {number|null} Área em metros quadrados
   */
  getArea(uuid) {
    if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
      return this.renderedLayers[uuid]._beraMetadata.area;
    }
    return null;
  }
  
  /**
   * Verifica se um desenho está fechado
   * @param {string} uuid - UUID
   * @returns {boolean|null} Se está fechado
   */
  isClosed(uuid) {
    if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
      return this.renderedLayers[uuid]._beraMetadata.isClosed;
    }
    return null;
  }
  
  /**
   * Obtém metadados do desenho
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
  
  _attachEventListeners(layer, uuid, feature) {
    // Click
    layer.on('click', (e) => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
      this._log(`Drawing clicado: ${uuid}`);
    });
    
    // Mouseover
    layer.on('mouseover', () => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
      layer.setStyle({
        weight: this.defaultStyle.weight + 2,
        opacity: 1
      });
    });
    
    // Mouseout
    layer.on('mouseout', () => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
      layer.setStyle({
        weight: this.defaultStyle.weight,
        opacity: this.defaultStyle.opacity
      });
    });
  }
  
  _isClosedLine(latLngs) {
    if (latLngs.length < 3) return false;
    
    const first = latLngs[0];
    const last = latLngs[latLngs.length - 1];
    
    const latDiff = Math.abs(first[0] - last[0]);
    const lngDiff = Math.abs(first[1] - last[1]);
    
    return latDiff < this.config.closedLineThreshold &&
      lngDiff < this.config.closedLineThreshold;
  }
  
  _calculateLength(latLngs) {
    let totalDistance = 0;
    
    for (let i = 0; i < latLngs.length - 1; i++) {
      totalDistance += this._haversineDistance(latLngs[i], latLngs[i + 1]);
    }
    
    return totalDistance;
  }
  
  _calculateArea(latLngs) {
    // Fórmula de Shoelace simplificada
    let area = 0;
    const R = 6371000; // Raio da Terra em metros
    
    for (let i = 0; i < latLngs.length - 1; i++) {
      const p1 = latLngs[i];
      const p2 = latLngs[i + 1];
      
      const φ1 = (p1[0] * Math.PI) / 180;
      const φ2 = (p2[0] * Math.PI) / 180;
      const Δλ = ((p2[1] - p1[1]) * Math.PI) / 180;
      
      area += Math.sin(φ1) * Math.cos(φ2) * Math.sin(Δλ);
      area -= Math.sin(φ2) * Math.cos(φ1) * Math.sin(Δλ);
    }
    
    area = Math.abs(area * R * R) / 2;
    return area;
  }
}

export default DrawingRenderer;
