// 1. MUTLAKA EN ÜSTTE OLMALI (Navigasyonun dokunmatiği algılaması için)
import 'react-native-gesture-handler'; 
import React from 'react';
import { StatusBar, useColorScheme, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Senin yazdığın navigasyon dosyası
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent 
      />
      
      {/* Hata buradaydı: NewAppScreen ve AppContent'i sildik.
          Artık uygulama senin sayfalarını yöneten AppNavigator ile başlıyor.
      */}
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;