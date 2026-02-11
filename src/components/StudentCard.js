import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeContext } from '../context/ThemeContext'; // [YENİ] Tema Context

const StudentCard = ({ item, isExpanded, onPress }) => {
  // [YENİ] Tema Bağlantısı
  const { theme } = useContext(ThemeContext);

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.cardBg }]} 
      onPress={onPress}
    >
      <View style={styles.row}>
        <View>
          <Text style={[styles.name, { color: theme.textColor }]}>
            {item.name} {item.lastname}
          </Text>
          <Text style={[styles.subText, { color: theme.subTextColor }]}>
            {item.class_name} • {item.lesson_name}
          </Text>
        </View>
        
        <View style={styles.avgContainer}>
          <Text style={[styles.avgLabel, { color: theme.subTextColor }]}>Ortalama</Text>
          <Text style={styles.avgText}>
            {item.ortalama !== null ? item.ortalama : '-'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  subText: { 
    fontSize: 12, 
    marginTop: 2
  },
  avgContainer: { 
    alignItems: 'flex-end' 
  },
  avgLabel: { 
    fontSize: 10, 
    marginBottom: 2
  },
  avgText: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#4a90e2' // Ortalama rengini vurgulu (Mavi) bıraktım
  },
});

export default StudentCard;