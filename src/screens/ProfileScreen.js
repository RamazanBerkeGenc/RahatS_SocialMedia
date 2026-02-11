import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, 
  ActivityIndicator, RefreshControl, Image, Platform, Modal, Switch
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';
import PostCard from '../components/PostCard';
import { ThemeContext } from '../context/ThemeContext'; // Tema Context

const ProfileScreen = ({ route, navigation }) => {
  const { userId, role, currentUserId, currentRole } = route.params || {};
  const isFocused = useIsFocused();
  
  // Tema Bağlantısı
  const { theme, isDarkMode, toggleTheme } = useContext(ThemeContext);

  // --- STATE ---
  const [userPosts, setUserPosts] = useState([]);
  const [userInfo, setUserInfo] = useState({ 
    name: '', lastname: '', role: '', is_private: 0, profile_image: null 
  });
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  
  // STATÜ KODU: 0=Takip Etmiyor, 1=Takip Ediyor, 2=İstek Gönderildi
  const [followStatus, setFollowStatus] = useState(0); 
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingInfo, setUploadingInfo] = useState(false);

  // --- AYARLAR STATE ---
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const isOwnProfile = userId === currentUserId && role === currentRole;

  // --- VERİ ÇEKME ---
  const fetchProfileData = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing && userPosts.length === 0) setLoading(true);
      
      const res = await apiClient.get(`/social/profile/${userId}/${role}/${currentUserId}/${currentRole}`);
      
      if (res.data && res.data[0]) {
        const profileData = res.data[0][0]; // Tablo 1: Profil Bilgisi
        
        setUserInfo(profileData);
        setStats({
          followers: profileData?.followers || 0,
          following: profileData?.following || 0
        });
        
        setFollowStatus(profileData?.follow_status || 0);
        
        if (isOwnProfile) {
            setIsPrivate(profileData?.is_private === 1);
        }

        setUserPosts(res.data[1] || []); // Tablo 2: Postlar
      }

    } catch (error) {
      console.error("Profil yükleme hatası:", error);
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

  // --- AYARLARI KAYDET ---
  const saveSettings = async () => {
    try {
        await apiClient.post('/user/settings', {
            user_id: currentUserId,
            user_role: currentRole,
            is_private: isPrivate
        });
        setSettingsVisible(false);
        fetchProfileData(true); 
        Alert.alert("Başarılı", "Ayarlar kaydedildi.");
    } catch (error) {
        Alert.alert("Hata", "Ayarlar kaydedilemedi.");
    }
  };

  // --- RESİM YÜKLEME ---
  const handleChoosePhoto = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response) => {
      if (response.assets) await uploadPhoto(response.assets[0]);
    });
  };

  const uploadPhoto = async (asset) => {
    setUploadingInfo(true);
    const formData = new FormData();
    formData.append('photo', {
      uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
      type: asset.type,
      name: asset.fileName || 'profile.jpg',
    });

    try {
      const response = await apiClient.post('/user/upload-profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        setUserInfo(prev => ({ ...prev, profile_image: response.data.imagePath }));
        Alert.alert("Başarılı", "Profil fotoğrafı güncellendi.");
      }
    } catch (error) { Alert.alert("Hata", "Fotoğraf yüklenemedi."); } 
    finally { setUploadingInfo(false); }
  };

  // --- TAKİP SİSTEMİ ---
  const handleFollowToggle = async () => {
    const prevStatus = followStatus;
    
    try {
      const response = await apiClient.post('/social/follow', {
        follower_id: currentUserId, follower_role: currentRole,
        following_id: userId, following_role: role
      });

      if (response.data.success) {
        const newCode = response.data.follow_status; 
        setFollowStatus(newCode);

        if (newCode === 1) {
            setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        } else if (newCode === 0) {
            if (prevStatus === 1) {
                setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
            }
        } else if (newCode === 2) {
            Alert.alert("İstek Gönderildi", "Hesap gizli, onay bekliyor.");
        }
      }
    } catch (error) {
      setFollowStatus(prevStatus);
      Alert.alert("Hata", "İşlem başarısız.");
    }
  };

  const handlePostLike = async (postId) => {
    const originalPosts = [...userPosts];
    setUserPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 } : p
    ));
    try {
        await apiClient.post('/social/like', { post_id: postId, user_id: currentUserId, user_role: currentRole });
    } catch (e) { setUserPosts(originalPosts); }
  };

  const handleDeletePost = async (postId) => {
    try {
      const res = await apiClient.delete(`/social/post/${postId}`, {
        data: { userId: currentUserId, role: currentRole } 
      });
      if (res.data.success) fetchProfileData(true);
    } catch (error) { Alert.alert("Hata", "Gönderi silinemedi."); }
  };
  
  const handleLogout = () => {
    Alert.alert("Çıkış", "Uygulamadan çıkmak istiyor musunuz?", [
      { text: "Vazgeç" },
      { text: "Evet", style:'destructive', onPress: async () => {
          await AsyncStorage.multiRemove(['userToken', 'userId', 'userRole']);
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        } 
      }
    ]);
  };

  // --- HEADER RENDER ---
  const renderHeader = () => (
    <View style={[styles.headerContainer, { backgroundColor: theme.cardBg }]}>
        {isOwnProfile && (
            <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsVisible(true)}>
                <Icon name="settings-sharp" size={26} color={theme.iconColor} />
            </TouchableOpacity>
        )}

      <View style={styles.profileInfo}>
        <View style={styles.imageWrapper}>
          {userInfo.profile_image ? (
            <Image source={{ uri: userInfo.profile_image }} style={[styles.profileImage, { borderColor: theme.backgroundColor }]} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage, { borderColor: theme.backgroundColor }]}>
              <Text style={styles.avatarLetter}>{userInfo.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {isOwnProfile && (
            <TouchableOpacity style={[styles.cameraButton, { borderColor: theme.cardBg }]} onPress={handleChoosePhoto} disabled={uploadingInfo}>
              {uploadingInfo ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="camera" size={16} color="#fff" />}
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.userName, { color: theme.textColor }]}>{userInfo.name} {userInfo.lastname}</Text>
        <Text style={[styles.userRoleText, { color: theme.subTextColor }]}>
            {role === 'teacher' ? '👨‍🏫 Eğitmen' : '🎓 Öğrenci'}
            {userInfo.is_private === 1 && <Text> • 🔒 Gizli</Text>}
        </Text>
      </View>

      <View style={[styles.statsBar, { borderTopColor: theme.borderColor }]}>
        <View style={styles.statBox}>
            <Text style={[styles.statCount, { color: theme.textColor }]}>{userInfo.post_count || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.subTextColor }]}>Gönderi</Text>
        </View>
        <View style={[styles.statBox, { marginHorizontal: 40 }]}>
            <Text style={[styles.statCount, { color: theme.textColor }]}>{stats.followers}</Text>
            <Text style={[styles.statLabel, { color: theme.subTextColor }]}>Takipçi</Text>
        </View>
        <View style={styles.statBox}>
            <Text style={[styles.statCount, { color: theme.textColor }]}>{stats.following}</Text>
            <Text style={[styles.statLabel, { color: theme.subTextColor }]}>Takip</Text>
        </View>
      </View>

      {!isOwnProfile && (
        <TouchableOpacity 
          style={[
            styles.followBtn, 
            followStatus === 1 && styles.unfollowBtn, 
            followStatus === 2 && styles.pendingBtn 
          ]} 
          onPress={handleFollowToggle}
        >
          <Text style={[
            styles.followBtnText, 
            (followStatus === 1 || followStatus === 2) && styles.unfollowBtnText
          ]}>
            {followStatus === 0 && "Takip Et"}
            {followStatus === 1 && "Takipten Çık"}
            {followStatus === 2 && "İstek Gönderildi"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // --- GİZLİLİK KİLİDİ ---
  const isProfileLocked = !isOwnProfile && userInfo.is_private === 1 && followStatus !== 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>
      ) : (
        <FlatList
          ListHeaderComponent={renderHeader}
          data={isProfileLocked ? [] : userPosts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            // [YENİ] PostCard TIKLANABİLİR YAPILDI
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => navigation.navigate('PostDetail', { post: item, userId: currentUserId, role: currentRole })}
            >
              <PostCard 
                post={item} currentUserId={currentUserId} currentRole={currentRole}
                onLike={() => handlePostLike(item.id)}
                onComment={() => navigation.navigate('PostDetail', { post: item, userId: currentUserId, role: currentRole })}
                onDelete={handleDeletePost}
                onProfilePress={()=>{}}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                {isProfileLocked ? (
                    <>
                        <Icon name="lock-closed-outline" size={50} color={theme.subTextColor} />
                        <Text style={[styles.lockTitle, { color: theme.textColor }]}>Bu Hesap Gizli</Text>
                        <Text style={[styles.emptyText, { color: theme.subTextColor }]}>Fotoğraflarını görmek için takip isteği gönder.</Text>
                    </>
                ) : (
                    <>
                        <Icon name="images-outline" size={40} color={theme.borderColor} />
                        <Text style={[styles.emptyText, { color: theme.subTextColor }]}>Henüz paylaşım yok.</Text>
                    </>
                )}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true); fetchProfileData(true);}} />}
        />
      )}

      {/* --- AYARLAR MODALI --- */}
      <Modal visible={settingsVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.textColor }]}>Ayarlar</Text>
                    <TouchableOpacity onPress={()=>setSettingsVisible(false)}>
                        <Icon name="close" size={24} color={theme.iconColor} />
                    </TouchableOpacity>
                </View>

                <View style={styles.settingRow}>
                    <View>
                        <Text style={[styles.settingLabel, { color: theme.textColor }]}>Gizli Hesap</Text>
                        <Text style={[styles.settingSub, { color: theme.subTextColor }]}>Onayladığın kişiler fotoğraflarını görebilir.</Text>
                    </View>
                    <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{false: "#767577", true: "#007bff"}} thumbColor={"#f4f3f4"} />
                </View>

                <View style={styles.settingRow}>
                    <View>
                        <Text style={[styles.settingLabel, { color: theme.textColor }]}>Koyu Tema</Text>
                        <Text style={[styles.settingSub, { color: theme.subTextColor }]}>Uygulama görünümünü değiştir.</Text>
                    </View>
                    
                    {/* GLOBAL TEMA DEĞİŞTİRİCİ */}
                    <Switch 
                        value={isDarkMode} 
                        onValueChange={(val) => toggleTheme(val)} 
                        trackColor={{false: "#767577", true: "#007bff"}} 
                        thumbColor={"#f4f3f4"} 
                    />
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
                    <Text style={styles.saveBtnText}>Değişiklikleri Kaydet</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalLogoutBtn} onPress={() => { setSettingsVisible(false); setTimeout(handleLogout, 500); }}>
                    <Text style={styles.modalLogoutText}>Çıkış Yap</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { padding: 20, paddingBottom: 30, marginBottom: 10, alignItems: 'center' },
  settingsBtn: { position: 'absolute', top: 20, right: 20, padding: 5, zIndex: 10 },
  imageWrapper: { marginBottom: 12 },
  profileImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 4 },
  placeholderImage: { backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007bff', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  userName: { fontSize: 20, fontWeight: 'bold' },
  userRoleText: { fontSize: 13, marginTop: 2 },
  statsBar: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, width: '100%', borderTopWidth: 1 },
  statBox: { alignItems: 'center' },
  statCount: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12 },
  
  // BUTON STİLLERİ
  followBtn: { backgroundColor: '#007bff', paddingVertical: 8, paddingHorizontal: 40, borderRadius: 20, marginTop: 15 },
  unfollowBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' },
  pendingBtn: { backgroundColor: '#dfe6e9', borderWidth: 1, borderColor: '#b2bec3' }, 
  
  followBtnText: { color: '#fff', fontWeight: 'bold' },
  unfollowBtnText: { color: '#666' },

  emptyContainer: { padding: 50, alignItems: 'center' },
  lockTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  emptyText: { textAlign: 'center', marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingLabel: { fontSize: 16, fontWeight: 'bold' },
  settingSub: { fontSize: 12, maxWidth: 250 },
  saveBtn: { backgroundColor: '#00b894', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalLogoutBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  modalLogoutText: { color: '#e84118', fontWeight: 'bold', fontSize: 16 }
});

export default ProfileScreen;