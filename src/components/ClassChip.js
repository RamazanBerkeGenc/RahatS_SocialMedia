import React, { useContext } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ThemeContext } from '../context/ThemeContext'; // [YENİ] Tema Context

const ClassChip = ({ label, isActive, onPress }) => {
  // [YENİ] Tema Bağlantısı
  const { theme } = useContext(ThemeContext);

  return (
    <TouchableOpacity 
      style={[
        styles.chip, 
        { backgroundColor: theme.cardBg, borderColor: theme.borderColor }, // Dinamik Pasif Stil
        isActive && styles.activeChip // Aktif olursa üstüne yazar
      ]} 
      onPress={onPress}
    >
      <Text style={[
        styles.chipText, 
        { color: theme.subTextColor }, // Dinamik Pasif Metin
        isActive && styles.activeText // Aktif metin (Beyaz kalır)
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    elevation: 2,
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  activeChip: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  chipText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  activeText: {
    color: '#fff',
  },
});

export default ClassChip;