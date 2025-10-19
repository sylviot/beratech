/**
 * Translations - Sistema de Internacionalização (i18n) para BeraMap
 *
 * Define mensagens em diferentes idiomas
 * Adicione novos idiomas conforme necessário
 */

export const TRANSLATIONS = {
  'pt-BR': {
    popupLabels: {
      name: 'Nome',
      description: 'Descrição',
      area: 'Área',
      perimeter: 'Perímetro',
      length: 'Comprimento',
      circumference: 'Circunferência',
      radius: 'Raio',
      isClosed: 'Fechado',
      type: 'Tipo',
      latLng: 'Coordenadas',
      noInfo: 'Sem informações disponíveis'
    },
    geometryTypes: {
      Point: 'Ponto',
      LineString: 'Linha',
      Polygon: 'Polígono',
      Circle: 'Círculo',
      Drawing: 'Desenho',
      polygon: 'Polígono',
      polyline: 'Polilinha'
    },
    units: {
      meters: 'm',
      kilometers: 'km',
      squareMeters: 'm²',
      hectares: 'ha',
      squareKilometers: 'km²'
    }
  },
  'en-US': {
    popupLabels: {
      name: 'Name',
      description: 'Description',
      area: 'Area',
      perimeter: 'Perimeter',
      length: 'Length',
      circumference: 'Circumference',
      radius: 'Radius',
      isClosed: 'Closed',
      type: 'Type',
      latLng: 'Coordinates',
      noInfo: 'No information available'
    },
    geometryTypes: {
      Point: 'Point',
      LineString: 'Line',
      Polygon: 'Polygon',
      Circle: 'Circle',
      Drawing: 'Drawing',
      polygon: 'Polygon',
      polyline: 'Polyline'
    },
    units: {
      meters: 'm',
      kilometers: 'km',
      squareMeters: 'm²',
      hectares: 'ha',
      squareKilometers: 'km²'
    }
  }
};

/**
 * Obtém tradução para um idioma e chave específica
 * @param {string} language - Código do idioma (ex: 'pt-BR', 'en-US')
 * @param {string} key - Chave da tradução (ex: 'popupLabels.name')
 * @param {string} defaultValue - Valor padrão se não encontrar
 * @returns {string} Texto traduzido
 */
export function getTranslation(language, key, defaultValue = '') {
  // Fallback para pt-BR se idioma não existir
  const translations = TRANSLATIONS[language] || TRANSLATIONS['pt-BR'];
  
  // Navegar pelos níveis (ex: 'popupLabels.name' → translations.popupLabels.name)
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return defaultValue;
    }
  }
  
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * Verifica se um idioma está disponível
 * @param {string} language - Código do idioma
 * @returns {boolean}
 */
export function isLanguageAvailable(language) {
  return language in TRANSLATIONS;
}

/**
 * Obtém lista de idiomas disponíveis
 * @returns {Array} Array de códigos de idioma
 */
export function getAvailableLanguages() {
  return Object.keys(TRANSLATIONS);
}

export default {
  TRANSLATIONS,
  getTranslation,
  isLanguageAvailable,
  getAvailableLanguages
};
