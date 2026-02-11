import React, { useState, useEffect, useCallback, useContext } from 'react';
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
  Alert,
  Image 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import apiClient from '../api/apiClient';
import PostCard from '../components/PostCard';
import { ThemeContext } from '../context/ThemeContext'; // [YENİ] Tema Context

const PostDetailScreen = ({ route, navigation }) => {
  // [YENİ] Tema Bağlantısı
  const { theme } = useContext(ThemeContext);

  const { post, userId, role } = route.params; 
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  // --- YORUMLARI ÇEK ---
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

  // --- YORUM GÖNDER ---
  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    setSending(true);
    try {
      const response = await apiClient.post('/social/comment', {
        post_id: post.id,
        user_id: userId,
        user_role: role,
        comment_text: commentText
      });

      if (response.data.success) {
        setCommentText('');
        fetchComments(); 
      } else {
        Alert.alert("Hata", response.data.message || "Yorum gönderilemedi.");
      }
    } catch (error) {
      Alert.alert("Hata", "Bağlantı hatası.");
    } finally {
      setSending(false);
    }
  };

  // --- YORUM SİL ---
  const handleDeleteComment = async (commentId) => {
    Alert.alert("Sil", "Bu yorumu silmek istiyor musun?", [
      { text: "Vazgeç" },
      { text: "Sil", style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/social/comment/${commentId}`);
            fetchComments();
          } catch (error) {
            Alert.alert("Hata", "Silinemedi.");
          }
        } 
      }
    ]);
  };

  // --- POST İŞLEMLERİ ---
  const handlePostLike = async () => {
    try {
        await apiClient.post('/social/like', { post_id: post.id, user_id: userId, user_role: role });
    } catch (e) { console.log(e); }
  };

  // --- PROFİLE GİTME ---
  const handleProfilePress = (targetId, targetRole) => {
    if (targetId !== userId || targetRole !== role) {
      navigation.push('UserProfile', { 
        userId: targetId, 
        role: targetRole, 
        currentUserId: userId, 
        currentRole: role 
      });
    }
  };

  // --- YORUM KARTI ---
  const renderComment = ({ item }) => (
    <View style={[styles.commentRow, { borderBottomColor: theme.borderColor }]}>
      <TouchableOpacity onPress={() => handleProfilePress(item.user_id, item.user_role)}>
        {item.author_image ? (
           <Image source={{ uri: item.author_image }} style={styles.commentAvatar} />
        ) : (
           <View style={[styles.commentAvatar, styles.placeholderAvatar, { backgroundColor: theme.inputBg }]}>
             <Text style={styles.avatarText}>{item.author_name?.charAt(0).toUpperCase()}</Text>
           </View>
        )}
      </TouchableOpacity>

      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
            <TouchableOpacity onPress={() => handleProfilePress(item.user_id, item.user_role)}>
                <Text style={[styles.commentAuthor, { color: theme.textColor }]}>{item.author_name}</Text>
            </TouchableOpacity>
            
            <Text style={[styles.commentDate, { color: theme.subTextColor }]}>
                {new Date(item.created_at).toLocaleDateString()}
            </Text>
        </View>
        <Text style={[styles.commentText, { color: theme.textColor }]}>{item.comment_text}</Text>
      </View>

      {(item.user_id === userId && item.user_role === role) && (
        <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.deleteIcon}>
          <Icon name="trash-outline" size={18} color="#e74c3c" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderComment}
        ListHeaderComponent={
          <View style={styles.postContainer}>
            <PostCard 
              post={post} 
              currentUserId={userId} 
              currentRole={role}
              onLike={handlePostLike} 
              onComment={() => {}} 
              onDelete={() => {}} 
              onProfilePress={(id, r) => handleProfilePress(id, r)}
            />
            <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />
            <Text style={[styles.commentTitle, { color: theme.textColor }]}>Yorumlar ({comments.length})</Text>
          </View>
        }
        ListEmptyComponent={
          !loading && <Text style={[styles.noCommentText, { color: theme.subTextColor }]}>Henüz yorum yok. İlk yorumu sen yap!</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Yorum Yazma Alanı - Temaya Uyarlandı */}
      <View style={[styles.inputWrapper, { backgroundColor: theme.cardBg, borderTopColor: theme.borderColor }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textColor }]}
          placeholder="Yorum yap..."
          placeholderTextColor={theme.subTextColor}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity 
          onPress={handleSendComment} 
          disabled={sending || !commentText.trim()}
          style={styles.sendBtn}
        >
          {sending ? <ActivityIndicator size="small" color="#007bff" /> : <Icon name="send" size={24} color="#007bff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  postContainer: { marginBottom: 10 },
  divider: { height: 1, marginVertical: 10 },
  commentTitle: { paddingHorizontal: 15, fontWeight: 'bold', marginBottom: 10 },
  
  commentRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  placeholderAvatar: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: '#636e72', fontSize: 16 },
  
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontWeight: 'bold', fontSize: 14 },
  commentDate: { fontSize: 10 },
  commentText: { fontSize: 14, lineHeight: 20 },
  
  deleteIcon: { marginLeft: 10, justifyContent: 'center' },
  noCommentText: { textAlign: 'center', marginTop: 30, fontStyle: 'italic' },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', padding: 10, 
    borderTopWidth: 1
  },
  input: {
    flex: 1, borderRadius: 20, 
    paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100
  },
  sendBtn: { marginLeft: 10, padding: 5 }
});

export default PostDetailScreen;