import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const PostCard = ({ post, onLike, onComment, onProfilePress }) => {
  
  // Beğeni durumuna göre ikon ve renk belirleme
  // Veritabanından gelen 'is_liked' alanı 1 ise dolu kalp, 0 ise boş kalp gösterir
  const isLiked = post.is_liked === 1;

  return (
    <View style={styles.card}>
      {/* Profil Bilgisi - Tıklanabilir */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => onProfilePress(post.user_id, post.user_role)}
      >
        <View style={styles.authorInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{post.author_name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.author}>{post.author_name}</Text>
            <Text style={styles.role}>
              {post.user_role === 'teacher' ? '👨‍🏫 Öğretmen' : '🎓 Öğrenci'}
            </Text>
          </View>
        </View>
        <Icon name="ellipsis-horizontal" size={20} color="#666" />
      </TouchableOpacity>
      
      {/* İçerik */}
      <Text style={styles.content}>{post.content}</Text>
      
      {/* Görsel */}
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Etkileşim Butonları */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onLike(post.id)}
          activeOpacity={0.6}
        >
          {/* BEĞENİ GERİ ALMA GÖRSELİ: isLiked durumuna göre ikon değişir */}
          <Icon 
            name={isLiked ? "heart" : "heart-outline"} 
            size={22} 
            color={isLiked ? "#e84118" : "#636e72"} 
          />
          <Text style={[styles.actionText, isLiked && { color: '#e84118' }]}>
            {post.like_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onComment(post)}
          activeOpacity={0.6}
        >
          <Icon name="chatbubble-outline" size={20} color="#4a90e2" />
          <Text style={styles.actionText}>{post.comment_count || 0} Yorum</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#fff', 
    marginBottom: 12, 
    padding: 15, 
    borderRadius: 12,
    elevation: 3, // Android gölge
    shadowColor: '#000', // iOS gölge
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12 
  },
  authorInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f1f2f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee'
  },
  avatarText: {
    fontWeight: 'bold',
    color: '#4a90e2',
    fontSize: 16
  },
  author: { 
    fontWeight: 'bold', 
    fontSize: 15, 
    color: '#2d3436' 
  },
  role: { 
    fontSize: 11, 
    color: '#7f8c8d',
    marginTop: 2
  },
  content: { 
    fontSize: 15, 
    lineHeight: 22, 
    color: '#2f3640',
    marginBottom: 12 
  },
  postImage: { 
    width: '100%', 
    height: 250, 
    borderRadius: 10, 
    marginBottom: 12,
    backgroundColor: '#f9f9f9' 
  },
  footer: { 
    flexDirection: 'row', 
    borderTopWidth: 0.8, 
    borderTopColor: '#f1f2f6', 
    paddingTop: 12,
    marginTop: 5
  },
  actionButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 30,
    paddingVertical: 5
  },
  actionText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#636e72',
    fontWeight: '600'
  }
});

export default PostCard;