import * as React from 'react';
import { Map, Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { FeatureCollection, Point } from 'geojson';
import type { HeatmapLayer } from 'mapbox-gl';
import { useState, useRef } from 'react';

interface HeatMapProps {
  data: { latitude: number; longitude: number; [key: string]: any }[];
  metric: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

function getColor(value: number, min: number, max: number) {
  // Simple blue-green-yellow-red scale
  const percent = (value - min) / (max - min + 0.0001);
  if (percent < 0.25) return '#2b83ba'; // blue
  if (percent < 0.5) return '#abdda4'; // green
  if (percent < 0.75) return '#ffffbf'; // yellow
  return '#d7191c'; // red
}

// Choose color ramp based on metric
function getHeatmapColorRamp(metric: string) {
  if (metric === 'air_quality') {
    // Fixed scale: 0 (good, green), 50 (yellow), 100 (bad, red)
    return [
      'interpolate', ['linear'], ['get', 'value'],
      0, 'rgba(43,131,186,0)',
      10, '#abdda4', // green
      50, '#ffffbf', // yellow
      100, '#d7191c'  // red
    ];
  }
  // Default: blue (low) to green to yellow to red (high)
  return [
    'interpolate', ['linear'], ['heatmap-density'],
    0, 'rgba(43,131,186,0)',
    0.2, '#2b83ba', // blue
    0.4, '#abdda4', // green
    0.6, '#ffffbf', // yellow
    0.8, '#d7191c'  // red
  ];
}

// Continuous blue-yellow-red color scale for temperature
function getTemperatureColor(value: number) {
  // Clamp value to -30 to 40
  const min = -30, max = 40;
  const v = Math.max(min, Math.min(max, value));
  // Normalize to 0-1
  const t = (v - min) / (max - min);
  // Color stops: blue (-30), cyan, green, yellow, orange, red (40)
  const stops = [
    { t: 0.0, color: [49, 54, 149] },   // deep blue
    { t: 0.17, color: [69, 117, 180] }, // blue
    { t: 0.33, color: [116, 173, 209] },// cyan
    { t: 0.5, color: [171, 221, 164] }, // green
    { t: 0.67, color: [253, 231, 37] }, // yellow
    { t: 0.83, color: [244, 109, 67] }, // orange
    { t: 1.0, color: [165, 0, 38] }     // red
  ];
  // Find two stops
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].t) {
      const prev = stops[i - 1], next = stops[i];
      const localT = (t - prev.t) / (next.t - prev.t);
      const color = prev.color.map((c, j) => Math.round(c + (next.color[j] - c) * localT));
      return `rgb(${color[0]},${color[1]},${color[2]})`;
    }
  }
  return 'rgb(165,0,38)'; // fallback red
}

// Value-to-color function for each metric
function getColorForValue(metric: string, value: number) {
  if (metric === 'temperature') {
    return getTemperatureColor(value);
  }
  if (metric === 'air_quality') {
    if (value <= 50) return '#43a047'; // green
    if (value <= 100) return '#ffee58'; // yellow
    return '#d32f2f'; // red
  }
  if (metric === 'humidity') {
    if (value <= 30) return '#2b83ba'; // blue
    if (value <= 60) return '#abdda4'; // green
    return '#d7191c'; // red
  }
  if (metric === 'pressure') {
    if (value <= 1013) return '#2b83ba'; // blue
    if (value <= 1025) return '#abdda4'; // green
    return '#d7191c'; // red
  }
  return '#888';
}

export default function HeatMap({ data, metric }: HeatMapProps) {
  const [hovered, setHovered] = useState<null | { screenX: number; screenY: number; value: number; time: string }>(null);
  const mapRef = useRef<any>(null);

  // Debug: log first 3 data points and metric
  React.useEffect(() => {
    console.log('HeatMap debug:', { metric, data: data.slice(0, 3) });
    data.slice(0, 3).forEach((d, i) => {
      if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number' || typeof d[metric] !== 'number') {
        console.warn(`Row ${i} missing or invalid lat/lng/metric:`, d);
      }
    });
  }, [data, metric]);

  const values = data.map((d) => d[metric]).filter((v) => typeof v === 'number');
  let min: number, max: number;
  if (!values.length) {
    min = 0;
    max = 1;
  } else {
    min = Math.min(...values);
    max = Math.max(...values);
    if (min === max) {
      min = min - 1;
      max = max + 1;
    }
  }
  const center = data.length
    ? [
        data.reduce((sum, d) => sum + d.longitude, 0) / data.length,
        data.reduce((sum, d) => sum + d.latitude, 0) / data.length,
      ]
    : [0, 0];

  // Heatmap weight mapping
  function getHeatmapWeightExpr(metric: string) {
    if (metric === 'air_quality') {
      // Invert: lower value (good) = low weight, higher value (bad) = high weight
      // Assume 0 (best) to 100+ (worst)
      return [
        'interpolate', ['linear'], ['get', 'value'],
        0, 0, // best air quality = low weight
        50, 0.5,
        100, 1 // worst air quality = high weight
      ];
    }
    // Default: higher value = higher weight
    return [
      'interpolate', ['linear'], ['get', 'value'],
      min, 0,
      max, 1
    ];
  }

  // Fixed color ramp for density
  const heatmapColorRamp: [string, ...any[]] = [
    'interpolate', ['linear'], ['heatmap-density'],
    0, 'rgba(43,131,186,0)',
    0.2, '#2b83ba',
    0.4, '#abdda4',
    0.6, '#ffffbf',
    0.8, '#d7191c'
  ];

  const geojson: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: data.map((d) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [d.longitude, d.latitude],
      },
      properties: {
        value: d[metric],
      },
    })),
  };

  const heatmapLayer: HeatmapLayer = {
    id: "heatmap",
    type: "heatmap",
    source: "sensor-points",
    maxzoom: 15,
    paint: {
      // "heatmap-weight": getHeatmapWeightExpr(metric),
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
      "heatmap-color": heatmapColorRamp as [string, ...any[]],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 15, 32],
      "heatmap-opacity": 0.7,
    },
  };

  console.log('HeatMap min:', min, 'max:', max, 'heatmapLayer:', heatmapLayer);
  // For debugging: set heatmap-weight to 1 if error persists
  // heatmapLayer.paint["heatmap-weight"] = 1;

  // Helper to get unit for metric
  function getMetricUnit(metric: string) {
    if (metric === 'temperature') return '°C';
    if (metric === 'humidity') return '%';
    if (metric === 'pressure') return 'hPa';
    return '';
  }

  // Helper to format time as HH:MM
  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="w-full h-[400px] rounded shadow overflow-hidden mb-8 bg-white relative">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: center[0], latitude: center[1], zoom: 13 }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="sensor-points" type="geojson" data={geojson}>
          {data.length > 0 && data.map((d, i) => (
            typeof d[metric] === 'number' && typeof d.latitude === 'number' && typeof d.longitude === 'number' ? (
              <Marker
                key={i}
                longitude={d.longitude}
                latitude={d.latitude}
                anchor="center"
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: getColorForValue(metric, d[metric]),
                    opacity: 0.5,
                    border: '2px solid white',
                    boxShadow: '0 0 8px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#222',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title={`${metric}: ${d[metric]}`}
                  onMouseEnter={e => {
                    if (mapRef.current) {
                      const mapbox = mapRef.current.getMap();
                      const { x, y } = mapbox.project([d.longitude, d.latitude]);
                      setHovered({
                        screenX: x,
                        screenY: y,
                        value: d[metric],
                        time: d.created_at,
                      });
                    }
                  }}
                  onMouseLeave={() => setHovered(null)}
                >
                </div>
              </Marker>
            ) : null
          ))}
        </Source>
      </Map>
      {hovered && (
        <div
          className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-xs text-gray-900 pointer-events-none font-semibold"
          style={{ left: hovered.screenX - 60, top: hovered.screenY - 50, minWidth: 120 }}
        >
          <div>{hovered.value} {getMetricUnit(metric)}</div>
          <div className="text-gray-500 font-mono">{formatTime(hovered.time)}</div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-2 text-xs">
        <span className="bg-[#2b83ba] px-2 py-1 rounded text-white">Low</span>
        <span className="bg-[#abdda4] px-2 py-1 rounded text-black">Med</span>
        <span className="bg-[#ffffbf] px-2 py-1 rounded text-black">High</span>
        <span className="bg-[#d7191c] px-2 py-1 rounded text-white">Max</span>
      </div>
      {/* Debug Panel */}
      <div className="bg-gray-100 text-xs p-2 mt-2 rounded shadow max-h-40 overflow-auto">
        <div><b>Debug:</b></div>
        <div><b>Metric:</b> {metric}</div>
        <div><b>Data (first 3):</b></div>
        <pre>{JSON.stringify(data.slice(0, 3), null, 2)}</pre>
      </div>
    </div>
  );
} 