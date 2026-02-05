import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// GERÇEK CİHAZDA TEST EDİYORSAN BURAYA BİLGİSAYARININ IP'SİNİ YAZ: 'http://192.168.1.XX:3000/api'
const apiClient = axios.create({
  baseURL: 'http://10.0.2.2:3000/api', 
  timeout: 10000,
});

// --- INTERCEPTOR (Her isteği yakalayan kod) ---
apiClient.interceptors.request.use(
  async (config) => {
    // Hafızadan Token'ı al
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      // Varsa isteğin başlığına ekle
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;