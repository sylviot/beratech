/**
 * CircleRenderer - Renderizador de Circles para BeraMap
 *
 * Responsável por renderizar círculos com raio configurável
 * Suporta animação de pulsação usando JavaScript puro
 */

import { BaseRenderer } from './BaseRenderer.js';

export class CircleRenderer extends BaseRenderer {
  constructor(beraMap, options = {}) {
    super(beraMap, 'Circle', {
      ...options,
      defaultStyle: {
        color: options.defaultColor || '#ff0000',
        weight: options.defaultWeight || 2,
        opacity: options.defaultOpacity || 0.8,
        fillColor: options.defaultFillColor || '#ff0000',
        fillOpacity: options.defaultFillOpacity || 0.2
      }
    });
    this.config.defaultRadius = options.defaultRadius || 500;
    this.config.enablePulse = options.enablePulse !== false;
    this.config.pulseOpacityMin = options.pulseOpacityMin || 0.3;
    this.config.pulseOpacityMax = options.pulseOpacityMax || 0.8;
    this.config.pulseDuration = options.pulseDuration || 1500;
    
    this.pulsingCircles = new Set();
    this.pulseAnimations = new Map(); // Mapear UUID -> animationId
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
        circumference: this._calculateCircumference(radius),
        isPulsing: false
      };
      
      this._attachEventListeners(circle, uuid, feature);
      
      // Aplicar pulsação se habilitada
      if (this.config.enablePulse) {
        setTimeout(() => {
          this.startPulse(uuid);
        }, 100);
      }
      
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
   * Inicia a pulsação de um círculo
   * @param {string} uuid - UUID
   * @returns {boolean} Sucesso
   */
  startPulse(uuid) {
    if (!this.renderedLayers[uuid]) {
      this._logError(`Círculo não encontrado: ${uuid}`);
      return false;
    }
    
    // Se já está pulsando, não iniciar novamente
    if (this.pulsingCircles.has(uuid)) {
      return true;
    }
    
    const circle = this.renderedLayers[uuid];
    const metadata = circle._beraMetadata;
    const minOpacity = this.config.pulseOpacityMin;
    const maxOpacity = this.config.pulseOpacityMax;
    const duration = this.config.pulseDuration;
    
    let startTime = null;
    let animationId = null;
    
    // Função de animação
    const animate = (currentTime) => {
      if (!startTime) {
        startTime = currentTime;
      }
      
      // Calcular progresso da animação (0 a 1)
      const elapsed = (currentTime - startTime) % duration;
      let progress = elapsed / duration;
      
      // Função senoidal para suavidade
      let opacity;
      if (progress < 0.5) {
        // Primeira metade: aumentar de minOpacity para maxOpacity
        opacity = minOpacity + (maxOpacity - minOpacity) * (progress * 2);
      } else {
        // Segunda metade: diminuir de maxOpacity para minOpacity
        opacity = maxOpacity - (maxOpacity - minOpacity) * ((progress - 0.5) * 2);
      }
      
      // Aplicar opacidade ao círculo
      try {
        circle.setStyle({
          fillOpacity: opacity
        });
      } catch (e) {
        this._logError(`Erro ao aplicar estilo: ${e.message}`);
      }
      
      // Continuar animação se ainda está pulsando
      if (this.pulsingCircles.has(uuid)) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    // Marcar como pulsando e iniciar animação
    this.pulsingCircles.add(uuid);
    if (metadata) {
      metadata.isPulsing = true;
    }
    
    animationId = requestAnimationFrame(animate);
    this.pulseAnimations.set(uuid, animationId);
    
    this._log(`Pulsação iniciada: ${uuid}`);
    return true;
  }
  
  /**
   * Para a pulsação de um círculo
   * @param {string} uuid - UUID
   * @returns {boolean} Sucesso
   */
  stopPulse(uuid) {
    if (!this.renderedLayers[uuid]) {
      return false;
    }
    
    const circle = this.renderedLayers[uuid];
    const metadata = circle._beraMetadata;
    const animationId = this.pulseAnimations.get(uuid);
    
    // Cancelar animação
    if (animationId) {
      cancelAnimationFrame(animationId);
      this.pulseAnimations.delete(uuid);
    }
    
    this.pulsingCircles.delete(uuid);
    
    if (metadata) {
      metadata.isPulsing = false;
      // Restaurar opacidade original
      try {
        circle.setStyle({
          fillOpacity: metadata.style.fillOpacity
        });
      } catch (e) {
        // Ignorar erro
      }
    }
    
    this._log(`Pulsação parada: ${uuid}`);
    return true;
  }
  
  /**
   * Alterna pulsação de um círculo
   * @param {string} uuid - UUID
   * @returns {boolean} Novo estado (true = pulsando, false = parado)
   */
  togglePulse(uuid) {
    if (!this.renderedLayers[uuid]) {
      return false;
    }
    
    const metadata = this.renderedLayers[uuid]._beraMetadata;
    if (metadata && metadata.isPulsing) {
      this.stopPulse(uuid);
      return false;
    } else {
      this.startPulse(uuid);
      return true;
    }
  }
  
  /**
   * Para pulsação de todos os círculos
   * @returns {number} Quantidade de círculos afetados
   */
  stopAllPulses() {
    let count = 0;
    const uuidsToStop = Array.from(this.pulsingCircles);
    uuidsToStop.forEach(uuid => {
      if (this.stopPulse(uuid)) {
        count++;
      }
    });
    return count;
  }
  
  /**
   * Inicia pulsação de todos os círculos
   * @returns {number} Quantidade de círculos afetados
   */
  startAllPulses() {
    let count = 0;
    Object.keys(this.renderedLayers).forEach(uuid => {
      if (this.startPulse(uuid)) {
        count++;
      }
    });
    return count;
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
