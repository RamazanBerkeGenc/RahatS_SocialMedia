import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const ClassChip = ({ label, isActive, onPress }) => (
  <TouchableOpacity 
    style={[styles.chip, isActive && styles.activeChip]} 
    onPress={onPress}
  >
    <Text style={[styles.chipText, isActive && styles.activeText]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  activeChip: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  chipText: {
    color: '#636e72',
    fontWeight: 'bold',
    fontSize: 13,
  },
  activeText: {
    color: '#fff',
  },
});

export default ClassChip;