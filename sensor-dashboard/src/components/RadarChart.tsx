import { RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface SensorRadarChartProps {
  data: any[];
}

// Scoring functions (1 = worst, 5 = best)
function scoreTemperature(temp: number) {
  // 21-24°C = 5, 18-20/25-27 = 4, 15-17/28-30 = 3, 10-14/31-33 = 2, else 1
  if (temp >= 21 && temp <= 24) return 5;
  if ((temp >= 18 && temp < 21) || (temp > 24 && temp <= 27)) return 4;
  if ((temp >= 15 && temp < 18) || (temp > 27 && temp <= 30)) return 3;
  if ((temp >= 10 && temp < 15) || (temp > 30 && temp <= 33)) return 2;
  return 1;
}
function scoreHumidity(hum: number) {
  // 40-60% = 5, 30-39/61-70 = 4, 20-29/71-80 = 3, 10-19/81-90 = 2, else 1
  if (hum >= 40 && hum <= 60) return 5;
  if ((hum >= 30 && hum < 40) || (hum > 60 && hum <= 70)) return 4;
  if ((hum >= 20 && hum < 30) || (hum > 70 && hum <= 80)) return 3;
  if ((hum >= 10 && hum < 20) || (hum > 80 && hum <= 90)) return 2;
  return 1;
}
function scorePressure(press: number) {
  // 1010-1020 hPa = 5, 1005-1009/1021-1025 = 4, 1000-1004/1026-1030 = 3, 990-999/1031-1040 = 2, else 1
  if (press >= 1010 && press <= 1020) return 5;
  if ((press >= 1005 && press < 1010) || (press > 1020 && press <= 1025)) return 4;
  if ((press >= 1000 && press < 1005) || (press > 1025 && press <= 1030)) return 3;
  if ((press >= 990 && press < 1000) || (press > 1030 && press <= 1040)) return 2;
  return 1;
}
function scoreAirQuality(aq: number) {
  // 0-50 = 5, 51-100 = 4, 101-150 = 3, 151-200 = 2, else 1 (higher is worse)
  if (aq <= 50) return 5;
  if (aq <= 100) return 4;
  if (aq <= 150) return 3;
  if (aq <= 200) return 2;
  return 1;
}

export default function SensorRadarChart({ data }: SensorRadarChartProps) {
  // Calculate average values for each metric
  const averages = data.reduce((acc, curr) => {
    acc.temperature += curr.temperature;
    acc.humidity += curr.humidity;
    acc.pressure += curr.pressure;
    acc.air_quality += curr.air_quality;
    return acc;
  }, { temperature: 0, humidity: 0, pressure: 0, air_quality: 0 });

  const count = data.length || 1;
  const avgTemp = averages.temperature / count;
  const avgHum = averages.humidity / count;
  const avgPress = averages.pressure / count;
  const avgAQ = averages.air_quality / count;

  // Calculate scores
  const tempScore = scoreTemperature(avgTemp);
  const humScore = scoreHumidity(avgHum);
  const pressScore = scorePressure(avgPress);
  const aqScore = scoreAirQuality(avgAQ);
  const comfortScore = ((tempScore + humScore + aqScore) / 3).toFixed(2);

  const chartData = [
    {
      metric: 'Temperature',
      value: tempScore,
      fullMark: 5,
    },
    {
      metric: 'Humidity',
      value: humScore,
      fullMark: 5,
    },
    {
      metric: 'Pressure',
      value: pressScore,
      fullMark: 5,
    },
    {
      metric: 'Air Quality',
      value: aqScore,
      fullMark: 5,
    },
    {
      metric: 'Comfort Index',
      value: Number(comfortScore),
      fullMark: 5,
    },
  ];

  // Format value based on metric
  const formatValue = (value: number, metric: string) => `${value}/5`;

  return (
    <div className="w-full h-[300px] bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Sensor Metrics Overview</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#f0f0f0" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: '#666', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[1, 5]}
            tick={{ fill: '#666', fontSize: 12 }}
            tickFormatter={(value) => `${value}/5`}
          />
          <Radar
            name="Metrics"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
            label={({ value, metric }: { value: number; metric: string }) => formatValue(value, metric)}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
} 