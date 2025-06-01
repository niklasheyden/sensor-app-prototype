import React from 'react';

const metrics = [
  { key: 'temperature', label: 'Temperature' },
  { key: 'humidity', label: 'Humidity' },
  { key: 'pressure', label: 'Pressure' },
  { key: 'air_quality', label: 'Air Quality' },
];

interface MetricSelectorProps {
  selected: string;
  onChange: (metric: string) => void;
}

export default function MetricSelector({ selected, onChange }: MetricSelectorProps) {
  return (
    <div className="flex gap-2 mb-4">
      {metrics.map((m) => (
        <button
          key={m.key}
          className={`px-4 py-2 rounded font-semibold border transition-colors ${selected === m.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
          onClick={() => onChange(m.key)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
} 