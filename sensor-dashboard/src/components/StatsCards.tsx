import React from 'react';

interface StatsCardsProps {
  metric: string;
  data: { [key: string]: any }[];
}

function getStats(data: { [key: string]: any }[], metric: string) {
  if (!data.length) return { min: '-', max: '-', avg: '-', latest: '-' };
  const values = data.map((d) => d[metric]).filter((v) => typeof v === 'number');
  if (!values.length) return { min: '-', max: '-', avg: '-', latest: '-' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
  const latest = values[0];
  return { min, max, avg, latest };
}

const metricLabels: Record<string, string> = {
  temperature: 'Temperature (°C)',
  humidity: 'Humidity (%)',
  pressure: 'Pressure (hPa)',
  air_quality: 'Air Quality',
};

export default function StatsCards({ metric, data }: StatsCardsProps) {
  const stats = getStats(data, metric);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 w-full max-w-2xl">
      <div className="bg-white rounded shadow p-4 text-center">
        <div className="text-xs text-gray-500 mb-1">Min</div>
        <div className="text-lg font-bold">{stats.min}</div>
      </div>
      <div className="bg-white rounded shadow p-4 text-center">
        <div className="text-xs text-gray-500 mb-1">Max</div>
        <div className="text-lg font-bold">{stats.max}</div>
      </div>
      <div className="bg-white rounded shadow p-4 text-center">
        <div className="text-xs text-gray-500 mb-1">Avg</div>
        <div className="text-lg font-bold">{stats.avg}</div>
      </div>
      <div className="bg-white rounded shadow p-4 text-center">
        <div className="text-xs text-gray-500 mb-1">Latest</div>
        <div className="text-lg font-bold">{stats.latest}</div>
      </div>
    </div>
  );
} 