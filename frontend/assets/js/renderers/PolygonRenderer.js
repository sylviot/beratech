/**
 * PolygonRenderer - Renderizador de Polygons para BeraMap
 *
 * Responsável por:
 * - Renderizar Polygons como polígonos Leaflet com preenchimento
 * - Gerenciar estilos (cor borda, peso, cor preenchimento, opacidade)
 * - Calcular área e perímetro
 * - Adicionar interatividade (click, hover)
 * - Gerenciar popups e tooltips
 * - Remover camadas corretamente
 *
 * @version 1.0.0
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory(global.L);
  } else if (typeof define === 'function' && define.amd) {
    define(['leaflet'], factory);
  } else {
    global.PolygonRenderer = factory(global.L);
  }
}(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';
  
  /**
   * Classe PolygonRenderer
   * Renderiza geometrias do tipo Polygon como polígonos Leaflet
   */
  class PolygonRenderer {
    /**
     * Constructor
     * @param {Object} beraMap - Referência à instância BeraMap
     * @param {Object} options - Opções de configuração
     */
    constructor(beraMap, options = {}) {
      if (!L) {
        throw new Error('PolygonRenderer: Leaflet.js não foi carregado');
      }
      
      this.beraMap = beraMap;
      this.geometryType = 'Polygon';
      
      // Configurações
      this.config = {
        debug: options.debug || false,
        defaultColor: options.defaultColor || '#3388ff',
        defaultFillColor: options.defaultFillColor || '#3388ff',
        defaultWeight: options.defaultWeight || 2,
        defaultOpacity: options.defaultOpacity || 0.8,
        defaultFillOpacity: options.defaultFillOpacity || 0.2,
        enablePopup: options.enablePopup !== false,
        enableTooltip: options.enableTooltip !== false,
        hoverWeight: options.hoverWeight || 4,
        hoverOpacity: options.hoverOpacity || 1,
        hoverFillOpacity: options.hoverFillOpacity || 0.4,
        areaUnit: options.areaUnit || 'sqm'  // 'sqm', 'sqkm', 'ha'
      };
      
      // Armazenamento de camadas renderizadas
      this.renderedLayers = {};  // { uuid: L.polygon }
      
      // Estilos padrão
      this.defaultStyle = {
        color: this.config.defaultColor,
        weight: this.config.defaultWeight,
        opacity: this.config.defaultOpacity,
        fillColor: this.config.defaultFillColor,
        fillOpacity: this.config.defaultFillOpacity,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'bera-polygon-renderer'
      };
      
      // Estilos predefinidos
      this.polygonStylePresets = this._initializePolygonStylePresets();
      
      this._initialize();
    }
    
    /**
     * Inicializa o renderer
     * @private
     */
    _initialize() {
      if (this.config.debug) {
        console.log('✅ PolygonRenderer inicializado');
        console.log('   Cor padrão:', this.config.defaultColor);
        console.log('   Fill color:', this.config.defaultFillColor);
        console.log('   Fill opacity:', this.config.defaultFillOpacity);
      }
    }
    
    /**
     * Inicializa presets de estilos de polígono
     * @private
     */
    _initializePolygonStylePresets() {
      return {
        'default': {
          color: '#3388ff',
          weight: 2,
          opacity: 0.8,
          fillColor: '#3388ff',
          fillOpacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'transparent': {
          color: '#3388ff',
          weight: 2,
          opacity: 0.8,
          fillColor: '#3388ff',
          fillOpacity: 0,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'bold': {
          color: '#000000',
          weight: 4,
          opacity: 1,
          fillColor: '#3388ff',
          fillOpacity: 0.3,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'light': {
          color: '#3388ff',
          weight: 1,
          opacity: 0.6,
          fillColor: '#3388ff',
          fillOpacity: 0.1,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'solid': {
          color: '#3388ff',
          weight: 2,
          opacity: 0.8,
          fillColor: '#3388ff',
          fillOpacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'red': {
          color: '#ff0000',
          weight: 2,
          opacity: 0.8,
          fillColor: '#ff0000',
          fillOpacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'green': {
          color: '#00ff00',
          weight: 2,
          opacity: 0.8,
          fillColor: '#00ff00',
          fillOpacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'yellow': {
          color: '#ffff00',
          weight: 2,
          opacity: 0.8,
          fillColor: '#ffff00',
          fillOpacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round'
        }
      };
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Renderização
    // ===================================================================
    
    /**
     * Renderiza um Polygon
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Feature GeoJSON
     * @param {Object} style - Estilo customizado (opcional)
     * @returns {Object} Camada Leaflet renderizada
     */
    render(uuid, feature, style = {}) {
      if (!uuid || !feature) {
        console.error('❌ PolygonRenderer.render(): uuid e feature obrigatórios');
        return null;
      }
      
      if (this.config.debug) {
        console.log('🎨 PolygonRenderer: renderizando', uuid);
      }
      
      try {
        // Se já renderizado, remover anterior
        if (this.renderedLayers[uuid]) {
          this.remove(uuid);
        }
        
        // Extrair coordenadas
        const coordinates = feature.geometry.coordinates;
        const latLngs = this._coordinatesToLatLngs(coordinates[0]); // Primeiro anel
        
        if (latLngs.length < 3) {
          console.warn('⚠️ PolygonRenderer: Polygon precisa de no mínimo 3 pontos');
          return null;
        }
        
        // Mesclar estilos
        const finalStyle = Object.assign({}, this.defaultStyle, style);
        
        // Criar polygon
        const polygon = L.polygon(latLngs, {
          color: finalStyle.color,
          weight: finalStyle.weight,
          opacity: finalStyle.opacity,
          fillColor: finalStyle.fillColor,
          fillOpacity: finalStyle.fillOpacity,
          lineCap: finalStyle.lineCap,
          lineJoin: finalStyle.lineJoin,
          className: finalStyle.className
        });
        
        // Adicionar popup se configurado
        if (this.config.enablePopup) {
          this._attachPopup(polygon, feature, uuid, latLngs);
        }
        
        // Adicionar tooltip se configurado
        if (this.config.enableTooltip) {
          this._attachTooltip(polygon, feature, uuid, latLngs);
        }
        
        // Adicionar event listeners
        this._attachEventListeners(polygon, uuid, feature);
        
        // Adicionar ao layer group
        const layerGroup = this.beraMap._layerGroups[this.geometryType];
        if (layerGroup) {
          polygon.addTo(layerGroup);
        }
        
        // Armazenar referência
        this.renderedLayers[uuid] = polygon;
        
        // Armazenar dados adicionais
        this.renderedLayers[uuid]._beraMetadata = {
          uuid: uuid,
          feature: feature,
          style: finalStyle,
          latLngs: latLngs,
          area: this._calculateArea(latLngs),
          perimeter: this._calculatePerimeter(latLngs),
          vertices: latLngs.length
        };
        
        // Atualizar no GeoManager
        this.beraMap._geoManager.setLeafletLayer(uuid, polygon);
        
        if (this.config.debug) {
          console.log('✅ Polygon renderizado:', uuid);
        }
        
        return polygon;
      } catch (error) {
        console.error('❌ Erro ao renderizar Polygon:', error);
        this.beraMap._eventManager.triggerError('Erro ao renderizar Polygon', error);
        return null;
      }
    }
    
    /**
     * Renderiza múltiplos Polygons em batch
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
      console.log('✅ PolygonRenderer: ' + rendered.length + ' polígonos renderizados em ' + duration + 'ms');
      
      return rendered;
    }
    
    /**
     * Remove um Polygon renderizado
     * @param {string} uuid - UUID da geometria
     * @returns {boolean} Sucesso da operação
     */
    remove(uuid) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ PolygonRenderer: uuid não encontrado:', uuid);
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
          console.log('🗑️ Polygon removido:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao remover Polygon:', error);
        return false;
      }
    }
    
    /**
     * Remove todos os Polygons
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
      
      console.log('✅ PolygonRenderer: ' + removedCount + ' polígonos removidos');
      return removedCount;
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Atualização
    // ===================================================================
    
    /**
     * Atualiza um Polygon
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Nova feature
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    update(uuid, feature, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ PolygonRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        // Remover anterior
        this.remove(uuid);
        
        // Renderizar novo
        this.render(uuid, feature, style);
        
        if (this.config.debug) {
          console.log('🔄 Polygon atualizado:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar Polygon:', error);
        return false;
      }
    }
    
    /**
     * Atualiza apenas o estilo de um Polygon
     * @param {string} uuid - UUID da geometria
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    updateStyle(uuid, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ PolygonRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        const polygon = this.renderedLayers[uuid];
        const metadata = polygon._beraMetadata;
        
        // Aplicar novo estilo
        polygon.setStyle({
          color: style.color !== undefined ? style.color : metadata.style.color,
          weight: style.weight !== undefined ? style.weight : metadata.style.weight,
          opacity: style.opacity !== undefined ? style.opacity : metadata.style.opacity,
          fillColor: style.fillColor !== undefined ? style.fillColor : metadata.style.fillColor,
          fillOpacity: style.fillOpacity !== undefined ? style.fillOpacity : metadata.style.fillOpacity
        });
        
        // Atualizar metadados
        metadata.style = Object.assign({}, metadata.style, style);
        
        if (this.config.debug) {
          console.log('🎨 Estilo do Polygon atualizado:', uuid);
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
        console.log('🎨 Estilo padrão do PolygonRenderer atualizado');
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
     * Obtém preset de estilo de polígono
     * @param {string} presetName - Nome do preset
     * @returns {Object|null} Configuração do preset
     */
    getPolygonStylePreset(presetName) {
      return this.polygonStylePresets[presetName] || null;
    }
    
    /**
     * Lista todos os presets de estilos disponíveis
     * @returns {Array} Array de nomes de presets
     */
    listPolygonStylePresets() {
      return Object.keys(this.polygonStylePresets);
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Query
    // ===================================================================
    
    /**
     * Obtém um polygon renderizado pelo UUID
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
     * Conta Polygons renderizados
     * @returns {number} Quantidade de Polygons
     */
    getRenderedCount() {
      return Object.keys(this.renderedLayers).length;
    }
    
    /**
     * Obtém área de um polígono
     * @param {string} uuid - UUID da geometria
     * @returns {number|null} Área em m²
     */
    getPolygonArea(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.area;
      }
      return null;
    }
    
    /**
     * Obtém perímetro de um polígono
     * @param {string} uuid - UUID da geometria
     * @returns {number|null} Perímetro em metros
     */
    getPolygonPerimeter(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.perimeter;
      }
      return null;
    }
    
    /**
     * Obtém número de vértices
     * @param {string} uuid - UUID da geometria
     * @returns {number|null} Número de vértices
     */
    getPolygonVertices(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.vertices;
      }
      return null;
    }
    
    /**
     * Obtém metadados de um polígono renderizado
     * @param {string} uuid - UUID da geometria
     * @returns {Object|null} Metadados
     */
    getPolygonMetadata(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return Object.assign({}, this.renderedLayers[uuid]._beraMetadata);
      }
      return null;
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Conversão de Coordenadas
    // ===================================================================
    
    /**
     * Converte array de coordenadas GeoJSON para LatLng do Leaflet
     * @private
     */
    _coordinatesToLatLngs(coordinates) {
      return coordinates.map(coord => {
        return [coord[1], coord[0]]; // [lng, lat] → [lat, lng]
      });
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Cálculos de Geometria
    // ===================================================================
    
    /**
     * Calcula área de um polígono usando fórmula de Shoelace
     * Retorna em m²
     * @private
     */
    _calculateArea(latLngs) {
      if (latLngs.length < 3) return 0;
      
      // Converter para graus em radianos para cálculos
      const R = 6371000; // Raio da Terra em metros
      
      let area = 0;
      const n = latLngs.length;
      
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const lat1 = (latLngs[i][0] * Math.PI) / 180;
        const lat2 = (latLngs[j][0] * Math.PI) / 180;
        const dLng = ((latLngs[j][1] - latLngs[i][1]) * Math.PI) / 180;
        
        area += Math.cos((lat1 + lat2) / 2) * dLng;
      }
      
      area = Math.abs((area * R * R) / 2);
      
      return area;
    }
    
    /**
     * Calcula perímetro de um polígono usando Haversine
     * @private
     */
    _calculatePerimeter(latLngs) {
      let perimeter = 0;
      
      for (let i = 0; i < latLngs.length; i++) {
        const j = (i + 1) % latLngs.length;
        const latlng1 = latLngs[i];
        const latlng2 = latLngs[j];
        perimeter += this._haversineDistance(latlng1, latlng2);
      }
      
      return perimeter;
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
     * Calcula centro/centroide de um polígono
     * @private
     */
    _calculateCentroid(latLngs) {
      if (latLngs.length === 0) return null;
      
      let sumLat = 0,
        sumLng = 0;
      
      latLngs.forEach(latlng => {
        sumLat += latlng[0];
        sumLng += latlng[1];
      });
      
      return [sumLat / latLngs.length, sumLng / latLngs.length];
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
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Popup e Tooltip
    // ===================================================================
    
    /**
     * Anexa popup ao polygon
     * @private
     */
    _attachPopup(polygon, feature, uuid, latLngs) {
      let popupContent = '<div class="bera-popup bera-polygon-popup">';
      
      // Título
      if (feature.properties?.name) {
        popupContent += '<h3>' + this._escapeHtml(feature.properties.name) + '</h3>';
      } else {
        popupContent += '<h3>Polygon</h3>';
      }
      
      // Informações do polígono
      const area = this._calculateArea(latLngs);
      const perimeter = this._calculatePerimeter(latLngs);
      
      popupContent += '<table class="bera-properties">';
      popupContent += '<tr>';
      popupContent += '<td><strong>Vértices:</strong></td>';
      popupContent += '<td>' + latLngs.length + '</td>';
      popupContent += '</tr>';
      
      popupContent += '<tr>';
      popupContent += '<td><strong>Área:</strong></td>';
      popupContent += '<td>' + this._formatArea(area) + '</td>';
      popupContent += '</tr>';
      
      popupContent += '<tr>';
      popupContent += '<td><strong>Perímetro:</strong></td>';
      popupContent += '<td>' + this._formatDistance(perimeter) + '</td>';
      popupContent += '</tr>';
      
      // Propriedades customizadas
      if (feature.properties && Object.keys(feature.properties).length > 0) {
        popupContent += '<tr><td colspan="2"><hr style="margin: 5px 0;"></td></tr>';
        Object.entries(feature.properties).forEach(([key, value]) => {
          if (key !== 'name') {
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
      
      polygon.bindPopup(popupContent, {
        maxWidth: 300,
        autoClose: false
      });
    }
    
    /**
     * Anexa tooltip ao polygon
     * @private
     */
    _attachTooltip(polygon, feature, uuid, latLngs) {
      let tooltipContent = feature.properties?.name || 'Polygon';
      
      const area = this._calculateArea(latLngs);
      tooltipContent += ' (' + this._formatArea(area) + ')';
      
      polygon.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'center',
        className: 'bera-tooltip'
      });
    }
    
    /**
     * Anexa event listeners ao polygon
     * @private
     */
    _attachEventListeners(polygon, uuid, feature) {
      const self = this;
      
      // Click
      polygon.on('click', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
        
        if (this.config.debug) {
          console.log('📍 Polygon clicado:', uuid);
        }
      });
      
      // Mouseover (hover)
      polygon.on('mouseover', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
        
        // Aumentar estilo ao hover
        polygon.setStyle({
          weight: this.config.hoverWeight,
          opacity: this.config.hoverOpacity,
          fillOpacity: this.config.hoverFillOpacity
        });
      });
      
      // Mouseout (unhover)
      polygon.on('mouseout', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
        
        // Restaurar estilo
        const metadata = polygon._beraMetadata;
        if (metadata && metadata.style) {
          polygon.setStyle({
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
  
  return PolygonRenderer;
}));
