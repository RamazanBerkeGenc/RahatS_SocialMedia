import React, { useState, useEffect } from 'react';
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
  const { post, userId, role } = route.params; // FeedScreen'den gelen veriler
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const response = await apiClient.get(`/social/comments/${post.id}`);
      setComments(response.data);
    } catch (error) {
      console.error("Yorumlar yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

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
        fetchComments(); // Listeyi güncelle
      } else {
        Alert.alert("Uyarı", response.data.message); // AI Reddi
      }
    } catch (error) {
      Alert.alert("Hata", "Yanıt gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Text style={styles.avatarText}>{item.author_name?.charAt(0)}</Text>
        </View>
        <View style={styles.commentContent}>
          <Text style={styles.commentAuthor}>{item.author_name}</Text>
          <Text style={styles.commentText}>{item.comment_text}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderComment}
        ListHeaderComponent={
          <View style={styles.mainPostContainer}>
            <PostCard 
              post={post} 
              onLike={() => {}} // Gerekirse detay sayfasında da beğeni eklenebilir
              onComment={() => {}} 
              onProfilePress={(id, r) => navigation.navigate('Profil', { userId: id, role: r })}
            />
            <View style={styles.divider} />
            <Text style={styles.replyTitle}>Yanıtlar</Text>
          </View>
        }
        ListEmptyComponent={
          !loading && <Text style={styles.noCommentText}>İlk yanıtı sen paylaş!</Text>
        }
      />

      {/* X TARZI SABİT ALT YANIT ÇUBUĞU */}
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
          style={[styles.sendBtn, !commentText.trim() && styles.disabledBtn]} 
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
  commentAuthor: { fontWeight: 'bold', fontSize: 14, color: '#2d3436', marginBottom: 2 },
  commentText: { fontSize: 14, color: '#2f3640', lineHeight: 18 },
  noCommentText: { textAlign: 'center', marginTop: 30, color: '#95a5a6', fontStyle: 'italic' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
    backgroundColor: '#fff'
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
    borderRadius: 20
  },
  disabledBtn: { backgroundColor: '#a5c9f5' },
  sendBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default PostDetailScreen;