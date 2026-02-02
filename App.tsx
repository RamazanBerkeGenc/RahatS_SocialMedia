import 'react-native-gesture-handler'; 
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native'; // Konteynırı buraya ekledik

// Navigasyon yapın
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
      {/* DİKKAT: Uygulamanın en tepesinde tek bir NavigationContainer olmalı.
          AppNavigator.js içindekini sildiğimiz için buraya ekledik.
      */}
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;