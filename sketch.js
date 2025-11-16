let table;
let volcanoes = [];
let hoveredVolcano = null;


const GLYPH_SIZE = 15;
const SIDEBAR_WIDTH = 320;
const CARD_HEIGHT = 200;
const CARD_BG_COLOR = [250, 250, 252, 240];
const HOVER_TOLERANCE = 1.2;
const MARGIN = 15;

// Mappa dei glifi per TypeCategory
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

let maxElevation, minElevation;

function preload() {
  table = loadTable("assets/data.csv", "csv", "header");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  prepareData();
}

function prepareData() {
  volcanoes = [];
  let elevations = [];
  let latitudes = [];
  let longitudes = [];

  for (let i = 0; i < table.getRowCount(); i++) {
    let row = table.getRow(i);
    let elevation = parseFloat(row.getString("Elevation (m)"));
    let lat = parseFloat(row.getString("Latitude"));
    let lon = parseFloat(row.getString("Longitude"));
    if (!isNaN(elevation)) elevations.push(elevation);
    if (!isNaN(lat)) latitudes.push(lat);
    if (!isNaN(lon)) longitudes.push(lon);
  }
  
  if (elevations.length > 0) {
    maxElevation = max(elevations.filter(e => e > 0));
    minElevation = min(elevations.filter(e => e > 0));
  } else {
    maxElevation = minElevation = 0;
  }

  for (let i = 0; i < table.getRowCount(); i++) {
    let row = table.getRow(i);
    let elevation = parseFloat(row.getString("Elevation (m)"));
    let typeCategory = row.getString("TypeCategory") || "Other / Unknown";
    let type = row.getString("Type") || "";
    let lat = parseFloat(row.getString("Latitude"));
    let lon = parseFloat(row.getString("Longitude"));

    let glyphColor;
    if (!isNaN(elevation) && maxElevation !== minElevation) {
      let t = map(elevation, minElevation, maxElevation, 0, 1);
      let r = lerp(92, 255, t);
      let g = lerp(64, 107, t);
      let b = lerp(51, 91, t);
      glyphColor = color(r, g, b);
    } else {
      glyphColor = color(150, 100, 85);
    }

    if (isNaN(lat) || isNaN(lon)) continue;

    let baseX = map(lon, -180, 180, SIDEBAR_WIDTH + MARGIN, width);
    let baseY = map(lat, 90, -90, 0, height);

    let jitter = 15;
    baseX += random(-jitter, jitter);
    baseY += random(-jitter, jitter);

    volcanoes.push({
      data: {
        number: row.getString("Volcano Number"),
        name: row.getString("Volcano Name"),
        country: row.getString("Country"),
        location: row.getString("Location"),
        status: row.getString("Status"),
        lastEruption: row.getString("Last Known Eruption"),
        type: type, 
        typeCategory: typeCategory, 
        elevation: row.getString("Elevation (m)")
      },
      x: baseX,
      y: baseY,
      color: glyphColor,
      typeCategory: typeCategory 
    });
  }
}

function draw() {
  let bgColor1 = color(240, 242, 247);
  let bgColor2 = color(225, 230, 242);
  for (let y = 0; y < height; y++) {
    let c = lerpColor(bgColor1, bgColor2, y / height);
    stroke(c);
    line(0, y, width, y);
  }
  noStroke();

  hoveredVolcano = null;

  for (let v of volcanoes) {
    drawVolcanoGlyph(v, 1, false);
    if (isMouseOverVolcano(v)) {
      hoveredVolcano = v;
    }
  }

  if (hoveredVolcano) {
    drawVolcanoGlyph(hoveredVolcano, 1, true);
  }

  // Disegna la sidebar con leggende e scheda
  drawSidebar();
}

function drawSidebar() {
  push();
  
  // Sfondo sidebar
  fill(250, 250, 252, 245);
  stroke(180, 190, 210, 120);
  strokeWeight(1);
  rect(0, 0, SIDEBAR_WIDTH, height);

  // Legenda Elevazione
  drawElevationLegend();

  // Legenda Categorie
  drawCategoriesLegend();

  // Scheda del vulcano selezionato
  if (hoveredVolcano) {
    drawVolcanoCard(hoveredVolcano);
  }

  pop();
}

function drawElevationLegend() {
  let x = MARGIN;
  let y = MARGIN;
  let w = SIDEBAR_WIDTH - MARGIN * 2;
  let h = 100;

  // Titolo
  fill(45, 55, 75);
  textSize(14);
  textStyle(BOLD);
  text("Elevation", x, y + 20);

  // Barra di sfumatura
  let barHeight = 20;
  let barY = y + 35;
  let barWidth = w;
  
  for (let i = 0; i < barWidth; i++) {
    let t = i / barWidth;
    let r = lerp(92, 255, t);
    let g = lerp(64, 107, t);
    let b = lerp(51, 91, t);
    stroke(r, g, b);
    line(x + i, barY, x + i, barY + barHeight);
  }
  
  noFill();
  stroke(0, 80);
  strokeWeight(1);
  rect(x, barY, barWidth, barHeight);

  // Labels min/max
  textSize(11);
  textStyle(NORMAL);
  fill(100, 110, 130);
  textAlign(LEFT);
  text(floor(minElevation) + " m", x, barY + barHeight + 15);
  textAlign(RIGHT);
  text(floor(maxElevation) + " m", x + barWidth, barY + barHeight + 15);
}

function drawCategoriesLegend() {
  let x = MARGIN;
  let y = 150;
  let w = SIDEBAR_WIDTH - MARGIN * 2;

  // Titolo
  fill(45, 55, 75);
  textSize(14);
  textStyle(BOLD);
  text("Type Categories", x + 115, y+5);

  // Elenco categorie - usa solo i glifi che hanno mappatura
  let categories = Object.keys(GLYPH_TYPES);
  let itemHeight = 18;
  let startY = y + 35;

  textSize(10);
  textStyle(NORMAL);
  fill(45, 55, 75);

  for (let i = 0; i < categories.length; i++) {
    let category = categories[i];
    let itemY = startY + i * itemHeight;

    // Disegna il glifo
    push();
    translate(x + 15, itemY - 4);
    drawCategoryGlyph(category);
    pop();

    // Etichetta testo
    textAlign(LEFT);
    text(category, x + 35, itemY);
  }
}

function drawCategoryGlyph(categoryName) {
  let size = 12;
  fill(150, 100, 85);
  stroke(0, 60);
  strokeWeight(1);

  let type = GLYPH_TYPES[categoryName] || 'circle';

  switch (type) {
    case 'circle':
      ellipse(0, 0, size, size);
      break;
    case 'triangle':
      triangle(-size / 2, size / 2, size / 2, size / 2, 0, -size / 2);
      break;
    case 'square':
      rectMode(CENTER);
      rect(0, 0, size, size);
      break;
    case 'pentagon':
      beginShape();
      for (let i = 0; i < 5; i++) {
        let angle = map(i, 0, 5, -90, 270);
        vertex(cos(angle) * size / 2, sin(angle) * size / 2);
      }
      endShape(CLOSE);
      break;
    case 'cross':
      line(-size / 2, 0, size / 2, 0);
      line(0, -size / 2, 0, size / 2);
      break;
    case 'rectangle':
      rectMode(CENTER);
      rect(0, 0, size * 1.5, size * 0.8);
      break;
    case 'star':
      let points = 5;
      beginShape();
      for (let i = 0; i < points * 2; i++) {
        let angle = map(i, 0, points * 2, -90, 270);
        let r = (i % 2 === 0) ? size / 2 : size / 4;
        vertex(cos(angle) * r, sin(angle) * r);
      }
      endShape(CLOSE);
      break;
    case 'ellipse':
      ellipse(0, 0, size * 1.5, size);
      break;
  }
}

function drawVolcanoCard(v) {
  let cardStartY = height - CARD_HEIGHT - 40;
  let x = MARGIN;
  let y = cardStartY;
  let cardWidth = SIDEBAR_WIDTH - MARGIN * 2;

  push();

  // Sfondo card
  fill(CARD_BG_COLOR);
  stroke(180, 190, 210, 120);
  strokeWeight(1);
  rect(x, y, cardWidth, CARD_HEIGHT, 8);

  // Titolo
  fill(45, 55, 75);
  textAlign(CENTER);
  textSize(15);
  textStyle(BOLD);
  text(v.data.name || "Unknown", x + cardWidth / 2, y + 25);

  // Piccolo glifo nella scheda
  push();
  translate(x + cardWidth / 2, y + 50);
  let size = GLYPH_SIZE * 1.2;
  fill(v.color);
  stroke(0, 80);
  strokeWeight(1);
  
  let type = GLYPH_TYPES[v.typeCategory] || 'circle';
  drawGlyph(type, size);
  pop();

  // Dettagli
  textAlign(LEFT);
  textSize(11);
  textStyle(NORMAL);
  let detailY = y + 100;
  let lineHeight = 18;
  let labelWidth = 80;

  const printDetail = (label, value) => {
    if (!value) return;
    textStyle(BOLD);
    fill(100, 110, 130);
    text(label + ":", x + 12, detailY + 10);
    textStyle(NORMAL);
    fill(45, 55, 75);
    let textX = x + 12 + labelWidth;
    text(value, textX, detailY, cardWidth - labelWidth - 24);
    detailY += lineHeight;
  };

  printDetail("Name", v.data.name);
  printDetail("Country", v.data.country);

  pop();
}


function drawGlyph(type, size) {
  switch (type) {
    case 'circle':
      ellipse(0, 0, size, size);
      break;
    case 'triangle':
      triangle(-size / 2, size / 2, size / 2, size / 2, 0, -size / 2);
      break;
    case 'square':
      rectMode(CENTER);
      rect(0, 0, size, size);
      break;
    case 'pentagon':
      beginShape();
      for (let i = 0; i < 5; i++) {
        let angle = map(i, 0, 5, -90, 270);
        vertex(cos(angle) * size / 2, sin(angle) * size / 2);
      }
      endShape(CLOSE);
      break;
    case 'cross':
      line(-size / 2, 0, size / 2, 0);
      line(0, -size / 2, 0, size / 2);
      break;
    case 'rectangle':
      rectMode(CENTER);
      rect(0, 0, size * 1.5, size * 0.8);
      break;
    case 'star':
      let points = 5;
      beginShape();
      for (let i = 0; i < points * 2; i++) {
        let angle = map(i, 0, points * 2, -90, 270);
        let r = (i % 2 === 0) ? size / 2 : size / 4;
        vertex(cos(angle) * r, sin(angle) * r);
      }
      endShape(CLOSE);
      break;
    default:
      ellipse(0, 0, size, size);
  }
}

function drawVolcanoGlyph(v, sizeFactor = 1, forceRed = false) {
  push();
  translate(v.x, v.y);

  let size = GLYPH_SIZE * sizeFactor;

  if (forceRed) {
    fill(231, 76, 60);
    stroke(0);
    strokeWeight(2.5);
  } else {
    fill(v.color);
    stroke(0, 60);
    strokeWeight(1);
  }

  // Usa typeCategory per determinare il glifo
  let type = GLYPH_TYPES[v.typeCategory] || 'circle';
  drawGlyph(type, size);

  pop();
}

function isMouseOverVolcano(v) {
  let tolerance = GLYPH_SIZE * HOVER_TOLERANCE;
  return dist(mouseX, mouseY, v.x, v.y) < tolerance;
}

function mousePressed() {
  if (hoveredVolcano) {
    let volcanoName = encodeURIComponent(hoveredVolcano.data.name);
    window.open(`detail.html?volcano=${volcanoName}`, '_blank');
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  prepareData();
}