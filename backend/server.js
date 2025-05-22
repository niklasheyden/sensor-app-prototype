const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage for sensor data
let sensorData = [];

// Endpoint to receive sensor data from ESP32
app.post('/sensor-data', (req, res) => {
  const data = {
    ...req.body,
    timestamp: new Date().toISOString()
  };
  sensorData.push(data);
  
  // Keep only the last 100 readings
  if (sensorData.length > 100) {
    sensorData = sensorData.slice(-100);
  }
  
  res.json({ success: true });
});

// Endpoint to get sensor data for the mobile app
app.get('/sensor-data', (req, res) => {
  res.json(sensorData);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });