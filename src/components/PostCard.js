import React, { useContext } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from '../context/ThemeContext'; // [YENİ] Tema Context

const PostCard = ({ post, onLike, onComment, onProfilePress, onDelete, currentUserId, currentRole }) => {
  
  // [YENİ] Tema Bağlantısı
  const { theme } = useContext(ThemeContext);

  // Beğeni durumu kontrolü
  const isLiked = post.is_liked === 1;

  // İsim Gösterimi: İsim ve Soyisimi birleştir, yoksa "Kullanıcı" yaz
  const displayName = post.author_name 
    ? `${post.author_name} ${post.author_lastname || ''}`.trim() 
    : "Kullanıcı";

  // Gönderi sahibi kontrolü
  const isOwner = post.user_id == currentUserId && post.user_role == currentRole;

  // Tarih Formatlama Fonksiyonu
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000; // Saniye cinsinden fark

    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
    return date.toLocaleDateString('tr-TR'); 
  };

  const confirmDelete = () => {
    Alert.alert(
      "Gönderiyi Sil",
      "Bu gönderiyi kalıcı olarak silmek istediğinize emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Sil", style: "destructive", onPress: () => onDelete(post.id) }
      ]
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
      {/* Header: Profil Bilgisi */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.authorInfo} 
          onPress={() => onProfilePress(post.user_id, post.user_role)}
        >
          {/* Profil Resmi veya Baş Harf */}
          {post.author_image ? (
            <Image 
              source={{ uri: post.author_image }} 
              style={[styles.avatarImage, { borderColor: theme.borderColor, backgroundColor: theme.inputBg }]} 
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { borderColor: theme.borderColor, backgroundColor: theme.inputBg }]}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View>
            <Text style={[styles.author, { color: theme.textColor }]}>{displayName}</Text>
            
            {/* Rol ve Tarih Yan Yana */}
            <View style={styles.subHeader}>
              <Text style={[styles.role, { color: theme.subTextColor }]}>
                {post.user_role === 'teacher' ? '👨‍🏫 Öğretmen' : '🎓 Öğrenci'}
              </Text>
              <Text style={[styles.dateText, { color: theme.subTextColor }]}>
                • {formatDate(post.created_at)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Silme veya Seçenekler Butonu */}
        {isOwner ? (
          <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
            <Icon name="trash-outline" size={20} color="#ff4757" />
          </TouchableOpacity>
        ) : (
          <Icon name="ellipsis-horizontal" size={20} color={theme.subTextColor} />
        )}
      </View>
      
      {/* İçerik */}
      <Text style={[styles.content, { color: theme.textColor }]}>{post.content}</Text>
      
      {/* Post Görseli */}
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Footer: Beğeni ve Yorum */}
      <View style={[styles.footer, { borderTopColor: theme.borderColor }]}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onLike(post.id)}
          activeOpacity={0.6}
        >
          <Icon 
            name={isLiked ? "heart" : "heart-outline"} 
            size={22} 
            color={isLiked ? "#e84118" : theme.subTextColor} 
          />
          <Text style={[styles.actionText, { color: theme.subTextColor }, isLiked && { color: '#e84118' }]}>
            {post.like_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onComment(post)}
          activeOpacity={0.6}
        >
          <Icon name="chatbubble-outline" size={20} color="#4a90e2" />
          <Text style={[styles.actionText, { color: theme.subTextColor }]}>
            {post.comment_count || 0} Yorum
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { 
    marginBottom: 12, 
    padding: 15, 
    borderRadius: 12,
    elevation: 3, 
    shadowColor: '#000', 
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
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  avatarText: {
    fontWeight: 'bold',
    color: '#4a90e2',
    fontSize: 16
  },
  author: { 
    fontWeight: 'bold', 
    fontSize: 15, 
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  role: { 
    fontSize: 11, 
  },
  dateText: {
    fontSize: 11,
    marginLeft: 6
  },
  deleteBtn: {
    padding: 5
  },
  content: { 
    fontSize: 15, 
    lineHeight: 22, 
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
    fontWeight: '600'
  }
});

export default PostCard;