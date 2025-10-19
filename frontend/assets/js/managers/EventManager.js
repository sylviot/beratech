/**
 * EventManager - Gerenciador de Eventos para BeraMap
 *
 * Responsável por:
 * - Centralizar disparo de eventos jQuery
 * - Gerenciar listeners registrados
 * - Usar namespacing para evitar conflitos
 * - Fornecer interface simples on/off/trigger
 * - Logar eventos para debug
 */

import { EVENTS } from '../utils/constants.js';

export class EventManager {
  constructor(beraMap, options = {}) {
    if (!window.jQuery && !window.$) {
      throw new Error('EventManager: jQuery não foi carregado');
    }
    
    this.$ = window.jQuery || window.$;
    this.beraMap = beraMap;
    
    this.config = {
      debug: options.debug || false,
      namespace: options.namespace || 'bera',
      useBubbling: options.useBubbling !== false,
      useCapture: options.useCapture || false
    };
    
    this.$eventTarget = options.$target || this.$(document);
    this.listeners = {};
    this.EVENTS = EVENTS;
    this.eventHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
    
    this._initialize();
  }
  
  _initialize() {
    console.log('✅ EventManager inicializado');
    console.log('   Namespace: ' + this.config.namespace);
    console.log('   Debug: ' + (this.config.debug ? 'ON' : 'OFF'));
  }
  
  /**
   * Registra um listener para um evento
   * @param {string} eventName - Nome do evento
   * @param {Function} callback - Função callback
   * @param {Object} context - Contexto (this) do callback
   * @returns {Function} Função para desinscrever
   */
  on(eventName, callback, context) {
    if (!eventName || typeof callback !== 'function') {
      console.error('❌ EventManager.on(): eventName e callback obrigatórios');
      return null;
    }
    
    const boundCallback = context ? callback.bind(context) : callback;
    
    this._registerListener(eventName, boundCallback);
    
    this.$eventTarget.on(eventName, (event, data) => {
      boundCallback(event, data);
    });
    
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
   * Remove um listener
   * @param {string} eventName - Nome do evento
   * @param {Function} callback - Callback (opcional)
   * @returns {void}
   */
  off(eventName, callback) {
    if (!eventName) {
      console.warn('⚠️ EventManager.off(): eventName obrigatório');
      return;
    }
    
    if (!callback) {
      this.$eventTarget.off(eventName);
      this._unregisterListener(eventName);
      return;
    }
    
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
    
    const eventData = Object.assign({}, data || {}, {
      timestamp: new Date().toISOString(),
      eventName: eventName
    });
    
    if (this.config.debug) {
      console.log('📢 EVENT DISPATCHED:', eventName, eventData);
    }
    
    this._addToHistory(eventName, eventData);
    return this.$eventTarget.trigger(eventName, [eventData]);
  }
  
  /**
   * Dispara múltiplos eventos em sequência
   * @param {Array} events - Array de { eventName, data }
   * @param {number} delayMs - Delay entre eventos
   * @returns {Promise} Promise que resolve quando todos disparados
   */
  triggerSequence(events, delayMs = 0) {
    return new Promise((resolve) => {
      let index = 0;
      
      const dispatchNext = () => {
        if (index < events.length) {
          const { eventName, data } = events[index];
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
  
  /**
   * Dispara evento de geometria adicionada
   * @param {Array} uuids - UUIDs das geometrias
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
   * @param {Array} uuids - UUIDs das geometrias
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
   * @param {Array} uuids - UUIDs das geometrias
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
   * @param {Object} leafletEvent - Evento do Leaflet
   */
  triggerGeometryClicked(uuid, geometry, leafletEvent = {}) {
    this.trigger(this.EVENTS.GEOMETRY_CLICKED, {
      uuid: uuid,
      geometry: geometry,
      leafletEvent: leafletEvent
    });
  }
  
  /**
   * Dispara evento de geometria com hover
   * @param {string} uuid - UUID
   * @param {Object} geometry - Dados da geometria
   */
  triggerGeometryHovered(uuid, geometry) {
    this.trigger(this.EVENTS.GEOMETRY_HOVERED, {
      uuid: uuid,
      geometry: geometry
    });
  }
  
  /**
   * Dispara evento de geometria sem hover
   * @param {string} uuid - UUID
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
    
    if (options.eventName) {
      history = history.filter(h => h.eventName === options.eventName);
    }
    
    if (options.limit) {
      history = history.slice(-options.limit);
    }
    
    return history;
  }
  
  /**
   * Limpa histórico de eventos
   * @returns {number} Quantidade removida
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
   * @returns {Object|Array} Listeners
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
   * @returns {number} Quantidade
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
   * Imprime relatório no console
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
    console.groupEnd();
  }
  
  // ===================================================================
  // MÉTODOS PRIVADOS
  // ===================================================================
  
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
  
  _unregisterListener(eventName, callback = null) {
    if (!this.listeners[eventName]) {
      return;
    }
    
    if (!callback) {
      delete this.listeners[eventName];
      if (this.config.debug) {
        console.log('✅ Todos os listeners removidos para:', eventName);
      }
      return;
    }
    
    this.listeners[eventName] = this.listeners[eventName].filter(
      listener => listener.callback !== callback
    );
    
    if (this.config.debug) {
      console.log('✅ Listener removido para:', eventName);
    }
  }
  
  _addToHistory(eventName, data) {
    this.eventHistory.push({
      eventName: eventName,
      timestamp: new Date().toISOString(),
      data: Object.assign({}, data)
    });
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
}

export default EventManager;
