import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';

const CustomInput = ({ 
  label, value, onChangeText, placeholder, secureTextEntry, 
  keyboardType = 'default', maxLength, isPassword, onToggleShow 
}) => (
  <View style={styles.container}>
    {label && <Text style={styles.label}>{label}</Text>}
    <View style={styles.inputWrapper}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        maxLength={maxLength} // Karakter sınırı buraya geliyor
        placeholderTextColor="#a0a0a0"
      />
      {isPassword && (
        <TouchableOpacity style={styles.iconContainer} onPress={onToggleShow}>
          <Text style={styles.iconText}>{secureTextEntry ? '👁️' : '🙈'}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { marginVertical: 10, width: '100%' },
  label: { fontSize: 14, color: '#636e72', marginBottom: 5, fontWeight: '600', paddingLeft: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  input: { flex: 1, padding: 12, color: '#2d3436', fontSize: 16 },
  iconContainer: { padding: 10 },
  iconText: { fontSize: 18 }
});

export default CustomInput;