import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SUPABASE_URL = 'https://ugceawhapyzapxfuuvgl.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnY2Vhd2hhcHl6YXB4ZnV1dmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NzE2MDgsImV4cCI6MjA2MzI0NzYwOH0.vDitfuwQ31ue1irj0xWhLnIjxj7jy4s9JNtg21EdX3A';

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

const DashboardScreen = () => {
  const [sensorData, setSensorData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchSensorData = async () => {
    setLoading(true);
    try {
      console.log('Fetching data from:', `${SUPABASE_URL}/rest/v1/sensor_data?order=created_at.desc&limit=100`);
      const response = await fetch(`${SUPABASE_URL}/rest/v1/sensor_data?order=created_at.desc&limit=100`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Received data:', data);
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
    fetchSensorData();
    fetchLocation();
    const interval = setInterval(fetchSensorData, 5000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchSensorData(), fetchLocation()]).finally(() => setRefreshing(false));
  };

  const latest = sensorData.length > 0 ? sensorData[0] : null;
  const markerColor = latest && typeof latest.temperature === 'number'
    ? getTemperatureColor(latest.temperature)
    : 'gray';

  const airQuality = latest ? getAirQualityLabel(latest.air_quality) : { label: "-", color: "#888" };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Sensor Dashboard</Text>
      {location && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={location}
              pinColor={markerColor}
              title="You"
              description={latest ? `Temperature: ${latest.temperature}°C` : undefined}
            />
          </MapView>
        </View>
      )}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : latest ? (
        <View style={styles.dataCard}>
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
            <MaterialCommunityIcons name="weather-windy" size={28} color={airQuality.color} />
            <Text style={styles.label}>Air Quality</Text>
            <Text style={[styles.value, { color: airQuality.color }]}> {airQuality.label}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.value}>No sensor data available.</Text>
      )}
      <View style={styles.locationCard}>
        <Text style={styles.locationTitle}>Your Location</Text>
        {location ? (
          <>
            <Text style={styles.locationValue}>Latitude: {location.latitude}</Text>
            <Text style={styles.locationValue}>Longitude: {location.longitude}</Text>
          </>
        ) : (
          <Text style={styles.locationValue}>{locationError || 'Fetching location...'}</Text>
        )}
      </View>
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
  },
  mapContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 24,
  },
  map: {
    width: '100%',
    height: 180,
  },
  dataCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 400,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    marginBottom: 32,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 6,
  },
  locationValue: {
    fontSize: 15,
    color: '#666',
    marginBottom: 2,
  },
});

export default DashboardScreen;