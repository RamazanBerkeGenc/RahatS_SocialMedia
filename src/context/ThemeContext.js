import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Uygulama açılınca kayıtlı temayı getir
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme === 'dark') setIsDarkMode(true);
    };
    loadTheme();
  }, []);

  // Temayı değiştir ve kaydet
  const toggleTheme = async (value) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem('appTheme', value ? 'dark' : 'light');
  };

  // RENK PALETİ
  const theme = {
    isDark: isDarkMode,
    backgroundColor: isDarkMode ? '#121212' : '#f0f2f5', // Ana Arka Plan
    cardBg: isDarkMode ? '#1e1e1e' : '#fff',             // Kart Rengi
    textColor: isDarkMode ? '#e0e0e0' : '#2d3436',       // Ana Metin
    subTextColor: isDarkMode ? '#b0b0b0' : '#7f8c8d',    // Alt Metin
    borderColor: isDarkMode ? '#333' : '#eee',           // Çizgiler
    iconColor: isDarkMode ? '#fff' : '#2d3436',          // İkonlar
    inputBg: isDarkMode ? '#2c2c2c' : '#f1f2f6',         // Input Alanları
    headerBg: isDarkMode ? '#1e1e1e' : '#fff',           // Üst Bar
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};