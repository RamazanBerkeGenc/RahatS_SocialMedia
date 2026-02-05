import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, Alert, KeyboardAvoidingView, 
  Platform, TouchableOpacity 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // [YENİ] Hafıza kütüphanesi
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import apiClient from '../api/apiClient';

const LoginScreen = ({ route, navigation }) => {
  const { role } = route.params;
  const [tc, setTc] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (tc.length !== 11) {
      Alert.alert("Hata", "TC Kimlik No 11 haneli olmalıdır.");
      return;
    }
    if (!password) {
      Alert.alert("Hata", "Lütfen şifrenizi girin.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', {
        tc_no: tc, password, role
      });

      if (response.data.success) {
        // --- KRİTİK GÜNCELLEME: TOKEN KAYDI ---
        const { token, user } = response.data;

        // 1. Token'ı ve temel bilgileri telefon hafızasına kaydediyoruz
        // apiClient.js her istekte 'userToken'ı okuyup Header'a ekleyecek.
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userId', user.id.toString());
        await AsyncStorage.setItem('userRole', role);

        // 2. Ana ekrana (MainTabs) yönlendiriyoruz
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'Main', 
            params: { 
              role: role, 
              userId: user.id 
            } 
          }],
        });
      }
    } catch (error) {
      console.error("Giriş Hatası:", error);
      Alert.alert("Giriş Başarısız", "Bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>{role === 'teacher' ? 'Öğretmen' : 'Öğrenci'} Girişi</Text>

        <CustomInput 
          label="TC Kimlik No"
          placeholder="11 Haneli TC"
          value={tc}
          onChangeText={setTc}
          keyboardType="numeric"
          maxLength={11}
        />

        <CustomInput 
          label="Şifre"
          placeholder="••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={showPassword}
          isPassword={true}
          onToggleShow={() => setShowPassword(!showPassword)}
        />

        <CustomButton 
          title={loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
          onPress={handleLogin}
          color={role === 'teacher' ? '#4a90e2' : '#50c878'}
        />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  inner: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2f3640', marginBottom: 30 },
  backButton: { marginTop: 20 },
  backText: { color: '#7f8c8d', fontWeight: '600' }
});

export default LoginScreen;