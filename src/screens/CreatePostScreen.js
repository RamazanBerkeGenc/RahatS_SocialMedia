import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import apiClient from '../api/apiClient';

const CreatePostScreen = ({ route, navigation }) => {
  // Navigasyondan gelen dinamik veriler
  const { userId, role, onPostCreated } = route.params || {}; 
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    // Boş içerik kontrolü
    if (!content.trim()) {
      Alert.alert("Hata", "Lütfen bir şeyler yazın.");
      return;
    }

    setLoading(true);
    try {
      // Backend'in multer yapılandırması için FormData kullanıyoruz
      const formData = new FormData();
      formData.append('user_id', userId);     
      formData.append('user_role', role);     
      formData.append('content', content.trim());

      const response = await apiClient.post('/social/create-post', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Backend tarafında is_clean kontrolü True ise kayıt başarılı döner
      if (response.data.success) {
        Alert.alert("Başarılı", "Paylaşımınız yayınlandı!");
        
        // Feed'i yenile ve geri dön
        if (onPostCreated) onPostCreated(); 
        navigation.goBack();
      }
    } catch (error) {
      // AI GÜVENLİK FİLTRESİ (HTTP 400):
      // Backend uygunsuz içerik tespit ettiğinde 400 döndürür ve veritabanına kayıt yapmaz.
      if (error.response && error.response.status === 400) {
        Alert.alert("Güvenlik Filtresi", error.response.data.message || "İçeriğiniz kurallara aykırı bulundu.");
      } else {
        console.log("Hata Detayı:", error.response?.data || error.message);
        Alert.alert("Hata", "Paylaşım şu an iletilemiyor. Lütfen bağlantınızı kontrol edin.");
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
        placeholderTextColor="#95a5a6"
      />
      
      <TouchableOpacity 
        style={[styles.button, (loading || !content.trim()) && { backgroundColor: '#ccc' }]} 
        onPress={handleShare}
        disabled={loading || !content.trim()}
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
  input: { height: 150, textAlignVertical: 'top', fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#eee', color: '#333' },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center', elevation: 2 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default CreatePostScreen;