import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

const WelcomeScreen = ({ navigation }) => {
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