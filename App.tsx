import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme/colors';
import HomeScreen from './src/screens/HomeScreen';
import AcademicsScreen from './src/screens/AcademicsScreen';
import NotesScreen from './src/screens/NotesScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import MoreScreen from './src/screens/MoreScreen';
import CalculatorScreen from './src/screens/CalculatorScreen';
import CP9Screen from './src/screens/CP9Screen';
import { setupNotifications, rescheduleAll } from './src/utils/reminders';

const Tab = createBottomTabNavigator();

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Academics: 'school',
  Notes: 'document-text',
  Documents: 'folder',
  More: 'grid',
  Calculator: 'calculator',
  CP9: 'sparkles',
};

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.card, border: colors.border, primary: colors.accent },
};

export default function App() {
  useEffect(() => {
    setupNotifications();
    rescheduleAll().catch(() => {});
  }, []);

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textDim,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Academics" component={AcademicsScreen} />
        <Tab.Screen name="Notes" component={NotesScreen} />
        <Tab.Screen name="Documents" component={DocumentsScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
        <Tab.Screen name="Calculator" component={CalculatorScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="CP9" component={CP9Screen} options={{ tabBarButton: () => null }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
