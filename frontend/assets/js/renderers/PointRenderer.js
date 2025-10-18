/**
 * PointRenderer - Renderizador de Points para BeraMap
 *
 * Responsável por:
 * - Renderizar Points como marcadores Leaflet
 * - Gerenciar estilos e ícones
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
    global.PointRenderer = factory(global.L);
  }
}(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';
  
  /**
   * Classe PointRenderer
   * Renderiza geometrias do tipo Point como marcadores Leaflet
   */
  class PointRenderer {
    /**
     * Constructor
     * @param {Object} beraMap - Referência à instância BeraMap
     * @param {Object} options - Opções de configuração
     */
    constructor(beraMap, options = {}) {
      if (!L) {
        throw new Error('PointRenderer: Leaflet.js não foi carregado');
      }
      
      this.beraMap = beraMap;
      this.geometryType = 'Point';
      
      // Configurações
      this.config = {
        debug: options.debug || false,
        defaultIcon: options.defaultIcon || 'default',
        defaultColor: options.defaultColor || '#3388ff',
        defaultRadius: options.defaultRadius || 8,
        enablePopup: options.enablePopup !== false,
        enableTooltip: options.enableTooltip !== false,
        popupOffset: options.popupOffset || [0, -15],
        tooltipOffset: options.tooltipOffset || [0, 0],
        tooltipDirection: options.tooltipDirection || 'top'
      };
      
      // Armazenamento de camadas renderizadas
      this.renderedLayers = {};  // { uuid: L.marker }
      
      // Estilos padrão
      this.defaultStyle = {
        color: this.config.defaultColor,
        radius: this.config.defaultRadius,
        fillOpacity: 0.8,
        weight: 2,
        opacity: 1,
        icon: null,                          // Será gerado dinamicamente
        iconUrl: null,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: 'bera-point-marker'
      };
      
      // Estilos predefinidos de ícones
      this.iconPresets = this._initializeIconPresets();
      
      this._initialize();
    }
    
    /**
     * Inicializa o renderer
     * @private
     */
    _initialize() {
      if (this.config.debug) {
        console.log('✅ PointRenderer inicializado');
        console.log('   Ícone padrão:', this.config.defaultIcon);
        console.log('   Cor padrão:', this.config.defaultColor);
      }
    }
    
    /**
     * Inicializa presets de ícones
     * @private
     */
    _initializeIconPresets() {
      return {
        'default': {
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        },
        'blue': {
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        },
        'red': {
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        },
        'green': {
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        },
        'orange': {
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        },
        'yellow': {
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        },
        'purple': {
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        },
        'grey': {
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        }
      };
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Renderização
    // ===================================================================
    
    /**
     * Renderiza um Point
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Feature GeoJSON
     * @param {Object} style - Estilo customizado (opcional)
     * @returns {Object} Camada Leaflet renderizada
     */
    render(uuid, feature, style = {}) {
      if (!uuid || !feature) {
        console.error('❌ PointRenderer.render(): uuid e feature obrigatórios');
        return null;
      }
      
      if (this.config.debug) {
        console.log('🎨 PointRenderer: renderizando', uuid);
      }
      
      try {
        // Se já renderizado, remover anterior
        if (this.renderedLayers[uuid]) {
          this.remove(uuid);
        }
        
        // Extrair coordenadas [lng, lat]
        const coords = feature.geometry.coordinates;
        const latLng = [coords[1], coords[0]];
        
        // Mesclar estilos
        const finalStyle = Object.assign({}, this.defaultStyle, style);
        
        // Criar ícone
        const icon = this._createIcon(finalStyle);
        
        // Criar marcador
        const marker = L.marker(latLng, {
          icon: icon,
          title: feature.properties?.name || 'Point ' + uuid.slice(0, 8)
        });
        
        // Adicionar popup se configurado
        if (this.config.enablePopup) {
          this._attachPopup(marker, feature, uuid);
        }
        
        // Adicionar tooltip se configurado
        if (this.config.enableTooltip) {
          this._attachTooltip(marker, feature, uuid);
        }
        
        // Adicionar event listeners
        this._attachEventListeners(marker, uuid, feature);
        
        // Adicionar ao layer group
        const layerGroup = this.beraMap._layerGroups[this.geometryType];
        if (layerGroup) {
          marker.addTo(layerGroup);
        }
        
        // Armazenar referência
        this.renderedLayers[uuid] = marker;
        
        // Atualizar no GeoManager
        this.beraMap._geoManager.setLeafletLayer(uuid, marker);
        
        if (this.config.debug) {
          console.log('✅ Point renderizado:', uuid);
        }
        
        return marker;
      } catch (error) {
        console.error('❌ Erro ao renderizar Point:', error);
        this.beraMap._eventManager.triggerError('Erro ao renderizar Point', error);
        return null;
      }
    }
    
    /**
     * Renderiza múltiplos Points em batch
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
      console.log('✅ PointRenderer: ' + rendered.length + ' points renderizados em ' + duration + 'ms');
      
      return rendered;
    }
    
    /**
     * Remove um Point renderizado
     * @param {string} uuid - UUID da geometria
     * @returns {boolean} Sucesso da operação
     */
    remove(uuid) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ PointRenderer: uuid não encontrado:', uuid);
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
          console.log('🗑️ Point removido:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao remover Point:', error);
        return false;
      }
    }
    
    /**
     * Remove todos os Points
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
      
      console.log('✅ PointRenderer: ' + removedCount + ' points removidos');
      return removedCount;
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Atualização
    // ===================================================================
    
    /**
     * Atualiza um Point
     * @param {string} uuid - UUID da geometria
     * @param {Object} feature - Nova feature
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    update(uuid, feature, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ PointRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        // Remover anterior
        this.remove(uuid);
        
        // Renderizar novo
        this.render(uuid, feature, style);
        
        if (this.config.debug) {
          console.log('🔄 Point atualizado:', uuid);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar Point:', error);
        return false;
      }
    }
    
    /**
     * Atualiza apenas o estilo de um Point
     * @param {string} uuid - UUID da geometria
     * @param {Object} style - Novo estilo
     * @returns {boolean} Sucesso da operação
     */
    updateStyle(uuid, style = {}) {
      if (!this.renderedLayers[uuid]) {
        console.warn('⚠️ PointRenderer: uuid não encontrado:', uuid);
        return false;
      }
      
      try {
        const marker = this.renderedLayers[uuid];
        const feature = this.beraMap._geoManager.getGeometryByUUID(uuid).feature;
        
        // Renderizar com novo estilo
        this.remove(uuid);
        this.render(uuid, feature, style);
        
        if (this.config.debug) {
          console.log('🎨 Estilo do Point atualizado:', uuid);
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
        console.log('🎨 Estilo padrão do PointRenderer atualizado');
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
     * Obtém ícone preset disponível
     * @param {string} presetName - Nome do preset
     * @returns {Object|null} Configuração do preset
     */
    getIconPreset(presetName) {
      return this.iconPresets[presetName] || null;
    }
    
    /**
     * Lista todos os presets de ícones disponíveis
     * @returns {Array} Array de nomes de presets
     */
    listIconPresets() {
      return Object.keys(this.iconPresets);
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Query
    // ===================================================================
    
    /**
     * Obtém um marker renderizado pelo UUID
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
     * Conta Points renderizados
     * @returns {number} Quantidade de Points
     */
    getRenderedCount() {
      return Object.keys(this.renderedLayers).length;
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Criação de Ícone
    // ===================================================================
    
    /**
     * Cria um ícone Leaflet baseado no estilo
     * @private
     */
    _createIcon(style) {
      // Se tem iconUrl customizado
      if (style.iconUrl) {
        return L.icon({
          iconUrl: style.iconUrl,
          iconSize: style.iconSize || [25, 41],
          iconAnchor: style.iconAnchor || [12, 41],
          popupAnchor: style.popupAnchor || [1, -34]
        });
      }
      
      // Tentar usar preset
      const presetName = style.icon || this.config.defaultIcon;
      const preset = this.iconPresets[presetName];
      
      if (preset) {
        return L.icon({
          iconUrl: preset.iconUrl,
          shadowUrl: preset.shadowUrl || undefined,
          iconSize: preset.iconSize || [25, 41],
          iconAnchor: preset.iconAnchor || [12, 41],
          popupAnchor: preset.popupAnchor || [1, -34],
          shadowSize: preset.shadowSize || [41, 41]
        });
      }
      
      // Fallback: ícone padrão do Leaflet
      return L.icon(L.Icon.Default.prototype.options);
    }
    
    /**
     * Cria um marcador circular com cor customizada
     * @private
     */
    _createColoredCircleIcon(color, radius = 10) {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="${radius * 2}" height="${radius * 2}">
          <circle cx="${radius}" cy="${radius}" r="${radius}" fill="${color}" stroke="white" stroke-width="2"/>
        </svg>
      `;
      
      const dataUrl = 'data:image/svg+xml;base64,' + btoa(svg);
      
      return L.icon({
        iconUrl: dataUrl,
        iconSize: [radius * 2, radius * 2],
        iconAnchor: [radius, radius],
        popupAnchor: [0, -radius]
      });
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS: Popup e Tooltip
    // ===================================================================
    
    /**
     * Anexa popup ao marcador
     * @private
     */
    _attachPopup(marker, feature, uuid) {
      let popupContent = '<div class="bera-popup">';
      
      // Título
      if (feature.properties?.name) {
        popupContent += '<h3>' + this._escapeHtml(feature.properties.name) + '</h3>';
      }
      
      // Propriedades
      if (feature.properties && Object.keys(feature.properties).length > 0) {
        popupContent += '<table class="bera-properties">';
        Object.entries(feature.properties).forEach(([key, value]) => {
          if (key !== 'name') {
            popupContent += '<tr>';
            popupContent += '<td><strong>' + this._escapeHtml(key) + ':</strong></td>';
            popupContent += '<td>' + this._escapeHtml(String(value)) + '</td>';
            popupContent += '</tr>';
          }
        });
        popupContent += '</table>';
      }
      
      // UUID
      popupContent += '<small style="color: #999;">UUID: ' + uuid.slice(0, 8) + '...</small>';
      popupContent += '</div>';
      
      marker.bindPopup(popupContent, {
        offset: this.config.popupOffset,
        maxWidth: 300
      });
    }
    
    /**
     * Anexa tooltip ao marcador
     * @private
     */
    _attachTooltip(marker, feature, uuid) {
      let tooltipContent = feature.properties?.name || 'Point';
      
      marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: this.config.tooltipDirection,
        offset: this.config.tooltipOffset,
        className: 'bera-tooltip'
      });
    }
    
    /**
     * Anexa event listeners ao marcador
     * @private
     */
    _attachEventListeners(marker, uuid, feature) {
      // Click
      marker.on('click', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryClicked(uuid, geometryData, e);
        
        if (this.config.debug) {
          console.log('📍 Point clicado:', uuid);
        }
      });
      
      // Mouseover (hover)
      marker.on('mouseover', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryHovered(uuid, geometryData);
        
        // Mudar opacidade ao hover
        marker.setOpacity(0.7);
      });
      
      // Mouseout (unhover)
      marker.on('mouseout', (e) => {
        const geometryData = this.beraMap._geoManager.getGeometryByUUID(uuid);
        this.beraMap._eventManager.triggerGeometryUnhovered(uuid, geometryData);
        
        // Restaurar opacidade
        marker.setOpacity(1);
      });
      
      // Drag (se habilitado no futuro)
      // marker.on('drag', (e) => { ... });
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
  
  return PointRenderer;
}));
