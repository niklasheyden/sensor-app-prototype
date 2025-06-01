import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';

const Stack = createNativeStackNavigator();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4f46e5', // indigo
    background: '#f4f6fb',
    surface: '#fff',
    onSurface: '#222',
    secondary: '#06b6d4', // teal
    outline: '#e5e7eb', // light gray
  },
};

const fixedTheme = {
  ...theme,
  fonts: {
    ...theme.fonts,
    bodyLarge: { ...theme.fonts.bodyLarge, fontWeight: '400' },
    titleMedium: { ...theme.fonts.titleMedium, fontWeight: '600' },
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={{
              title: 'Sensor Dashboard',
              headerStyle: {
                backgroundColor: '#fff',
              },
              headerTitleStyle: {
                color: '#222',
                fontWeight: '600',
                fontSize: 20,
                fontFamily: 'System',
              },
              headerTintColor: '#222',
              headerTitleAlign: 'center',
            }}
          />
        </Stack.Navigator>
      <StatusBar style="auto" />
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
