import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WelcomeScreen = ({ navigation }) => {
  // Kontrol yapılırken butonları gizlemek için state
  const [isLoading, setIsLoading] = useState(true);

  // --- OTOMATİK GİRİŞ KONTROLÜ ---
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');
        const userId = await AsyncStorage.getItem('userId');
        const rememberMe = await AsyncStorage.getItem('rememberMe');

        // Eğer bilgiler var ve "Beni Hatırla" seçilmişse -> Direkt Ana Sayfaya git
        if (token && role && userId && rememberMe === 'true') {
          navigation.reset({
            index: 0,
            routes: [{ 
              name: 'Main', 
              params: { role: role, userId: parseInt(userId) } 
            }],
          });
        } else {
          // Değilse yüklemeyi bitir, butonları göster
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Oto-Giriş Hatası:", e);
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // Kontrol sürerken Loading göster
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>RahatS</Text>
      <Text style={styles.tagline}>Akıllı Öğrenci Takip Sistemi</Text>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#4a90e2' }]} 
        onPress={() => navigation.navigate('Login', { role: 'teacher' })}
      >
        <Text style={styles.buttonText}>Öğretmen Girişi</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#50c878' }]} 
        onPress={() => navigation.navigate('Login', { role: 'student' })}
      >
        <Text style={styles.buttonText}>Öğrenci Girişi</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' },
  logo: { fontSize: 48, fontWeight: 'bold', color: '#2f3640' },
  tagline: { fontSize: 16, color: '#7f8c8d', marginBottom: 50 },
  button: { width: '80%', padding: 18, borderRadius: 15, marginBottom: 20, alignItems: 'center', elevation: 5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default WelcomeScreen;