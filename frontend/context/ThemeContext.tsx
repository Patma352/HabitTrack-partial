import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightColors = {
  primary: '#007AFF',
  primaryForeground: '#FFFFFF',
  secondary: '#FFD700',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceHighlight: '#F9F9F9',
  textPrimary: '#000000',
  textSecondary: '#6C6C70',
  border: '#E5E5EA',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  habitWater: '#5AC8FA',
  habitSleep: '#5856D6',
  habitCalories: '#FF2D55',
  habitSteps: '#FF9500',
  coin: '#FFD700',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E5EA',
  cardShadow: '#00000015',
};

const darkColors = {
  primary: '#0A84FF',
  primaryForeground: '#FFFFFF',
  secondary: '#FFD700',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceHighlight: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#AEAEB2',
  border: '#38383A',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  habitWater: '#64D2FF',
  habitSleep: '#5E5CE6',
  habitCalories: '#FF375F',
  habitSteps: '#FF9F0A',
  coin: '#FFD700',
  tabBar: '#1C1C1E',
  tabBarBorder: '#38383A',
  cardShadow: '#00000040',
};

export type ThemeColors = typeof lightColors;

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [isDark, setIsDark] = useState(system === 'dark');

  useEffect(() => {
    AsyncStorage.getItem('theme_pref').then((pref) => {
      if (pref !== null) setIsDark(pref === 'dark');
      else setIsDark(system === 'dark');
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('theme_pref', next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
