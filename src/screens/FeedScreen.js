import React, { useEffect, useState } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl, 
  Text, 
  TouchableOpacity,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { useIsFocused } from '@react-navigation/native'; 
import Icon from 'react-native-vector-icons/Ionicons';
import apiClient from '../api/apiClient';
import PostCard from '../components/PostCard';
import CustomButton from '../components/CustomButton';

const FeedScreen = ({ route, navigation }) => {
  const { userId, role } = route.params || {}; 
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const isFocused = useIsFocused(); 

  const fetchPosts = async () => {
    try {
      const response = await apiClient.get('/social/feed');
      setPosts(response.data);
    } catch (error) {
      console.error("Akış çekilemedi:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchPosts();
    }
  }, [isFocused]);

  // --- OPTIMISTIC LIKE (İyimser Beğeni) ---
  const handleLike = async (postId) => {
    // 1. Durumu kaydet (Hata olursa geri dönmek için)
    const originalPosts = [...posts];

    // 2. UI'ı anında güncelle
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        const currentlyLiked = p.is_liked === 1;
        return {
          ...p,
          is_liked: currentlyLiked ? 0 : 1, // Varsa kaldır, yoksa ekle
          like_count: currentlyLiked ? Math.max(0, p.like_count - 1) : p.like_count + 1
        };
      }
      return p;
    });
    setPosts(updatedPosts);

    try {
      // 3. Arkaplanda API isteğini at
      const response = await apiClient.post('/social/like', {
        post_id: postId,
        user_id: userId,
        user_role: role
      });

      if (!response.data.success) {
        // Sunucu başarısızsa eski haline çek
        setPosts(originalPosts);
      }
    } catch (error) {
      // Bağlantı hatası olursa eski haline çek
      setPosts(originalPosts);
      console.error("Beğeni hatası:", error);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    
    setSendingComment(true);
    try {
      const response = await apiClient.post('/social/comment', {
        post_id: selectedPostId,
        user_id: userId,
        user_role: role,
        comment_text: commentText.trim()
      });

      if (response.data.success) {
        setCommentText('');
        setCommentModalVisible(false);
        fetchPosts(); // Yorum sayısını güncellemek için listeyi yenile
      } else {
        Alert.alert("Uyarı", response.data.message);
      }
    } catch (error) {
      Alert.alert("Hata", "Yorum gönderilemedi.");
    } finally {
      setSendingComment(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Güvenli Akış Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PostDetail', { 
              post: item, 
              userId: userId, 
              role: role 
            })}
          >
            <PostCard 
              post={item} 
              onLike={(id) => handleLike(id)}
              onComment={(post) => {
                setSelectedPostId(post.id);
                setCommentModalVisible(true);
              }}
              onProfilePress={(id, userRole) => {
                navigation.navigate('Profil', { userId: id, role: userRole });
              }}
            />
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007bff']} />
        }
        contentContainerStyle={posts.length === 0 && { flex: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chatbubbles-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Henüz paylaşım yok.{"\n"}Hadi, ilk sen bir şeyler yaz!</Text>
          </View>
        }
      />

      <Modal visible={commentModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yorum Yap</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Yorumunuzu yazın..."
              multiline
              value={commentText}
              onChangeText={setCommentText}
            />
            <CustomButton 
              title={sendingComment ? "Gönderiliyor..." : "Gönder"} 
              onPress={handleSendComment} 
              color="#007bff" 
            />
            <TouchableOpacity 
              onPress={() => {
                setCommentModalVisible(false);
                setCommentText('');
              }} 
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('NewPost', { 
          userId: userId, 
          role: role 
        })}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#007bff', fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 15, color: '#888', fontSize: 16, lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 25,
    backgroundColor: '#007bff',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 300
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 15
  },
  closeBtn: {
    marginTop: 10,
    alignItems: 'center'
  },
  closeBtnText: {
    color: '#ff4757',
    fontWeight: 'bold'
  }
});

export default FeedScreen;