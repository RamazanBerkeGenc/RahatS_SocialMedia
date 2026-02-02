import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import apiClient from '../api/apiClient';

const CreatePostScreen = ({ route, navigation }) => {
  // 1. Navigasyondan gelen dinamik verileri alıyoruz
  const { userId, role, onPostCreated } = route.params || {}; 
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!content.trim()) {
      Alert.alert("Hata", "Lütfen bir şeyler yazın.");
      return;
    }

    setLoading(true);
    try {
      // BACKEND DÜZELTMESİ: Multer beklediği için FormData oluşturuyoruz
      const formData = new FormData();
      formData.append('user_id', userId);     // Giriş yapanın gerçek ID'si
      formData.append('user_role', role);     // 'teacher' veya 'student'
      formData.append('content', content.trim());

      // Eğer görsel özelliği eklersen buraya ekleyebilirsin:
      // formData.append('image', { uri: ..., name: 'photo.jpg', type: 'image/jpeg' });

      const response = await apiClient.post('/social/create-post', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        Alert.alert("Başarılı", "Paylaşımınız yayınlandı!");
        
        // Ana sayfayı tetikle ve geri dön
        if (onPostCreated) onPostCreated(); 
        navigation.goBack();
      }
    } catch (error) {
      // AI Güvenlik Filtresi (400 Hatası)
      if (error.response && error.response.status === 400) {
        Alert.alert("Güvenlik Filtresi", error.response.data.message);
      } else {
        console.log("Hata Detayı:", error.response?.data || error.message);
        Alert.alert("Hata", "Paylaşım sunucuya iletilemedi. Lütfen bağlantınızı kontrol edin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Mevcut rolü teyit etmek için bilgi etiketi */}
      <Text style={styles.roleLabel}>
        {role === 'teacher' ? '👨‍🏫 Öğretmen Modu' : '🎓 Öğrenci Modu'} (ID: {userId})
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Neler düşünüyorsun?"
        multiline
        value={content}
        onChangeText={setContent}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && { backgroundColor: '#ccc' }]} 
        onPress={handleShare}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Paylaş</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  roleLabel: { fontSize: 12, color: '#95a5a6', marginBottom: 10, textAlign: 'right', fontStyle: 'italic' },
  input: { height: 150, textAlignVertical: 'top', fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});

export default CreatePostScreen;