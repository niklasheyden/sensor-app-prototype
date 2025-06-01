"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import MetricSelector from '../components/MetricSelector';
import StatsCards from '../components/StatsCards';
import HeatMap from '../components/HeatMap';
import { saveAs } from 'file-saver';
import TimeSeriesChart from '../components/TimeSeriesChart';
import SensorRadarChart from '../components/RadarChart';

interface SensorData {
  id: number;
  created_at: string;
  temperature: number;
  humidity: number;
  pressure: number;
  air_quality: number;
  latitude: number;
  longitude: number;
}

const DEFAULT_METRIC = 'temperature';

export default function Home() {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState(DEFAULT_METRIC);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        setError(error.message);
        setData([]);
      } else {
        setData(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Filter data by selected date and hour
  const filteredData = data.filter((row) => {
    if (!selectedDate) return true;
    const date = row.created_at.slice(0, 10);
    if (date !== selectedDate) return false;
    if (selectedHour === null || selectedHour === undefined) return true;
    const hour = new Date(row.created_at).getHours();
    return hour === selectedHour;
  });

  // Get available dates from data
  const availableDates = Array.from(new Set(data.map((row) => row.created_at.slice(0, 10))));

  // Helper to get unit for metric
  function getMetricUnit(metric: string) {
    if (metric === 'temperature') return '°C';
    if (metric === 'humidity') return '%';
    if (metric === 'pressure') return 'hPa';
    if (metric === 'air_quality') return 'IAQ';
    return '';
  }

  // Helper to download CSV
  function downloadCSV() {
    if (!filteredData.length) return;
    const headers = ['Time', 'Lat', 'Lng', 'Temp (°C)', 'Humidity (%)', 'Pressure (hPa)', 'Air Quality (IAQ)'];
    const rows = filteredData.map(row => [
      row.created_at,
      row.latitude,
      row.longitude,
      row.temperature,
      row.humidity,
      row.pressure,
      row.air_quality
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'sensor_data.csv');
  }

  return (
    <main className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-gray-900 tracking-tight">Sensor Data Dashboard</h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <MetricSelector selected={metric} onChange={setMetric} />
          {/* Date Picker */}
          <div className="flex gap-2 items-center">
            <label htmlFor="date-picker" className="font-semibold text-gray-700">Date:</label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              min={availableDates.length ? availableDates[availableDates.length - 1] : ''}
              max={availableDates.length ? availableDates[0] : ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-2 py-1 text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            />
            <button
              className="ml-2 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold"
              onClick={() => setSelectedDate('')}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
          {!loading && <HeatMap data={filteredData} metric={metric} />}
          {/* Time Slider */}
          <div className="my-4 flex flex-col items-center">
            <label htmlFor="hour-slider" className="font-semibold mb-1 text-gray-700">Hour: <span className="font-mono">{selectedHour}:00</span></label>
            <input
              id="hour-slider"
              type="range"
              min={0}
              max={23}
              value={selectedHour}
              onChange={(e) => setSelectedHour(Number(e.target.value))}
              className="w-full max-w-md accent-blue-600"
            />
            <button
              className="mt-2 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold"
              onClick={() => setSelectedHour(0)}
            >
              Reset Hour
            </button>
          </div>
        </div>

        {/* Charts and Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Line Graph */}
          <TimeSeriesChart data={filteredData} metric={metric} />
          {/* Radar Chart */}
          <SensorRadarChart data={filteredData} />
          {/* Stats Cards 2x2 Grid */}
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="grid grid-cols-2 gap-4 w-full max-w-xs h-[300px]">
              <div className="bg-white rounded-lg shadow p-6 text-center border border-gray-200 flex flex-col justify-center h-full">
                <div className="text-xs text-gray-500 mb-1">Min</div>
                <div className="text-2xl font-bold text-gray-900">
                  {filteredData.length ? Math.min(...filteredData.map(d => (d as any)[metric] ?? 0)).toFixed(2) : '-'}
                  <span className="text-base font-normal ml-1">{getMetricUnit(metric)}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center border border-gray-200 flex flex-col justify-center h-full">
                <div className="text-xs text-gray-500 mb-1">Max</div>
                <div className="text-2xl font-bold text-gray-900">
                  {filteredData.length ? Math.max(...filteredData.map(d => (d as any)[metric] ?? 0)).toFixed(2) : '-'}
                  <span className="text-base font-normal ml-1">{getMetricUnit(metric)}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center border border-gray-200 flex flex-col justify-center h-full">
                <div className="text-xs text-gray-500 mb-1">Avg</div>
                <div className="text-2xl font-bold text-gray-900">
                  {filteredData.length ? (filteredData.reduce((a, b) => a + ((b as any)[metric] ?? 0), 0) / filteredData.length).toFixed(2) : '-'}
                  <span className="text-base font-normal ml-1">{getMetricUnit(metric)}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center border border-gray-200 flex flex-col justify-center h-full">
                <div className="text-xs text-gray-500 mb-1">Latest</div>
                <div className="text-2xl font-bold text-gray-900">
                  {filteredData.length ? ((filteredData[0] as any)[metric] ?? 0).toFixed(2) : '-'}
                  <span className="text-base font-normal ml-1">{getMetricUnit(metric)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto mt-8">
          <table className="min-w-full border bg-white rounded shadow text-gray-900">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-2">Time</th>
                <th className="border px-2 py-2">Lat</th>
                <th className="border px-2 py-2">Lng</th>
                <th className="border px-2 py-2">Temp (°C)</th>
                <th className="border px-2 py-2">Humidity (%)</th>
                <th className="border px-2 py-2">Pressure (hPa)</th>
                <th className="border px-2 py-2">Air Quality (IAQ)</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 15).map((row) => (
                <tr key={row.id} className="even:bg-gray-50">
                  <td className="border px-2 py-1 font-mono text-xs">{row.created_at}</td>
                  <td className="border px-2 py-1 font-mono text-xs">{row.latitude}</td>
                  <td className="border px-2 py-1 font-mono text-xs">{row.longitude}</td>
                  <td className="border px-2 py-1">{row.temperature}</td>
                  <td className="border px-2 py-1">{row.humidity}</td>
                  <td className="border px-2 py-1">{row.pressure}</td>
                  <td className="border px-2 py-1">{row.air_quality}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-semibold"
              onClick={downloadCSV}
            >
              Download CSV
            </button>
          </div>
        </div>
      </div>
    </main>
  );
} 