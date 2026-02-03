import React, { useEffect, useState, useCallback } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
  Platform
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

  // AKIŞI ÇEKME: Artık kullanıcı ID ve Rol bilgisini gönderiyoruz
  const fetchPosts = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh && posts.length === 0) setLoading(true);
      
      // Backend'e kim olduğumuzu söylüyoruz (is_liked kontrolü için)
      const response = await apiClient.get(`/social/feed/${userId}/${role}`);
      setPosts(response.data);
    } catch (error) {
      console.error("Akış çekilemedi:", error);
      Alert.alert("Hata", "Sosyal akış şu an yüklenemiyor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, role]);

  useEffect(() => {
    if (isFocused) {
      fetchPosts();
    }
  }, [isFocused, fetchPosts]);

  // --- BEĞENİ SİSTEMİ (GÜNCELLENDİ) ---
  const handleLike = async (postId) => {
    const originalPosts = [...posts];

    // 1. İyimser Güncelleme (Hız hissi için)
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        const currentlyLiked = p.is_liked === 1;
        return {
          ...p,
          is_liked: currentlyLiked ? 0 : 1,
          like_count: currentlyLiked ? Math.max(0, p.like_count - 1) : p.like_count + 1
        };
      }
      return p;
    });
    setPosts(updatedPosts);

    try {
      // 2. Veritabanı İşlemi
      const response = await apiClient.post('/social/like', {
        post_id: postId,
        user_id: userId,
        user_role: role
      });

      // 3. Veritabanından gelen kesin sonuçla (is_liked: 1/0) state'i doğrula
      if (response.data.success) {
        setPosts(currentPosts => currentPosts.map(p => {
          if (p.id === postId) {
            return { ...p, is_liked: response.data.is_liked };
          }
          return p;
        }));
      } else {
        setPosts(originalPosts); // Hata varsa geri al
      }
    } catch (error) {
      setPosts(originalPosts); // Bağlantı hatasında geri al
      console.error("Beğeni hatası:", error);
    }
  };

  const handleDeletePost = async (postId) => {
    const originalPosts = [...posts];
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));

    try {
      const res = await apiClient.delete(`/social/post/${postId}`, {
        data: { userId, role } 
      });
      if (!res.data.success) throw new Error();
    } catch (error) {
      setPosts(originalPosts);
      Alert.alert("Hata", "Gönderi silinemedi.");
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
        fetchPosts(true); 
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        Alert.alert("Güvenlik Filtresi", error.response.data.message);
      } else {
        Alert.alert("Hata", "Yorum gönderilemedi.");
      }
    } finally {
      setSendingComment(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(true);
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
              currentUserId={userId} 
              currentRole={role}     
              onLike={() => handleLike(item.id)}
              onComment={(postItem) => {
                setSelectedPostId(postItem.id);
                setCommentModalVisible(true);
              }}
              onProfilePress={(id, userRole) => {
                navigation.navigate('Profil', { userId: id, role: userRole });
              }}
              onDelete={handleDeletePost}
            />
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007bff']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chatbubbles-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Henüz paylaşım yok.{"\n"}Hadi, ilk sen bir şeyler yaz!</Text>
          </View>
        }
      />

      <Modal visible={commentModalVisible} animationType="fade" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yorum Yap</Text>
                <TouchableOpacity onPress={() => { setCommentModalVisible(false); setCommentText(''); }}>
                    <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Yanıtını paylaş..."
              placeholderTextColor="#999"
              multiline
              value={commentText}
              onChangeText={setCommentText}
              autoFocus={true}
            />
            <CustomButton 
              title={sendingComment ? "Gönderiliyor..." : "Yanıtla"} 
              onPress={handleSendComment} 
              color="#007bff" 
              disabled={!commentText.trim() || sendingComment}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('NewPost', { 
          userId: userId, 
          role: role,
          onPostCreated: () => fetchPosts(true)
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
  emptyContainer: { flex: 4, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 100 },
  emptyText: { textAlign: 'center', marginTop: 15, color: '#888', fontSize: 16, lineHeight: 22 },
  fab: {
    position: 'absolute', right: 25, bottom: 25, backgroundColor: '#007bff',
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  commentInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, height: 120, textAlignVertical: 'top', marginBottom: 15, color: '#333', backgroundColor: '#f9f9f9' }
});

export default FeedScreen;