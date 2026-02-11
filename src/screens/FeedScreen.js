import React, { useEffect, useState, useCallback, useContext } from 'react';
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
  Image 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native'; 
import Icon from 'react-native-vector-icons/Ionicons';
import apiClient from '../api/apiClient';
import PostCard from '../components/PostCard';
import RecommendationCard from '../components/RecommendationCard';
import CustomButton from '../components/CustomButton';
import { ThemeContext } from '../context/ThemeContext'; // [YENİ] Tema Context

const FeedScreen = ({ route, navigation }) => {
  const { userId, role } = route.params || {}; 
  
  // [YENİ] Tema Bağlantısı
  const { theme } = useContext(ThemeContext);

  // --- STATE YÖNETİMİ ---
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Arama ve Öneri State'leri
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  // Yorum Modal State'leri
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const isFocused = useIsFocused(); 

  // --- VERİ ÇEKME FONKSİYONLARI ---
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

  const fetchRecommendations = async () => {
    try {
        const res = await apiClient.get(`/social/recommendations/${userId}/${role}`);
        setRecommendations(res.data);
    } catch (error) {
        console.log("Öneri çekilemedi", error);
    }
  };

  // --- OTOMATİK DÖNGÜ VE VERİ ÇEKME ---
  useEffect(() => {
    let intervalId;

    if (isFocused && !isSearching) {
      fetchPosts();
      fetchRecommendations();

      intervalId = setInterval(() => {
        fetchRecommendations();
      }, 86400000); 
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isFocused, isSearching, fetchPosts]); 

  // --- FONKSİYONLAR ---
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

  const handleLike = async (postId) => {
    const originalPosts = [...posts];
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        const currentlyLiked = p.is_liked === 1;
        return { ...p, is_liked: currentlyLiked ? 0 : 1, like_count: currentlyLiked ? Math.max(0, p.like_count - 1) : p.like_count + 1 };
      }
      return p;
    });
    setPosts(updatedPosts);

    try {
      const response = await apiClient.post('/social/like', { post_id: postId, user_id: userId, user_role: role });
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

  const handleDeletePost = async (postId) => {
    try {
      const res = await apiClient.delete(`/social/post/${postId}`, { data: { userId, role } });
      if (res.data.success) fetchPosts(true);
    } catch (error) {
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
    fetchRecommendations();
  };

  const handleFollowRecommendation = async (targetId, targetRole) => {
    setRecommendations(prev => prev.filter(user => !(user.id === targetId && user.role === targetRole)));
    
    try {
        await apiClient.post('/social/follow', {
            follower_id: userId, follower_role: role,
            following_id: targetId, following_role: targetRole
        });
    } catch (error) {
        console.error("Takip hatası", error);
    }
  };

  // --- RENDER ---
  const renderUserResult = ({ item }) => (
    <TouchableOpacity 
      style={[styles.userCard, { backgroundColor: theme.cardBg }]}
      onPress={() => {
        Keyboard.dismiss();
        navigation.navigate('UserProfile', { 
            userId: item.id, role: item.role, currentUserId: userId, currentRole: role
        });
      }}
    >
      {item.profile_image ? (
        <Image source={{ uri: item.profile_image }} style={[styles.avatarImage, { borderColor: theme.borderColor }]} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.inputBg, borderColor: theme.borderColor }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
      )}
      <View>
        <Text style={[styles.userName, { color: theme.textColor }]}>{item.name} {item.lastname}</Text>
        <Text style={[styles.userRole, { color: theme.subTextColor }]}>
            {item.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
        </Text>
      </View>
      <Icon name="chevron-forward" size={20} color={theme.subTextColor} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      
      {/* Arama Çubuğu */}
      <View style={[styles.searchContainer, { backgroundColor: theme.cardBg }]}>
        <Icon name="search" size={20} color={theme.subTextColor} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.textColor }]}
          placeholder="Kullanıcı Ara..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor={theme.subTextColor}
        />
        {isSearching && (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            setIsSearching(false);
            Keyboard.dismiss();
          }}>
            <Icon name="close-circle" size={20} color={theme.subTextColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* İÇERİK */}
      {isSearching ? (
        /* ARAMA SONUÇLARI */
        <FlatList
          data={searchResults}
          keyExtractor={(item) => `${item.role}-${item.id}`}
          renderItem={renderUserResult}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.subTextColor }]}>Kullanıcı bulunamadı.</Text>
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        /* NORMAL AKIŞ (FEED) */
        loading && !refreshing ? (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        ) : (
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id.toString()}
                /* --- HEADER: ÖNERİLER --- */
                ListHeaderComponent={
                    recommendations.length > 0 ? (
                        <View style={[styles.recContainer, { backgroundColor: theme.cardBg, borderBottomColor: theme.borderColor }]}>
                            <Text style={[styles.recTitle, { color: theme.textColor }]}>Tanıyor Olabileceğin Kişiler</Text>
                            
                            <FlatList
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                data={recommendations}
                                keyExtractor={(item) => `rec-${item.role}-${item.id}`}
                                renderItem={({ item }) => (
                                    <RecommendationCard 
                                        item={item}
                                        onProfilePress={(id, r) => navigation.navigate('UserProfile', { userId: id, role: r, currentUserId: userId, currentRole: role })}
                                        onFollow={handleFollowRecommendation}
                                    />
                                )}
                                contentContainerStyle={{ paddingHorizontal: 10 }}
                            />
                        </View>
                    ) : null
                }
                /* ------------------------ */
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
                    <Icon name="chatbubbles-outline" size={50} color={theme.subTextColor} />
                    <Text style={[styles.emptyText, { color: theme.subTextColor }]}>Henüz paylaşım yok.</Text>
                </View>
                }
                contentContainerStyle={{ paddingBottom: 80 }}
            />
        )
      )}

      {/* Yorum Modalı */}
      <Modal visible={commentModalVisible} animationType="fade" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textColor }]}>Yorum Yap</Text>
                <TouchableOpacity onPress={() => { setCommentModalVisible(false); setCommentText(''); }}>
                    <Icon name="close" size={24} color={theme.iconColor} />
                </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.commentInput, { backgroundColor: theme.inputBg, color: theme.textColor, borderColor: theme.borderColor }]}
              placeholder="Yanıtını paylaş..."
              placeholderTextColor={theme.subTextColor}
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
  container: { flex: 1 }, // Renk dinamik
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    height: 50,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1
  },
  avatarImage: { 
    width: 40, height: 40, borderRadius: 20, marginRight: 15, 
    borderWidth: 1,
  },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
    borderWidth: 1
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#4a90e2' },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userRole: { fontSize: 12 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', marginTop: 15, fontSize: 16, lineHeight: 22 },
  fab: {
    position: 'absolute', right: 25, bottom: 25, backgroundColor: '#007bff',
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 20, borderRadius: 15, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  commentInput: { borderWidth: 1, borderRadius: 10, padding: 12, height: 120, textAlignVertical: 'top', marginBottom: 15 },

  recContainer: { marginBottom: 15, paddingVertical: 15, borderBottomWidth: 1 },
  recTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, marginBottom: 10 },
});

export default FeedScreen;