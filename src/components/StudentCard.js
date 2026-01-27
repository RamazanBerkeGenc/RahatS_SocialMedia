import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const StudentCard = ({ item, isExpanded, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.row}>
      <View>
        <Text style={styles.name}>{item.name} {item.lastname}</Text>
        <Text style={styles.subText}>{item.class_name} • {item.lesson_name}</Text>
      </View>
      <View style={styles.avgContainer}>
        <Text style={styles.avgLabel}>Ortalama</Text>
        <Text style={styles.avgText}>{item.ortalama !== null ? item.ortalama : '-'}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2d3436' },
  subText: { fontSize: 12, color: '#7f8c8d' },
  avgContainer: { alignItems: 'flex-end' },
  avgLabel: { fontSize: 10, color: '#b2bec3' },
  avgText: { fontSize: 15, fontWeight: 'bold', color: '#4a90e2' },
});

export default StudentCard;