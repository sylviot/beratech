/**
 * PolygonRenderer - Renderizador de Polygons para BeraMap
 *
 * Responsável por renderizar polígonos como polygons Leaflet
 */

import { BaseRenderer } from './BaseRenderer.js';

export class PolygonRenderer extends BaseRenderer {
  constructor(beraMap, options = {}) {
    super(beraMap, 'Polygon', {
      ...options,
      defaultStyle: {
        color: options.defaultColor || '#3388ff',
        weight: options.defaultWeight || 2,
        opacity: options.defaultOpacity || 0.8,
        fillColor: options.defaultFillColor || '#3388ff',
        fillOpacity: options.defaultFillOpacity || 0.2
      }
    });
  }
  
  /**
   * Renderiza um polígono
   * @param {string} uuid - UUID da geometria
   * @param {Object} feature - Feature GeoJSON
   * @param {Object} style - Estilo customizado
   * @returns {Object} Polygon renderizado
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
      
      const coordinates = feature.geometry.coordinates[0];
      const latLngs = coordinates.map(coord => [coord[1], coord[0]]);
      
      const finalStyle = Object.assign({}, this.defaultStyle, style);
      
      const L = window.L;
      const polygon = L.polygon(latLngs, {
        color: finalStyle.color,
        weight: finalStyle.weight,
        opacity: finalStyle.opacity,
        fillColor: finalStyle.fillColor,
        fillOpacity: finalStyle.fillOpacity
      });
      
      const layerGroup = this.beraMap._layerGroups[this.geometryType];
      if (layerGroup) {
        polygon.addTo(layerGroup);
      }
      
      this.renderedLayers[uuid] = polygon;
      this.beraMap._geoManager.setLeafletLayer(uuid, polygon);
      
      // Armazenar metadados
      polygon._beraMetadata = {
        uuid: uuid,
        feature: feature,
        style: finalStyle,
        area: this._calculateArea(latLngs),
        perimeter: this._calculatePerimeter(latLngs)
      };
      
      this._attachEventListeners(polygon, uuid, feature);
      
      this._log(`Polygon renderizado: ${uuid}`);
      return polygon;
    } catch (error) {
      this._logError(`Erro ao renderizar: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Renderiza múltiplos polígonos
   * @param {Array} geometries - Array de { uuid, feature }
   * @param {Object} style - Estilo customizado
   * @returns {Array} Polygons renderizados
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
   * Atualiza um polígono
   * @param {string} uuid - UUID
   * @param {Object} feature - Nova feature
   * @param {Object} style - Novo estilo
   * @returns {Object} Polygon atualizado
   */
  update(uuid, feature, style = {}) {
    this.remove(uuid);
    return this.render(uuid, feature, style);
  }
  
  /**
   * Obtém a área de um polígono
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
   * Obtém o perímetro de um polígono
   * @param {string} uuid - UUID
   * @returns {number|null} Perímetro em metros
   */
  getPerimeter(uuid) {
    if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
      return this.renderedLayers[uuid]._beraMetadata.perimeter;
    }
    return null;
  }
  
  /**
   * Obtém metadados do polígono
   * @param {string} uuid - UUID
   * @returns {Object|null} Metadados
   */
  getMetadata(uuid) {
    if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
      return Object.assign({}, this.renderedLayers[uuid]._beraMetadata);
    }
    return null;
  }
  
  /**
   * Verifica se um ponto está dentro do polígono
   * @param {string} uuid - UUID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} Se o ponto está dentro
   */
  isPointInPolygon(uuid, lat, lng) {
    if (!this.renderedLayers[uuid]) {
      return false;
    }
    
    const polygon = this.renderedLayers[uuid];
    const bounds = polygon.getBounds();
    
    // Verificação rápida de bounds
    if (!bounds.contains([lat, lng])) {
      return false;
    }
    
    // Verificação mais precisa com ponto-em-polígono
    const coordinates = this.renderedLayers[uuid]._beraMetadata.feature.geometry.coordinates[0];
    return this._pointInPolygon([lng, lat], coordinates);
  }
  
  // ===================================================================
  // MÉTODOS PRIVADOS
  // ===================================================================
  
  _attachEventListeners(polygon, uuid, feature) {
    // Click
    polygon.on('click', (e) => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
      this._log(`Polygon clicado: ${uuid}`);
    });
    
    // Mouseover
    polygon.on('mouseover', () => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
      polygon.setStyle({
        weight: this.defaultStyle.weight + 2,
        opacity: 1,
        fillOpacity: this.defaultStyle.fillOpacity + 0.2
      });
    });
    
    // Mouseout
    polygon.on('mouseout', () => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
      polygon.setStyle({
        weight: this.defaultStyle.weight,
        opacity: this.defaultStyle.opacity,
        fillOpacity: this.defaultStyle.fillOpacity
      });
    });
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
  
  _calculatePerimeter(latLngs) {
    let totalDistance = 0;
    
    for (let i = 0; i < latLngs.length; i++) {
      const nextIndex = (i + 1) % latLngs.length;
      totalDistance += this._haversineDistance(latLngs[i], latLngs[nextIndex]);
    }
    
    return totalDistance;
  }
  
  _pointInPolygon(point, polygon) {
    const [px, py] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }
}

export default PolygonRenderer;
