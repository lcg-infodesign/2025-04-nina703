// Configurazione glifi
const GLYPH_TYPES = {
  'Stratovolcano': 'circle',
  'Shield Volcano': 'triangle',
  'Crater System': 'square',
  'Caldera': 'pentagon',
  'Submarine Volcano': 'cross',
  'Cone': 'rectangle',
  'Maars / Tuff ring': 'star',
  'Other / Unknown': 'ellipse'
};

let maxElevation = 0;
let minElevation = 0;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getVolcanoFromURL() {
  const params = new URLSearchParams(window.location.search);
  return decodeURIComponent(params.get('volcano'));
}

function getColorForElevation(elevation) {
  if (!elevation || isNaN(elevation) || maxElevation === minElevation) {
    return { r: 150, g: 100, b: 85 };
  }
  let t = (elevation - minElevation) / (maxElevation - minElevation);
  let r = Math.round(lerp(92, 255, t));
  let g = Math.round(lerp(64, 107, t));
  let b = Math.round(lerp(51, 91, t));
  return { r, g, b };
}

// Parser CSV migliorato
function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of lines[i]) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

function loadVolcanoData() {
  const volcanoName = getVolcanoFromURL();
  
  if (!volcanoName) {
    document.getElementById('volcanoTitle').textContent = 'Errore: vulcano non specificato';
    return;
  }

  fetch('./assets/data.csv')
    .then(response => {
      if (!response.ok) throw new Error('Errore ' + response.status);
      return response.text();
    })
    .then(csvText => {
      const { headers, rows } = parseCSV(csvText);
      
      // Calcola min/max elevazione
      const elevations = rows
        .map(r => parseFloat(r['Elevation (m)']))
        .filter(e => !isNaN(e) && e > 0);
      
      if (elevations.length > 0) {
        maxElevation = Math.max(...elevations);
        minElevation = Math.min(...elevations);
      }
      
      // Trova il vulcano
      const volData = rows.find(r => r['Volcano Name'] === volcanoName);
      
      if (!volData) {
        document.getElementById('volcanoTitle').textContent = 'Vulcano non trovato';
        return;
      }
      
      // Popola i dati
      document.getElementById('volcanoTitle').textContent = volData['Volcano Name'];
      document.getElementById('volcanoNumber').textContent = volData['Volcano Number'] || '-';
      document.getElementById('volcanoCountry').textContent = volData['Country'] || '-';
      document.getElementById('volcanoLocation').textContent = volData['Location'] || '-';
      document.getElementById('volcanoTypeCategory').textContent = volData['TypeCategory'] || '-';
      document.getElementById('volcanoTypeDetail').textContent = volData['Type'] || '-';
      document.getElementById('volcanoStatus').textContent = volData['Status'] || '-';
      document.getElementById('volcanoElevation').textContent = volData['Elevation (m)'] ? volData['Elevation (m)'] + ' m' : '-';
      document.getElementById('volcanoLastEruption').textContent = volData['Last Known Eruption'] || '-';
      
      // Disegna il glifo
      const elevation = parseFloat(volData['Elevation (m)']);
      const typeCategory = volData['TypeCategory'] || 'Other / Unknown';
      drawGlyph(typeCategory, elevation);
    })
    .catch(err => {
      console.error('Errore:', err);
      document.getElementById('volcanoTitle').textContent = 'Errore: ' + err.message;
    });
}

function drawGlyph(typeCategory, elevation) {
  const color = getColorForElevation(elevation);
  
  const sketch = (p) => {
    p.setup = function() {
      const container = document.getElementById('glyphCanvas');
      const size = Math.min(container.clientWidth - 20, 300);
      p.createCanvas(size, size);
      p.angleMode(p.DEGREES);
      
      p.background(249, 250, 251);
      p.translate(size / 2, size / 2);
      
      p.fill(color.r, color.g, color.b);
      p.stroke(0);
      p.strokeWeight(2);
      
      const glyphType = GLYPH_TYPES[typeCategory] || 'circle';
      drawGlyphShape(p, glyphType, 80);
    };

    p.draw = function() {
      p.noLoop();
    };
  };

  new p5(sketch, 'glyphCanvas');
}

function drawGlyphShape(p, glyphType, size) {
  switch (glyphType) {
    case 'circle':
      p.ellipse(0, 0, size, size);
      break;
    case 'triangle':
      p.triangle(-size / 2, size / 2, size / 2, size / 2, 0, -size / 2);
      break;
    case 'square':
      p.rectMode(p.CENTER);
      p.rect(0, 0, size, size);
      break;
    case 'pentagon':
      p.beginShape();
      for (let i = 0; i < 5; i++) {
        let angle = p.map(i, 0, 5, -90, 270);
        p.vertex(p.cos(angle) * size / 2, p.sin(angle) * size / 2);
      }
      p.endShape(p.CLOSE);
      break;
    case 'cross':
      p.line(-size / 2, 0, size / 2, 0);
      p.line(0, -size / 2, 0, size / 2);
      break;
    case 'rectangle':
      p.rectMode(p.CENTER);
      p.rect(0, 0, size * 1.5, size * 0.8);
      break;
    case 'star':
      p.beginShape();
      for (let i = 0; i < 10; i++) {
        let angle = p.map(i, 0, 10, -90, 270);
        let r = (i % 2 === 0) ? size / 2 : size / 4;
        p.vertex(p.cos(angle) * r, p.sin(angle) * r);
      }
      p.endShape(p.CLOSE);
      break;
    case 'ellipse':
      p.ellipse(0, 0, size * 1.5, size);
      break;
    default:
      p.ellipse(0, 0, size, size);
  }
}

// Avvia quando la pagina carica
window.addEventListener('load', loadVolcanoData);