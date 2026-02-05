import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, 
  ActivityIndicator, RefreshControl, Image, Platform 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage'; // [YENİ] Çıkış için eklendi
import apiClient from '../api/apiClient';
import PostCard from '../components/PostCard';

const ProfileScreen = ({ route, navigation }) => {
  const { userId, role, currentUserId, currentRole } = route.params || {};
  const isFocused = useIsFocused();
  
  // --- STATE ---
  const [userPosts, setUserPosts] = useState([]);
  const [fullName, setFullName] = useState('');
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [profileImage, setProfileImage] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingInfo, setUploadingInfo] = useState(false);

  const isOwnProfile = userId === currentUserId && role === currentRole;

  // --- VERİ ÇEKME ---
  const fetchProfileData = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing && userPosts.length === 0) setLoading(true);
      
      // 1. İsim Çekme (Yedek Yöntem)
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
        console.log("Yedek isim çekme hatası (Önemsiz):", err);
      }

      // 2. Profil İstatistikleri, Resim ve Postlar
      const res = await apiClient.get(`/social/profile/${userId}/${role}/${currentUserId}/${currentRole}`);
      
      if (res.data && res.data[0]) {
        const profileStats = res.data[0][0]; // İlk sorgu sonucu
        setStats({
          followers: profileStats?.followers || 0,
          following: profileStats?.following || 0
        });
        setIsFollowing(profileStats?.is_following === 1);
        setProfileImage(profileStats?.profile_image);
        
        // Veritabanından gelen güncel isim varsa onu kullan
        if(profileStats?.name) setFullName(`${profileStats.name} ${profileStats.lastname}`);
        
        setUserPosts(res.data[1] || []); // İkinci sorgu (postlar)
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

  // --- RESİM YÜKLEME ---
  const handleChoosePhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert("Hata", "Fotoğraf seçilemedi: " + response.errorMessage);
        return;
      }
      const asset = response.assets[0];
      await uploadPhoto(asset);
    });
  };

  const uploadPhoto = async (asset) => {
    setUploadingInfo(true);
    const formData = new FormData();
    formData.append('photo', {
      uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
      type: asset.type,
      name: asset.fileName || 'profile_image.jpg',
    });

    try {
      const response = await apiClient.post('/user/upload-profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        Alert.alert("Başarılı", "Profil fotoğrafın güncellendi!");
        setProfileImage(response.data.imagePath);
      }
    } catch (error) {
      console.error("Upload Hatası:", error);
      Alert.alert("Hata", "Fotoğraf yüklenirken bir sorun oluştu.");
    } finally {
      setUploadingInfo(false);
    }
  };

  // --- BEĞENİ SİSTEMİ ---
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
        post_id: postId, user_id: currentUserId, user_role: currentRole
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

  // --- TAKİP SİSTEMİ ---
  const handleFollowToggle = async () => {
    const previousState = isFollowing;
    // const previousFollowers = stats.followers; // Takipçi sayısını anlık değiştirmek istersen açabilirsin

    setIsFollowing(!previousState);
    // İyimser güncelleme:
    setStats(prev => ({
        ...prev,
        followers: previousState ? Math.max(0, prev.followers - 1) : prev.followers + 1
    }));

    try {
      const response = await apiClient.post('/social/follow', {
        follower_id: currentUserId, follower_role: currentRole,
        following_id: userId, following_role: role
      });

      if (response.data.success) {
        setIsFollowing(response.data.is_following === 1);
      } else {
        throw new Error();
      }
    } catch (error) {
      setIsFollowing(previousState);
      // setStats(prev => ({ ...prev, followers: previousFollowers }));
      fetchProfileData(); // Garanti olsun diye veriyi tazele
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

  // --- [GÜNCELLENDİ] ÇIKIŞ YAPMA ---
  const handleLogout = () => {
    Alert.alert("Çıkış", "Emin misiniz?", [
      { text: "Vazgeç" },
      { 
        text: "Evet", 
        onPress: async () => {
          try {
            // Token ve kullanıcı bilgilerini telefondan sil
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userId');
            await AsyncStorage.removeItem('userRole');
            
            // Login ekranına gönder
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          } catch (e) {
            console.error("Çıkış Hatası:", e);
          }
        } 
      }
    ]);
  };

  // --- GÖRÜNÜM (HEADER) ---
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {isOwnProfile && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="log-out-outline" size={22} color="#e84118" />
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.profileInfo}>
        <View style={styles.imageWrapper}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage]}>
              <Text style={styles.avatarLetter}>{fullName?.charAt(0).toUpperCase() || "?"}</Text>
            </View>
          )}

          {isOwnProfile && (
            <TouchableOpacity 
              style={styles.cameraButton} 
              onPress={handleChoosePhoto}
              disabled={uploadingInfo}
            >
              {uploadingInfo ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="camera" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.userName} numberOfLines={1}>{fullName || "Yükleniyor..."}</Text>
        <Text style={styles.userRoleText}>
            {role === 'teacher' ? '👨‍🏫 Yetkili Eğitmen' : '🎓 RahatS Öğrencisi'}
        </Text>
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
              onComment={() => navigation.navigate('PostDetail', { post: item, userId: currentUserId, role: currentRole })}
              onDelete={handleDeletePost}
              onProfilePress={(id, r) => {
                if (id !== userId || r !== role) {
                  // Kendi profilimiz değilse git, yoksa zaten buradayız
                  navigation.push('UserProfile', { userId: id, role: r, currentUserId, currentRole });
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
  logoutBtn: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  logoutText: { color: '#e84118', marginLeft: 4, fontWeight: 'bold', fontSize: 13 },
  profileInfo: { alignItems: 'center', marginTop: 10 },
  
  imageWrapper: { position: 'relative', marginBottom: 12 },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#e3f2fd' },
  placeholderImage: { backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  cameraButton: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#007bff', width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff'
  },

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