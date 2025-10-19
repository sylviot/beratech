/**
 * BaseRenderer - Classe base para todos os renderers
 *
 * Fornece funcionalidades comuns para todos os tipos de geometria
 * Reduz duplicação de código entre renderers
 * Suporta internacionalização (i18n)
 */

import { getTranslation, isLanguageAvailable } from '../utils/translations.js';

export class BaseRenderer {
  /**
   * Constructor
   * @param {Object} beraMap - Referência à instância BeraMap
   * @param {string} geometryType - Tipo de geometria
   * @param {Object} options - Opções de configuração
   */
  constructor(beraMap, geometryType, options = {}) {
    this.beraMap = beraMap;
    this.geometryType = geometryType;
    this.renderedLayers = {};
    this.config = {
      debug: options.debug || false,
      enablePopup: options.enablePopup !== false,
      enableTooltip: options.enableTooltip !== false,
      language: options.language || 'pt-BR',
      ...options
    };
    
    // Validar idioma, usar pt-BR como fallback
    if (!isLanguageAvailable(this.config.language)) {
      console.warn(`Idioma '${this.config.language}' não disponível. Usando 'pt-BR'.`);
      this.config.language = 'pt-BR';
    }
    
    this.defaultStyle = options.defaultStyle || {};
  }
  
  /**
   * Remove uma geometria renderizada
   * @param {string} uuid - UUID da geometria
   * @returns {boolean} Sucesso da operação
   */
  remove(uuid) {
    if (!this.renderedLayers[uuid]) {
      return false;
    }
    
    const layer = this.renderedLayers[uuid];
    const layerGroup = this.beraMap._layerGroups[this.geometryType];
    
    if (layerGroup && layer.remove) {
      layerGroup.removeLayer(layer);
    }
    
    delete this.renderedLayers[uuid];
    return true;
  }
  
  /**
   * Remove todas as geometrias renderizadas
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
    
    return removedCount;
  }
  
  /**
   * Obtém uma camada renderizada
   * @param {string} uuid - UUID da geometria
   * @returns {Object|null} Camada ou null
   */
  getLayer(uuid) {
    return this.renderedLayers[uuid] || null;
  }
  
  /**
   * Obtém todas as camadas renderizadas
   * @returns {Object} Objeto com todas as camadas
   */
  getAllLayers() {
    return Object.assign({}, this.renderedLayers);
  }
  
  /**
   * Obtém quantidade de geometrias renderizadas
   * @returns {number} Quantidade
   */
  getLayerCount() {
    return Object.keys(this.renderedLayers).length;
  }
  
  /**
   * Limpa todas as camadas
   * @returns {void}
   */
  clear() {
    this.removeAll();
  }
  
  /**
   * Define o estilo padrão
   * @param {Object} style - Novo estilo padrão
   * @returns {void}
   */
  setDefaultStyle(style) {
    this.defaultStyle = Object.assign({}, this.defaultStyle, style);
  }
  
  /**
   * Obtém o estilo padrão
   * @returns {Object} Cópia do estilo padrão
   */
  getDefaultStyle() {
    return Object.assign({}, this.defaultStyle);
  }
  
  /**
   * Define o idioma para tradução
   * @param {string} language - Código do idioma (ex: 'pt-BR', 'en-US')
   * @returns {boolean} Sucesso
   */
  setLanguage(language) {
    if (!isLanguageAvailable(language)) {
      console.warn(`Idioma '${language}' não disponível.`);
      return false;
    }
    this.config.language = language;
    return true;
  }
  
  /**
   * Obtém o idioma atual
   * @returns {string} Código do idioma
   */
  getLanguage() {
    return this.config.language;
  }
  
  /**
   * Ativa/desativa debug
   * @param {boolean} enabled - Ativar ou desativar
   * @returns {void}
   */
  setDebug(enabled) {
    this.config.debug = enabled;
  }
  
  /**
   * Escapa HTML para segurança
   * @protected
   * @param {string} text - Texto a escapar
   * @returns {string} Texto escapado
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Valida UUID
   * @protected
   * @param {string} uuid - UUID a validar
   * @returns {boolean} Se é válido
   */
  _validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
  
  /**
   * Formata distância para unidade legível
   * @protected
   * @param {number} meters - Distância em metros
   * @returns {string} Distância formatada
   */
  _formatDistance(meters) {
    if (meters >= 1000) {
      return (meters / 1000).toFixed(2) + ' km';
    }
    return meters.toFixed(2) + ' m';
  }
  
  /**
   * Formata área para unidade legível
   * @protected
   * @param {number} areaInSqm - Área em metros quadrados
   * @returns {string} Área formatada
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
   * Calcula distância entre dois pontos (Haversine)
   * @protected
   * @param {Array} latlng1 - [lat, lng]
   * @param {Array} latlng2 - [lat, lng]
   * @returns {number} Distância em metros
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
   * Log com prefixo de debug
   * @protected
   * @param {string} message - Mensagem a logar
   * @returns {void}
   */
  _log(message) {
    if (this.config.debug) {
      console.log(`[${this.geometryType}Renderer] ${message}`);
    }
  }
  
  /**
   * Log de erro com prefixo
   * @protected
   * @param {string} message - Mensagem de erro
   * @returns {void}
   */
  _logError(message) {
    console.error(`[${this.geometryType}Renderer] ❌ ${message}`);
  }
  
  /**
   * Cria conteúdo HTML para popup com tradução
   * @protected
   * @param {Object} feature - Feature GeoJSON
   * @param {Object} metadata - Metadados adicionais
   * @returns {string} HTML do popup
   */
  _createPopupContent(feature, metadata = {}) {
    const properties = feature.properties || {};
    const hasProperties = Object.keys(properties).length > 0;
    
    let html = '<div class="bera-popup">';
    
    // Adicionar título se existir
    if (properties.name) {
      html += `<h3 style="margin: 0 0 8px 0; font-weight: bold;">${this._escapeHtml(properties.name)}</h3>`;
    }
    
    // Adicionar descrição se existir
    if (properties.description) {
      html += `<p style="margin: 0 0 8px 0; font-size: 0.9em;">${this._escapeHtml(properties.description)}</p>`;
    }
    
    // Mapeamento de chaves para labels de tradução
    const keyTranslationMap = {
      'area': 'popupLabels.area',
      'perimeter': 'popupLabels.perimeter',
      'length': 'popupLabels.length',
      'circumference': 'popupLabels.circumference',
      'radius': 'popupLabels.radius',
      'isClosed': 'popupLabels.isClosed',
      'type': 'popupLabels.type'
    };
    
    // Adicionar metadados calculados (área, comprimento, etc)
    if (metadata && Object.keys(metadata).length > 0) {
      html += '<hr style="margin: 8px 0; border: none; border-top: 1px solid #ccc;">';
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key !== 'uuid' && key !== 'feature' && key !== 'style' && key !== 'latLng') {
          let displayValue = value;
          
          // Formatar números com muitas casas decimais
          if (typeof value === 'number') {
            displayValue = value.toFixed(2);
          }
          
          // Traduzir tipo se for 'polygon' ou 'polyline'
          if (key === 'type' && (value === 'polygon' || value === 'polyline')) {
            displayValue = getTranslation(
              this.config.language,
              `geometryTypes.${value}`,
              value
            );
          }
          
          // Traduzir label e valor de isClosed
          let label = keyTranslationMap[key];
          if (!label) {
            // Criar label legível caso não exista no mapa
            label = key.replace(/([A-Z])/g, ' $1').trim();
            label = label.charAt(0).toUpperCase() + label.slice(1);
          } else {
            // Obter label traduzido
            label = getTranslation(this.config.language, label, label);
          }
          
          // Traduzir valor boolean
          if (key === 'isClosed' && typeof value === 'boolean') {
            displayValue = value ? 'Sim' : 'Não';
            if (this.config.language === 'en-US') {
              displayValue = value ? 'Yes' : 'No';
            }
          }
          
          html += `<div style="margin: 4px 0; font-size: 0.85em;"><strong>${label}:</strong> ${displayValue}</div>`;
        }
      });
    }
    
    // Se não há propriedades e nenhum metadado, mostrar mensagem padrão
    if (!hasProperties && (!metadata || Object.keys(metadata).length === 0)) {
      const noInfoText = getTranslation(
        this.config.language,
        'popupLabels.noInfo',
        'Sem informações disponíveis'
      );
      html += `<p style="margin: 0; font-size: 0.9em; color: #999; font-style: italic;">${noInfoText}</p>`;
    }
    
    html += '</div>';
    return html;
  }
}

export default BaseRenderer;
