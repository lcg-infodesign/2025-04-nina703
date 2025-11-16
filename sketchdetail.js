// Configurazione glifi - Usa TypeCategory!
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

// Funzione lerp semplice
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Estrai il parametro dall'URL
function getVolcanoFromURL() {
  const params = new URLSearchParams(window.location.search);
  return decodeURIComponent(params.get('volcano'));
}

// Parser CSV robusto - gestisce virgole dentro i valori
function parseCSVLine(line, headers) {
  const values = [];
  let current = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));
  
  const row = {};
  headers.forEach((h, i) => {
    row[h] = values[i] || '';
  });
  return row;
}

// Calcola il colore in base all'elevazione
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

// Popola i dati nella pagina
function populateData(volData) {
  document.getElementById('volcanoTitle').textContent = volData['Volcano Name'];
  document.getElementById('volcanoNumber').textContent = volData['Volcano Number'];
  document.getElementById('volcanoCountry').textContent = volData['Country'];
  document.getElementById('volcanoLocation').textContent = volData['Location'];
  
  // Type è quello che vuoi mostrare nella scheda
  const type = volData['Type'] || '';
  document.getElementById('volcanoTypeDetail').textContent = type;
  
  // TypeCategory è quello che usi per il glifo - ORA LO MOSTRIAMO ALL'UTENTE!
  const typeCategory = volData['TypeCategory'] || 'Other / Unknown';
  document.getElementById('volcanoTypeCategory').textContent = typeCategory;
  
  document.getElementById('volcanoStatus').textContent = volData['Status'];
  
  const elevation = volData['Elevation (m)'];
  document.getElementById('volcanoElevation').textContent = elevation ? elevation + ' m' : '-';
  
  document.getElementById('volcanoLastEruption').textContent = volData['Last Known Eruption'];
}

// Carica e filtra i dati
function loadVolcanoData() {
  const volcanoName = getVolcanoFromURL();
  
  if (!volcanoName) {
    document.getElementById('volcanoTitle').textContent = 'Errore: vulcano non specificato';
    return;
  }
  
  // Usa percorso relativo
  const csvPath = './assets/data.csv';
  
  console.log("Caricando CSV da:", csvPath);
  
  fetch(csvPath)
    .then(response => {
      if (!response.ok) {
        throw new Error('Errore HTTP: ' + response.status);
      }
      return response.text();
    })
    .then(csv => {
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // PRIMO PASSAGGIO: calcola min/max elevazione
      let elevations = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = parseCSVLine(lines[i], headers);
        const elev = parseFloat(row['Elevation (m)']);
        if (!isNaN(elev) && elev > 0) {
          elevations.push(elev);
        }
      }
      
      if (elevations.length > 0) {
        maxElevation = Math.max(...elevations);
        minElevation = Math.min(...elevations);
      }
      
      // SECONDO PASSAGGIO: trova il vulcano e carica i dati
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = parseCSVLine(lines[i], headers);
        
        if (row['Volcano Name'] === volcanoName) {
          populateData(row);
          const elevation = parseFloat(row['Elevation (m)']);
          // Usa TypeCategory per il glifo!
          const typeCategory = row['TypeCategory'] || 'Other / Unknown';
          drawGlyph(typeCategory, elevation);
          return;
        }
      }
      
      document.getElementById('volcanoTitle').textContent = 'Vulcano "' + volcanoName + '" non trovato';
    })
    .catch(err => {
      console.error('Errore nel caricamento:', err);
      document.getElementById('volcanoTitle').textContent = 'Errore nel caricamento dei dati: ' + err.message;
    });
}

// Disegna il glifo con p5.js
function drawGlyph(typeCategory, elevation) {
  const color = getColorForElevation(elevation);
  
  const sketch = (p) => {
    p.setup = function() {
      const container = document.getElementById('glyphCanvas');
      const size = Math.min(container.clientWidth - 20, 300);
      p.createCanvas(size, size);
      p.angleMode(p.DEGREES);
      drawGlyphContent(p, typeCategory, color, size);
    };

    p.draw = function() {
      p.noLoop();
    };
  };

  new p5(sketch, 'glyphCanvas');
}

// Disegna il contenuto del glifo
function drawGlyphContent(p, typeCategory, color, canvasSize) {
  p.background(249, 250, 251);
  p.translate(canvasSize / 2, canvasSize / 2);
  
  const glyphSize = 80;
  p.fill(color.r, color.g, color.b);
  p.stroke(0);
  p.strokeWeight(2);
  
  // Usa la mappatura corretta di TypeCategory
  const glyphType = GLYPH_TYPES[typeCategory] || 'circle';
  drawGlyphShape(p, glyphType, glyphSize);
}

// Disegna la forma del glifo
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
        let x = p.cos(angle) * size / 2;
        let y = p.sin(angle) * size / 2;
        p.vertex(x, y);
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

// Avvia al caricamento della pagina
window.addEventListener('load', loadVolcanoData);