<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BeraMap - Exemplo de Uso</title>

  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

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
      }

      #map {
          flex: 1;
          background: #e0e0e0;
      }

      .sidebar {
          width: 350px;
          background: white;
          box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
          overflow-y: auto;
          padding: 20px;
          border-right: 1px solid #ddd;
      }

      h1 {
          font-size: 24px;
          color: #333;
          margin-bottom: 20px;
          border-bottom: 2px solid #3388ff;
          padding-bottom: 10px;
      }

      h2 {
          font-size: 16px;
          color: #555;
          margin-top: 20px;
          margin-bottom: 10px;
      }

      .section {
          margin-bottom: 20px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 5px;
          border-left: 3px solid #3388ff;
      }

      input, textarea, button {
          width: 100%;
          padding: 10px;
          margin: 5px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
      }

      button {
          background: #3388ff;
          color: white;
          border: none;
          cursor: pointer;
          transition: background 0.3s;
      }

      button:hover {
          background: #256fd6;
      }

      button.danger {
          background: #f44336;
      }

      button.danger:hover {
          background: #d32f2f;
      }

      button.success {
          background: #4caf50;
      }

      button.success:hover {
          background: #388e3c;
      }

      .info-box {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 10px;
          margin: 10px 0;
          border-radius: 3px;
          font-size: 13px;
          color: #1565c0;
      }

      .error-box {
          background: #ffebee;
          border-left: 4px solid #f44336;
          padding: 10px;
          margin: 10px 0;
          border-radius: 3px;
          font-size: 13px;
          color: #c62828;
      }

      .success-box {
          background: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 10px;
          margin: 10px 0;
          border-radius: 3px;
          font-size: 13px;
          color: #2e7d32;
      }

      .stat {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
      }

      .stat:last-child {
          border-bottom: none;
      }

      .stat-label {
          color: #666;
          font-weight: 500;
      }

      .stat-value {
          color: #3388ff;
          font-weight: bold;
      }

      #events-log {
          background: #263238;
          color: #aed581;
          padding: 10px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          height: 150px;
          overflow-y: auto;
          margin-top: 10px;
      }

      .log-entry {
          margin: 2px 0;
          padding: 2px 0;
      }

      textarea {
          min-height: 100px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
      }
  </style>
</head>
<body>
<div class="container">
  <!-- Mapa -->
  <div id="map"></div>

  <!-- Sidebar -->
  <div class="sidebar">
    <h1>🗺️ BeraMap</h1>

    <!-- Status -->
    <div class="section">
      <h2>Status</h2>
      <div class="stat">
        <span class="stat-label">Inicializado:</span>
        <span class="stat-value" id="status-initialized">❌</span>
      </div>
      <div class="stat">
        <span class="stat-label">Versão:</span>
        <span class="stat-value" id="status-version">-</span>
      </div>
      <div class="stat">
        <span class="stat-label">Total de Geometrias:</span>
        <span class="stat-value" id="status-count">0</span>
      </div>
    </div>

    <!-- Adicionar Ponto -->
    <div class="section">
      <h2>Adicionar Ponto</h2>
      <input type="number" id="lat" placeholder="Latitude" value="-8.7619" step="0.0001">
      <input type="number" id="lng" placeholder="Longitude" value="-63.9039" step="0.0001">
      <input type="text" id="pointName" placeholder="Nome do ponto" value="Meu Ponto">
      <button class="success" onclick="addPoint()">Adicionar Ponto</button>
    </div>

    <!-- Adicionar Círculo -->
    <div class="section">
      <h2>Adicionar Círculo</h2>
      <input type="number" id="circleLat" placeholder="Latitude" value="-8.7600" step="0.0001">
      <input type="number" id="circleLng" placeholder="Longitude" value="-63.9000" step="0.0001">
      <input type="number" id="radius" placeholder="Raio (metros)" value="500" step="100">
      <button class="success" onclick="addCircle()">Adicionar Círculo</button>
    </div>

    <!-- Controles -->
    <div class="section">
      <h2>Controles</h2>
      <button onclick="fitBounds()">📍 Encaixar ao Mapa</button>
      <button class="danger" onclick="clearAll()">🗑️ Limpar Tudo</button>
      <button onclick="exportData()">💾 Exportar GeoJSON</button>
    </div>

    <!-- Estatísticas -->
    <div class="section">
      <h2>Estatísticas</h2>
      <button onclick="showStats()">📊 Ver Estatísticas</button>
      <div id="stats-container"></div>
    </div>

    <!-- Log de Eventos -->
    <div class="section">
      <h2>Log de Eventos</h2>
      <button onclick="clearLog()">🧹 Limpar Log</button>
      <div id="events-log"></div>
    </div>
  </div>
</div>

<!-- Leaflet JS -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>

<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<!-- BeraMap -->
<script type="module">
  import { init } from './assets/js/maps.js';

  // Variável global
  window.beraMap = null;

  // Inicializar mapa quando DOM estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
    initializeBeraMap();
  });

  function initializeBeraMap() {
    // Criar instância
    window.beraMap = init('map', {
      center: [-8.7619, -63.9039],
      zoom: 13
    });

    // Registrar eventos
    window.beraMap.on('bera:geometryAdded', (e, data) => {
      logEvent(`✅ Geometrias adicionadas: ${data.count}`);
      updateStatus();
    });

    window.beraMap.on('bera:geometryRemoved', (e, data) => {
      logEvent(`❌ Geometrias removidas: ${data.count}`);
      updateStatus();
    });

    window.beraMap.on('bera:geometryClicked', (e, data) => {
      logEvent(`🖱️ Clique em: ${data.uuid.slice(0, 8)}...`);
    });

    window.beraMap.on('bera:geometryHovered', (e, data) => {
      logEvent(`👆 Hover em: ${data.uuid.slice(0, 8)}...`);
    });

    // Atualizar status inicial
    updateStatus();
  }

  window.addPoint = function() {
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);
    const name = document.getElementById('pointName').value;

    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: { name: name }
    };

    const uuids = window.beraMap.addGeometries(geojson);
    logEvent(`✨ Ponto adicionado: ${uuids[0]?.slice(0, 8)}...`);
  };

  window.addCircle = function() {
    const lat = parseFloat(document.getElementById('circleLat').value);
    const lng = parseFloat(document.getElementById('circleLng').value);
    const radius = parseFloat(document.getElementById('radius').value);

    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'Circle',
        coordinates: [lng, lat],
        properties: { radius: radius }
      },
      properties: { name: `Círculo ${radius}m` }
    };

    const uuids = window.beraMap.addGeometries(geojson);
    logEvent(`🔵 Círculo adicionado: ${uuids[0]?.slice(0, 8)}...`);
  };

  window.fitBounds = function() {
    window.beraMap.fitBounds();
    logEvent('📍 Encaixado ao mapa');
  };

  window.clearAll = function() {
    if (confirm('Tem certeza que deseja limpar todas as geometrias?')) {
      window.beraMap.clearAll();
      logEvent('🗑️ Todas as geometrias foram removidas');
    }
  };

  window.exportData = function() {
    const data = window.beraMap.exportGeoJSON();
    console.log('Exportado:', data);
    alert('GeoJSON exportado! Verifique o console');
    logEvent('💾 GeoJSON exportado');
  };

  window.showStats = function() {
    const stats = window.beraMap.getStats();
    const html = `
        <div class="info-box">
          <strong>Total:</strong> ${stats.totalCount}<br>
          <strong>Points:</strong> ${stats.countByType.Point}<br>
          <strong>Lines:</strong> ${stats.countByType.LineString}<br>
          <strong>Polygons:</strong> ${stats.countByType.Polygon}<br>
          <strong>Circles:</strong> ${stats.countByType.Circle}<br>
          <strong>Drawings:</strong> ${stats.countByType.Drawing}
        </div>
      `;
    document.getElementById('stats-container').innerHTML = html;
    logEvent('📊 Estatísticas atualizadas');
  };

  window.updateStatus = function() {
    document.getElementById('status-initialized').textContent =
      window.beraMap.isInitialized() ? '✅' : '❌';
    document.getElementById('status-version').textContent =
      window.beraMap.getVersion();
    document.getElementById('status-count').textContent =
      window.beraMap.getGeometriesCount();
  };

  window.logEvent = function(message) {
    const log = document.getElementById('events-log');
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const entry = `<div class="log-entry">[${timestamp}] ${message}</div>`;
    log.innerHTML = entry + log.innerHTML;

    // Manter apenas os últimos 20 eventos
    const entries = log.querySelectorAll('.log-entry');
    if (entries.length > 20) {
      entries[entries.length - 1].remove();
    }
  };

  window.clearLog = function() {
    document.getElementById('events-log').innerHTML = '';
    logEvent('🧹 Log limpo');
  };

  // Log inicial
  setTimeout(() => {
    logEvent('🚀 BeraMap inicializado');
  }, 500);
</script>
</body>
</html>
