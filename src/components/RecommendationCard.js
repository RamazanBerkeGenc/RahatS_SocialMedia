import React, { useContext } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeContext } from '../context/ThemeContext'; // [YENİ] Tema Context

const RecommendationCard = ({ item, onProfilePress, onFollow }) => {
  // [YENİ] Tema Bağlantısı
  const { theme } = useContext(ThemeContext);

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
      {/* Profil Alanı (Tıklanabilir) */}
      <TouchableOpacity 
        style={styles.content}
        onPress={() => onProfilePress(item.id, item.role)}
        activeOpacity={0.8}
      >
        {item.profile_image ? (
            <Image 
              source={{ uri: item.profile_image }} 
              style={[styles.image, { borderColor: theme.borderColor }]} 
            />
        ) : (
            <View style={[styles.placeholder, { backgroundColor: theme.inputBg }]}>
                <Text style={styles.placeholderText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
        )}
        
        <Text style={[styles.name, { color: theme.textColor }]} numberOfLines={1}>
            {item.name} {item.lastname}
        </Text>
        <Text style={[styles.role, { color: theme.subTextColor }]}>
            {item.role === 'teacher' ? '👨‍🏫 Öğretmen' : '🎓 Öğrenci'}
        </Text>
      </TouchableOpacity>
      
      {/* Takip Et Butonu */}
      <TouchableOpacity 
        style={styles.followBtn}
        onPress={() => onFollow(item.id, item.role)}
        activeOpacity={0.7}
      >
        <Text style={styles.followText}>Takip Et</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { 
    width: 140, 
    height: 190, 
    borderWidth: 1, 
    borderRadius: 12, 
    marginRight: 10, 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 10,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: {width:0, height:1}, 
    shadowOpacity:0.1
  },
  content: { 
    alignItems: 'center', 
    width: '100%',
    flex: 1,
    justifyContent: 'center'
  },
  image: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    marginBottom: 8,
    borderWidth: 1,
  },
  placeholder: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  placeholderText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#4a90e2' 
  },
  name: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    textAlign: 'center',
    marginBottom: 2
  },
  role: { 
    fontSize: 11, 
    marginBottom: 5 
  },
  followBtn: { 
    backgroundColor: '#007bff', 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 20, 
    width: '100%',
    alignItems: 'center'
  },
  followText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
});

export default RecommendationCard;