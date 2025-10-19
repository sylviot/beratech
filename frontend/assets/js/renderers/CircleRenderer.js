/**
 * CircleRenderer - Renderizador de Circles para BeraMap
 *
 * Responsável por renderizar círculos com raio configurável
 */

import { BaseRenderer } from './BaseRenderer.js';

export class CircleRenderer extends BaseRenderer {
  constructor(beraMap, options = {}) {
    super(beraMap, 'Circle', {
      ...options,
      defaultStyle: {
        color: options.defaultColor || '#ff7800',
        weight: options.defaultWeight || 2,
        opacity: options.defaultOpacity || 0.8,
        fillColor: options.defaultFillColor || '#ff7800',
        fillOpacity: options.defaultFillOpacity || 0.2
      }
    });
    this.config.defaultRadius = options.defaultRadius || 500;
  }
  
  /**
   * Renderiza um círculo
   * @param {string} uuid - UUID da geometria
   * @param {Object} feature - Feature GeoJSON
   * @param {Object} style - Estilo customizado
   * @returns {Object} Circle renderizado
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
      const latLng = [coordinates[1], coordinates[0]];
      
      // Obter raio
      let radius = this.config.defaultRadius;
      if (feature.geometry.properties?.radius) {
        radius = feature.geometry.properties.radius;
      } else if (feature.properties?.radius) {
        radius = feature.properties.radius;
      }
      
      if (radius <= 0) {
        this._logError('raio deve ser maior que 0');
        return null;
      }
      
      const finalStyle = Object.assign({}, this.defaultStyle, style);
      
      const L = window.L;
      const circle = L.circle(latLng, {
        radius: radius,
        color: finalStyle.color,
        weight: finalStyle.weight,
        opacity: finalStyle.opacity,
        fillColor: finalStyle.fillColor,
        fillOpacity: finalStyle.fillOpacity
      });
      
      const layerGroup = this.beraMap._layerGroups[this.geometryType];
      if (layerGroup) {
        circle.addTo(layerGroup);
      }
      
      this.renderedLayers[uuid] = circle;
      this.beraMap._geoManager.setLeafletLayer(uuid, circle);
      
      // Armazenar metadados
      circle._beraMetadata = {
        uuid: uuid,
        feature: feature,
        style: finalStyle,
        latLng: latLng,
        radius: radius,
        area: this._calculateArea(radius),
        circumference: this._calculateCircumference(radius)
      };
      
      this._attachEventListeners(circle, uuid, feature);
      
      this._log(`Circle renderizado: ${uuid}`);
      return circle;
    } catch (error) {
      this._logError(`Erro ao renderizar: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Renderiza múltiplos círculos
   * @param {Array} geometries - Array de { uuid, feature }
   * @param {Object} style - Estilo customizado
   * @returns {Array} Circles renderizados
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
   * Atualiza um círculo
   * @param {string} uuid - UUID
   * @param {Object} feature - Nova feature
   * @param {Object} style - Novo estilo
   * @returns {Object} Circle atualizado
   */
  update(uuid, feature, style = {}) {
    this.remove(uuid);
    return this.render(uuid, feature, style);
  }
  
  /**
   * Obtém a área de um círculo
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
   * Obtém a circunferência de um círculo
   * @param {string} uuid - UUID
   * @returns {number|null} Circunferência em metros
   */
  getCircumference(uuid) {
    if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
      return this.renderedLayers[uuid]._beraMetadata.circumference;
    }
    return null;
  }
  
  /**
   * Obtém metadados do círculo
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
   * Verifica se um ponto está dentro do círculo
   * @param {string} uuid - UUID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} Se o ponto está dentro
   */
  isPointInCircle(uuid, lat, lng) {
    if (!this.renderedLayers[uuid]) {
      return false;
    }
    
    const metadata = this.renderedLayers[uuid]._beraMetadata;
    const centerLat = metadata.latLng[0];
    const centerLng = metadata.latLng[1];
    const radius = metadata.radius;
    
    const distance = this._haversineDistance([lat, lng], [centerLat, centerLng]);
    return distance <= radius;
  }
  
  // ===================================================================
  // MÉTODOS PRIVADOS
  // ===================================================================
  
  _attachEventListeners(circle, uuid, feature) {
    // Click - Exibir popup
    circle.on('click', (e) => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      const metadata = circle._beraMetadata || {};
      
      // Criar e abrir popup
      if (this.config.enablePopup) {
        const popupContent = this._createPopupContent(feature, metadata);
        circle.bindPopup(popupContent).openPopup(e.latlng);
      }
      
      this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
      this._log(`Circle clicado: ${uuid}`);
    });
    
    // Mouseover
    circle.on('mouseover', (e) => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
      circle.setStyle({
        weight: this.defaultStyle.weight + 2,
        opacity: 1,
        fillOpacity: this.defaultStyle.fillOpacity + 0.2
      });
    });
    
    // Mouseout
    circle.on('mouseout', (e) => {
      const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
      this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
      circle.setStyle({
        weight: this.defaultStyle.weight,
        opacity: this.defaultStyle.opacity,
        fillOpacity: this.defaultStyle.fillOpacity
      });
    });
  }
  
  _calculateArea(radius) {
    return Math.PI * radius * radius;
  }
  
  _calculateCircumference(radius) {
    return 2 * Math.PI * radius;
  }
}

export default CircleRenderer;
