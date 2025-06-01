import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface TimeSeriesChartProps {
  data: any[];
  metric: string;
}

export default function TimeSeriesChart({ data, metric }: TimeSeriesChartProps) {
  // Sort data by time
  const sortedData = [...data].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Format data for the chart
  const chartData = sortedData.map(item => ({
    time: new Date(item.created_at),
    value: item[metric],
  }));

  // Get unit for metric
  function getMetricUnit(metric: string) {
    if (metric === 'temperature') return '°C';
    if (metric === 'humidity') return '%';
    if (metric === 'pressure') return 'hPa';
    if (metric === 'air_quality') return 'IAQ';
    return '';
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow">
          <p className="text-sm font-semibold">{format(label, 'HH:mm:ss')}</p>
          <p className="text-sm">
            {payload[0].value.toFixed(2)} {getMetricUnit(metric)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px] bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        {metric.charAt(0).toUpperCase() + metric.slice(1)} Over Time
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            tickFormatter={(time) => format(time, 'HH:mm')}
            stroke="#666"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}${getMetricUnit(metric)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 