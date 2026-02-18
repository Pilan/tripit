'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';

interface Milestone {
  id: number;
  name: string;
  cost: number;
  order_index: number;
  description: string;
}

interface TripConfig {
  goal_city: string;
  total_cost: number;
  current_amount: number;
  start_cities: string[];
}

// Convert geographic coordinates (lon, lat) to SVG coordinates
// x = 23 * longitude + 61
// y = (63.8 - latitude) * 44.3 + 40
// Viewport: 700×1150, covers roughly 3°W–28°E, 38.7°N–64.7°N
function geo(lon: number, lat: number): { x: number; y: number } {
  return { x: Math.round(23 * lon + 61), y: Math.round((63.8 - lat) * 44.3 + 40) };
}

// Build SVG path from [lon, lat] geographic coordinates
function geoPath(coords: [number, number][]): string {
  return coords.map(([lon, lat], i) => {
    const { x, y } = geo(lon, lat);
    return i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }).join(' ') + ' Z';
}

// Build SVG polyline (no Z close) from [lon, lat]
function geoLine(coords: [number, number][]): string {
  return coords.map(([lon, lat], i) => {
    const { x, y } = geo(lon, lat);
    return i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }).join(' ');
}

// All city positions from real lat/lon — verifiable on Google Maps
const KNOWN_CITIES: Record<string, { x: number; y: number }> = {
  'Umeå':        geo(20.26, 63.83),
  'Sundsvall':   geo(17.31, 62.39),
  'Stockholm':   geo(18.07, 59.33),
  'Göteborg':    geo(11.97, 57.71),
  'Köpenhamn':   geo(12.57, 55.68),
  'Malmö':       geo(13.00, 55.61),
  'Hamburg':      geo(9.99, 53.55),
  'Berlin':      geo(13.40, 52.52),
  'München':     geo(11.58, 48.14),
  'Innsbruck':   geo(11.39, 47.26),
  'Zürich':      geo(8.54, 47.38),
  'Wien':        geo(16.37, 48.21),
  'Venedig':     geo(12.34, 45.44),
  'Milano':      geo(9.19, 45.46),
  'Bologna':     geo(11.34, 44.49),
  'Florens':     geo(11.25, 43.77),
  'Rom':         geo(12.50, 41.90),
  'Roma':        geo(12.50, 41.90),
  'Rome':        geo(12.50, 41.90),
  'Neapel':      geo(14.27, 40.85),
  'Paris':       geo(2.35, 48.86),
  'Prag':        geo(14.42, 50.08),
  'Frankfurt':   geo(8.68, 50.11),
};

// Decorative mountains at real positions
const MOUNTAINS = [
  { ...geo(14, 63.5), scale: 0.8, label: 'Skanderna' },
  { ...geo(13, 62), scale: 0.6 },
  { ...geo(12, 60.5), scale: 0.7 },
  { ...geo(8, 46.8), scale: 1.2, label: 'Alperna' },
  { ...geo(11.5, 47), scale: 1.0 },
  { ...geo(14, 47), scale: 0.8 },
  { ...geo(6.5, 46.5), scale: 0.9 },
];

const TREES = [
  { ...geo(18, 63), scale: 0.7 },
  { ...geo(20, 64), scale: 0.5 },
  { ...geo(16, 61), scale: 0.6 },
  { ...geo(15, 60), scale: 0.5 },
  { ...geo(16.5, 62.5), scale: 0.4 },
  { ...geo(10, 51), scale: 0.6 },
  { ...geo(14, 50.5), scale: 0.5 },
  { ...geo(20, 52), scale: 0.5 },
  { ...geo(11, 43.5), scale: 0.5 },
  { ...geo(13, 42.5), scale: 0.4 },
];

// ═══ LAND SHAPES ═══
// All defined as [longitude, latitude] arrays — every point verifiable on Google Maps
const LAND_SHAPES = {
  // Scandinavia — clockwise from NW (Norwegian coast) to NE (Swedish coast)
  scandinavia: geoPath([
    [13, 65],      // top-left (N Norway)
    [10.5, 63.4],  // outer Trondheim
    [7, 62.5],     // Ålesund
    [5, 61.6],     // Florø
    [5, 60.4],     // Bergen
    [5.7, 59],     // Stavanger
    [7.5, 58],     // south coast
    [8, 58.2],     // Kristiansand
    [10, 58.5],    // Arendal
    [10.7, 59.2],  // Fredrikstad/Oslo fjord
    [12, 57.7],    // Göteborg
    [12.7, 56],    // Helsingborg
    [13, 55.6],    // Malmö (south tip)
    [14.5, 55.5],  // Ystad
    [15.6, 56.2],  // Karlskrona
    [16.4, 56.7],  // Kalmar
    [16.6, 57.8],  // Västervik
    [18.2, 59.3],  // Stockholm
    [17.1, 60.7],  // Gävle
    [17.3, 62.4],  // Sundsvall
    [20.3, 63.8],  // Umeå
    [21, 65],      // top-right (N Sweden)
  ]),

  // Finland — western coast
  finland: geoPath([
    [24, 65],      // Tornio
    [25.5, 65],    // Oulu
    [28, 65],      // NE corner
    [28, 60],      // SE corner
    [25, 60.2],    // Helsinki
    [23, 59.8],    // Hanko
    [22.3, 60.5],  // Turku
    [21.5, 61.5],  // Rauma
    [21.6, 63.1],  // Vaasa
    [23.1, 63.8],  // Kokkola
    [24, 65],
  ]),

  // Jutland (Denmark mainland)
  jutland: geoPath([
    [8.1, 57.6],   // Skagen NW
    [8, 57],        // west coast
    [8.2, 56],      // Esbjerg
    [8.6, 55.5],    // SW
    [9.4, 55],      // south tip
    [9.8, 55.3],    // SE
    [10.2, 55.7],   // east coast
    [10.5, 56.5],   // Aarhus
    [10.6, 57.1],   // Randers
    [10.2, 57.7],   // Frederikshavn
    [9.5, 57.7],    // top
    [8.1, 57.6],
  ]),

  // Danish islands (Fyn + Sjælland) — Copenhagen inside
  danishIslands: geoPath([
    [10.5, 55.8],  // Fyn W
    [11, 55.2],    // Fyn S
    [12, 55],      // between
    [12.7, 55.7],  // Copenhagen
    [12.5, 56],    // Sjælland NE
    [11.8, 56.1],  // Sjælland NW
    [10.8, 55.9],  // Fyn NE
    [10.5, 55.8],
  ]),

  // Continental Europe — big mainland
  // North coast: Netherlands → Germany → Poland
  // South: French Riviera → Alps → Po Valley → Trieste
  continent: geoPath([
    [-3, 53],       // viewport left at NL latitude
    [4.8, 53],      // Den Helder
    [7, 53.4],      // Emden
    [8.6, 53.6],    // Bremerhaven
    [8.7, 53.9],    // Cuxhaven
    [10.1, 54.3],   // Kiel
    [12.1, 54.1],   // Rostock
    [13.1, 54.3],   // Stralsund
    [14.2, 53.9],   // Usedom
    [15.6, 54.2],   // Kołobrzeg
    [18.7, 54.4],   // Gdańsk
    [20.5, 54.7],   // Kaliningrad
    [28, 54.5],     // viewport right
    [28, 39],       // viewport right, south (below map)
    [13.8, 45.6],   // Trieste
    [12.3, 45.4],   // Venice
    [9.2, 45.5],    // Milano area
    [8.9, 44.4],    // Genoa (match Italy shape)
    [7.5, 43.8],    // Menton/French Riviera
    [7, 43.6],      // Nice
    [6, 43.1],      // Toulon
    [5.4, 43.3],    // Marseille
    [3.9, 43.6],    // Montpellier
    [3, 43.3],      // Narbonne
    [3, 42.4],      // Spanish border
    [-3, 42.4],     // viewport left
  ]),

  // Italy — THE BOOT
  // clockwise from NW (Genoa) through Po Valley to Trieste,
  // down Adriatic to heel, around toe, up Tyrrhenian back to Genoa
  italy: geoPath([
    [7.5, 43.8],    // French border / Menton
    [8.9, 44.4],    // Genoa
    [9.2, 45.5],    // Milano (Po Valley)
    [11, 45.5],     // Verona area
    [12.3, 45.4],   // Venice
    [13.8, 45.6],   // Trieste
    // Adriatic coast south
    [13.5, 44.9],   // south of Venice lagoon
    [12.6, 44.1],   // Rimini
    [13.5, 43.6],   // Ancona
    [14.2, 42.5],   // Pescara
    [16, 41.7],     // Gargano (spur)
    [16.9, 41.1],   // Bari
    [18, 40.6],     // Brindisi
    [18.5, 39.8],   // HEEL (S.M. di Leuca)
    // Gulf of Taranto (instep)
    [17.2, 40.5],   // Taranto
    [16.5, 39.1],   // Crotone
    // Toe
    [15.6, 38.2],   // Reggio Calabria (toe tip)
    // Tyrrhenian coast north
    [15.9, 39.3],   // Paola
    [14.8, 40.6],   // Salerno
    [14.3, 40.9],   // Naples
    [13.6, 41.2],   // Gaeta
    [12.3, 41.8],   // Rome coast
    [11.8, 42.1],   // Civitavecchia
    [10.5, 42.9],   // Piombino
    [10.3, 43.6],   // Livorno
    [9.8, 44.1],    // La Spezia
    [8.9, 44.4],    // Genoa (close)
  ]),

  // Sicily
  sicily: geoPath([
    [13.2, 38.2], [15.1, 37.5], [15.6, 38], [15.3, 38.3],
    [13.4, 38.5], [12.4, 38], [13.2, 38.2],
  ]),

  // Sardinia
  sardinia: geoPath([
    [8.2, 41.2], [9.7, 41], [9.8, 39.2], [9.5, 39],
    [8.2, 39.1], [8.1, 40], [8.2, 41.2],
  ]),

  // Corsica
  corsica: geoPath([
    [8.6, 43], [9.5, 42.9], [9.6, 41.5], [9, 41.4],
    [8.5, 41.9], [8.6, 43],
  ]),

  // Balkans — east side of Adriatic
  balkans: geoPath([
    [13.8, 45.6],   // Trieste
    [14.4, 45.3],   // Rijeka
    [15.2, 44.1],   // Zadar
    [16.4, 43.5],   // Split
    [17, 43.3],     // Makarska
    [18.1, 42.6],   // Dubrovnik
    [19.5, 41.3],   // Albania
    [20, 39.5],     // S Albania
    [28, 39.5],     // viewport right
    [28, 39],       // viewport bottom right
    [13.8, 45.6],
  ]),
};

// ═══ COUNTRY BORDERS ═══
// Each border is a line of [lon, lat] waypoints
// Key tripoints (verified via Google Maps / Barry's Borderpoints):
//   CHDEFR (FR-DE-CH Basel):       7.59, 47.59
//   ATCHDE (AT-CH-DE Bodensee):    9.61, 47.53
//   ATCHIT (AT-CH-IT Piz Lad):     10.47, 46.85
//   CHFRIT (CH-FR-IT Mont Dolent): 7.04, 45.92
//   ATCZDE (AT-CZ-DE Bayerwald):   13.84, 48.77
//   ATCZSK (AT-CZ-SK Moravia):     16.95, 48.62
//   ATHUSK (AT-HU-SK Bratislava):  17.16, 48.01
//   ATHUSI (AT-HU-SI Szentgotthárd): 16.11, 46.87
//   ATITSI (AT-IT-SI Arnoldstein): 13.71, 46.52
//   CZDEPL (CZ-DE-PL Zittau):     14.82, 50.87
//   CZPLSK (CZ-PL-SK Beskydy):    18.85, 49.52
//   BEDENL (BE-DE-NL Vaalserberg): 6.02, 50.75
//   BEDELU (BE-DE-LU):             6.14, 50.13
//   HRHUSI (HR-HU-SI):             16.60, 46.47
//   HRHURS (HR-HU-RS):             18.89, 45.92
const COUNTRY_BORDERS = [
  // Norway-Sweden (mountain ridge)
  geoLine([[14.5, 65], [14, 63.5], [13.5, 62], [12.5, 61], [12, 60], [12, 59.3], [11.5, 59]]),
  // Sweden-Finland (Torne river)
  geoLine([[23.5, 65.8], [24, 65.5], [24.2, 65]]),
  // Denmark-Germany (~54.8°N across Jutland)
  geoLine([[8.6, 54.9], [9, 54.8], [9.5, 54.8], [10, 54.9]]),
  // Germany-Netherlands (coast to BEDENL tripoint)
  geoLine([[6, 53.5], [7, 53.3], [7, 52.4], [6.2, 51.9], [6.02, 50.75]]),
  // Netherlands-Belgium (coast to BEDENL tripoint)
  geoLine([[3.4, 51.4], [4, 51.4], [4.3, 51.3], [5, 51.3], [5.7, 51.2], [6.02, 50.75]]),
  // Belgium-France
  geoLine([[2.5, 51.1], [3, 50.5], [4, 50], [4.2, 49.9], [4.9, 49.8], [5.4, 49.5]]),
  // Belgium-Germany / Luxembourg (BEDENL → BEDELU → France-Germany line)
  geoLine([[6.02, 50.75], [6.1, 50.5], [6.14, 50.13], [6.1, 49.8], [6, 49.4]]),
  // Germany-Poland (Oder-Neisse → CZDEPL tripoint)
  geoLine([[14.2, 53.9], [14.3, 53.4], [14.5, 52.3], [14.6, 51.9], [14.7, 51.1], [14.82, 50.87]]),
  // Germany-Czech Republic (CZDEPL → ATCZDE tripoint)
  geoLine([[14.82, 50.87], [14.3, 50.7], [13.8, 50.6], [13, 50.5], [12.5, 50.3], [12.1, 49.8], [12.1, 49.1], [13.84, 48.77]]),
  // France-Germany (Rhine → CHDEFR Basel tripoint)
  geoLine([[-2, 49.5], [2.5, 49.5], [6, 49.4], [7, 49], [7.5, 48.5], [7.6, 48], [7.59, 47.59]]),
  // Germany-Switzerland (CHDEFR → ATCHDE Bodensee tripoint)
  geoLine([[7.59, 47.59], [8.5, 47.6], [9.5, 47.5], [9.61, 47.53]]),
  // France-Switzerland (CHDEFR → CHFRIT Mont Dolent tripoint)
  geoLine([[7.59, 47.59], [6.8, 47.4], [6.2, 46.9], [6, 46.4], [7.04, 45.92]]),
  // Switzerland-Italy (CHFRIT → ATCHIT tripoint)
  geoLine([[7.04, 45.92], [7.5, 46], [8.2, 46.2], [9, 46.5], [10, 46.5], [10.47, 46.85]]),
  // Germany-Austria (ATCHDE → ATCZDE tripoint)
  geoLine([[9.61, 47.53], [10.5, 47.3], [11, 47.4], [12, 47.6], [13, 47.8], [13.84, 48.77]]),
  // Czech Republic-Austria (ATCZDE → ATCZSK tripoint)
  geoLine([[13.84, 48.77], [14.6, 48.6], [15.5, 49], [16.95, 48.62]]),
  // Czech Republic-Slovakia (ATCZSK → CZPLSK tripoint)
  geoLine([[16.95, 48.62], [17.2, 49], [17.7, 48.9], [18.2, 49.1], [18.85, 49.52]]),
  // Czech Republic-Poland (CZDEPL → CZPLSK tripoint)
  geoLine([[14.82, 50.87], [15.5, 50.8], [16, 50.6], [16.9, 50.3], [17.5, 50.3], [18.2, 49.9], [18.85, 49.52]]),
  // Slovakia-Poland (CZPLSK → east)
  geoLine([[18.85, 49.52], [19.5, 49.6], [20, 49.4], [20.5, 49.3], [22, 49]]),
  // Austria-Slovakia (ATCZSK → ATHUSK Bratislava tripoint)
  geoLine([[16.95, 48.62], [17.1, 48.1], [17.16, 48.01]]),
  // Austria-Hungary (ATHUSK → ATHUSI tripoint)
  geoLine([[17.16, 48.01], [17, 47.7], [16.5, 47.5], [16.4, 47], [16.11, 46.87]]),
  // Hungary-Slovakia (ATHUSK → east along Danube)
  geoLine([[17.16, 48.01], [18.7, 47.8], [19, 48.1], [20.1, 48.4], [21, 48.5], [22, 48.4]]),
  // Hungary-Slovenia (ATHUSI → HRHUSI tripoint, short ~100km border)
  geoLine([[16.11, 46.87], [16.3, 46.7], [16.60, 46.47]]),
  // Hungary-Croatia (HRHUSI → along Drava river → HRHURS tripoint)
  geoLine([[16.60, 46.47], [17, 46.1], [17.5, 45.9], [18, 45.8], [18.5, 45.8], [18.89, 45.92]]),
  // Hungary-Serbia (HRHURS → east)
  geoLine([[18.89, 45.92], [19.1, 46.2], [20, 46.2], [21, 46.1], [22, 46.1]]),
  // Slovenia-Croatia (coast at Dragonja → Kolpa river → curves NE → HRHUSI)
  geoLine([[13.6, 45.47], [14.2, 45.5], [14.8, 45.5], [15.3, 45.45], [15.6, 45.6], [15.8, 45.8], [16.1, 46.1], [16.60, 46.47]]),
  // Croatia-Bosnia (NW inland: Karlovac area → along Una river → Sava → HRHURS)
  geoLine([[15.6, 45.6], [15.8, 45.3], [16, 45.1], [16.5, 45], [17.3, 45.2], [18, 45], [18.5, 45], [19, 44.9], [18.89, 45.92]]),
  // Croatia-Bosnia (southern border: inland down to coast near Split)
  geoLine([[15.8, 45.3], [15.5, 44.8], [15.8, 44.2], [16.2, 43.8], [16.4, 43.5]]),
  // Croatia-Bosnia (eastern segment: coast at Neum → inland → east to Serbia)
  geoLine([[17.4, 43.1], [17.8, 43.3], [18.2, 43.5], [18.5, 43.7], [19, 44.9]]),
  // Bosnia-Montenegro (south border)
  geoLine([[18.5, 43.7], [18.5, 42.9]]),
  // Montenegro-Albania
  geoLine([[18.5, 42.9], [19.4, 42.5], [19.5, 42], [19.8, 41.7], [19.5, 41.3]]),
  // Montenegro-Croatia (coast near Dubrovnik → Montenegro border)
  geoLine([[18.1, 42.6], [18.5, 42.9]]),
  // Austria-Slovenia (ATITSI → ATHUSI tripoint)
  geoLine([[13.71, 46.52], [14.5, 46.4], [15.1, 46.7], [16.11, 46.87]]),
  // Austria-Italy (ATCHIT → ATITSI tripoint)
  geoLine([[10.47, 46.85], [11.5, 47], [12.3, 46.8], [13, 46.6], [13.71, 46.52]]),
  // Italy-Slovenia (ATITSI → coast near Trieste)
  geoLine([[13.71, 46.52], [13.8, 46.2], [13.7, 45.8], [13.6, 45.5]]),
  // France-Italy (CHFRIT → Riviera coast)
  geoLine([[7.04, 45.92], [6.9, 45.5], [6.6, 45.1], [7, 44.1], [7.5, 43.8]]),
];

// ═══ SEA & COUNTRY LABELS ═══
const SEA_LABELS = [
  // Gulf of Bothnia — centered between Sweden and Finland
  { ...geo(20.5, 62.5), text: 'Bottniska viken', fontSize: 11, rotate: -80 },
  // Baltic Sea — between Sweden and Poland/Baltics
  { ...geo(18, 57), text: 'Östersjön', fontSize: 13, rotate: -55 },
  // North Sea — west of Denmark/Norway
  { ...geo(3, 56), text: 'Nordsjön', fontSize: 12, rotate: 0 },
  // Adriatic Sea — centered between Italy and Croatia
  { ...geo(16.5, 42.5), text: 'Adriatiska havet', fontSize: 10, rotate: -70 },
  // Western Mediterranean — south of France, west of Italy
  { ...geo(5, 41), text: 'Medelhavet', fontSize: 11, rotate: 0 },
  // Central Mediterranean — south of Sicily
  { ...geo(13, 37), text: 'Medelhavet', fontSize: 14, rotate: 0 },
];

const COUNTRY_LABELS = [
  { ...geo(15, 61.5), text: 'Sverige', fontSize: 20 },
  { ...geo(26, 63), text: 'Finland', fontSize: 12 },
  { ...geo(10, 55.8), text: 'Danmark', fontSize: 10 },
  { ...geo(5, 52.2), text: 'Nederländerna', fontSize: 7 },
  { ...geo(4.5, 50.7), text: 'Belgien', fontSize: 8 },
  { ...geo(6, 51.5), text: 'Tyskland', fontSize: 18 },
  { ...geo(2, 47), text: 'Frankrike', fontSize: 14 },
  { ...geo(20, 51.5), text: 'Polen', fontSize: 14 },
  { ...geo(15.5, 49.8), text: 'Tjeckien', fontSize: 10 },
  { ...geo(19.5, 48.7), text: 'Slovakien', fontSize: 9 },
  { ...geo(19.5, 47), text: 'Ungern', fontSize: 11 },
  { ...geo(14.5, 46.1), text: 'Slovenien', fontSize: 8 },
  { ...geo(16.5, 45.3), text: 'Kroatien', fontSize: 9 },
  { ...geo(17.7, 44.2), text: 'Bosnien', fontSize: 9 },
  { ...geo(19.2, 42.5), text: 'Montenegro', fontSize: 7 },
  { ...geo(20, 41), text: 'Albanien', fontSize: 8 },
  { ...geo(16.3, 47.5), text: 'Österrike', fontSize: 12 },
  { ...geo(8, 47), text: 'Schweiz', fontSize: 10 },
  { ...geo(10, 43), text: 'Italien', fontSize: 18 },
];

const CLOUDS = [
  { x: 100, y: 30, scale: 1 },
  { x: 600, y: 70, scale: 0.8 },
  { x: 350, y: 10, scale: 0.6 },
  { x: 500, y: 450, scale: 0.7 },
  { x: 120, y: 700, scale: 0.9 },
];

function getCityPosition(name: string, index: number, total: number): { x: number; y: number } {
  const normalized = name.trim();
  if (KNOWN_CITIES[normalized]) return KNOWN_CITIES[normalized];
  const t = total > 1 ? index / (total - 1) : 0.5;
  return { x: 300 + Math.sin(t * 3) * 80, y: 80 + t * 950 };
}

function Mountain({ x, y, scale = 1, label }: { x: number; y: number; scale?: number; label?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <polygon points="0,-40 -35,20 35,20" fill="#8B9DC3" stroke="#5B6F8E" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="0,-40 -12,-10 12,-10" fill="white" stroke="#B0BFD4" strokeWidth="1" strokeLinejoin="round" />
      <polygon points="25,-15 5,20 45,20" fill="#9BADC4" stroke="#5B6F8E" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="25,-15 18,-2 32,-2" fill="white" strokeWidth="0" />
      {label && <text x="0" y="35" textAnchor="middle" fontSize="11" fill="#5B6F8E" fontWeight="bold" fontStyle="italic">{label}</text>}
    </g>
  );
}

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <rect x="-3" y="5" width="6" height="12" fill="#8B6914" rx="1" />
      <polygon points="0,-15 -12,5 12,5" fill="#2D8B46" stroke="#1A6B30" strokeWidth="1" />
      <polygon points="0,-22 -9,-3 9,-3" fill="#3DA55D" stroke="#2D8B46" strokeWidth="1" />
    </g>
  );
}

function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity="0.5">
      <ellipse cx="0" cy="0" rx="30" ry="12" fill="white" />
      <ellipse cx="-15" cy="-5" rx="18" ry="10" fill="white" />
      <ellipse cx="15" cy="-3" rx="20" ry="11" fill="white" />
    </g>
  );
}

function Geography() {
  return (
    <g>
      {/* Ocean background */}
      <rect width="700" height="1150" fill="#B0D9EC" />

      {/* Land masses — fill all shapes */}
      {Object.entries(LAND_SHAPES).map(([key, d]) => {
        const hasNaturalCoast = !['continent', 'balkans'].includes(key);
        return (
          <g key={key}>
            {hasNaturalCoast && <path d={d} fill="#D6E8C8" filter="url(#landBlur)" />}
            <path d={d} fill="url(#landGrad)" />
          </g>
        );
      })}

      {/* Subtle coastline strokes — only for shapes with natural coastlines */}
      {(['scandinavia', 'finland', 'jutland', 'danishIslands', 'italy', 'sicily', 'sardinia', 'corsica'] as (keyof typeof LAND_SHAPES)[]).map((key) => (
        <path key={`coast-${key}`} d={LAND_SHAPES[key]} fill="none" stroke="#8CB878" strokeWidth="1" opacity="0.4" />
      ))}

      {/* Wave decorations */}
      {[
        'M590,60 q10,-4 20,0 q10,4 20,0',
        'M600,150 q8,-3 16,0 q8,3 16,0',
        'M530,340 q10,-4 20,0 q10,4 20,0',
        'M130,400 q10,-4 20,0 q10,4 20,0',
        'M160,450 q8,-3 16,0 q8,3 16,0',
        'M440,930 q10,-4 20,0 q10,4 20,0',
        'M90,960 q12,-4 24,0 q12,4 24,0',
        'M340,1130 q12,-4 24,0 q12,4 24,0',
      ].map((d, i) => (
        <path key={`wave-${i}`} d={d} fill="none" stroke="#7CBAD4" strokeWidth="1.2" opacity="0.35" />
      ))}

      {/* Sea labels */}
      {SEA_LABELS.map((label, i) => (
        <text
          key={i}
          x={label.x}
          y={label.y}
          fontSize={label.fontSize}
          fill="#4A8BA8"
          fontStyle="italic"
          opacity="0.55"
          textAnchor="middle"
          transform={label.rotate ? `rotate(${label.rotate},${label.x},${label.y})` : undefined}
        >
          {label.text}
        </text>
      ))}

      {/* Country borders */}
      {COUNTRY_BORDERS.map((d, i) => (
        <g key={`border-${i}`}>
          <path d={d} fill="none" stroke="#A0B0A0" strokeWidth="3" opacity="0.12" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="#7A8A7A" strokeWidth="1.2" opacity="0.35" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8,5" />
        </g>
      ))}

    </g>
  );
}

function CityMarker({ x, y, name, reached, isGoal, isStart, description }: {
  x: number; y: number; name: string; reached: boolean; isGoal?: boolean; isStart?: boolean; description?: string;
}) {
  const color = reached ? '#FFD700' : '#B0B0B0';
  const textColor = reached ? '#333' : '#888';

  if (isGoal) {
    return (
      <g transform={`translate(${x},${y})`} className={reached ? 'animate-pulse-glow' : ''}>
        <polygon
          points="0,-22 6,-8 20,-8 9,2 13,18 0,10 -13,18 -9,2 -20,-8 -6,-8"
          fill={reached ? '#FFD700' : '#D4D4D4'}
          stroke={reached ? '#DAA520' : '#999'}
          strokeWidth="2"
        />
        <text x="0" y="35" textAnchor="middle" fontSize="14" fontWeight="bold" fill={textColor}>
          {name} ⭐
        </text>
        {description && (
          <text x="0" y="48" textAnchor="middle" fontSize="9" fill="#666">{description}</text>
        )}
      </g>
    );
  }

  if (isStart) {
    return (
      <g transform={`translate(${x},${y})`}>
        <polygon points="0,-18 -14,0 14,0" fill="#FF6B6B" stroke="#CC5555" strokeWidth="1.5" />
        <rect x="-10" y="0" width="20" height="16" fill="#FFAA80" stroke="#CC8866" strokeWidth="1.5" rx="2" />
        <rect x="-4" y="6" width="8" height="10" fill="#8B6914" rx="1" />
        <text x="0" y="32" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#CC5555">
          {name}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <line x1="0" y1="-20" x2="0" y2="10" stroke={reached ? '#DAA520' : '#999'} strokeWidth="2.5" />
      <polygon points="0,-20 18,-14 0,-8" fill={color} stroke={reached ? '#DAA520' : '#999'} strokeWidth="1.5" />
      <circle cx="0" cy="10" r="4" fill={color} stroke={reached ? '#DAA520' : '#999'} strokeWidth="1.5" />
      <text x="22" y="-10" fontSize="11" fontWeight="bold" fill={textColor}>{name}</text>
      {description && (
        <text x="22" y="2" fontSize="9" fill="#888">{description}</text>
      )}
    </g>
  );
}
function BusIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 15},${y - 10})`} className="animate-bounce-gentle">
      <rect x="0" y="0" width="30" height="18" rx="5" fill="#FF6B6B" stroke="#CC4444" strokeWidth="1.5" />
      <rect x="4" y="3" width="8" height="7" rx="2" fill="#87CEEB" stroke="#5BA3C9" strokeWidth="1" />
      <rect x="15" y="3" width="8" height="7" rx="2" fill="#87CEEB" stroke="#5BA3C9" strokeWidth="1" />
      <circle cx="7" cy="20" r="3.5" fill="#333" stroke="#555" strokeWidth="1" />
      <circle cx="23" cy="20" r="3.5" fill="#333" stroke="#555" strokeWidth="1" />
      <circle cx="7" cy="20" r="1.5" fill="#999" />
      <circle cx="23" cy="20" r="1.5" fill="#999" />
    </g>
  );
}

export default function TripMap() {
  const [config, setConfig] = useState<TripConfig | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      fetch('/api/trip')
        .then(res => res.json())
        .then(data => {
          setConfig(data.config);
          setMilestones(data.milestones || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const positions = useMemo(() => {
    if (!milestones.length) return [];
    return milestones.map((m, i) => ({
      ...m,
      pos: getCityPosition(m.name, i, milestones.length),
    }));
  }, [milestones]);

  const startPositions = useMemo(() => {
    if (!config) return [];
    return config.start_cities.map(city => ({
      name: city,
      pos: getCityPosition(city, 0, 1),
    }));
  }, [config]);

  const roadPath = useMemo(() => {
    if (!positions.length) return '';
    const pts = positions.map(p => p.pos);
    if (pts.length < 2) return `M${pts[0].x},${pts[0].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx1 = prev.x + (Math.random() * 0.2 - 0.1) * 40 + 20;
      const cpy1 = prev.y + (curr.y - prev.y) * 0.4;
      const cpx2 = curr.x - (Math.random() * 0.2 - 0.1) * 40 - 20;
      const cpy2 = prev.y + (curr.y - prev.y) * 0.6;
      d += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${curr.x},${curr.y}`;
    }
    return d;
  }, [positions]);

  const umeaPath = useMemo(() => {
    if (!positions.length) return '';
    const umea = getCityPosition('Umeå', 0, 1);
    const first = positions[0].pos;
    return `M${umea.x},${umea.y} C${umea.x},${umea.y + 30} ${first.x + 20},${first.y - 30} ${first.x},${first.y}`;
  }, [positions]);

  const { progressPathLength, busPosition } = useMemo(() => {
    if (!config || !positions.length) return { progressPathLength: 0, busPosition: { x: 0, y: 0 } };
    let busPos = positions[0].pos;
    // Find which segment the bus is on based on cost
    let reachedSegment = 0;
    let segFrac = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      const currCost = positions[i].cost;
      const nextCost = positions[i + 1].cost;
      if (config.current_amount >= nextCost) {
        reachedSegment = i + 1;
        busPos = positions[i + 1].pos;
      } else if (config.current_amount >= currCost) {
        reachedSegment = i;
        segFrac = (config.current_amount - currCost) / (nextCost - currCost);
        busPos = {
          x: positions[i].pos.x + (positions[i + 1].pos.x - positions[i].pos.x) * segFrac,
          y: positions[i].pos.y + (positions[i + 1].pos.y - positions[i].pos.y) * segFrac,
        };
        break;
      }
    }
    // Calculate actual path distance up to bus position
    const dist = (a: {x:number;y:number}, b: {x:number;y:number}) =>
      Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    let reachedDist = 0;
    let totalDist = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      const segLen = dist(positions[i].pos, positions[i + 1].pos);
      totalDist += segLen;
      if (i < reachedSegment) {
        reachedDist += segLen;
      } else if (i === reachedSegment && config.current_amount < (positions[i + 1]?.cost ?? Infinity)) {
        reachedDist += segLen * segFrac;
      }
    }
    return { progressPathLength: totalDist > 0 ? reachedDist / totalDist : 0, busPosition: busPos };
  }, [config, positions]);

  const roadRef = useRef<SVGPathElement>(null);
  const [realPathLength, setRealPathLength] = useState(0);
  const [busPosOnPath, setBusPosOnPath] = useState<{ x: number; y: number } | null>(null);
  const roadRefCallback = useCallback((node: SVGPathElement | null) => {
    roadRef.current = node;
    if (node) {
      const total = node.getTotalLength();
      setRealPathLength(total);
      if (progressPathLength > 0 && total > 0) {
        const pt = node.getPointAtLength(progressPathLength * total);
        setBusPosOnPath({ x: pt.x, y: pt.y });
      } else {
        setBusPosOnPath(null);
      }
    }
  }, [roadPath, progressPathLength]);

  // Update bus position when progress changes and road ref exists
  useEffect(() => {
    if (roadRef.current && progressPathLength > 0) {
      const total = roadRef.current.getTotalLength();
      const pt = roadRef.current.getPointAtLength(progressPathLength * total);
      setBusPosOnPath({ x: pt.x, y: pt.y });
    } else {
      setBusPosOnPath(null);
    }
  }, [progressPathLength]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-teal-600 animate-bounce">Loading trip map...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">No trip configured yet. Visit /admin to set up.</div>
      </div>
    );
  }

  const percentage = Math.round(Math.min(config.current_amount / config.total_cost, 1) * 100);

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-1 text-center">
        <span>🚌</span> <span className="bg-gradient-to-r from-sky-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">Tripit</span>
      </h1>
      <p className="text-base text-gray-500 mb-4">
        From {config.start_cities.join(' & ')} to {config.goal_city}
      </p>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 items-start justify-center">
      <div className="w-full lg:w-2/3 max-w-2xl rounded-2xl overflow-hidden shadow-lg">
        <svg viewBox="0 0 700 1150" className="w-full h-auto">
          <defs>
            <linearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D4E7C5" />
              <stop offset="40%" stopColor="#E2EED5" />
              <stop offset="100%" stopColor="#EDE8D0" />
            </linearGradient>
            <linearGradient id="roadReached" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <filter id="landBlur" x="-3%" y="-3%" width="106%" height="106%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          <Geography />

          {MOUNTAINS.map((m, i) => <Mountain key={i} {...m} />)}
          {TREES.map((t, i) => <Tree key={i} {...t} />)}
          {CLOUDS.map((c, i) => <Cloud key={i} {...c} />)}

          {/* Country labels — rendered on top of decorations for readability */}
          {COUNTRY_LABELS.map((label, i) => (
            <text key={`cl-${i}`} x={label.x} y={label.y} fontSize={label.fontSize} fontWeight="bold" fontStyle="italic" textAnchor="middle" stroke="white" strokeWidth="3" paintOrder="stroke" fill="#4A6A4A" opacity="0.7">
              {label.text}
            </text>
          ))}

          {roadPath && (
            <path d={roadPath} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {umeaPath && (
            <>
              <path d={umeaPath} fill="none" stroke="#C4A87C" strokeWidth="8" strokeLinecap="round" />
              <path d={umeaPath} fill="none" stroke="white" strokeWidth="2" strokeDasharray="8,8" opacity="0.6" className="animate-dash" />
            </>
          )}

          {roadPath && (
            <>
              <path ref={roadRefCallback} d={roadPath} fill="none" stroke="#C4A87C" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d={roadPath} fill="none" stroke="white" strokeWidth="2" strokeDasharray="8,8" opacity="0.5" className="animate-dash" />
            </>
          )}

          {roadPath && progressPathLength > 0 && realPathLength > 0 && (
            <path d={roadPath} fill="none" stroke="url(#roadReached)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${progressPathLength * realPathLength}, ${realPathLength}`} opacity="0.8" />
          )}

          {startPositions.map((s, i) => (
            <CityMarker key={`start-${i}`} x={s.pos.x} y={s.pos.y} name={s.name} reached={true} isStart={true} />
          ))}

          {positions.filter(m => !config.start_cities.includes(m.name)).map((m, i, arr) => (
            <CityMarker key={m.id || i} x={m.pos.x} y={m.pos.y} name={m.name} reached={config.current_amount >= m.cost} isGoal={i === arr.length - 1} description={m.description} />
          ))}

          {config && config.current_amount > 0 && busPosOnPath && <BusIcon x={busPosOnPath.x} y={busPosOnPath.y} />}
        </svg>
      </div>

      <div className="w-full lg:w-1/3 lg:sticky lg:top-4">
        <div className="p-4">
          <h2 className="text-xl font-bold text-teal-600 mb-1">📍 Milestones</h2>
          <p className="text-sm text-gray-400 mb-3">{config.current_amount.toLocaleString()} / {config.total_cost.toLocaleString()} kr ({percentage}%)</p>
          <div className="space-y-2">
            {positions.map((m, i) => {
              const reached = config.current_amount >= m.cost;
              return (
                <div key={m.id || i} className={`flex items-center gap-2 p-2 rounded-xl border-2 ${reached ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="text-lg">{reached ? '✅' : '⬜'}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm ${reached ? 'text-green-700' : 'text-gray-500'}`}>{m.name}</div>
                    {m.description && <div className="text-xs text-gray-400 truncate">{m.description}</div>}
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap ${reached ? 'text-green-600' : 'text-gray-400'}`}>{m.cost.toLocaleString()} kr</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
