import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'assets', 'story');
const manifestPath = path.join(rootDir, 'data', 'story-art.js');

const scenes = [
  {
    id: 'ch01-lv01',
    name: 'Old Hallway',
    title: 'Footprints Behind the Door',
    colors: ['#08131d', '#12293b', '#36566b', '#e6d3b2'],
    draw: drawHallwayFootprints
  },
  {
    id: 'ch01-lv02',
    name: 'Mirror Hall',
    title: 'Mirror Reflection',
    colors: ['#071019', '#102333', '#2f546e', '#bfe7ff'],
    draw: drawBrokenMirror
  },
  {
    id: 'ch01-lv03',
    name: 'Basement Stairs',
    title: 'Staircase Scratches',
    colors: ['#0a1018', '#23313e', '#576777', '#d2a874'],
    draw: drawStairScratches
  },
  {
    id: 'ch01-lv04',
    name: 'Window Note',
    title: 'Torn Note by Window',
    colors: ['#07111a', '#1b3043', '#876148', '#f3dcc2'],
    draw: drawWindowNote
  },
  {
    id: 'ch02-lv01',
    name: 'Abandoned Stage',
    title: 'Shadow Behind Curtain',
    colors: ['#140d17', '#301929', '#8a2337', '#ffd8a8'],
    draw: drawCurtainShadow
  },
  {
    id: 'ch02-lv02',
    name: 'Empty Seats',
    title: 'Scattered Tickets',
    colors: ['#101522', '#273141', '#62252f', '#f0c697'],
    draw: drawTicketSeats
  },
  {
    id: 'ch02-lv03',
    name: 'Light Console',
    title: 'Control Panel',
    colors: ['#041018', '#0d2232', '#1d5067', '#8eeeff'],
    draw: drawControlPanel
  },
  {
    id: 'ch02-lv04',
    name: 'Backstage Trunk',
    title: 'Open Costume Box',
    colors: ['#11151b', '#2c3440', '#734a2f', '#ffcc98'],
    draw: drawBackstageTrunk
  },
  {
    id: 'ch03-lv01',
    name: 'Rainy Dock',
    title: 'Wet Rope Knot',
    colors: ['#071120', '#17324a', '#275e79', '#7fd8ff'],
    draw: drawDockRope
  },
  {
    id: 'ch03-lv02',
    name: 'Container Yard',
    title: 'Shifted Numbers',
    colors: ['#081320', '#223347', '#a86041', '#ffd3a4'],
    draw: drawContainers
  },
  {
    id: 'ch03-lv03',
    name: 'Deck Watermark',
    title: 'Dragged Across Deck',
    colors: ['#0a1522', '#17364f', '#2d6a7b', '#a8f1ff'],
    draw: drawDeckWater
  },
  {
    id: 'ch03-lv04',
    name: 'Signal Lighthouse',
    title: 'Rainy Lighthouse',
    colors: ['#08111d', '#14253f', '#314662', '#f5d07b'],
    draw: drawLighthouse
  }
];

fs.mkdirSync(outputDir, { recursive: true });

const manifestEntries = [];

for (const scene of scenes) {
  const svg = buildSceneSvg(scene);
  const fileName = `${scene.id}.svg`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, svg, 'utf8');
  manifestEntries.push({
    levelId: scene.id,
    path: `assets/story/${fileName}`,
    sceneName: scene.name
  });
}

fs.writeFileSync(
  manifestPath,
  `module.exports = ${JSON.stringify(
    manifestEntries.reduce((acc, item) => {
      acc[item.levelId] = { path: item.path, sceneName: item.sceneName };
      return acc;
    }, {}),
    null,
    2
  )};\n`,
  'utf8'
);

function buildSceneSvg(scene) {
  const seed = hash(scene.id);
  const random = createRandom(seed);
  const background = `
    <defs>
      <linearGradient id="bg-${scene.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${scene.colors[2]}" />
        <stop offset="48%" stop-color="${scene.colors[1]}" />
        <stop offset="100%" stop-color="${scene.colors[0]}" />
      </linearGradient>
      <radialGradient id="glow-${scene.id}" cx="50%" cy="18%" r="62%">
        <stop offset="0%" stop-color="${withOpacity(scene.colors[3], 0.28)}" />
        <stop offset="100%" stop-color="${withOpacity(scene.colors[0], 0)}" />
      </radialGradient>
      <filter id="blur-${scene.id}">
        <feGaussianBlur stdDeviation="16" />
      </filter>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg-${scene.id})" />
    <rect width="1024" height="1024" fill="url(#glow-${scene.id})" />
  `;

  const particles = Array.from({ length: 42 }, (_, index) => {
    const x = Math.round(random() * 1024);
    const y = Math.round(random() * 1024);
    const r = Math.round(2 + random() * 8);
    const opacity = (0.04 + random() * 0.06).toFixed(3);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${withOpacity(scene.colors[3], opacity)}" />`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${background}
  ${particles}
  ${scene.draw(scene, random)}
</svg>`;
}

function drawHallwayFootprints(scene, random) {
  const footprints = Array.from({ length: 10 }, (_, index) => {
    const x = 180 + index * 58 + (index % 2 === 0 ? 10 : -8);
    const y = 720 + index * 18;
    return `
      <ellipse cx="${x}" cy="${y}" rx="18" ry="32" fill="${withOpacity(scene.colors[0], 0.52)}" transform="rotate(${index % 2 === 0 ? -22 : 18} ${x} ${y})" />
      <circle cx="${x - 10}" cy="${y - 18}" r="6" fill="${withOpacity(scene.colors[0], 0.48)}" />
      <circle cx="${x + 2}" cy="${y - 24}" r="5" fill="${withOpacity(scene.colors[0], 0.48)}" />
    `;
  }).join('');

  return `
    <rect x="0" y="0" width="1024" height="1024" fill="${withOpacity('#000000', 0.12)}" />
    <polygon points="170,120 854,120 728,1024 296,1024" fill="${withOpacity('#4f6e82', 0.26)}" />
    <polygon points="318,208 706,208 644,840 380,840" fill="${withOpacity('#0f1823', 0.56)}" />
    <rect x="410" y="268" width="204" height="466" rx="14" fill="#2b2018" stroke="${withOpacity(scene.colors[3], 0.18)}" stroke-width="8"/>
    <circle cx="576" cy="500" r="10" fill="${scene.colors[3]}" />
    <ellipse cx="512" cy="168" rx="96" ry="34" fill="${withOpacity(scene.colors[3], 0.3)}" filter="url(#blur-${scene.id})"/>
    ${footprints}
  `;
}

function drawBrokenMirror(scene) {
  const cracks = [
    '320,268 436,352 392,474 520,620 476,764',
    '676,244 600,370 706,484 584,658 646,774',
    '512,180 520,312 420,444 580,560 486,820'
  ]
    .map((points) => `<polyline points="${points}" fill="none" stroke="${withOpacity('#eff9ff', 0.55)}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');

  return `
    <rect x="188" y="150" width="648" height="740" rx="34" fill="${withOpacity('#15293b', 0.56)}" />
    <rect x="250" y="212" width="524" height="616" rx="24" fill="${withOpacity('#98d8ff', 0.22)}" stroke="${withOpacity('#d8f8ff', 0.38)}" stroke-width="10"/>
    <rect x="412" y="288" width="198" height="284" rx="18" fill="${withOpacity('#dff5ff', 0.16)}" />
    <rect x="452" y="330" width="118" height="198" fill="${withOpacity('#f5fcff', 0.45)}" />
    <line x1="511" y1="330" x2="511" y2="528" stroke="${withOpacity('#95c4d7', 0.7)}" stroke-width="10"/>
    <line x1="452" y1="428" x2="570" y2="428" stroke="${withOpacity('#95c4d7', 0.7)}" stroke-width="10"/>
    ${cracks}
    <ellipse cx="512" cy="188" rx="120" ry="34" fill="${withOpacity('#d6f2ff', 0.28)}" filter="url(#blur-${scene.id})"/>
  `;
}

function drawStairScratches(scene) {
  const stairs = Array.from({ length: 6 }, (_, index) => {
    const y = 310 + index * 98;
    return `<polygon points="160,${y + 70} 882,${y - 10} 882,${y + 70} 160,${y + 150}" fill="${index % 2 === 0 ? '#5f6d78' : '#738390'}" opacity="0.88"/>`;
  }).join('');

  const scratches = Array.from({ length: 7 }, (_, index) => {
    const x1 = 420 + index * 40;
    const y1 = 548 + index * 56;
    return `<line x1="${x1}" y1="${y1}" x2="${x1 + 148}" y2="${y1 + 28}" stroke="${withOpacity('#d7af82', 0.76)}" stroke-width="8" stroke-linecap="round"/>`;
  }).join('');

  return `
    <rect x="0" y="0" width="1024" height="1024" fill="${withOpacity('#000000', 0.14)}"/>
    ${stairs}
    <line x1="190" y1="230" x2="760" y2="830" stroke="${withOpacity('#c89f73', 0.4)}" stroke-width="14" />
    ${scratches}
    <ellipse cx="838" cy="186" rx="84" ry="26" fill="${withOpacity(scene.colors[3], 0.24)}" filter="url(#blur-${scene.id})"/>
  `;
}

function drawWindowNote(scene) {
  const papers = [
    [376, 586, -8],
    [528, 610, 14],
    [464, 714, -18]
  ]
    .map(
      ([x, y, angle]) => `
        <g transform="translate(${x} ${y}) rotate(${angle})">
          <rect x="-76" y="-54" width="152" height="108" rx="8" fill="#f3e7cf" />
          <line x1="-42" y1="-12" x2="44" y2="-12" stroke="${withOpacity('#8b7358', 0.56)}" stroke-width="6"/>
          <line x1="-42" y1="18" x2="26" y2="18" stroke="${withOpacity('#8b7358', 0.56)}" stroke-width="6"/>
        </g>
      `
    )
    .join('');

  return `
    <rect x="270" y="144" width="484" height="360" rx="24" fill="${withOpacity('#1b2e3e', 0.52)}" stroke="${withOpacity('#d6e7ef', 0.18)}" stroke-width="12"/>
    <rect x="330" y="198" width="364" height="246" fill="${withOpacity('#e8f7ff', 0.26)}"/>
    <line x1="512" y1="198" x2="512" y2="444" stroke="${withOpacity('#aec6d2', 0.46)}" stroke-width="12"/>
    <line x1="330" y1="318" x2="694" y2="318" stroke="${withOpacity('#aec6d2', 0.46)}" stroke-width="12"/>
    <path d="M724 182 Q782 266 758 392" fill="none" stroke="${withOpacity('#e6d4c8', 0.34)}" stroke-width="20"/>
    ${papers}
    <ellipse cx="350" cy="154" rx="118" ry="34" fill="${withOpacity('#f9f2dc', 0.24)}" filter="url(#blur-${scene.id})"/>
  `;
}

function drawCurtainShadow(scene) {
  return `
    <rect x="0" y="0" width="1024" height="1024" fill="${withOpacity('#0c0810', 0.2)}"/>
    <ellipse cx="512" cy="242" rx="228" ry="76" fill="${withOpacity('#ffd8a7', 0.2)}" filter="url(#blur-${scene.id})"/>
    <path d="M112 0 H424 Q388 212 430 420 Q362 612 420 1024 H112 Z" fill="#7a1f30"/>
    <path d="M912 0 H600 Q636 212 594 420 Q662 612 604 1024 H912 Z" fill="#7a1f30"/>
    <rect x="246" y="712" width="532" height="136" rx="20" fill="${withOpacity('#241116', 0.82)}"/>
    <ellipse cx="512" cy="574" rx="92" ry="168" fill="${withOpacity('#06070a', 0.42)}"/>
    <rect x="478" y="474" width="68" height="210" rx="34" fill="${withOpacity('#06070a', 0.52)}"/>
  `;
}

function drawTicketSeats(scene) {
  const seats = Array.from({ length: 5 }, (_, row) => {
    const y = 390 + row * 110;
    const scale = 1 - row * 0.09;
    return Array.from({ length: 6 }, (_, col) => {
      const x = 140 + col * 130;
      const width = 96 * scale;
      const height = 80 * scale;
      return `
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="20" fill="#712b36" opacity="${0.92 - row * 0.08}"/>
        <rect x="${x + 10}" y="${y - 36 * scale}" width="${width - 20}" height="${50 * scale}" rx="18" fill="#8a3240" opacity="${0.92 - row * 0.08}"/>
      `;
    }).join('');
  }).join('');

  const tickets = [
    [336, 678, -16],
    [544, 748, 12],
    [690, 628, -8]
  ]
    .map(
      ([x, y, rotate]) => `
        <g transform="translate(${x} ${y}) rotate(${rotate})">
          <rect x="-60" y="-32" width="120" height="64" rx="8" fill="#f4d4b8"/>
          <line x1="-18" y1="-20" x2="-18" y2="20" stroke="${withOpacity('#87584a', 0.7)}" stroke-width="4" stroke-dasharray="6 6"/>
        </g>
      `
    )
    .join('');

  return `
    <rect x="0" y="0" width="1024" height="1024" fill="${withOpacity('#140d13', 0.18)}"/>
    <ellipse cx="790" cy="182" rx="140" ry="46" fill="${withOpacity(scene.colors[3], 0.22)}" filter="url(#blur-${scene.id})"/>
    ${seats}
    ${tickets}
  `;
}

function drawControlPanel(scene) {
  const buttons = [];
  const colors = ['#7ee0db', '#74cfff', '#ffd878'];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const x = 180 + col * 84;
      const y = 300 + row * 86;
      const color = colors[(row + col) % colors.length];
      buttons.push(`<circle cx="${x}" cy="${y}" r="18" fill="${withOpacity(color, 0.88)}" />`);
    }
  }

  return `
    <rect x="92" y="224" width="840" height="560" rx="34" fill="${withOpacity('#0a141f', 0.76)}" />
    <rect x="132" y="264" width="760" height="480" rx="28" fill="${withOpacity('#102230', 0.88)}" stroke="${withOpacity('#93dff5', 0.18)}" stroke-width="10"/>
    <path d="M152 774 C236 716 338 722 412 760 S586 810 694 752 S842 726 892 754" fill="none" stroke="${withOpacity('#1d5268', 0.8)}" stroke-width="20" stroke-linecap="round"/>
    ${buttons.join('')}
    <ellipse cx="512" cy="174" rx="168" ry="44" fill="${withOpacity('#8be8ff', 0.22)}" filter="url(#blur-${scene.id})"/>
  `;
}

function drawBackstageTrunk(scene) {
  return `
    <rect x="166" y="360" width="692" height="352" rx="28" fill="#6d472c"/>
    <rect x="202" y="394" width="620" height="280" rx="18" fill="#9d6940"/>
    <rect x="250" y="240" width="524" height="170" rx="28" fill="#7b5236" transform="rotate(-6 512 324)"/>
    <rect x="416" y="468" width="210" height="126" rx="12" fill="#e6d8bc" transform="rotate(-10 512 531)"/>
    <line x1="436" y1="500" x2="574" y2="500" stroke="${withOpacity('#7b6246', 0.7)}" stroke-width="6"/>
    <line x1="452" y1="540" x2="604" y2="540" stroke="${withOpacity('#7b6246', 0.7)}" stroke-width="6"/>
    <path d="M250 616 C322 574 388 578 470 620 S650 660 770 602" fill="none" stroke="${withOpacity('#20160f', 0.28)}" stroke-width="18"/>
    <ellipse cx="758" cy="210" rx="104" ry="30" fill="${withOpacity(scene.colors[3], 0.2)}" filter="url(#blur-${scene.id})"/>
  `;
}

function drawDockRope(scene) {
  return `
    <rect x="0" y="740" width="1024" height="284" fill="${withOpacity('#294b61', 0.6)}"/>
    <ellipse cx="512" cy="790" rx="380" ry="62" fill="${withOpacity('#9fd8ef', 0.12)}"/>
    <rect x="430" y="490" width="168" height="248" rx="26" fill="#3b4c55"/>
    <ellipse cx="514" cy="494" rx="118" ry="38" fill="#70818a"/>
    <path d="M512 522 C434 538 414 620 470 658 C522 692 608 658 612 594 C616 548 572 520 512 522" fill="none" stroke="#d7ba8c" stroke-width="30" stroke-linecap="round"/>
    <path d="M616 594 C698 628 742 684 776 760" fill="none" stroke="#d7ba8c" stroke-width="24" stroke-linecap="round"/>
    <g stroke="${withOpacity('#d7f5ff', 0.18)}" stroke-width="4">
      <line x1="140" y1="120" x2="80" y2="980"/>
      <line x1="230" y1="120" x2="170" y2="980"/>
      <line x1="880" y1="120" x2="820" y2="980"/>
    </g>
  `;
}

function drawContainers(scene) {
  const blocks = [
    [138, 520, 228, 172, '#bb6b43'],
    [382, 452, 232, 240, '#4f768f'],
    [626, 520, 258, 172, '#7c5a4a'],
    [252, 694, 304, 184, '#2f5e7f'],
    [572, 694, 278, 184, '#a34f3b']
  ]
    .map(
      ([x, y, width, height, color]) => `
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="${color}" />
        <line x1="${x + 36}" y1="${y + 20}" x2="${x + 36}" y2="${y + height - 20}" stroke="${withOpacity('#f6e2c8', 0.18)}" stroke-width="8"/>
        <line x1="${x + width - 36}" y1="${y + 20}" x2="${x + width - 36}" y2="${y + height - 20}" stroke="${withOpacity('#f6e2c8', 0.18)}" stroke-width="8"/>
      `
    )
    .join('');

  return `
    <rect x="0" y="690" width="1024" height="334" fill="${withOpacity('#213648', 0.58)}"/>
    ${blocks}
    <text x="222" y="622" font-size="78" font-family="Arial" fill="${withOpacity('#f4e6d5', 0.34)}">72A</text>
    <text x="470" y="602" font-size="92" font-family="Arial" fill="${withOpacity('#f4e6d5', 0.34)}">1B8</text>
    <text x="676" y="622" font-size="84" font-family="Arial" fill="${withOpacity('#f4e6d5', 0.34)}">C03</text>
  `;
}

function drawDeckWater(scene) {
  const planks = Array.from({ length: 8 }, (_, index) => {
    const y = 370 + index * 76;
    return `<rect x="112" y="${y}" width="800" height="62" rx="18" fill="${index % 2 === 0 ? '#385766' : '#2c4552'}" opacity="0.92"/>`;
  }).join('');

  const puddles = Array.from({ length: 5 }, (_, index) => {
    const x = 250 + index * 130;
    const y = 520 + (index % 2 === 0 ? 0 : 84);
    return `<ellipse cx="${x}" cy="${y}" rx="86" ry="32" fill="${withOpacity('#b8f1ff', 0.22)}" />`;
  }).join('');

  return `
    ${planks}
    ${puddles}
    <path d="M746 214 L604 514" stroke="${withOpacity('#161e28', 0.44)}" stroke-width="34" stroke-linecap="round"/>
    <path d="M792 248 L650 548" stroke="${withOpacity('#161e28', 0.34)}" stroke-width="12" stroke-linecap="round"/>
    <path d="M442 430 C558 496 634 576 724 724" fill="none" stroke="${withOpacity('#d3edf2', 0.26)}" stroke-width="12" stroke-linecap="round"/>
  `;
}

function drawLighthouse(scene) {
  return `
    <rect x="0" y="700" width="1024" height="324" fill="${withOpacity('#1a2637', 0.72)}"/>
    <rect x="680" y="208" width="108" height="512" rx="18" fill="#d5dfeb"/>
    <rect x="648" y="166" width="172" height="74" rx="22" fill="#f1d389"/>
    <polygon points="736,84 826,166 646,166" fill="#43576e"/>
    <path d="M734 196 L180 380 L180 470 L734 246 Z" fill="${withOpacity('#f7d97a', 0.26)}"/>
    <ellipse cx="734" cy="202" rx="96" ry="36" fill="${withOpacity('#ffe8a1', 0.38)}" filter="url(#blur-${scene.id})"/>
    <g stroke="${withOpacity('#d7f5ff', 0.16)}" stroke-width="4">
      <line x1="140" y1="80" x2="80" y2="980"/>
      <line x1="310" y1="80" x2="250" y2="980"/>
      <line x1="520" y1="80" x2="460" y2="980"/>
      <line x1="910" y1="80" x2="850" y2="980"/>
    </g>
  `;
}

function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hash(value) {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result += (result << 1) + (result << 4) + (result << 7) + (result << 8) + (result << 24);
  }
  return result >>> 0;
}

function withOpacity(hex, opacity) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

console.log(`Generated ${scenes.length} story svg assets in ${outputDir}`);
