/**
 * LineRenderer - Renderizador de LineStrings para BeraMap
 *
 * Responsável por:
 * - Renderizar LineStrings como polylines Leaflet
 * - Gerenciar estilos (cor, espessura, padrão de traço)
 * - Adicionar interatividade (click, hover)
 * - Gerenciar popups e tooltips
 * - Remover camadas corretamente
 * - Suportar desenhos abertos e fechados
 *
 * @version 1.0.0
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory(global.L);
  } else if (typeof define === 'function' && define.amd) {
    define(['leaflet'], factory);
  } else {
    global.LineRenderer = factory(global.L);
  }
}(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';
  
  /**
   * Classe LineRenderer
   * Renderiza geometrias do tipo LineString como polylines Leaflet
   */
  class LineRenderer {
    /**
     * Constructor
     * @param {Object} beraMap - Referência à instância BeraMap
     * @param {Object} options - Opções de configuração
     */
    constructor(beraMap, options = {}) {
      if (!L) {
        throw new Error('LineRenderer: Leaflet.js não foi carregado');
      }
      
      this.beraMap = beraMap;
      this.geometryType = 'LineString';
      
      // Configurações
      this.config = {
        debug: options.debug || false,
        defaultColor: options.defaultColor || '#ff7800',
        defaultWeight: options.defaultWeight || 3,
        defaultOpacity: options.defaultOpacity || 0.8,
        defaultDashArray: options.defaultDashArray || null,
        enablePopup: options.enablePopup !== false,
        enableTooltip: options.enableTooltip !== false,
        hoverWeight: options.hoverWeight || 5,
        hoverOpacity: options.hoverOpacity || 1,
        closePixelDistance: options.closePixelDistance || 10
      };
      
      // Armazenamento de camadas renderizadas
      this.renderedLayers = {};  // { uuid: L.polyline }
      
      // Estilos padrão
      this.defaultStyle = {
        color: this.config.defaultColor,
        weight: this.config.defaultWeight,
        opacity: this.config.defaultOpacity,
        dashArray: this.config.defaultDashArray,
        lineCap: 'round',
        lineJoin: 'round',
        fillColor: null,
        fillOpacity: 0,
        className: 'bera-line-renderer'
      };
      
      // Estilos predefinidos
      this.lineStylePresets = this._initializeLineStylePresets();
      
      this._initialize();
    }
    
    /**
     * Inicializa o renderer
     * @private
     */
    _initialize() {
      if (this.config.debug) {
        console.log('✅ LineRenderer inicializado');
        console.log('   Cor padrão:', this.config.defaultColor);
        console.log('   Espessura padrão:', this.config.defaultWeight);
      }
    }
    
    /**
     * Inicializa presets de estilos de linha
     * @private
     */
    _initializeLineStylePresets() {
      return {
        'solid': {
          color: '#ff7800',
          weight: 3,
          opacity: 0.8,
          dashArray: null,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'dashed': {
          color: '#ff7800',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5',
          lineCap: 'round',
          lineJoin: 'round'
        },
        'dotted': {
          color: '#ff7800',
          weight: 2,
          opacity: 0.8,
          dashArray: '2, 3',
          lineCap: 'round',
          lineJoin: 'round'
        },
        'bold': {
          color: '#ff7800',
          weight: 5,
          opacity: 0.9,
          dashArray: null,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'thin': {
          color: '#ff7800',
          weight: 1,
          opacity: 0.8,
          dashArray: null,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'border': {
          color: '#000000',
          weight: 2,
          opacity: 0.6,
          dashArray: null,
          lineCap: 'butt',
          lineJoin: 'miter'
        }
      };
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Renderização
    // ===================================================================
    
    /**
     * Renderiza uma LineString
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Feature GeoJSON
     * @param {Object} style - Estilo customizado (opcional)
     * @returns {Object} Camada Leaflet renderizada
     */
    render(uuid, feature, style = {}) {
      if (!uuid || !feature) {
        console.error('❌ LineRenderer.render(): uuid e feature obrigatórios');
        return null;
      }
      
      if (this.config.debug) {
        console.log('🎨 LineRenderer: renderizando', uuid);
      }
      
      try {
        // Se já renderizado, remover anterior
        if (this.renderedLayers[uuid]) {
          this.remove(uuid);
        }
        
        // Extrair coordenadas
        const coordinates = feature.geometry.coordinates;
        const latLngs = this._coordinatesToLatLngs(coordinates);
        
        if (latLngs.length < 2) {
          console.warn('⚠️ LineRenderer: LineString precisa de no mínimo 2 pontos');
          return null;
        }
        
        // Mesclar estilos
        const finalStyle = Object.assign({}, this.defaultStyle, style);
        
        // Criar polyline
        const polyline = L.polyline(latLngs, {
          color: finalStyle.color,
          weight: finalStyle.weight,
          opacity: finalStyle.opacity,
          dashArray: finalStyle.dashArray,
          lineCap: finalStyle.lineCap,
          lineJoin: finalStyle.lineJoin,
          className: finalStyle.className
        });
        
        // Adicionar popup se configurado
        if (this.config.enablePopup) {
          this._attachPopup(polyline, feature, uuid, latLngs);
        }
        
        // Adicionar tooltip se configurado
        if (this.config.enableTooltip) {
          this._attachTooltip(polyline, feature, uuid, latLngs);
        }
        
        // Adicionar event listeners
        this._attachEventListeners(polyline, uuid, feature);
        
        // Adicionar ao layer group
        const layerGroup = this.beraMap._layerGroups[this.geometryType];
        if (layerGroup) {
          polyline.addTo(layerGroup);
        }
        
        // Armazenar referência
        this.renderedLayers[uuid] = polyline;
        
        // Armazenar dados adicionais
        this.renderedLayers[uuid]._beraMetadata = {
          uuid: uuid,
          feature: feature,
          style: finalStyle,
          latLngs: latLngs,
          length: this._calculateLength(latLngs)
        };
        
        // Atualizar no GeoManager
        this.beraMap._geoManager.setLeafletLayer(uuid, polyline);
        
        if (this.config.debug) {
          console.log('✅ LineString renderizada:', uuid);
        }
        
        return polyline;
      } catch (error) {
        console.error('❌ Erro ao renderizar LineString:', error);
        this.beraMap._eventManager.triggerError('Erro ao renderizar LineString', error);
        return null;
      }
    }
    
    /**
     * Renderiza múltiplas LineStrings em batch
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
      console.log('✅ LineRenderer: ' + rendered.length + ' linhas renderizadas em ' + duration + 'ms');
      
      return rendered;
    }
    
    /**
     * Remove uma LineString renderizada
     * @param {string} uuid - UUID da geometria
     * @returns {boolean} Sucesso da operação
     */
    remove(uuid) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ LineRenderer: uuid não encontrado:', uuid);
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
          console.log('🗑️ LineString removida:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao remover LineString:', error);
        return false;
      }
    }
    
    /**
     * Remove todas as LineStrings
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
      
      console.log('✅ LineRenderer: ' + removedCount + ' linhas removidas');
      return removedCount;
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Atualização
    // ===================================================================
    
    /**
     * Atualiza uma LineString
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Nova feature
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    update(uuid, feature, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ LineRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        // Remover anterior
        this.remove(uuid);
        
        // Renderizar novo
        this.render(uuid, feature, style);
        
        if (this.config.debug) {
          console.log('🔄 LineString atualizada:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar LineString:', error);
        return false;
      }
    }
    
    /**
     * Atualiza apenas o estilo de uma LineString
     * @param {string} uuid - UUID da geometria
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    updateStyle(uuid, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ LineRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        const polyline = this.renderedLayers[uuid];
        const metadata = polyline._beraMetadata;
        
        // Aplicar novo estilo
        if (style.color !== undefined) polyline.setStyle({color: style.color});
        if (style.weight !== undefined) polyline.setStyle({weight: style.weight});
        if (style.opacity !== undefined) polyline.setStyle({opacity: style.opacity});
        if (style.dashArray !== undefined) polyline.setStyle({dashArray: style.dashArray});
        
        // Atualizar metadados
        metadata.style = Object.assign({}, metadata.style, style);
        
        if (this.config.debug) {
          console.log('🎨 Estilo da LineString atualizado:', uuid);
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
        console.log('🎨 Estilo padrão do LineRenderer atualizado');
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
     * Obtém preset de estilo de linha
     * @param {string} presetName - Nome do preset
     * @returns {Object|null} Configuração do preset
     */
    getLineStylePreset(presetName) {
      return this.lineStylePresets[presetName] || null;
    }
    
    /**
     * Lista todos os presets de estilos disponíveis
     * @returns {Array} Array de nomes de presets
     */
    listLineStylePresets() {
      return Object.keys(this.lineStylePresets);
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Query
    // ===================================================================
    
    /**
     * Obtém uma polyline renderizada pelo UUID
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
     * Conta LineStrings renderizadas
     * @returns {number} Quantidade de LineStrings
     */
    getRenderedCount() {
      return Object.keys(this.renderedLayers).length;
    }
    
    /**
     * Obtém comprimento de uma linha (em metros, aproximado)
     * @param {string} uuid - UUID da geometria
     * @returns {number|null} Comprimento em metros
     */
    getLineLength(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.length;
      }
      return null;
    }
    
    /**
     * Obtém metadados de uma linha renderizada
     * @param {string} uuid - UUID da geometria
     * @returns {Object|null} Metadados
     */
    getLineMetadata(uuid) {
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
    
    /**
     * Calcula comprimento aproximado de uma linha em metros
     * @private
     */
    _calculateLength(latLngs) {
      let length = 0;
      
      for (let i = 0; i < latLngs.length - 1; i++) {
        const latlng1 = latLngs[i];
        const latlng2 = latLngs[i + 1];
        length += this._haversineDistance(latlng1, latlng2);
      }
      
      return length;
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
     * Calcula ponto central de uma linha
     * @private
     */
    _calculateMidpoint(latLngs) {
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
     * Verifica se a linha é fechada (primeiro e último ponto são iguais)
     * @private
     */
    _isClosedLine(latLngs) {
      if (latLngs.length < 2) return false;
      
      const first = latLngs[0];
      const last = latLngs[latLngs.length - 1];
      
      return (
        Math.abs(first[0] - last[0]) < 0.00001 &&
        Math.abs(first[1] - last[1]) < 0.00001
      );
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Popup e Tooltip
    // ===================================================================
    
    /**
     * Anexa popup à polyline
     * @private
     */
    _attachPopup(polyline, feature, uuid, latLngs) {
      let popupContent = '<div class="bera-popup bera-line-popup">';
      
      // Título
      if (feature.properties?.name) {
        popupContent += '<h3>' + this._escapeHtml(feature.properties.name) + '</h3>';
      } else {
        popupContent += '<h3>LineString</h3>';
      }
      
      // Informações da linha
      popupContent += '<table class="bera-properties">';
      popupContent += '<tr>';
      popupContent += '<td><strong>Pontos:</strong></td>';
      popupContent += '<td>' + latLngs.length + '</td>';
      popupContent += '</tr>';
      
      const length = this._calculateLength(latLngs);
      popupContent += '<tr>';
      popupContent += '<td><strong>Comprimento:</strong></td>';
      popupContent += '<td>' + length.toFixed(2) + ' m</td>';
      popupContent += '</tr>';
      
      popupContent += '<tr>';
      popupContent += '<td><strong>Fechada:</strong></td>';
      popupContent += '<td>' + (this._isClosedLine(latLngs) ? 'Sim' : 'Não') + '</td>';
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
      
      // Calcular ponto para popup (centro da linha)
      const midpoint = this._calculateMidpoint(latLngs);
      
      polyline.bindPopup(popupContent, {
        maxWidth: 300,
        autoClose: false
      });
    }
    
    /**
     * Anexa tooltip à polyline
     * @private
     */
    _attachTooltip(polyline, feature, uuid, latLngs) {
      let tooltipContent = feature.properties?.name || 'LineString';
      
      const length = this._calculateLength(latLngs);
      tooltipContent += ' (' + length.toFixed(2) + 'm)';
      
      polyline.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'center',
        className: 'bera-tooltip'
      });
    }
    
    /**
     * Anexa event listeners à polyline
     * @private
     */
    _attachEventListeners(polyline, uuid, feature) {
      const self = this;
      
      // Click
      polyline.on('click', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
        
        if (this.config.debug) {
          console.log('📍 LineString clicada:', uuid);
        }
      });
      
      // Mouseover (hover)
      polyline.on('mouseover', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
        
        // Aumentar espessura ao hover
        polyline.setStyle({
          weight: this.config.hoverWeight,
          opacity: this.config.hoverOpacity
        });
      });
      
      // Mouseout (unhover)
      polyline.on('mouseout', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
        
        // Restaurar estilo
        const metadata = polyline._beraMetadata;
        if (metadata && metadata.style) {
          polyline.setStyle({
            weight: metadata.style.weight,
            opacity: metadata.style.opacity
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
  }
  
  // ===================================================================
  // EXPORTAÇÃO
  // ===================================================================
  
  return LineRenderer;
}));
