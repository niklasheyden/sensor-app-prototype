import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Heatmap } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { SegmentedButtons, Card, useTheme } from 'react-native-paper';
import { LineChart, Grid, YAxis, XAxis } from 'react-native-svg-charts';
import * as scale from 'd3-scale';

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
  { value: 'temperature', label: 'Temperature', icon: 'thermometer' },
  { value: 'humidity', label: 'Humidity', icon: 'water-percent' },
  { value: 'pressure', label: 'Pressure', icon: 'gauge' },
  { value: 'air_quality', label: 'Air Quality', icon: 'weather-windy' },
];

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
    if (sensorData.length > 0) {
      const lats = sensorData.map(d => d.latitude);
      const lngs = sensorData.map(d => d.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.5),
        longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.5),
      };
    } else if (location) {
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

  // Prepare chart data for selected metric (last 30 readings, most recent last)
  const chartData = sensorData.slice(0, 30).reverse().map((d, i) => d[selectedMetric]);

  const theme = useTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Sensor Dashboard</Text>
      <SegmentedButtons
        value={selectedMetric}
        onValueChange={setSelectedMetric}
        buttons={METRICS.map(m => ({ value: m.value, label: m.label, icon: m.icon }))}
        style={styles.segmented}
      />
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={getMapRegion()}
          showsUserLocation={true}
        >
          {sensorData.filter(d => d.latitude && d.longitude).map((d, idx) => (
            <Marker
              key={idx}
              coordinate={{ latitude: d.latitude, longitude: d.longitude }}
              pinColor={getTemperatureColor(d.temperature)}
              title={`Sensor Reading`}
              description={`Temp: ${d.temperature}°C\nHumidity: ${d.humidity}%\nPressure: ${d.pressure} hPa\nAir: ${d.air_quality}`}
            />
          ))}
          {/*
          // Heatmap is only available in a custom dev client or bare workflow
          {heatmapPoints.length > 0 && (
            <Heatmap
              points={heatmapPoints}
              opacity={0.7}
              radius={40}
              gradient={{
                colors: [
                  '#00f', '#0ff', '#0f0', '#ff0', '#f90', '#f00'
                ],
                startPoints: [0.1, 0.3, 0.5, 0.7, 0.9, 1],
                colorMapSize: 256,
              }}
            />
          )}
          */}
        </MapView>
      </View>
      <Text style={styles.sectionTitle}>Real-Time {METRICS.find(m => m.value === selectedMetric)?.label} Graph</Text>
      <Card style={styles.chartCard}>
        <View style={{ flexDirection: 'row', height: 180, paddingVertical: 8 }}>
          <YAxis
            data={chartData}
            contentInset={{ top: 20, bottom: 20 }}
            svg={{ fontSize: 10, fill: '#888' }}
            numberOfTicks={6}
            min={Math.min(...chartData, 0)}
            max={Math.max(...chartData, 1)}
          />
          <LineChart
            style={{ flex: 1, marginLeft: 8 }}
            data={chartData}
            svg={{ stroke: theme.colors.primary, strokeWidth: 2 }}
            contentInset={{ top: 20, bottom: 20 }}
            curve={undefined}
          >
            <Grid svg={{ stroke: '#eee' }} />
          </LineChart>
        </View>
        <XAxis
          style={{ marginHorizontal: -10, height: 20 }}
          data={chartData}
          formatLabel={(value, index) => `${index + 1}`}
          contentInset={{ left: 30, right: 10 }}
          svg={{ fontSize: 10, fill: '#888' }}
          scale={scale.scaleLinear}
        />
        <Text style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 4 }}>
          Most recent readings (right = newest)
        </Text>
      </Card>
      <Text style={styles.sectionTitle}>Latest Sensor Reading</Text>
      {latest ? (
        <Card style={styles.dataCard}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="thermometer" size={28} color={getTemperatureColor(latest.temperature)} />
            <Text style={styles.label}>Temperature</Text>
            <Text style={[styles.value, { color: getTemperatureColor(latest.temperature) }]}> {latest.temperature} °C</Text>
          </View>
          <View style={styles.row}>
            <MaterialCommunityIcons name="water-percent" size={28} color="#3498db" />
            <Text style={styles.label}>Humidity</Text>
            <Text style={[styles.value, { color: "#3498db" }]}> {latest.humidity} %</Text>
          </View>
          <View style={styles.row}>
            <MaterialCommunityIcons name="gauge" size={28} color="#9b59b6" />
            <Text style={styles.label}>Pressure</Text>
            <Text style={[styles.value, { color: "#9b59b6" }]}> {latest.pressure} hPa</Text>
          </View>
          <View style={styles.row}>
            <MaterialCommunityIcons name="weather-windy" size={28} color={getAirQualityLabel(latest.air_quality).color} />
            <Text style={styles.label}>Air Quality</Text>
            <Text style={[styles.value, { color: getAirQualityLabel(latest.air_quality).color }]}> {getAirQualityLabel(latest.air_quality).label}</Text>
          </View>
          <View style={styles.row}>
            <MaterialCommunityIcons name="map-marker" size={28} color="#e67e22" />
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}> {latest.latitude?.toFixed(5)}, {latest.longitude?.toFixed(5)}</Text>
          </View>
        </Card>
      ) : (
        <Text style={styles.value}>No sensor data available.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#f4f6fb',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#222',
    letterSpacing: 1,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  segmented: {
    marginBottom: 12,
    alignSelf: 'center',
  },
  mapContainer: {
    width: Dimensions.get('window').width - 40,
    maxWidth: 500,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 24,
    height: 250,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    maxWidth: 500,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dataCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  label: {
    flex: 1,
    fontSize: 18,
    color: '#555',
    marginLeft: 12,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});

export default DashboardScreen;