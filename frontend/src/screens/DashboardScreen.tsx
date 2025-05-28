import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Heatmap, Polyline } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { SegmentedButtons, Card, useTheme, Text as PaperText, Appbar, Divider } from 'react-native-paper';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryScatter } from 'victory-native';
import { decode as atob } from 'base-64';

const SUPABASE_URL = 'https://ugceawhapyzapxfuuvgl.supabase.co/';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// BLE Service and Characteristic UUIDs (must match Arduino code)
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

// Create BLE Manager instance
const bleManager = new BleManager();

function getTemperatureColor(temp: number) {
  if (temp < 10) return "#3498db"; // Blue (cold)
  if (temp < 18) return "#5dade2"; // Light blue (cool)
  if (temp < 25) return "#27ae60"; // Green (comfortable)
  if (temp < 30) return "#f39c12"; // Orange (warm)
  return "#e74c3c"; // Red (hot)
}

function getAirQualityLabel(value: number) {
  if (value > 20) return { label: "Excellent", color: "#2ecc40" };
  if (value > 10) return { label: "Good", color: "#27ae60" };
  if (value > 5) return { label: "Moderate", color: "#f1c40f" };
  if (value > 2) return { label: "Poor", color: "#e67e22" };
  return { label: "Very Poor", color: "#e74c3c" };
}

const METRICS = [
  { value: 'temperature', label: 'Temp.', icon: 'thermometer' },
  { value: 'humidity', label: 'Hum.', icon: 'water-percent' },
  { value: 'pressure', label: 'Pres.', icon: 'gauge' },
  { value: 'air_quality', label: 'Air Q.', icon: 'weather-windy' },
];

// Metric units for y-axis label
const METRIC_UNITS: Record<string, string> = {
  temperature: '°C',
  humidity: '%',
  pressure: 'hPa',
  air_quality: '',
};

// Helper to get color for selected metric
function getMetricColor(metric: string, value: number) {
  if (metric === 'temperature') return getTemperatureColor(value);
  if (metric === 'humidity') {
    if (value < 30) return '#3498db'; // blue
    if (value < 60) return '#27ae60'; // green
    if (value < 80) return '#f39c12'; // orange
    return '#e74c3c'; // red
  }
  if (metric === 'pressure') {
    if (value < 1000) return '#3498db';
    if (value < 1020) return '#27ae60';
    if (value < 1040) return '#f39c12';
    return '#e74c3c';
  }
  if (metric === 'air_quality') return getAirQualityLabel(value).color;
  return '#000';
}

// Helper to get readings from the last 10 minutes
function getReadingsLast10Minutes(data: any[]) {
  const now = new Date();
  return data.filter(d => {
    const t = new Date(d.created_at);
    return (now.getTime() - t.getTime()) <= 10 * 60 * 1000;
  });
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_WIDTH = 500;

const DashboardScreen = () => {
  const [sensorData, setSensorData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [latestSensorData, setLatestSensorData] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState('temperature');

  // Function to start BLE scanning
  const startScan = async () => {
    try {
      setIsScanning(true);
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error(error);
          return;
        }
        if (device?.name === "Sensor-Node") {
          bleManager.stopDeviceScan();
          connectToDevice(device);
        }
      });
    } catch (error) {
      console.error('Error starting scan:', error);
      Alert.alert('Error', 'Failed to start BLE scanning');
    }
  };

  // Function to connect to a device
  const connectToDevice = async (device: Device) => {
    try {
      const connectedDevice = await device.connect();
      setConnectedDevice(connectedDevice);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      // Subscribe to notifications
      connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error(error);
            return;
          }
          if (characteristic?.value) {
            try {
              // Decode base64 to string
              const raw = atob(characteristic.value);
              console.log('Raw BLE data:', raw);
              const data = JSON.parse(raw);
              // Attach latest location and store in Supabase
              attachLocationAndStore(data);
            } catch (error) {
              console.error('Error parsing sensor data:', error);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert('Error', 'Failed to connect to sensor');
    }
  };

  // Function to get and attach the latest location to sensor data
  const attachLocationAndStore = async (data: any) => {
    try {
      let loc = location;
      // Always try to get the latest location
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const latestLoc = await Location.getCurrentPositionAsync({});
          loc = {
            latitude: latestLoc.coords.latitude,
            longitude: latestLoc.coords.longitude,
          };
          setLocation(loc);
        }
      } catch (err) {
        // If location fetch fails, use last known location
      }
      // Only send if location is valid
      if (loc && loc.latitude !== 0 && loc.longitude !== 0) {
        data.latitude = loc.latitude;
        data.longitude = loc.longitude;
        setLatestSensorData(data);
        storeSensorData(data);
      } else {
        console.warn('No valid location available, not sending data to Supabase.');
      }
    } catch (error) {
      console.error('Error attaching location:', error);
    }
  };

  // Function to store sensor data in Supabase
  const storeSensorData = async (data: any) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/sensor_data`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to store data');
      }
    } catch (error) {
      console.error('Error storing sensor data:', error);
    }
  };

  const fetchSensorData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/sensor_data?order=created_at.desc&limit=100`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });
      const data = await response.json();
      setSensorData(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setSensorData([]);
    }
    setLoading(false);
  };

  const fetchLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLocationError(null);
    } catch (err) {
      setLocationError('Could not get location');
    }
  };

  useEffect(() => {
    // Request BLE permissions and start scanning
    const setupBLE = async () => {
      try {
        const state = await bleManager.state();
        if (state === State.PoweredOn) {
          startScan();
        } else {
          Alert.alert('Bluetooth is not enabled', 'Please enable Bluetooth to connect to the sensor');
        }
      } catch (error) {
        console.error('Error setting up BLE:', error);
      }
    };

    setupBLE();
    fetchSensorData();
    fetchLocation();
    const interval = setInterval(fetchSensorData, 5000);
    
    return () => {
      clearInterval(interval);
      if (connectedDevice) {
        connectedDevice.cancelConnection();
        setConnectedDevice(null);
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchSensorData(), fetchLocation()]).finally(() => setRefreshing(false));
  };

  // Get latest sensor data for dashboard card
  const latest = latestSensorData || (sensorData.length > 0 ? sensorData[0] : null);

  // Calculate map region to fit all markers
  const getMapRegion = () => {
    if (location) {
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    } else {
      return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
  };

  // Prepare heatmap points for selected metric
  const heatmapPoints = sensorData
    .filter(d => d.latitude && d.longitude && typeof d[selectedMetric] === 'number')
    .map(d => ({
      latitude: d.latitude,
      longitude: d.longitude,
      weight: d[selectedMetric],
    }));

  // Prepare chart data for selected metric (last 10 minutes, most recent last)
  const readingsLast10Min = getReadingsLast10Minutes(sensorData).filter(d => {
    const value = d[selectedMetric];
    const t = new Date(d.created_at);
    return typeof value === 'number' && !isNaN(value) && t instanceof Date && !isNaN(t.getTime());
  });
  const chartData = readingsLast10Min.map(d => {
    const t = new Date(d.created_at);
    const now = new Date();
    const minutesAgo = (now.getTime() - t.getTime()) / 60000;
    return { x: -minutesAgo, y: d[selectedMetric] };
  }).sort((a, b) => a.x - b.x);
  const yValues = chartData.map(d => d.y).filter(y => typeof y === 'number' && isFinite(y));
  let yDomain: [number, number] | undefined = undefined;
  if (yValues.length >= 2) {
    let min = Math.min(...yValues);
    let max = Math.max(...yValues);
    if (min === max) {
      min -= 1;
      max += 1;
    } else {
      const pad = (max - min) * 0.1;
      min -= pad;
      max += pad;
    }
    yDomain = [min, max];
  }

  // Calculate x-axis domain from data
  const xValues = chartData.map(d => d.x);
  let xDomain: [number, number] = [-10, 0];
  if (xValues.length > 0) {
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    // Add a small buffer to left/right
    xDomain = [Math.floor(minX - 0.5), Math.ceil(maxX + 0.5)];
  }

  const theme = useTheme();

  // For map path, only show readings from the last 30 minutes or since last large time gap
  function getCurrentSessionPath(data: any[]) {
    if (data.length === 0) return [];
    // Find the last large time gap (e.g., > 10 minutes)
    const reversed = [...data].reverse();
    const now = new Date();
    let sessionStartIdx = 0;
    for (let i = 1; i < reversed.length; i++) {
      const t1 = new Date(reversed[i - 1].created_at);
      const t2 = new Date(reversed[i].created_at);
      if ((t1.getTime() - t2.getTime()) > 10 * 60 * 1000) {
        sessionStartIdx = i;
        break;
      }
    }
    return reversed.slice(0, sessionStartIdx + 1).reverse();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ alignItems: 'center', paddingBottom: 32, paddingHorizontal: 16 }}>
      {/* Alert if sensor is not connected */}
      {!connectedDevice ? (
        <Card style={{ width: '100%', maxWidth: 500, alignSelf: 'center', backgroundColor: '#fffbe6', borderRadius: 18, marginBottom: 18, marginTop: 18, elevation: 0, padding: 18, borderWidth: 1, borderColor: '#fbbf24' }}>
          <PaperText style={{ textAlign: 'center', fontSize: 16, color: '#b45309', marginBottom: 6 }}>
            <MaterialCommunityIcons name="bluetooth-off" size={22} color="#b45309" />  Please turn on your sensor and enable Bluetooth to start receiving data.
          </PaperText>
        </Card>
      ) : (
        latest && (
          <Card style={{ width: '100%', maxWidth: 500, alignSelf: 'center', backgroundColor: '#f4f6fb', borderRadius: 18, marginBottom: 18, marginTop: 18, elevation: 0, padding: 18 }}>
            <PaperText style={{ textAlign: 'center', fontSize: 16, color: '#222', marginBottom: 6 }}>
              {(() => {
                // Context-aware messages
                if (latest.temperature > 30) return '⚠️ High temperature detected! Stay hydrated and avoid prolonged exposure to heat.';
                if (latest.temperature < 0) return '❄️ It is freezing! Dress warmly to avoid hypothermia.';
                if (latest.humidity > 80) return '💧 High humidity detected. It may feel muggy or uncomfortable.';
                if (latest.humidity < 20) return '🌵 Low humidity detected. Dry air can cause dehydration.';
                if (latest.pressure < 950) return '⚠️ Low pressure detected. Weather may be unstable.';
                if (latest.pressure > 1050) return '⚠️ High pressure detected. Weather may be unusually stable.';
                if (latest.air_quality < 3) return '😷 Poor air quality! Consider wearing a mask or avoiding outdoor activity.';
                if (latest.air_quality < 6) return '🌫️ Moderate air quality. Sensitive individuals should take care.';
                return '✅ All sensor readings are in a healthy range. Enjoy your walk!';
              })()}
            </PaperText>
          </Card>
        )
      )}
      {/* Metric Selector */}
      <SegmentedButtons
        value={selectedMetric}
        onValueChange={setSelectedMetric}
        buttons={METRICS.map(m => ({ value: m.value, label: m.label, icon: m.icon }))}
        style={{ marginBottom: 8, marginTop: 12, maxWidth: 500, alignSelf: 'center' }}
        density="small"
      />
      {/* Map Section with Colored Path */}
      <Card style={{ width: '100%', maxWidth: 500, marginTop: 8, marginBottom: 24, borderRadius: 18, alignSelf: 'center', elevation: 2 }}>
        <MapView
          style={{ width: '100%', height: 220 }}
          region={getMapRegion()}
          showsUserLocation={true}
        >
          {/* Markers for each reading */}
          {sensorData.filter(d => d.latitude && d.longitude).map((d, idx) => (
            <Marker
              key={idx}
              coordinate={{ latitude: d.latitude, longitude: d.longitude }}
              pinColor={getMetricColor(selectedMetric, d[selectedMetric])}
              title={`Sensor Reading`}
              description={(() => {
                if (selectedMetric === 'temperature') return `Temp: ${d.temperature}°C`;
                if (selectedMetric === 'humidity') return `Humidity: ${d.humidity}%`;
                if (selectedMetric === 'pressure') return `Pressure: ${d.pressure} hPa`;
                if (selectedMetric === 'air_quality') return `Air Quality: ${getAirQualityLabel(d.air_quality).label}`;
                return '';
              })()}
            />
          ))}
          {/* Colored path for current session */}
          {(() => {
            const path = getCurrentSessionPath(sensorData).slice(-30);
            const lines = [];
            for (let i = 1; i < path.length; i++) {
              const prev = path[i - 1];
              const curr = path[i];
              if (
                prev.latitude && prev.longitude && curr.latitude && curr.longitude &&
                typeof curr[selectedMetric] === 'number'
              ) {
                lines.push(
                  <Polyline
                    key={`segment-${i}`}
                    coordinates={[
                      { latitude: prev.latitude, longitude: prev.longitude },
                      { latitude: curr.latitude, longitude: curr.longitude }
                    ]}
                    strokeColor={getMetricColor(selectedMetric, curr[selectedMetric])}
                    strokeWidth={6}
                    lineCap="round"
                    lineJoin="round"
                    geodesic={true}
                  />
                );
              }
            }
            return lines;
          })()}
        </MapView>
      </Card>
      {/* Latest Sensor Reading Grid */}
      <Card style={{ width: '100%', maxWidth: 500, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 18, marginBottom: 24, elevation: 2, padding: 16 }}>
        <PaperText variant="titleMedium" style={{ textAlign: 'center', marginBottom: 16, color: theme.colors.onSurface }}>Latest Sensor Readings</PaperText>
        {latest ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
            {/* Temperature */}
            <View style={{ flexBasis: '48%', backgroundColor: '#f4f6fb', borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center', elevation: 1 }}>
              <MaterialCommunityIcons name="thermometer" size={28} color={getTemperatureColor(latest.temperature)} />
              <PaperText style={{ color: getTemperatureColor(latest.temperature), fontWeight: 'bold', fontSize: 18 }}>{latest.temperature} °C</PaperText>
              <PaperText style={{ color: '#888', fontSize: 13 }}>Temperature</PaperText>
            </View>
            {/* Humidity */}
            <View style={{ flexBasis: '48%', backgroundColor: '#f4f6fb', borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center', elevation: 1 }}>
              <MaterialCommunityIcons name="water-percent" size={28} color="#3498db" />
              <PaperText style={{ color: '#3498db', fontWeight: 'bold', fontSize: 18 }}>{latest.humidity} %</PaperText>
              <PaperText style={{ color: '#888', fontSize: 13 }}>Humidity</PaperText>
            </View>
            {/* Pressure */}
            <View style={{ flexBasis: '48%', backgroundColor: '#f4f6fb', borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center', elevation: 1 }}>
              <MaterialCommunityIcons name="gauge" size={28} color="#9b59b6" />
              <PaperText style={{ color: '#9b59b6', fontWeight: 'bold', fontSize: 18 }}>{latest.pressure} hPa</PaperText>
              <PaperText style={{ color: '#888', fontSize: 13 }}>Pressure</PaperText>
            </View>
            {/* Air Quality */}
            <View style={{ flexBasis: '48%', backgroundColor: '#f4f6fb', borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center', elevation: 1 }}>
              <MaterialCommunityIcons name="weather-windy" size={28} color={getAirQualityLabel(latest.air_quality).color} />
              <PaperText style={{ color: getAirQualityLabel(latest.air_quality).color, fontWeight: 'bold', fontSize: 18 }}>{getAirQualityLabel(latest.air_quality).label}</PaperText>
              <PaperText style={{ color: '#888', fontSize: 13 }}>Air Quality</PaperText>
            </View>
          </View>
        ) : (
          <PaperText style={{ textAlign: 'center', color: '#888', fontSize: 16, padding: 24 }}>
            No sensor data available.
          </PaperText>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  mapCard: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 18,
    alignSelf: 'center',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  map: {
    width: '100%',
    height: '100%',
  },
  metricSelectorContainer: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    marginBottom: 12,
  },
  metricButton: {
    backgroundColor: '#f4f6fb',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  metricButtonSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  graphCard: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    padding: 16,
  },
  graphContainer: {
    width: '100%',
    height: 250,
    alignSelf: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  dataCard: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    padding: 16,
  },
  dataGrid: {
    width: '100%',
    flexDirection: 'column',
    gap: 0,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dataLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dataLabelText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 6,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 0,
    textAlign: 'right',
    flexShrink: 1,
  },
});

export default DashboardScreen;