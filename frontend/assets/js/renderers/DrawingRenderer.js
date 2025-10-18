/**
 * DrawingRenderer - Renderizador de Desenhos para BeraMap
 *
 * Responsável por:
 * - Renderizar desenhos como polylines/polygons Leaflet
 * - Gerenciar estilos (cor, peso, padrão de traço)
 * - Detectar automaticamente linhas abertas vs fechadas
 * - Calcular comprimento (ambas) e área (se fechada)
 * - Adicionar interatividade (click, hover)
 * - Gerenciar popups e tooltips
 * - Remover camadas corretamente
 *
 * Formato de Drawing esperado:
 * {
 *   type: "Feature",
 *   geometry: {
 *     type: "LineString",
 *     coordinates: [[lng, lat], [lng, lat], ...]
 *   },
 *   properties: { name: "Meu Desenho", ... }
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
    global.DrawingRenderer = factory(global.L);
  }
}(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';
  
  /**
   * Classe DrawingRenderer
   * Renderiza geometrias de tipo Drawing (desenhos abertos/fechados)
   */
  class DrawingRenderer {
    /**
     * Constructor
     * @param {Object} beraMap - Referência à instância BeraMap
     * @param {Object} options - Opções de configuração
     */
    constructor(beraMap, options = {}) {
      if (!L) {
        throw new Error('DrawingRenderer: Leaflet.js não foi carregado');
      }
      
      this.beraMap = beraMap;
      this.geometryType = 'Drawing';
      
      // Configurações
      this.config = {
        debug: options.debug || false,
        defaultColor: options.defaultColor || '#9c27b0',
        defaultWeight: options.defaultWeight || 2,
        defaultOpacity: options.defaultOpacity || 0.9,
        defaultDashArray: options.defaultDashArray || '5, 5',
        enablePopup: options.enablePopup !== false,
        enableTooltip: options.enableTooltip !== false,
        hoverWeight: options.hoverWeight || 4,
        hoverOpacity: options.hoverOpacity || 1,
        hoverDashArray: options.hoverDashArray || null,
        closedLineThreshold: options.closedLineThreshold || 0.00001,  // graus
        autoDetectClosed: options.autoDetectClosed !== false
      };
      
      // Armazenamento de camadas renderizadas
      this.renderedLayers = {};  // { uuid: L.polyline ou L.polygon }
      
      // Estilos padrão
      this.defaultStyle = {
        color: this.config.defaultColor,
        weight: this.config.defaultWeight,
        opacity: this.config.defaultOpacity,
        dashArray: this.config.defaultDashArray,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'bera-drawing-renderer'
      };
      
      // Estilos predefinidos
      this.drawingStylePresets = this._initializeDrawingStylePresets();
      
      this._initialize();
    }
    
    /**
     * Inicializa o renderer
     * @private
     */
    _initialize() {
      if (this.config.debug) {
        console.log('✅ DrawingRenderer inicializado');
        console.log('   Cor padrão:', this.config.defaultColor);
        console.log('   Auto-detect fechado:', this.config.autoDetectClosed);
      }
    }
    
    /**
     * Inicializa presets de estilos de desenho
     * @private
     */
    _initializeDrawingStylePresets() {
      return {
        'dashed': {
          color: '#9c27b0',
          weight: 2,
          opacity: 0.9,
          dashArray: '5, 5',
          lineCap: 'round',
          lineJoin: 'round'
        },
        'dotted': {
          color: '#9c27b0',
          weight: 2,
          opacity: 0.9,
          dashArray: '2, 3',
          lineCap: 'round',
          lineJoin: 'round'
        },
        'solid': {
          color: '#9c27b0',
          weight: 2,
          opacity: 0.9,
          dashArray: null,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'bold': {
          color: '#9c27b0',
          weight: 4,
          opacity: 0.9,
          dashArray: null,
          lineCap: 'round',
          lineJoin: 'round'
        },
        'thin': {
          color: '#9c27b0',
          weight: 1,
          opacity: 0.9,
          dashArray: '5, 5',
          lineCap: 'round',
          lineJoin: 'round'
        },
        'red': {
          color: '#ff0000',
          weight: 2,
          opacity: 0.9,
          dashArray: '5, 5',
          lineCap: 'round',
          lineJoin: 'round'
        },
        'green': {
          color: '#00ff00',
          weight: 2,
          opacity: 0.9,
          dashArray: '5, 5',
          lineCap: 'round',
          lineJoin: 'round'
        },
        'blue': {
          color: '#0000ff',
          weight: 2,
          opacity: 0.9,
          dashArray: '5, 5',
          lineCap: 'round',
          lineJoin: 'round'
        }
      };
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Renderização
    // ===================================================================
    
    /**
     * Renderiza um Drawing
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Feature GeoJSON
     * @param {Object} style - Estilo customizado (opcional)
     * @returns {Object} Camada Leaflet renderizada
     */
    render(uuid, feature, style = {}) {
      if (!uuid || !feature) {
        console.error('❌ DrawingRenderer.render(): uuid e feature obrigatórios');
        return null;
      }
      
      if (this.config.debug) {
        console.log('🎨 DrawingRenderer: renderizando', uuid);
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
          console.warn('⚠️ DrawingRenderer: Drawing precisa de no mínimo 2 pontos');
          return null;
        }
        
        // Detectar se é fechado
        const isClosed = this.config.autoDetectClosed && this._isClosedLine(latLngs);
        
        // Mesclar estilos
        const finalStyle = Object.assign({}, this.defaultStyle, style);
        
        let layer;
        
        if (isClosed) {
          // Renderizar como polígono (preenchimento leve)
          layer = L.polygon(latLngs, {
            color: finalStyle.color,
            weight: finalStyle.weight,
            opacity: finalStyle.opacity,
            dashArray: finalStyle.dashArray,
            lineCap: finalStyle.lineCap,
            lineJoin: finalStyle.lineJoin,
            fillColor: finalStyle.color,
            fillOpacity: 0.1,
            className: finalStyle.className
          });
          
          if (this.config.debug) {
            console.log('   Tipo: Fechado (Polígono)');
          }
        } else {
          // Renderizar como polyline (aberto)
          layer = L.polyline(latLngs, {
            color: finalStyle.color,
            weight: finalStyle.weight,
            opacity: finalStyle.opacity,
            dashArray: finalStyle.dashArray,
            lineCap: finalStyle.lineCap,
            lineJoin: finalStyle.lineJoin,
            className: finalStyle.className
          });
          
          if (this.config.debug) {
            console.log('   Tipo: Aberto (Polyline)');
          }
        }
        
        // Adicionar popup se configurado
        if (this.config.enablePopup) {
          this._attachPopup(layer, feature, uuid, latLngs, isClosed);
        }
        
        // Adicionar tooltip se configurado
        if (this.config.enableTooltip) {
          this._attachTooltip(layer, feature, uuid, latLngs, isClosed);
        }
        
        // Adicionar event listeners
        this._attachEventListeners(layer, uuid, feature);
        
        // Adicionar ao layer group
        const layerGroup = this.beraMap._layerGroups[this.geometryType];
        if (layerGroup) {
          layer.addTo(layerGroup);
        }
        
        // Armazenar referência
        this.renderedLayers[uuid] = layer;
        
        // Armazenar dados adicionais
        this.renderedLayers[uuid]._beraMetadata = {
          uuid: uuid,
          feature: feature,
          style: finalStyle,
          latLngs: latLngs,
          isClosed: isClosed,
          length: this._calculateLength(latLngs),
          area: isClosed ? this._calculateArea(latLngs) : 0,
          vertices: latLngs.length,
          type: isClosed ? 'closed' : 'open'
        };
        
        // Atualizar no GeoManager
        this.beraMap._geoManager.setLeafletLayer(uuid, layer);
        
        if (this.config.debug) {
          console.log('✅ Drawing renderizado:', uuid);
        }
        
        return layer;
      } catch (error) {
        console.error('❌ Erro ao renderizar Drawing:', error);
        this.beraMap._eventManager.triggerError('Erro ao renderizar Drawing', error);
        return null;
      }
    }
    
    /**
     * Renderiza múltiplos Drawings em batch
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
      console.log('✅ DrawingRenderer: ' + rendered.length + ' desenhos renderizados em ' + duration + 'ms');
      
      return rendered;
    }
    
    /**
     * Remove um Drawing renderizado
     * @param {string} uuid - UUID da geometria
     * @returns {boolean} Sucesso da operação
     */
    remove(uuid) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ DrawingRenderer: uuid não encontrado:', uuid);
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
          console.log('🗑️ Drawing removido:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao remover Drawing:', error);
        return false;
      }
    }
    
    /**
     * Remove todos os Drawings
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
      
      console.log('✅ DrawingRenderer: ' + removedCount + ' desenhos removidos');
      return removedCount;
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Atualização
    // ===================================================================
    
    /**
     * Atualiza um Drawing
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Nova feature
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    update(uuid, feature, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ DrawingRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        // Remover anterior
        this.remove(uuid);
        
        // Renderizar novo
        this.render(uuid, feature, style);
        
        if (this.config.debug) {
          console.log('🔄 Drawing atualizado:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar Drawing:', error);
        return false;
      }
    }
    
    /**
     * Atualiza apenas o estilo de um Drawing
     * @param {string} uuid - UUID da geometria
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    updateStyle(uuid, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ DrawingRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        const layer = this.renderedLayers[uuid];
        const metadata = layer._beraMetadata;
        
        // Aplicar novo estilo
        layer.setStyle({
          color: style.color !== undefined ? style.color : metadata.style.color,
          weight: style.weight !== undefined ? style.weight : metadata.style.weight,
          opacity: style.opacity !== undefined ? style.opacity : metadata.style.opacity,
          dashArray: style.dashArray !== undefined ? style.dashArray : metadata.style.dashArray
        });
        
        // Atualizar metadados
        metadata.style = Object.assign({}, metadata.style, style);
        
        if (this.config.debug) {
          console.log('🎨 Estilo do Drawing atualizado:', uuid);
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
        console.log('🎨 Estilo padrão do DrawingRenderer atualizado');
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
     * Obtém preset de estilo de desenho
     * @param {string} presetName - Nome do preset
     * @returns {Object|null} Configuração do preset
     */
    getDrawingStylePreset(presetName) {
      return this.drawingStylePresets[presetName] || null;
    }
    
    /**
     * Lista todos os presets de estilos disponíveis
     * @returns {Array} Array de nomes de presets
     */
    listDrawingStylePresets() {
      return Object.keys(this.drawingStylePresets);
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Query
    // ===================================================================
    
    /**
     * Obtém um drawing renderizado pelo UUID
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
     * Conta Drawings renderizados
     * @returns {number} Quantidade de Drawings
     */
    getRenderedCount() {
      return Object.keys(this.renderedLayers).length;
    }
    
    /**
     * Conta desenhos abertos vs fechados
     * @returns {Object} { open: count, closed: count }
     */
    getDrawingTypesCount() {
      let open = 0,
        closed = 0;
      
      Object.values(this.renderedLayers).forEach(layer => {
        if (layer._beraMetadata) {
          if (layer._beraMetadata.isClosed) {
            closed++;
          } else {
            open++;
          }
        }
      });
      
      return {open: open, closed: closed};
    }
    
    /**
     * Verifica se um Drawing é fechado
     * @param {string} uuid - UUID da geometria
     * @returns {boolean|null} True se fechado, false se aberto, null se não encontrado
     */
    isDrawingClosed(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.isClosed;
      }
      return null;
    }
    
    /**
     * Obtém comprimento de um Drawing
     * @param {string} uuid - UUID da geometria
     * @returns {number|null} Comprimento em metros
     */
    getDrawingLength(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.length;
      }
      return null;
    }
    
    /**
     * Obtém área de um Drawing (se fechado)
     * @param {string} uuid - UUID da geometria
     * @returns {number|null} Área em m² (0 se aberto)
     */
    getDrawingArea(uuid) {
      if (this.renderedLayers[uuid] && this.renderedLayers[uuid]._beraMetadata) {
        return this.renderedLayers[uuid]._beraMetadata.area;
      }
      return null;
    }
    
    /**
     * Obtém metadados de um Drawing renderizado
     * @param {string} uuid - UUID da geometria
     * @returns {Object|null} Metadados
     */
    getDrawingMetadata(uuid) {
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
     * Verifica se a linha é fechada (primeiro e último ponto são iguais)
     * @private
     */
    _isClosedLine(latLngs) {
      if (latLngs.length < 3) return false;
      
      const first = latLngs[0];
      const last = latLngs[latLngs.length - 1];
      
      return (
        Math.abs(first[0] - last[0]) < this.config.closedLineThreshold &&
        Math.abs(first[1] - last[1]) < this.config.closedLineThreshold
      );
    }
    
    /**
     * Calcula comprimento de um desenho usando Haversine
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
     * Calcula área de um desenho fechado usando fórmula de Shoelace
     * @private
     */
    _calculateArea(latLngs) {
      if (latLngs.length < 3 || !this._isClosedLine(latLngs)) {
        return 0;
      }
      
      const R = 6371000; // Raio da Terra em metros
      let area = 0;
      const n = latLngs.length - 1; // Remover o último (que é igual ao primeiro)
      
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
     * Anexa popup ao drawing
     * @private
     */
    _attachPopup(layer, feature, uuid, latLngs, isClosed) {
      let popupContent = '<div class="bera-popup bera-drawing-popup">';
      
      // Título
      if (feature.properties?.name) {
        popupContent += '<h3>' + this._escapeHtml(feature.properties.name) + '</h3>';
      } else {
        popupContent += '<h3>Drawing</h3>';
      }
      
      // Tipo de desenho
      const typeLabel = isClosed ? 'Fechado' : 'Aberto';
      popupContent += '<p><strong>Tipo:</strong> ' + typeLabel + '</p>';
      
      // Informações do desenho
      const length = this._calculateLength(latLngs);
      
      popupContent += '<table class="bera-properties">';
      popupContent += '<tr>';
      popupContent += '<td><strong>Vértices:</strong></td>';
      popupContent += '<td>' + latLngs.length + '</td>';
      popupContent += '</tr>';
      
      popupContent += '<tr>';
      popupContent += '<td><strong>Comprimento:</strong></td>';
      popupContent += '<td>' + this._formatDistance(length) + '</td>';
      popupContent += '</tr>';
      
      // Se fechado, mostrar área
      if (isClosed) {
        const area = this._calculateArea(latLngs);
        popupContent += '<tr>';
        popupContent += '<td><strong>Área:</strong></td>';
        popupContent += '<td>' + this._formatArea(area) + '</td>';
        popupContent += '</tr>';
      }
      
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
      
      layer.bindPopup(popupContent, {
        maxWidth: 300,
        autoClose: false
      });
    }
    
    /**
     * Anexa tooltip ao drawing
     * @private
     */
    _attachTooltip(layer, feature, uuid, latLngs, isClosed) {
      let tooltipContent = feature.properties?.name || 'Drawing';
      
      const length = this._calculateLength(latLngs);
      tooltipContent += ' (' + this._formatDistance(length);
      
      if (isClosed) {
        const area = this._calculateArea(latLngs);
        tooltipContent += ', ' + this._formatArea(area);
      }
      
      tooltipContent += ')';
      
      layer.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'center',
        className: 'bera-tooltip'
      });
    }
    
    /**
     * Anexa event listeners ao drawing
     * @private
     */
    _attachEventListeners(layer, uuid, feature) {
      // Click
      layer.on('click', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
        
        if (this.config.debug) {
          console.log('📍 Drawing clicado:', uuid);
        }
      });
      
      // Mouseover (hover)
      layer.on('mouseover', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
        
        // Aumentar espessura ao hover
        const newStyle = {
          weight: this.config.hoverWeight,
          opacity: this.config.hoverOpacity
        };
        
        if (this.config.hoverDashArray !== null) {
          newStyle.dashArray = this.config.hoverDashArray;
        }
        
        layer.setStyle(newStyle);
      });
      
      // Mouseout (unhover)
      layer.on('mouseout', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
        
        // Restaurar estilo
        const metadata = layer._beraMetadata;
        if (metadata && metadata.style) {
          layer.setStyle({
            weight: metadata.style.weight,
            opacity: metadata.style.opacity,
            dashArray: metadata.style.dashArray
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
  
  return DrawingRenderer;
}));
