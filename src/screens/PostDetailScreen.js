import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import apiClient from '../api/apiClient';
import PostCard from '../components/PostCard';

const PostDetailScreen = ({ route, navigation }) => {
  const { post, userId, role } = route.params; // userId/role: Giriş yapan kullanıcı
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const response = await apiClient.get(`/social/comments/${post.id}`);
      setComments(response.data);
    } catch (error) {
      console.error("Yorumlar yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    setSending(true);
    try {
      const response = await apiClient.post('/social/comment', {
        post_id: post.id,
        user_id: userId,
        user_role: role,
        comment_text: commentText.trim()
      });

      if (response.data.success) {
        setCommentText('');
        fetchComments(); 
      }
    } catch (error) {
      // AI GÜVENLİK FİLTRESİ (HTTP 400)
      // Backend yorumu uygunsuz bulursa 400 döner ve işlem durur.
      if (error.response && error.response.status === 400) {
        Alert.alert("Güvenlik Filtresi", error.response.data.message || "Yorumunuz kurallara aykırı bulundu.");
      } else {
        Alert.alert("Hata", "Yanıt gönderilemedi. Lütfen bağlantınızı kontrol edin.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert("Yorumu Sil", "Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      { 
        text: "Sil", 
        style: "destructive", 
        onPress: async () => {
          try {
            const res = await apiClient.delete(`/social/comment/${commentId}`, {
              data: { userId, role } 
            });
            if (res.data.success) {
              fetchComments(); 
            }
          } catch (error) {
            Alert.alert("Hata", "Yorum şu an silinemiyor.");
          }
        } 
      }
    ]);
  };

  const handleDeleteMainPost = async (postId) => {
    try {
      const res = await apiClient.delete(`/social/post/${postId}`, {
        data: { userId, role }
      });
      if (res.data.success) {
        Alert.alert("Başarılı", "Gönderi silindi.");
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Hata", "Gönderi silinemedi.");
    }
  };

  const renderComment = ({ item }) => {
    const canDelete = role === 'teacher' || (item.user_id == userId && item.user_role == role);

    return (
      <View style={styles.commentContainer}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAvatar}>
            <Text style={styles.avatarText}>{item.author_name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.commentContent}>
            <View style={styles.commentRow}>
              <Text style={styles.commentAuthor}>{item.author_name}</Text>
              {canDelete && (
                <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.deleteIcon}>
                  <Icon name="trash-outline" size={16} color="#ff4757" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.commentText}>{item.comment_text}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderComment}
        ListHeaderComponent={
          <View style={styles.mainPostContainer}>
            <PostCard 
              post={post} 
              currentUserId={userId}
              currentRole={role}
              onLike={() => {}} 
              onComment={() => {}} 
              onDelete={handleDeleteMainPost}
              onProfilePress={(id, r) => navigation.navigate('Profil', { userId: id, role: r })}
            />
            <View style={styles.divider} />
            <Text style={styles.replyTitle}>Yanıtlar</Text>
          </View>
        }
        ListEmptyComponent={
          !loading && <Text style={styles.noCommentText}>Henüz yanıt yok. İlk yanıtı sen paylaş!</Text>
        }
      />

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Yanıtını paylaş..."
          placeholderTextColor="#95a5a6"
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, (!commentText.trim() || sending) && styles.disabledBtn]} 
          onPress={handleSendComment}
          disabled={sending || !commentText.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>Yanıtla</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mainPostContainer: { borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginHorizontal: 15 },
  replyTitle: { fontSize: 16, fontWeight: 'bold', padding: 15, color: '#2d3436' },
  commentContainer: { paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f2f6' },
  commentHeader: { flexDirection: 'row' },
  commentAvatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#f1f2f6', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { fontWeight: 'bold', color: '#007bff', fontSize: 14 },
  commentContent: { flex: 1 },
  commentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  commentAuthor: { fontWeight: 'bold', fontSize: 14, color: '#2d3436' },
  commentText: { fontSize: 14, color: '#2f3640', lineHeight: 18 },
  deleteIcon: { padding: 4 },
  noCommentText: { textAlign: 'center', marginTop: 30, color: '#95a5a6', fontStyle: 'italic' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f2f6',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
    color: '#2d3436'
  },
  sendBtn: {
    backgroundColor: '#007bff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center'
  },
  disabledBtn: { backgroundColor: '#a5c9f5' },
  sendBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default PostDetailScreen;