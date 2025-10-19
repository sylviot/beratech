/**
 * BaseRenderer - Classe base para todos os renderers
 *
 * Fornece funcionalidades comuns para todos os tipos de geometria
 * Reduz duplicação de código entre renderers
 */

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
      ...options
    };
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
}

export default BaseRenderer;
