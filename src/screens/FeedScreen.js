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
  Platform,
  Keyboard,
  Image // [YENİ] Resim bileşeni eklendi
} from 'react-native';
import { useIsFocused } from '@react-navigation/native'; 
import Icon from 'react-native-vector-icons/Ionicons';
import apiClient from '../api/apiClient';
import PostCard from '../components/PostCard';
import CustomButton from '../components/CustomButton';

const FeedScreen = ({ route, navigation }) => {
  const { userId, role } = route.params || {}; 
  
  // --- STATE YÖNETİMİ ---
  const [posts, setPosts] = useState([]); // Normal Akış
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Arama State'leri
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Yorum Modal State'leri
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const isFocused = useIsFocused(); 

  // --- 1. POST AKIŞINI ÇEKME ---
  const fetchPosts = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh && posts.length === 0) setLoading(true);
      const response = await apiClient.get(`/social/feed/${userId}/${role}`);
      setPosts(response.data);
    } catch (error) {
      console.error("Akış çekilemedi:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, role]);

  useEffect(() => {
    if (isFocused && !isSearching) {
      fetchPosts();
    }
  }, [isFocused, fetchPosts, isSearching]);

  // --- 2. ARAMA FONKSİYONU ---
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length > 1) {
      setIsSearching(true);
      try {
        const response = await apiClient.get(`/social/search?q=${text}`);
        setSearchResults(response.data);
      } catch (error) {
        console.error("Arama hatası:", error);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  // --- 3. BEĞENİ SİSTEMİ ---
  const handleLike = async (postId) => {
    const originalPosts = [...posts];
    // İyimser Güncelleme
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
      const response = await apiClient.post('/social/like', {
        post_id: postId, user_id: userId, user_role: role
      });
      if (response.data.success) {
        setPosts(currentPosts => currentPosts.map(p => {
          if (p.id === postId) return { ...p, is_liked: response.data.is_liked };
          return p;
        }));
      } else {
        setPosts(originalPosts);
      }
    } catch (error) {
      setPosts(originalPosts);
    }
  };

  // --- 4. SİLME VE YORUM ---
  const handleDeletePost = async (postId) => {
    const originalPosts = [...posts];
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    try {
      const res = await apiClient.delete(`/social/post/${postId}`, { data: { userId, role } });
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
        post_id: selectedPostId, user_id: userId, user_role: role, comment_text: commentText.trim()
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

  // --- 5. ARAMA SONUCU KARTI (GÜNCELLENDİ) ---
  const renderUserResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => {
        Keyboard.dismiss();
        navigation.navigate('UserProfile', { 
            userId: item.id, 
            role: item.role,
            currentUserId: userId,
            currentRole: role
        });
      }}
    >
      {/* --- [YENİ] RESİM KONTROLÜ --- */}
      {item.profile_image ? (
        <Image source={{ uri: item.profile_image }} style={styles.avatarImage} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
      )}
      
      <View>
        <Text style={styles.userName}>{item.name} {item.lastname}</Text>
        <Text style={styles.userRole}>
            {item.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
        </Text>
      </View>
      <Icon name="chevron-forward" size={20} color="#ccc" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      
      {/* --- ARAMA ÇUBUĞU --- */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Öğrenci veya Öğretmen Ara..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#95a5a6"
        />
        {isSearching && (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            setIsSearching(false);
            Keyboard.dismiss();
          }}>
            <Icon name="close-circle" size={20} color="#7f8c8d" />
          </TouchableOpacity>
        )}
      </View>

      {/* --- İÇERİK ALANI --- */}
      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => `${item.role}-${item.id}`}
          renderItem={renderUserResult}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Kullanıcı bulunamadı.</Text>
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        loading && !refreshing ? (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        ) : (
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                <TouchableOpacity 
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('PostDetail', { post: item, userId, role })}
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
                        navigation.navigate('UserProfile', { 
                            userId: id, role: userRole, currentUserId: userId, currentRole: role 
                        });
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
                    <Text style={styles.emptyText}>Henüz paylaşım yok.</Text>
                </View>
                }
                contentContainerStyle={{ paddingBottom: 80 }}
            />
        )
      )}

      {/* --- YORUM MODALI --- */}
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

      {!isSearching && (
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    height: 50,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#2d3436', fontSize: 16 },
  
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1
  },
  // --- [YENİ] RESİM STİLLERİ ---
  avatarImage: { 
    width: 40, height: 40, borderRadius: 20, marginRight: 15, 
    borderWidth: 1, borderColor: '#eee', backgroundColor: '#f1f2f6'
  },
  // ---------------------------
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f2f6',
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
    borderWidth: 1, borderColor: '#eee'
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#4a90e2' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#2d3436' },
  userRole: { fontSize: 12, color: '#7f8c8d' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
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