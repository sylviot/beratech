/**
 * EventManager - Gerenciador de Eventos para BeraMap
 *
 * Responsável por:
 * - Centralizar disparo de eventos jQuery
 * - Gerenciar listeners registrados
 * - Usar namespacing para evitar conflitos
 * - Fornecer interface simples on/off/trigger
 * - Logar eventos para debug
 *
 * @version 1.0.0
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory(global.jQuery);
  } else if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else {
    global.EventManager = factory(global.jQuery);
  }
}(typeof self !== 'undefined' ? self : this, function ($) {
  'use strict';
  
  /**
   * Classe EventManager
   * Gerencia eventos do BeraMap usando jQuery
   */
  class EventManager {
    /**
     * Constructor
     * @param {Object} beraMap - Referência à instância BeraMap
     * @param {Object} options - Opções de configuração
     */
    constructor(beraMap, options = {}) {
      if (!$) {
        throw new Error('EventManager: jQuery não foi carregado');
      }
      
      this.beraMap = beraMap;
      
      // Configurações
      this.config = {
        debug: options.debug || false,           // Ativa logging de eventos
        namespace: options.namespace || 'bera',  // Namespace para eventos
        useBubbling: options.useBubbling !== false,
        useCapture: options.useCapture || false
      };
      
      // Referência ao elemento de disparo de eventos
      this.$eventTarget = options.$target || $(document);
      
      // Registro de listeners para debug/gerenciamento
      this.listeners = {};
      
      // Constantes de eventos
      this.EVENTS = {
        // Geometrias
        GEOMETRY_ADDED: 'bera:geometryAdded',
        GEOMETRY_UPDATED: 'bera:geometryUpdated',
        GEOMETRY_REMOVED: 'bera:geometryRemoved',
        GEOMETRY_CLICKED: 'bera:geometryClicked',
        GEOMETRY_HOVERED: 'bera:geometryHovered',
        GEOMETRY_UNHOVERED: 'bera:geometryUnhovered',
        
        // Mapa
        MAP_CLEARED: 'bera:cleared',
        MAP_READY: 'bera:mapReady',
        
        // Tema
        THEME_CHANGED: 'bera:themeChanged',
        STYLE_CHANGED: 'bera:styleChanged',
        
        // Seleção
        SELECTION_CHANGED: 'bera:selectionChanged',
        
        // Erro
        ERROR: 'bera:error'
      };
      
      // Histórico de eventos (para debug)
      this.eventHistory = [];
      this.maxHistorySize = options.maxHistorySize || 100;
      
      this._initialize();
    }
    
    /**
     * Inicializa o EventManager
     * @private
     */
    _initialize() {
      console.log('✅ EventManager inicializado');
      console.log('   Namespace: ' + this.config.namespace);
      console.log('   Debug: ' + (this.config.debug ? 'ON' : 'OFF'));
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Registro de Listeners
    // ===================================================================
    
    /**
     * Registra um listener para um evento
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função callback
     * @param {Object} context - Contexto (this) do callback
     * @returns {Function} Função para desinscrever (chainable)
     */
    on(eventName, callback, context) {
      if (!eventName || typeof callback !== 'function') {
        console.error('❌ EventManager.on(): eventName e callback obrigatórios');
        return null;
      }
      
      // Preservar contexto se fornecido
      const boundCallback = context ? callback.bind(context) : callback;
      
      // Registrar listener
      this._registerListener(eventName, boundCallback);
      
      // Anexar ao elemento
      this.$eventTarget.on(eventName, (event, data) => {
        boundCallback(event, data);
      });
      
      // Retornar função para desinscrever (chainable)
      return () => this.off(eventName, callback);
    }
    
    /**
     * Registra um listener que será executado uma única vez
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função callback
     * @param {Object} context - Contexto (this) do callback
     * @returns {Function} Função para desinscrever
     */
    once(eventName, callback, context) {
      if (!eventName || typeof callback !== 'function') {
        console.error('❌ EventManager.once(): eventName e callback obrigatórios');
        return null;
      }
      
      const self = this;
      const wrappedCallback = function (event, data) {
        callback.call(context, event, data);
        self.off(eventName, wrappedCallback);
      };
      
      return this.on(eventName, wrappedCallback, context);
    }
    
    /**
     * Remove um listener de um evento
     * @param {string} eventName - Nome do evento (opcional)
     * @param {Function} callback - Função callback (opcional)
     * @returns {void}
     */
    off(eventName, callback) {
      if (!eventName) {
        console.warn('⚠️ EventManager.off(): eventName obrigatório');
        return;
      }
      
      // Se callback não fornecido, desinscrever todos para este evento
      if (!callback) {
        this.$eventTarget.off(eventName);
        this._unregisterListener(eventName);
        return;
      }
      
      // Desinscrever callback específico
      this.$eventTarget.off(eventName, callback);
      this._unregisterListener(eventName, callback);
    }
    
    /**
     * Remove todos os listeners
     * @returns {void}
     */
    offAll() {
      const eventNames = Object.values(this.EVENTS);
      eventNames.forEach(eventName => {
        this.$eventTarget.off(eventName);
      });
      
      this.listeners = {};
      
      console.log('✅ EventManager: Todos os listeners removidos');
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Disparo de Eventos
    // ===================================================================
    
    /**
     * Dispara um evento
     * @param {string} eventName - Nome do evento
     * @param {Object} data - Dados do evento
     * @returns {Object} Evento disparado
     */
    trigger(eventName, data) {
      if (!eventName) {
        console.error('❌ EventManager.trigger(): eventName obrigatório');
        return null;
      }
      
      // Adicionar informações de contexto
      const eventData = Object.assign({}, data || {}, {
        timestamp: new Date().toISOString(),
        eventName: eventName
      });
      
      // Log se debug ativado
      if (this.config.debug) {
        console.log('📢 EVENT DISPATCHED:', eventName, eventData);
      }
      
      // Adicionar ao histórico
      this._addToHistory(eventName, eventData);
      
      // Disparar evento
      const event = this.$eventTarget.trigger(eventName, [eventData]);
      
      return event;
    }
    
    /**
     * Dispara múltiplos eventos em sequência
     * @param {Array} events - Array de { eventName, data }
     * @param {number} delayMs - Delay entre eventos (ms)
     * @returns {Promise} Promise que resolve quando todos disparados
     */
    triggerSequence(events, delayMs = 0) {
      return new Promise((resolve) => {
        let index = 0;
        
        const dispatchNext = () => {
          if (index < events.length) {
            const {eventName, data} = events[index];
            this.trigger(eventName, data);
            index++;
            
            if (index < events.length) {
              setTimeout(dispatchNext, delayMs);
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        };
        
        dispatchNext();
      });
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Eventos Específicos do BeraMap
    // ===================================================================
    
    /**
     * Dispara evento de geometria adicionada
     * @param {Array} uuids - UUIDs das geometrias adicionadas
     * @param {Object} data - Dados adicionais
     */
    triggerGeometryAdded(uuids, data = {}) {
      this.trigger(this.EVENTS.GEOMETRY_ADDED, {
        uuids: uuids,
        count: Array.isArray(uuids) ? uuids.length : 1,
        ...data
      });
    }
    
    /**
     * Dispara evento de geometria atualizada
     * @param {Array} uuids - UUIDs das geometrias atualizadas
     * @param {Object} data - Dados adicionais
     */
    triggerGeometryUpdated(uuids, data = {}) {
      this.trigger(this.EVENTS.GEOMETRY_UPDATED, {
        uuids: uuids,
        count: Array.isArray(uuids) ? uuids.length : 1,
        ...data
      });
    }
    
    /**
     * Dispara evento de geometria removida
     * @param {Array} uuids - UUIDs das geometrias removidas
     * @param {Object} data - Dados adicionais
     */
    triggerGeometryRemoved(uuids, data = {}) {
      this.trigger(this.EVENTS.GEOMETRY_REMOVED, {
        uuids: uuids,
        count: Array.isArray(uuids) ? uuids.length : 1,
        ...data
      });
    }
    
    /**
     * Dispara evento de geometria clicada
     * @param {string} uuid - UUID da geometria
     * @param {Object} geometry - Dados da geometria
     * @param {Object} leafletEvent - Evento Leaflet
     */
    triggerGeometryClicked(uuid, geometry, leafletEvent = {}) {
      this.trigger(this.EVENTS.GEOMETRY_CLICKED, {
        uuid: uuid,
        geometry: geometry,
        leafletEvent: leafletEvent
      });
    }
    
    /**
     * Dispara evento de geometria hover
     * @param {string} uuid - UUID da geometria
     * @param {Object} geometry - Dados da geometria
     */
    triggerGeometryHovered(uuid, geometry) {
      this.trigger(this.EVENTS.GEOMETRY_HOVERED, {
        uuid: uuid,
        geometry: geometry
      });
    }
    
    /**
     * Dispara evento de geometria unhover
     * @param {string} uuid - UUID da geometria
     * @param {Object} geometry - Dados da geometria
     */
    triggerGeometryUnhovered(uuid, geometry) {
      this.trigger(this.EVENTS.GEOMETRY_UNHOVERED, {
        uuid: uuid,
        geometry: geometry
      });
    }
    
    /**
     * Dispara evento de mapa limpo
     * @param {Object} data - Dados adicionais
     */
    triggerMapCleared(data = {}) {
      this.trigger(this.EVENTS.MAP_CLEARED, {
        clearedAt: new Date().toISOString(),
        ...data
      });
    }
    
    /**
     * Dispara evento de mapa pronto
     * @param {Object} data - Dados adicionais
     */
    triggerMapReady(data = {}) {
      this.trigger(this.EVENTS.MAP_READY, {
        readyAt: new Date().toISOString(),
        ...data
      });
    }
    
    /**
     * Dispara evento de tema alterado
     * @param {string} themeName - Nome do tema
     * @param {Object} data - Dados adicionais
     */
    triggerThemeChanged(themeName, data = {}) {
      this.trigger(this.EVENTS.THEME_CHANGED, {
        theme: themeName,
        changedAt: new Date().toISOString(),
        ...data
      });
    }
    
    /**
     * Dispara evento de estilo alterado
     * @param {string} geometryType - Tipo de geometria
     * @param {Object} style - Novo estilo
     */
    triggerStyleChanged(geometryType, style) {
      this.trigger(this.EVENTS.STYLE_CHANGED, {
        geometryType: geometryType,
        style: style,
        changedAt: new Date().toISOString()
      });
    }
    
    /**
     * Dispara evento de seleção alterada
     * @param {Array} uuids - UUIDs selecionados
     */
    triggerSelectionChanged(uuids) {
      this.trigger(this.EVENTS.SELECTION_CHANGED, {
        selected: uuids,
        count: Array.isArray(uuids) ? uuids.length : 0
      });
    }
    
    /**
     * Dispara evento de erro
     * @param {string} message - Mensagem de erro
     * @param {Error} error - Objeto de erro
     */
    triggerError(message, error = null) {
      this.trigger(this.EVENTS.ERROR, {
        message: message,
        error: error,
        errorAt: new Date().toISOString()
      });
    }
    
    // ===================================================================
    // MÉTODOS PÚBLICOS: Debug e Histórico
    // ===================================================================
    
    /**
     * Ativa/desativa debug
     * @param {boolean} enabled - Ativar ou desativar
     */
    setDebug(enabled) {
      this.config.debug = enabled;
      console.log('🔧 EventManager debug: ' + (enabled ? 'ON' : 'OFF'));
    }
    
    /**
     * Obtém histórico de eventos
     * @param {Object} options - Opções de filtro
     * @returns {Array} Array de eventos históricos
     */
    getEventHistory(options = {}) {
      let history = this.eventHistory;
      
      // Filtrar por nome de evento
      if (options.eventName) {
        history = history.filter(h => h.eventName === options.eventName);
      }
      
      // Filtrar por tipo de evento
      if (options.eventType) {
        history = history.filter(h => h.eventName.includes(options.eventType));
      }
      
      // Limitar resultados
      if (options.limit) {
        history = history.slice(-options.limit);
      }
      
      return history;
    }
    
    /**
     * Limpa histórico de eventos
     * @returns {number} Quantidade de eventos removidos
     */
    clearEventHistory() {
      const count = this.eventHistory.length;
      this.eventHistory = [];
      return count;
    }
    
    /**
     * Obtém estatísticas de eventos
     * @returns {Object} Estatísticas
     */
    getEventStats() {
      const stats = {
        totalEvents: this.eventHistory.length,
        byEventType: {},
        firstEventAt: null,
        lastEventAt: null
      };
      
      this.eventHistory.forEach(entry => {
        if (!stats.byEventType[entry.eventName]) {
          stats.byEventType[entry.eventName] = 0;
        }
        stats.byEventType[entry.eventName]++;
      });
      
      if (this.eventHistory.length > 0) {
        stats.firstEventAt = this.eventHistory[0].timestamp;
        stats.lastEventAt = this.eventHistory[this.eventHistory.length - 1].timestamp;
      }
      
      return stats;
    }
    
    /**
     * Obtém listeners registrados
     * @param {string} eventName - Nome do evento (opcional)
     * @returns {Object} Listeners registrados
     */
    getListeners(eventName = null) {
      if (eventName) {
        return this.listeners[eventName] || [];
      }
      return Object.assign({}, this.listeners);
    }
    
    /**
     * Conta listeners registrados
     * @param {string} eventName - Nome do evento (opcional)
     * @returns {number} Quantidade de listeners
     */
    getListenerCount(eventName = null) {
      if (eventName) {
        return (this.listeners[eventName] || []).length;
      }
      
      let total = 0;
      Object.values(this.listeners).forEach(listeners => {
        total += listeners.length;
      });
      return total;
    }
    
    /**
     * Imprime relatório de eventos no console
     * @returns {void}
     */
    printReport() {
      console.group('📊 EventManager Report');
      
      const stats = this.getEventStats();
      console.log('Total de eventos disparados:', stats.totalEvents);
      
      if (stats.firstEventAt) {
        console.log('Primeiro evento:', stats.firstEventAt);
        console.log('Último evento:', stats.lastEventAt);
      }
      
      console.log('Eventos por tipo:');
      Object.entries(stats.byEventType).forEach(([eventName, count]) => {
        console.log('  - ' + eventName + ': ' + count);
      });
      
      console.log('Listeners registrados:', this.getListenerCount());
      console.log('Listeners por evento:');
      Object.entries(this.listeners).forEach(([eventName, listeners]) => {
        console.log('  - ' + eventName + ': ' + listeners.length);
      });
      
      console.groupEnd();
    }
    
    // ===================================================================
    // MÉTODOS PRIVADOS
    // ===================================================================
    
    /**
     * Registra um listener no registro interno
     * @private
     */
    _registerListener(eventName, callback) {
      if (!this.listeners[eventName]) {
        this.listeners[eventName] = [];
      }
      
      this.listeners[eventName].push({
        callback: callback,
        registeredAt: new Date().toISOString()
      });
      
      if (this.config.debug) {
        console.log('✅ Listener registrado para:', eventName);
      }
    }
    
    /**
     * Desregistra um listener do registro interno
     * @private
     */
    _unregisterListener(eventName, callback = null) {
      if (!this.listeners[eventName]) {
        return;
      }
      
      if (!callback) {
        // Remover todos para este evento
        delete this.listeners[eventName];
        if (this.config.debug) {
          console.log('✅ Todos os listeners removidos para:', eventName);
        }
        return;
      }
      
      // Remover callback específico
      this.listeners[eventName] = this.listeners[eventName].filter(
        listener => listener.callback !== callback
      );
      
      if (this.config.debug) {
        console.log('✅ Listener removido para:', eventName);
      }
    }
    
    /**
     * Adiciona evento ao histórico
     * @private
     */
    _addToHistory(eventName, data) {
      this.eventHistory.push({
        eventName: eventName,
        timestamp: new Date().toISOString(),
        data: Object.assign({}, data)
      });
      
      // Limitar tamanho do histórico
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift();
      }
    }
  }
  
  // ===================================================================
  // EXPORTAÇÃO
  // ===================================================================
  
  return EventManager;
}));
