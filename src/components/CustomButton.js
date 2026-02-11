import React, { useContext } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ThemeContext } from '../context/ThemeContext'; // [YENİ] Tema Context

const CustomButton = ({ title, onPress, color = '#4a90e2', style, disabled }) => {
  // [YENİ] Tema Bağlantısı
  const { theme } = useContext(ThemeContext);

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { backgroundColor: disabled ? '#ccc' : color }, // Disabled kontrolü eklendi
        // Eğer koyu temadaysa ve özel bir stil gerekirse buraya eklenebilir
        // Örneğin: { shadowColor: theme.isDark ? '#000' : '#000' }
        style
      ]} 
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    marginVertical: 10,
    width: '100%',
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff', // Aksiyon butonlarında yazı genelde beyaz kalır
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomButton;