<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BeraMap - Filtros Geográficos</title>

  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>

  <!-- BeraMap CSS -->
  <link rel="stylesheet" href="/dist/css/maps.min.css">

  <style>
      * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
      }

      body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f5f5f5;
      }

      .container {
          display: flex;
          height: 100vh;
          gap: 10px;
          padding: 10px;
      }

      #map {
          flex: 1;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      .sidebar {
          width: 380px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
      }

      .sidebar-header {
          padding: 20px;
          border-bottom: 2px solid #3388ff;
          background: #fafafa;
      }

      .sidebar-header h1 {
          font-size: 22px;
          color: #333;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
      }

      .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
      }

      .section {
          margin-bottom: 25px;
      }

      .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #555;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 8px;
      }

      /* ===== ESTILOS PARA FILTROS ===== */

      .filter-group {
          margin-bottom: 15px;
      }

      .filter-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
      }

      .filter-group input,
      .filter-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 12px;
          font-family: inherit;
          background: white;
          color: #333;
          transition: border-color 0.3s ease;
      }

      .filter-group input:focus,
      .filter-group select:focus {
          outline: none;
          border-color: #3388ff;
          box-shadow: 0 0 0 2px rgba(51, 136, 255, 0.1);
      }

      .filter-group input[type="date"] {
          cursor: pointer;
      }

      .filter-date-range {
          display: flex;
          gap: 8px;
          align-items: center;
      }

      .filter-date-range input {
          flex: 1;
      }

      .filter-date-range .separator {
          color: #999;
          font-weight: 600;
      }

      .filter-buttons {
          display: flex;
          gap: 8px;
          margin-top: 12px;
      }

      .filter-buttons button {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
      }

      .btn-apply-filter {
          background: #4caf50;
          color: white;
      }

      .btn-apply-filter:hover {
          background: #45a049;
      }

      .btn-clear-filter {
          background: #f0f0f0;
          color: #666;
          border: 1px solid #ddd;
      }

      .btn-clear-filter:hover {
          background: #e0e0e0;
      }

      .filter-status {
          background: #e8f5e9;
          border-left: 3px solid #4caf50;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
          margin-top: 12px;
          display: none;
      }

      .filter-status.active {
          display: block;
      }

      .filter-status-item {
          padding: 4px 0;
          color: #2e7d32;
      }

      /* ===== MENSAGEM DE CARREGAMENTO ===== */

      .loading-message {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
      }

      .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #3388ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
      }

      @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
      }
  </style>
</head>
<body>
<div class="container">
  <div id="map"></div>

  <div class="sidebar">
    <div class="sidebar-header">
      <h1>📍 BeraMap</h1>
    </div>

    <div class="sidebar-content">
      <!-- MENSAGEM DE CARREGAMENTO INICIAL -->
      <div class="section" id="loadingSection">
        <div class="loading-message">
          <div class="loading-spinner"></div>
          <p style="margin-top: 10px;">Carregando dados...</p>
        </div>
      </div>

      <!-- FILTROS - SEÇÃO PRINCIPAL -->
      <div class="section" id="filterSection" style="display: none;">
        <div class="section-title">🔍 Filtros</div>

        <!-- Filtro: Responsável -->
        <div class="filter-group">
          <label for="filterResponsavel">Responsável</label>
          <select id="filterResponsavel">
            <option value="">-- Selecione --</option>
            <option value="João Silva">João Silva</option>
            <option value="Maria Santos">Maria Santos</option>
            <option value="Pedro Oliveira">Pedro Oliveira</option>
            <option value="Ana Costa">Ana Costa</option>
          </select>
        </div>

        <!-- Filtro: Situação -->
        <div class="filter-group">
          <label for="filterSituacao">Situação</label>
          <select id="filterSituacao">
            <option value="">-- Selecione --</option>
            <option value="Planejamento">Planejamento</option>
            <option value="Em Execução">Em Execução</option>
            <option value="Concluído">Concluído</option>
            <option value="Pausado">Pausado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>

        <!-- Filtro: Período em Data -->
        <div class="filter-group">
          <label>Período em Data</label>
          <div class="filter-date-range">
            <input type="date" id="filterDataInicio" placeholder="Data início">
            <span class="separator">até</span>
            <input type="date" id="filterDataFim" placeholder="Data fim">
          </div>
        </div>

        <!-- Botões de Ação do Filtro -->
        <div class="filter-buttons">
          <button class="btn-apply-filter" id="applyFilterBtn">✓ Aplicar</button>
          <button class="btn-clear-filter" id="clearFilterBtn">✕ Limpar</button>
        </div>

        <!-- Status dos Filtros -->
        <div class="filter-status" id="filterStatus">
          <div class="filter-status-item" id="filterStatusText"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Leaflet -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>

<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<!-- BeraMap - Bundle minificado em dist/ -->
<script src="/dist/js/maps.min.js"></script>

<script>
  // ===================================================================
  // ESTADO GLOBAL
  // ===================================================================

  const state = {
    beraMap: null,
    loadedData: null,
    filters: {
      responsavel: '',
      situacao: '',
      dataInicio: '',
      dataFim: ''
    },
    filtroAtivo: false
  };

  // ===================================================================
  // FILTROS
  // ===================================================================

  function applyFilters() {
    state.filters.responsavel = document.getElementById('filterResponsavel').value;
    state.filters.situacao = document.getElementById('filterSituacao').value;
    state.filters.dataInicio = document.getElementById('filterDataInicio').value;
    state.filters.dataFim = document.getElementById('filterDataFim').value;

    // Verificar se algum filtro foi aplicado
    const temFiltro = state.filters.responsavel || state.filters.situacao ||
      state.filters.dataInicio || state.filters.dataFim;

    if (temFiltro) {
      state.filtroAtivo = true;
      updateFilterStatus();
    } else {
      clearFilters();
    }
  }

  function clearFilters() {
    document.getElementById('filterResponsavel').value = '';
    document.getElementById('filterSituacao').value = '';
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';

    state.filters.responsavel = '';
    state.filters.situacao = '';
    state.filters.dataInicio = '';
    state.filters.dataFim = '';

    state.filtroAtivo = false;
    document.getElementById('filterStatus').classList.remove('active');
  }

  function updateFilterStatus() {
    const statusEl = document.getElementById('filterStatus');
    const statusTextEl = document.getElementById('filterStatusText');

    const filtrosAtivos = [];

    if (state.filters.responsavel) {
      filtrosAtivos.push('Responsável: ' + state.filters.responsavel);
    }
    if (state.filters.situacao) {
      filtrosAtivos.push('Situação: ' + state.filters.situacao);
    }
    if (state.filters.dataInicio) {
      filtrosAtivos.push('Data início: ' + state.filters.dataInicio);
    }
    if (state.filters.dataFim) {
      filtrosAtivos.push('Data fim: ' + state.filters.dataFim);
    }

    statusTextEl.textContent = filtrosAtivos.join(' | ');
    statusEl.classList.add('active');
  }

  // ===================================================================
  // INICIALIZAÇÃO DO MAPA
  // ===================================================================

  function initMap() {
    state.beraMap = BeraMap.init('map', {
      center: [-8.7619, -63.9039],
      zoom: 13
    });
  }

  // ===================================================================
  // CARREGAR DADOS
  // ===================================================================

  function loadData() {
    try {
      fetch('/data/dados.geojson')
        .then(function(response) {
          if (!response.ok) {
            throw new Error('HTTP ' + response.status);
          }
          return response.json();
        })
        .then(function(geojson) {
          if (!geojson.features || !Array.isArray(geojson.features)) {
            throw new Error('GeoJSON inválido');
          }

          const uuids = state.beraMap.addGeometries(geojson);
          state.loadedData = {
            uuids: uuids,
            data: geojson,
            loadedAt: new Date()
          };

          // Ocultar mensagem de carregamento
          document.getElementById('loadingSection').style.display = 'none';

          // Mostrar seção de filtros
          document.getElementById('filterSection').style.display = 'block';

          // Encaixar limites
          state.beraMap.fitBounds();
        })
        .catch(function(error) {
          console.error('Erro ao carregar:', error.message);
          document.getElementById('loadingSection').innerHTML =
            '<div class="loading-message" style="color: #d32f2f;">❌ Erro ao carregar dados</div>';
        });
    } catch (error) {
      console.error('Erro:', error.message);
    }
  }

  // ===================================================================
  // EVENT LISTENERS
  // ===================================================================

  document.getElementById('applyFilterBtn').addEventListener('click', applyFilters);

  document.getElementById('clearFilterBtn').addEventListener('click', clearFilters);

  // ===================================================================
  // EXPORTAR FUNÇÕES GLOBAIS
  // ===================================================================

  window.app = {
    loadData: loadData,
    applyFilters: applyFilters,
    clearFilters: clearFilters,
    state: state
  };

  // ===================================================================
  // INICIALIZAÇÃO
  // ===================================================================

  initMap();

  // Carregar dados automaticamente após inicializar o mapa
  setTimeout(loadData, 500);
</script>

</body>
</html>
