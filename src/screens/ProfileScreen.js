import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, 
  ActivityIndicator, RefreshControl 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import apiClient from '../api/apiClient';
import PostCard from '../components/PostCard';

const ProfileScreen = ({ route, navigation }) => {
  const { userId, role, currentUserId, currentRole } = route.params || {};
  const isFocused = useIsFocused();
  
  const [userPosts, setUserPosts] = useState([]);
  const [fullName, setFullName] = useState('');
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOwnProfile = userId === currentUserId && role === currentRole;

  const fetchProfileData = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing && userPosts.length === 0) setLoading(true);
      
      // 1. İSİM ÇEKME MANTIĞI
      try {
        if (role === 'student') {
          const studentRes = await apiClient.get(`/student/dashboard/${userId}`);
          const info = studentRes.data.studentInfo;
          if (info) setFullName(`${info.name} ${info.lastname}`);
        } else if (role === 'teacher') {
          const teacherRes = await apiClient.get(`/teacher/students/${userId}`);
          const tData = teacherRes.data[0];
          if (tData) {
            setFullName(`${tData.teacher_name || tData.name} ${tData.teacher_lastname || tData.lastname}`);
          }
        }
      } catch (err) {
        console.log("İsim çekme hatası:", err);
      }

      // 2. PROFİL İSTATİSTİKLERİ VE POSTLAR
      const res = await apiClient.get(`/social/profile/${userId}/${role}/${currentUserId}/${currentRole}`);
      
      if (res.data && res.data[0]) {
        const profileStats = res.data[0][0];
        setStats({
          followers: profileStats?.followers_count || 0,
          following: profileStats?.following_count || 0
        });
        setIsFollowing(profileStats?.is_following === 1);
        setUserPosts(res.data[1] || []);
      }

    } catch (error) {
      console.error("Profil yükleme hatası:", error);
      if (!fullName) setFullName("Kullanıcı");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, role, currentUserId, currentRole]);

  useEffect(() => {
    if (userId && isFocused) {
      fetchProfileData();
    }
  }, [userId, isFocused, fetchProfileData]);

  // --- BEĞENİ SİSTEMİ (FeedScreen Mimarisi ile Aynı) ---
  const handlePostLike = async (postId) => {
    const originalPosts = [...userPosts];
    const updatedPosts = userPosts.map(post => {
      if (post.id === postId) {
        const currentlyLiked = post.is_liked === 1;
        return {
          ...post,
          is_liked: currentlyLiked ? 0 : 1,
          like_count: currentlyLiked ? Math.max(0, post.like_count - 1) : post.like_count + 1
        };
      }
      return post;
    });
    setUserPosts(updatedPosts);

    try {
      const response = await apiClient.post('/social/like', {
        post_id: postId,
        user_id: currentUserId,
        user_role: currentRole
      });

      if (response.data.success) {
        setUserPosts(currentPosts => currentPosts.map(p => {
          if (p.id === postId) return { ...p, is_liked: response.data.is_liked };
          return p;
        }));
      } else {
        setUserPosts(originalPosts);
      }
    } catch (error) {
      setUserPosts(originalPosts);
    }
  };

  // --- TAKİP SİSTEMİ (Düzeltilmiş ve Senkronize) ---
  const handleFollowToggle = async () => {
    const previousState = isFollowing;
    const previousFollowers = stats.followers;

    // 1. İyimser Güncelleme
    setIsFollowing(!previousState);
    setStats(prev => ({
      ...prev,
      followers: previousState ? Math.max(0, prev.followers - 1) : prev.followers + 1
    }));

    try {
      // 2. API İsteği
      const response = await apiClient.post('/social/follow', {
        follower_id: currentUserId,
        follower_role: currentRole,
        following_id: userId,
        following_role: role
      });

      // 3. Backend verisi ile kesin doğrulama
      if (response.data.success) {
        setIsFollowing(response.data.is_following === 1);
      } else {
        throw new Error();
      }
    } catch (error) {
      // Hata durumunda eski haline döndür
      setIsFollowing(previousState);
      setStats(prev => ({ ...prev, followers: previousFollowers }));
      Alert.alert("Hata", "Takip işlemi gerçekleştirilemedi.");
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const res = await apiClient.delete(`/social/post/${postId}`, {
        data: { userId: currentUserId, role: currentRole } 
      });
      if (res.data.success) fetchProfileData(true);
    } catch (error) {
      Alert.alert("Hata", "Gönderi silinemedi.");
    }
  };

  const navigateToDetail = (postItem) => {
    navigation.navigate('Sosyal', {
      screen: 'PostDetail',
      params: { post: postItem, userId: currentUserId, role: currentRole }
    });
  };

  const handleLogout = () => {
    Alert.alert("Çıkış", "Emin misiniz?", [
      { text: "Vazgeç" },
      { text: "Evet", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] }) }
    ]);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {isOwnProfile && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="log-out-outline" size={22} color="#e84118" />
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      )}
      <View style={styles.profileInfo}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{fullName?.charAt(0).toUpperCase() || "?"}</Text>
        </View>
        <Text style={styles.userName} numberOfLines={1}>{fullName || "Yükleniyor..."}</Text>
        <Text style={styles.userRoleText}>{role === 'teacher' ? '👨‍🏫 Yetkili Eğitmen' : '🎓 RahatS Öğrencisi'}</Text>
      </View>
      <View style={styles.statsBar}>
        <View style={styles.statBox}><Text style={styles.statCount}>{userPosts.length}</Text><Text style={styles.statLabel}>Gönderi</Text></View>
        <View style={[styles.statBox, { marginHorizontal: 40 }]}><Text style={styles.statCount}>{stats.followers}</Text><Text style={styles.statLabel}>Takipçi</Text></View>
        <View style={styles.statBox}><Text style={styles.statCount}>{stats.following}</Text><Text style={styles.statLabel}>Takip</Text></View>
      </View>
      {!isOwnProfile && (
        <TouchableOpacity 
          style={[styles.followBtn, isFollowing && styles.unfollowBtn]} 
          onPress={handleFollowToggle}
          activeOpacity={0.7}
        >
          <Text style={[styles.followBtnText, isFollowing && styles.unfollowBtnText]}>
            {isFollowing ? "Takipten Çık" : "Takip Et"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>
      ) : (
        <FlatList
          ListHeaderComponent={renderHeader}
          data={userPosts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <PostCard 
              post={item} 
              currentUserId={currentUserId}
              currentRole={currentRole}
              onLike={() => handlePostLike(item.id)}
              onComment={() => navigateToDetail(item)}
              onDelete={handleDeletePost}
              onProfilePress={(id, r) => {
                if (id !== userId || r !== role) {
                  navigation.push('Profil', { userId: id, role: r });
                }
              }} 
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfileData(true); }} colors={['#007bff']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="documents-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>Henüz paylaşım yok.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { backgroundColor: '#fff', padding: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 4, alignItems: 'center' },
  logoutBtn: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center' },
  logoutText: { color: '#e84118', marginLeft: 4, fontWeight: 'bold', fontSize: 13 },
  profileInfo: { alignItems: 'center', marginTop: 10 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 4, borderColor: '#e3f2fd' },
  avatarLetter: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#2d3436' },
  userRoleText: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },
  statsBar: { flexDirection: 'row', justifyContent: 'center', marginTop: 25, borderTopWidth: 1, borderTopColor: '#f1f2f6', paddingTop: 20, width: '100%' },
  statBox: { alignItems: 'center' },
  statCount: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  statLabel: { fontSize: 12, color: '#95a5a6' },
  followBtn: { backgroundColor: '#007bff', paddingVertical: 10, paddingHorizontal: 50, borderRadius: 25, marginTop: 20, width: '80%', alignItems: 'center' },
  unfollowBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  followBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  unfollowBtnText: { color: '#666' },
  emptyContainer: { padding: 60, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#95a5a6', marginTop: 10, fontStyle: 'italic' }
});

export default ProfileScreen;