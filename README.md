# BME688 Sensor App

This project consists of a React Native/Expo mobile app that displays data from a BME688 sensor connected to an ESP32 C3 SuperMini.

## Project Structure

- `sensor-app/` - React Native/Expo mobile application
- `backend/` - Express.js server for handling sensor data

## Setup Instructions

### Backend Server

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

The server will run on http://localhost:3000

### Mobile App

1. Navigate to the sensor-app directory:
   ```bash
   cd sensor-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```

4. Use the Expo Go app on your smartphone to scan the QR code and run the app.

## ESP32 Setup

The ESP32 should be configured to send data to the backend server. Here's an example of the data format to send:

```json
{
  "temperature": 25.5,
  "humidity": 45.2,
  "pressure": 1013.25,
  "airQuality": 150
}
```

Send this data to `http://your-computer-ip:3000/sensor-data` using HTTP POST requests.

## Features

- Real-time display of sensor readings
- Historical data visualization using charts
- Pull-to-refresh functionality
- Automatic data updates every 30 seconds 