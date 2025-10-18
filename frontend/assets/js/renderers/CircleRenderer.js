/**
 * CircleRenderer - Renderizador de Circles para BeraMap
 *
 * Responsável por:
 * - Renderizar Circles como círculos Leaflet com raio configurável
 * - Gerenciar estilos (cor borda, peso, cor preenchimento, opacidade)
 * - Calcular área e circunferência
 * - Adicionar interatividade (click, hover)
 * - Gerenciar popups e tooltips
 * - Remover camadas corretamente
 *
 * Formato de Circle esperado:
 * {
 *   type: "Feature",
 *   geometry: {
 *     type: "Circle",
 *     coordinates: [lng, lat],
 *     properties: {
 *       radius: 500  // em metros
 *     }
 *   },
 *   properties: { ... }
 * }
 *
 * @version 1.0.0
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory(global.L);
  } else if (typeof define === 'function' && define.amd) {
    define(['leaflet'], factory);
  } else {
    global.CircleRenderer = factory(global.L);
  }
}(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';
  
  /**
   * Classe CircleRenderer
   * Renderiza geometrias do tipo Circle como círculos Leaflet
   */
  class CircleRenderer {
    /**
     * Constructor
     * @param {Object} beraMap - Referência à instância BeraMap
     * @param {Object} options - Opções de configuração
     */
    constructor(beraMap, options = {}) {
      if (!L) {
        throw new Error('CircleRenderer: Leaflet.js não foi carregado');
      }
      
      this.beraMap = beraMap;
      this.geometryType = 'Circle';
      
      // Configurações
      this.config = {
        debug: options.debug || false,
        defaultRadius: options.defaultRadius || 500,          // em metros
        defaultColor: options.defaultColor || '#ff7800',
        defaultFillColor: options.defaultFillColor || '#ff7800',
        defaultWeight: options.defaultWeight || 2,
        defaultOpacity: options.defaultOpacity || 0.8,
        defaultFillOpacity: options.defaultFillOpacity || 0.2,
        enablePopup: options.enablePopup !== false,
        enableTooltip: options.enableTooltip !== false,
        hoverWeight: options.hoverWeight || 4,
        hoverOpacity: options.hoverOpacity || 1,
        hoverFillOpacity: options.hoverFillOpacity || 0.4
      };
      
      // Armazenamento de camadas renderizadas
      this.renderedLayers = {};  // { uuid: L.circle }
      
      // Estilos padrão
      this.defaultStyle = {
        color: this.config.defaultColor,
        weight: this.config.defaultWeight,
        opacity: this.config.defaultOpacity,
        fillColor: this.config.defaultFillColor,
        fillOpacity: this.config.defaultFillOpacity,
        className: 'bera-circle-renderer'
      };
      
      // Estilos predefinidos
      this.circleStylePresets = this._initializeCircleStylePresets();
      
      this._initialize();
    }
    
    /**
     * Inicializa o renderer
     * @private
     */
    _initialize() {
      if (this.config.debug) {
        console.log('✅ CircleRenderer inicializado');
        console.log('   Raio padrão:', this.config.defaultRadius, 'metros');
        console.log('   Cor padrão:', this.config.defaultColor);
      }
    }
    
    /**
     * Inicializa presets de estilos de círculo
     * @private
     */
    _initializeCircleStylePresets() {
      return {
        'default': {
          color: '#ff7800',
          weight: 2,
          opacity: 0.8,
          fillColor: '#ff7800',
          fillOpacity: 0.2
        },
        'transparent': {
          color: '#ff7800',
          weight: 2,
          opacity: 0.8,
          fillColor: '#ff7800',
          fillOpacity: 0
        },
        'bold': {
          color: '#000000',
          weight: 4,
          opacity: 1,
          fillColor: '#ff7800',
          fillOpacity: 0.3
        },
        'light': {
          color: '#ff7800',
          weight: 1,
          opacity: 0.6,
          fillColor: '#ff7800',
          fillOpacity: 0.1
        },
        'solid': {
          color: '#ff7800',
          weight: 2,
          opacity: 0.8,
          fillColor: '#ff7800',
          fillOpacity: 0.7
        },
        'red': {
          color: '#ff0000',
          weight: 2,
          opacity: 0.8,
          fillColor: '#ff0000',
          fillOpacity: 0.2
        },
        'green': {
          color: '#00ff00',
          weight: 2,
          opacity: 0.8,
          fillColor: '#00ff00',
          fillOpacity: 0.2
        },
        'blue': {
          color: '#0000ff',
          weight: 2,
          opacity: 0.8,
          fillColor: '#0000ff',
          fillOpacity: 0.2
        }
      };
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Renderização
    // ===================================================================
    
    /**
     * Renderiza um Circle
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Feature GeoJSON
     * @param {Object} style - Estilo customizado (opcional)
     * @returns {Object} Camada Leaflet renderizada
     */
    render(uuid, feature, style = {}) {
      if (!uuid || !feature) {
        console.error('❌ CircleRenderer.render(): uuid e feature obrigatórios');
        return null;
      }
      
      if (this.config.debug) {
        console.log('🎨 CircleRenderer: renderizando', uuid);
      }
      
      try {
        // Se já renderizado, remover anterior
        if (this.renderedLayers[uuid]) {
          this.remove(uuid);
        }
        
        // Extrair coordenadas e raio
        const coordinates = feature.geometry.coordinates;
        const latLng = [coordinates[1], coordinates[0]]; // [lng, lat] → [lat, lng]
        
        // Obter raio (em metros)
        let radius = this.config.defaultRadius;
        if (feature.geometry.properties && feature.geometry.properties.radius) {
          radius = feature.geometry.properties.radius;
        } else if (feature.properties && feature.properties.radius) {
          radius = feature.properties.radius;
        }
        
        if (radius <= 0) {
          console.warn('⚠️ CircleRenderer: raio deve ser maior que 0');
          return null;
        }
        
        // Mesclar estilos
        const finalStyle = Object.assign({}, this.defaultStyle, style);
        
        // Criar círculo
        const circle = L.circle(latLng, {
          radius: radius,
          color: finalStyle.color,
          weight: finalStyle.weight,
          opacity: finalStyle.opacity,
          fillColor: finalStyle.fillColor,
          fillOpacity: finalStyle.fillOpacity,
          className: finalStyle.className
        });
        
        // Adicionar popup se configurado
        if (this.config.enablePopup) {
          this._attachPopup(circle, feature, uuid, latLng, radius);
        }
        
        // Adicionar tooltip se configurado
        if (this.config.enableTooltip) {
          this._attachTooltip(circle, feature, uuid, radius);
        }
        
        // Adicionar event listeners
        this._attachEventListeners(circle, uuid, feature);
        
        // Adicionar ao layer group
        const layerGroup = this.beraMap._layerGroups[this.geometryType];
        if (layerGroup) {
          circle.addTo(layerGroup);
        }
        
        // Armazenar referência
        this.renderedLayers[uuid] = circle;
        
        // Armazenar dados adicionais
        this.renderedLayers[uuid]._beraMetadata = {
          uuid: uuid,
          feature: feature,
          style: finalStyle,
          latLng: latLng,
          radius: radius,
          area: this._calculateArea(radius),
          circumference: this._calculateCircumference(radius)
        };
        
        // Atualizar no GeoManager
        this.beraMap._geoManager.setLeafletLayer(uuid, circle);
        
        if (this.config.debug) {
          console.log('✅ Circle renderizado:', uuid);
        }
        
        return circle;
      } catch (error) {
        console.error('❌ Erro ao renderizar Circle:', error);
        this.beraMap._eventManager.triggerError('Erro ao renderizar Circle', error);
        return null;
      }
    }
    
    /**
     * Renderiza múltiplos Circles em batch
     * @param {Array} geometries - Array de { uuid, feature }
     * @param {Object} style - Estilo para todos
     * @returns {Array} Array de camadas renderizadas
     */
    renderBatch(geometries, style = {}) {
      const startTime = performance.now();
      const rendered = [];
      
      geometries.forEach(({uuid, feature}) => {
        const layer = this.render(uuid, feature, style);
        if (layer) {
          rendered.push(layer);
        }
      });
      
      const duration = (performance.now() - startTime).toFixed(2);
      console.log('✅ CircleRenderer: ' + rendered.length + ' círculos renderizados em ' + duration + 'ms');
      
      return rendered;
    }
    
    /**
     * Remove um Circle renderizado
     * @param {string} uuid - UUID da geometria
     * @returns {boolean} Sucesso da operação
     */
    remove(uuid) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ CircleRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        const layer = this.renderedLayers[uuid];
        
        // Remover do layer group
        const layerGroup = this.beraMap._layerGroups[this.geometryType];
        if (layerGroup) {
          layerGroup.removeLayer(layer);
        }
        
        // Remover do armazenamento
        delete this.renderedLayers[uuid];
        
        if (this.config.debug) {
          console.log('🗑️ Circle removido:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao remover Circle:', error);
        return false;
      }
    }
    
    /**
     * Remove todos os Circles
     * @returns {number} Quantidade removida
     */
    removeAll() {
      const uuids = Object.keys(this.renderedLayers);
      let removedCount = 0;
      
      uuids.forEach(uuid => {
        if (this.remove(uuid)) {
          removedCount++;
        }
      });
      
      console.log('✅ CircleRenderer: ' + removedCount + ' círculos removidos');
      return removedCount;
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Atualização
    // ===================================================================
    
    /**
     * Atualiza um Circle
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Nova feature
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    update(uuid, feature, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ CircleRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        // Remover anterior
        this.remove(uuid);
        
        // Renderizar novo
        this.render(uuid, feature, style);
        
        if (this.config.debug) {
          console.log('🔄 Circle atualizado:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar Circle:', error);
        return false;
      }
    }
    
    /**
     * Atualiza apenas o raio de um Circle
     * @param {string} uuid - UUID da geometria
     * @param {number} newRadius - Novo raio em metros
     * @returns {boolean} Sucesso da operação
     */
    updateRadius(uuid, newRadius) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ CircleRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      if (newRadius <= 0) {
        console.warn('⚠️ CircleRenderer: raio deve ser maior que 0');
        return false;
      }
      
      try {
        const circle = this.renderedLayers[uuid];
        const metadata = circle._beraMetadata;
        
        // Atualizar raio
        circle.setRadius(newRadius);
        
        // Atualizar metadados
        metadata.radius = newRadius;
        metadata.area = this._calculateArea(newRadius);
        metadata.circumference = this._calculateCircumference(newRadius);
        
        if (this.config.debug) {
          console.log('🎨 Raio do Circle atualizado:', uuid, 'para', newRadius, 'm');
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar raio:', error);
        return false;
      }
    }
    
    /**
     * Atualiza apenas o estilo de um Circle
     * @param {string} uuid - UUID da geometria
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    updateStyle(uuid, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ CircleRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        const circle = this.renderedLayers[uuid];
        const metadata = circle._beraMetadata;
        
        // Aplicar novo estilo
        circle.setStyle({
          color: style.color !== undefined ? style.color : metadata.style.color,
          weight: style.weight !== undefined ? style.weight : metadata.style.weight,
          opacity: style.opacity !== undefined ? style.opacity : metadata.style.opacity,
          fillColor: style.fillColor !== undefined ? style.fillColor : metadata.style.fillColor,
          fillOpacity: style.fillOpacity !== undefined ? style.fillOpacity : metadata.style.fillOpacity
        });
        
        // Atualizar metadados
        metadata.style = Object.assign({}, metadata.style, style);
        
        if (this.config.debug) {
          console.log('🎨 Estilo do Circle atualizado:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar estilo:', error);
        return false;
      }
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Estilo
    // ===================================================================
    
    /**
     * Define o estilo padrão
     * @param {Object} style - Objeto com propriedades de estilo
     * @returns {void}
     */
    setDefaultStyle(style) {
      this.defaultStyle = Object.assign({}, this.defaultStyle, style);
      
      if (this.config.debug) {
        console.log('🎨 Estilo padrão do CircleRenderer atualizado');
      }
    }
    
    /**
     * Obtém o estilo padrão
     * @returns {Object} Estilo padrão
     */
    getDefaultStyle() {
      return Object.assign({}, this.defaultStyle);
    }
    
    /**
     * Obtém preset de estilo de círculo
     * @param {string} presetName - Nome do preset
     * @returns {Object|null} Configuração do preset
     */
    getCircleStylePreset(presetName) {
      return this.circleStylePresets[presetName] || null;
    }
    
    /**
     * Lista todos os presets de estilos disponíveis
     * @returns {Array} Array de nomes de presets
     */
    listCircleStylePresets() {
      return Object.keys(this.circleStylePresets);
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Query
    // ===================================================================
    
    /**
     * Obtém um circle renderizado pelo UUID
     * @param {string} uuid - UUID da geometria
     * @returns {Object|null} Layer Leaflet ou null
     */
    getLayer(uuid) {
      return this.renderedLayers[uuid] || null;
    }
    
    /**
     * Lista todos os UUIDs renderizados
     * @returns {Array} Array de UUIDs
     */
    getRenderedUUIDs() {
      return Object.keys(this.renderedLayers);
    }
    
    /**
     * Conta Circles renderizados
     * @returns {number} Quantidade de Circles
     */
    getRenderedCount() {
      return Object.keys(this.renderedLayers).length;
    }
    
    /**
     * Obtém raio de um círculo
     * @param {string} uuid - UUID da geometria
     * @returns {number|null} Raio em metros
     */
    getCircleRadius(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.radius;
      }
      return null;
    }
    
    /**
     * Obtém área de um círculo
     * @param {string} uuid - UUID da geometria
     * @returns {number|null} Área em m²
     */
    getCircleArea(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.area;
      }
      return null;
    }
    
    /**
     * Obtém circunferência de um círculo
     * @param {string} uuid - UUID da geometria
     * @returns {number|null} Circunferência em metros
     */
    getCircleCircumference(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.circumference;
      }
      return null;
    }
    
    /**
     * Obtém metadados de um círculo renderizado
     * @param {string} uuid - UUID da geometria
     * @returns {Object|null} Metadados
     */
    getCircleMetadata(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return Object.assign({}, this.renderedLayers[uuid]._beraMetadata);
      }
      return null;
    }
    
    /**
     * Verifica se um ponto está dentro de um círculo
     * @param {string} uuid - UUID do círculo
     * @param {number} lat - Latitude do ponto
     * @param {number} lng - Longitude do ponto
     * @returns {boolean} Se o ponto está dentro do círculo
     */
    isPointInCircle(uuid, lat, lng) {
      if (!this.renderedLayers[uuid]) {
        return false;
      }
      
      const metadata = this.renderedLayers[uuid]._beraMetadata;
      const centerLat = metadata.latLng[0];
      const centerLng = metadata.latLng[1];
      const radius = metadata.radius;
      
      // Usar Haversine para calcular distância
      const distance = this._haversineDistance([lat, lng], [centerLat, centerLng]);
      
      return distance <= radius;
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Cálculos de Geometria
    // ===================================================================
    
    /**
     * Calcula área de um círculo
     * Área = π × r²
     * @private
     */
    _calculateArea(radius) {
      return Math.PI * radius * radius;
    }
    
    /**
     * Calcula circunferência de um círculo
     * Circunferência = 2 × π × r
     * @private
     */
    _calculateCircumference(radius) {
      return 2 * Math.PI * radius;
    }
    
    /**
     * Calcula distância entre dois pontos usando fórmula de Haversine
     * @private
     */
    _haversineDistance(latlng1, latlng2) {
      const R = 6371000; // Raio da Terra em metros
      const φ1 = (latlng1[0] * Math.PI) / 180;
      const φ2 = (latlng2[0] * Math.PI) / 180;
      const Δφ = ((latlng2[0] - latlng1[0]) * Math.PI) / 180;
      const Δλ = ((latlng2[1] - latlng1[1]) * Math.PI) / 180;
      
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      
      return R * c;
    }
    
    /**
     * Formata distância para unidade legível
     * @private
     */
    _formatDistance(meters) {
      if (meters >= 1000) {
        return (meters / 1000).toFixed(2) + ' km';
      }
      return meters.toFixed(2) + ' m';
    }
    
    /**
     * Formata área para unidade legível
     * @private
     */
    _formatArea(areaInSqm) {
      const sqkm = areaInSqm / 1000000;
      if (sqkm >= 1) {
        return sqkm.toFixed(4) + ' km²';
      }
      const hectares = areaInSqm / 10000;
      if (hectares >= 1) {
        return hectares.toFixed(4) + ' ha';
      }
      return areaInSqm.toFixed(2) + ' m²';
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Popup e Tooltip
    // ===================================================================
    
    /**
     * Anexa popup ao circle
     * @private
     */
    _attachPopup(circle, feature, uuid, latLng, radius) {
      let popupContent = '<div class="bera-popup bera-circle-popup">';
      
      // Título
      if (feature.properties?.name) {
        popupContent += '<h3>' + this._escapeHtml(feature.properties.name) + '</h3>';
      } else {
        popupContent += '<h3>Circle</h3>';
      }
      
      // Informações do círculo
      const area = this._calculateArea(radius);
      const circumference = this._calculateCircumference(radius);
      
      popupContent += '<table class="bera-properties">';
      popupContent += '<tr>';
      popupContent += '<td><strong>Raio:</strong></td>';
      popupContent += '<td>' + this._formatDistance(radius) + '</td>';
      popupContent += '</tr>';
      
      popupContent += '<tr>';
      popupContent += '<td><strong>Área:</strong></td>';
      popupContent += '<td>' + this._formatArea(area) + '</td>';
      popupContent += '</tr>';
      
      popupContent += '<tr>';
      popupContent += '<td><strong>Circunferência:</strong></td>';
      popupContent += '<td>' + this._formatDistance(circumference) + '</td>';
      popupContent += '</tr>';
      
      popupContent += '<tr>';
      popupContent += '<td><strong>Centro:</strong></td>';
      popupContent += '<td>' + latLng[0].toFixed(6) + ', ' + latLng[1].toFixed(6) + '</td>';
      popupContent += '</tr>';
      
      // Propriedades customizadas
      if (feature.properties && Object.keys(feature.properties).length > 0) {
        popupContent += '<tr><td colspan="2"><hr style="margin: 5px 0;"></td></tr>';
        Object.entries(feature.properties).forEach(([key, value]) => {
          if (key !== 'name' && key !== 'radius') {
            popupContent += '<tr>';
            popupContent += '<td><strong>' + this._escapeHtml(key) + ':</strong></td>';
            popupContent += '<td>' + this._escapeHtml(String(value)) + '</td>';
            popupContent += '</tr>';
          }
        });
      }
      
      // UUID
      popupContent += '<tr><td colspan="2"><small style="color: #999;">UUID: ' + uuid.slice(0, 8) + '...</small></td></tr>';
      popupContent += '</table>';
      popupContent += '</div>';
      
      circle.bindPopup(popupContent, {
        maxWidth: 300,
        autoClose: false
      });
    }
    
    /**
     * Anexa tooltip ao circle
     * @private
     */
    _attachTooltip(circle, feature, uuid, radius) {
      let tooltipContent = feature.properties?.name || 'Circle';
      
      tooltipContent += ' (r: ' + this._formatDistance(radius) + ')';
      
      circle.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'center',
        className: 'bera-tooltip'
      });
    }
    
    /**
     * Anexa event listeners ao circle
     * @private
     */
    _attachEventListeners(circle, uuid, feature) {
      // Click
      circle.on('click', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
        
        if (this.config.debug) {
          console.log('📍 Circle clicado:', uuid);
        }
      });
      
      // Mouseover (hover)
      circle.on('mouseover', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
        
        // Aumentar estilo ao hover
        circle.setStyle({
          weight: this.config.hoverWeight,
          opacity: this.config.hoverOpacity,
          fillOpacity: this.config.hoverFillOpacity
        });
      });
      
      // Mouseout (unhover)
      circle.on('mouseout', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
        
        // Restaurar estilo
        const metadata = circle._beraMetadata;
        if (metadata && metadata.style) {
          circle.setStyle({
            weight: metadata.style.weight,
            opacity: metadata.style.opacity,
            fillOpacity: metadata.style.fillOpacity
          });
        }
      });
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Utilitários
    // ===================================================================
    
    /**
     * Escapa HTML para segurança
     * @private
     */
    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }
  
  // ===================================================================
  // EXPORTAÇÃO
  // ===================================================================
  
  return CircleRenderer;
}));
