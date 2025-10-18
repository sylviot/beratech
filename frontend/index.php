<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BeraMap - Carregamento Dinâmico de Dados</title>

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

      .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 12px 15px;
          margin-bottom: 8px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.3s ease;
          text-align: left;
      }

      .btn:active {
          transform: scale(0.98);
      }

      .btn-primary {
          background: #3388ff;
          color: white;
      }

      .btn-primary:hover {
          background: #2570d9;
      }

      .btn-success {
          background: #28a745;
          color: white;
      }

      .btn-success:hover {
          background: #218838;
      }

      .btn-danger {
          background: #dc3545;
          color: white;
      }

      .btn-danger:hover {
          background: #c82333;
      }

      .btn-warning {
          background: #ffc107;
          color: #333;
      }

      .btn-warning:hover {
          background: #e0a800;
      }

      .btn-sm {
          padding: 8px 12px;
          font-size: 12px;
          margin: 4px 0;
      }

      .data-list {
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 5px;
          max-height: 200px;
          overflow-y: auto;
      }

      .data-item {
          padding: 12px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
      }

      .data-item:last-child {
          border-bottom: none;
      }

      .data-name {
          flex: 1;
          font-weight: 500;
          color: #333;
      }

      .data-count {
          background: #3388ff;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin-right: 8px;
      }

      .btn-remove {
          background: #dc3545;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: background 0.3s;
      }

      .btn-remove:hover {
          background: #c82333;
      }

      .stats {
          background: #f0f7ff;
          border-left: 3px solid #3388ff;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
      }

      .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
      }

      .stat-label {
          color: #666;
          font-weight: 500;
      }

      .stat-value {
          color: #3388ff;
          font-weight: 600;
      }

      .log {
          background: #1e1e1e;
          color: #00ff00;
          border: 1px solid #444;
          border-radius: 4px;
          padding: 10px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          height: 150px;
          overflow-y: auto;
          line-height: 1.4;
      }

      .log-entry {
          padding: 2px 0;
          border-bottom: 1px solid #333;
      }

      .log-entry.info {
          color: #00ff00;
      }

      .log-entry.success {
          color: #00ff00;
      }

      .log-entry.warning {
          color: #ffff00;
      }

      .log-entry.error {
          color: #ff0000;
      }

      .empty-state {
          color: #999;
          font-size: 12px;
          padding: 20px;
          text-align: center;
      }

      .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          color: white;
      }

      .badge-point {
          background: #3388ff;
      }

      .badge-line {
          background: #ff7800;
      }

      .badge-polygon {
          background: #4caf50;
      }

      .badge-circle {
          background: #9c27b0;
      }

      .badge-drawing {
          background: #ff6b6b;
      }

      .loading {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #3388ff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
          to {
              transform: rotate(360deg);
          }
      }

      .toggle {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 10px;
      }

      .toggle input[type="checkbox"] {
          cursor: pointer;
          width: 16px;
          height: 16px;
      }

      .toggle label {
          cursor: pointer;
          font-size: 12px;
          color: #555;
          margin: 0;
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
      <!-- Arquivos Disponíveis -->
      <div class="section">
        <div class="section-title">📂 Arquivos Disponíveis</div>
        <div id="availableFiles"></div>
      </div>

      <!-- Dados Carregados -->
      <div class="section">
        <div class="section-title">📦 Dados Carregados</div>
        <div class="data-list" id="loadedDataList">
          <div class="empty-state">Nenhum dado carregado</div>
        </div>
      </div>

      <!-- Estatísticas -->
      <div class="section">
        <div class="section-title">📊 Estatísticas</div>
        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">Total:</span>
            <span class="stat-value" id="statTotal">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Pontos:</span>
            <span class="stat-value" id="statPoints">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Linhas:</span>
            <span class="stat-value" id="statLines">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Polígonos:</span>
            <span class="stat-value" id="statPolygons">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Desenhos:</span>
            <span class="stat-value" id="statDrawings">0</span>
          </div>
        </div>
      </div>

      <!-- Ações -->
      <div class="section">
        <div class="section-title">⚙️ Ações</div>
        <button id="fitBoundsBtn" class="btn btn-primary">
          📍 Encaixar Limites
        </button>
        <button id="clearAllBtn" class="btn btn-danger">
          🗑️ Limpar Tudo
        </button>
      </div>

      <!-- Configurações -->
      <div class="section">
        <div class="section-title">⚙️ Configurações</div>
        <div class="toggle">
          <input type="checkbox" id="debugToggle" checked>
          <label for="debugToggle">Debug</label>
        </div>
        <div class="toggle">
          <input type="checkbox" id="autoFitToggle" checked>
          <label for="autoFitToggle">Auto-encaixar</label>
        </div>
      </div>

      <!-- Log -->
      <div class="section">
        <div class="section-title">📝 Log</div>
        <div class="log" id="logContainer"></div>
      </div>
    </div>
  </div>
</div>

<!-- Leaflet -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>

<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<!-- BeraMap - Bundle minificado em dist/ como variável global -->
<script src="/dist/js/maps.min.js"></script>

<script>
  // ===================================================================
  // CONFIGURAÇÃO
  // ===================================================================

  const FILES = {
    'ponto.geojson': {label: '📍 Pontos', icon: '📍'},
    'linha.geojson': {label: '📏 Linhas', icon: '📏'},
    'poligonos.geojson': {label: '🔲 Polígonos', icon: '🔲'},
    'desenho-fechado.geojson': {label: '✏️ Desenho Fechado', icon: '✏️'},
    'desenho-sem-fechar.geojson': {label: '✏️ Desenho Aberto', icon: '✏️'}
  };

  // ===================================================================
  // ESTADO GLOBAL
  // ===================================================================

  const state = {
    beraMap: null,
    loadedData: {}, // { filename: { uuids: [], data: geojson } }
    debugMode: true,
    autoFit: true
  };

  // ===================================================================
  // LOGGING
  // ===================================================================

  function log(message, type = 'info') {
    const logContainer = document.getElementById('logContainer');
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + type;
    const time = new Date().toLocaleTimeString('pt-BR');
    entry.textContent = '[' + time + '] ' + message;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    if (logContainer.children.length > 50) {
      logContainer.removeChild(logContainer.firstChild);
    }

    if (state.debugMode) {
      console.log('[' + type.toUpperCase() + ']', message);
    }
  }

  // ===================================================================
  // INICIALIZAÇÃO DO MAPA
  // ===================================================================

  function initMap() {
    // Acessar a função init do bundle global BeraMap
    state.beraMap = BeraMap.init('map', {
      center: [-8.7619, -63.9039], // Porto Velho
      zoom: 13
    });

    log('✅ BeraMap inicializado', 'success');

    // Registrar eventos
    state.beraMap.on('bera:geometryAdded', function(e, data) {
      log('✅ ' + data.count + ' geometria(s) adicionada(s)', 'success');
      updateStats();
    });

    state.beraMap.on('bera:geometryRemoved', function(e, data) {
      log('❌ ' + data.count + ' geometria(s) removida(s)', 'warning');
      updateStats();
    });

    state.beraMap.on('bera:geometryClicked', function(e, data) {
      const type = data.geometry.type;
      log('🖱️ ' + type + ' clicado: ' + data.uuid.slice(0, 8) + '...', 'info');
    });

    state.beraMap.on('bera:cleared', function() {
      log('🗑️ Mapa limpo', 'warning');
      updateStats();
    });
  }

  // ===================================================================
  // CARREGAR ARQUIVO GEOJSON
  // ===================================================================

  function loadGeoJSON(filename) {
    try {
      // Se já está carregado, remover
      if (state.loadedData[filename]) {
        unloadGeoJSON(filename);
        return;
      }

      log('⏳ Carregando ' + FILES[filename].label + '...', 'info');

      fetch('/data/' + filename)
        .then(function(response) {
          if (!response.ok) {
            throw new Error('HTTP ' + response.status);
          }
          return response.json();
        })
        .then(function(geojson) {
          // Validar GeoJSON
          if (!geojson.features || !Array.isArray(geojson.features)) {
            throw new Error('GeoJSON inválido');
          }

          // Adicionar ao mapa
          const uuids = state.beraMap.addGeometries(geojson);

          // Salvar no estado
          state.loadedData[filename] = {
            uuids: uuids,
            data: geojson,
            loadedAt: new Date()
          };

          log('✅ ' + filename + ' carregado (' + uuids.length + ' geometrias)', 'success');

          // Auto-encaixar se ativado
          if (state.autoFit) {
            state.beraMap.fitBounds();
          }

          // Atualizar UI
          updateLoadedDataList();
          updateStats();
        })
        .catch(function(error) {
          log('❌ Erro ao carregar ' + filename + ': ' + error.message, 'error');
        });
    } catch (error) {
      log('❌ Erro ao carregar ' + filename + ': ' + error.message, 'error');
    }
  }

  // ===================================================================
  // DESCARREGAR ARQUIVO
  // ===================================================================

  function unloadGeoJSON(filename) {
    try {
      const data = state.loadedData[filename];
      if (!data) return;

      state.beraMap.removeGeometries(data.uuids);
      delete state.loadedData[filename];

      log('❌ ' + filename + ' descarregado', 'warning');
      updateLoadedDataList();
      updateStats();
    } catch (error) {
      log('❌ Erro ao descarregar: ' + error.message, 'error');
    }
  }

  // ===================================================================
  // ATUALIZAR UI
  // ===================================================================

  function updateLoadedDataList() {
    const listContainer = document.getElementById('loadedDataList');
    const loaded = Object.entries(state.loadedData);

    if (loaded.length === 0) {
      listContainer.innerHTML = '<div class="empty-state">Nenhum dado carregado</div>';
      return;
    }

    let html = '';
    for (let i = 0; i < loaded.length; i++) {
      const filename = loaded[i][0];
      const data = loaded[i][1];
      const geomTypes = {};

      for (let j = 0; j < data.data.features.length; j++) {
        const f = data.data.features[j];
        const type = f.geometry.type;
        geomTypes[type] = (geomTypes[type] || 0) + 1;
      }

      let badges = '';
      const typeKeys = Object.keys(geomTypes);
      for (let j = 0; j < typeKeys.length; j++) {
        const type = typeKeys[j];
        const count = geomTypes[type];
        const badgeClass = 'badge-' + type.toLowerCase().replace('string', '');
        badges += '<span class="badge ' + badgeClass + '">' + type + ': ' + count + '</span>';
      }

      html += '<div class="data-item">' +
        '<div>' +
        '<div class="data-name">' + FILES[filename].label + '</div>' +
        '<div style="margin-top: 4px; font-size: 10px; color: #999;">' +
        badges +
        '</div>' +
        '</div>' +
        '<button class="btn-remove" onclick="window.app.unloadGeoJSON(\'' + filename + '\')">Remover</button>' +
        '</div>';
    }

    listContainer.innerHTML = html;
  }

  function updateAvailableFiles() {
    const container = document.getElementById('availableFiles');
    let html = '';

    const fileKeys = Object.keys(FILES);
    for (let i = 0; i < fileKeys.length; i++) {
      const filename = fileKeys[i];
      const file = FILES[filename];
      const isLoaded = !!state.loadedData[filename];
      const btnClass = isLoaded ? 'btn-danger' : 'btn-primary';
      const btnText = isLoaded ? '✅ Remover' : '⬇️ Carregar';

      html += '<button class="btn ' + btnClass + ' file-btn" onclick="window.app.loadGeoJSON(\'' + filename + '\')"> ' +
        file.icon + ' ' + btnText +
        '</button>';
    }

    container.innerHTML = html;
  }

  function updateStats() {
    const stats = state.beraMap.getStats();
    document.getElementById('statTotal').textContent = stats.totalCount;
    document.getElementById('statPoints').textContent = stats.countByType.Point || 0;
    document.getElementById('statLines').textContent = stats.countByType.LineString || 0;
    document.getElementById('statPolygons').textContent = stats.countByType.Polygon || 0;
    document.getElementById('statDrawings').textContent = stats.countByType.Drawing || 0;
  }

  // ===================================================================
  // EVENT LISTENERS
  // ===================================================================

  document.getElementById('fitBoundsBtn').addEventListener('click', function() {
    if (state.beraMap.getGeometriesCount() > 0) {
      state.beraMap.fitBounds();
      log('📍 Limites encaixados', 'info');
    } else {
      log('⚠️ Nenhuma geometria para encaixar', 'warning');
    }
  });

  document.getElementById('clearAllBtn').addEventListener('click', function() {
    if (confirm('Tem certeza que deseja limpar tudo?')) {
      state.beraMap.clearAll();
      Object.keys(state.loadedData).forEach(function(filename) {
        delete state.loadedData[filename];
      });
      updateLoadedDataList();
      updateAvailableFiles();
    }
  });

  document.getElementById('debugToggle').addEventListener('change', function(e) {
    state.debugMode = e.target.checked;
    if (state.beraMap.getEventManager()) {
      state.beraMap.getEventManager().setDebug(state.debugMode);
    }
    log('🔧 Debug ' + (state.debugMode ? 'ativado' : 'desativado'), 'info');
  });

  document.getElementById('autoFitToggle').addEventListener('change', function(e) {
    state.autoFit = e.target.checked;
    log('📍 Auto-encaixar ' + (state.autoFit ? 'ativado' : 'desativado'), 'info');
  });

  // ===================================================================
  // EXPORTAR FUNÇÕES GLOBAIS
  // ===================================================================

  window.app = {
    loadGeoJSON: loadGeoJSON,
    unloadGeoJSON: unloadGeoJSON,
    state: state
  };

  // ===================================================================
  // INICIALIZAÇÃO
  // ===================================================================

  initMap();
  updateAvailableFiles();
  updateLoadedDataList();
  updateStats();

  log('🚀 Aplicação pronta', 'success');
  log('👇 Clique nos botões para carregar dados', 'info');
</script>

</body>
</html>
