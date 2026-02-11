import React, { useEffect, useState, useCallback, useContext } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  Text, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  Alert 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import apiClient from '../api/apiClient';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from '../context/ThemeContext'; // [YENİ] Tema Context

const NotificationScreen = ({ navigation, route }) => {
  const { userId, role } = route.params || {};
  
  // [YENİ] Tema Bağlantısı
  const { theme } = useContext(ThemeContext);

  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]); // Takip İstekleri
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      // 1. Normal Bildirimler
      const notifRes = await apiClient.get(`/social/notifications/${userId}/${role}`);
      setNotifications(notifRes.data);

      // 2. Takip İstekleri
      const reqRes = await apiClient.get(`/social/follow-requests/${userId}/${role}`);
      setRequests(reqRes.data);

    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, role]);

  useEffect(() => {
    if (isFocused) fetchData();
  }, [isFocused, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- İSTEK CEVAPLAMA ---
  const handleResponse = async (followerId, followerRole, action) => {
    // Arayüzden hemen kaldır (Hız hissi için)
    setRequests(prev => prev.filter(req => !(req.follower_id === followerId && req.follower_role === followerRole)));

    try {
      await apiClient.post('/social/respond-request', {
        user_id: userId, user_role: role,
        follower_id: followerId, follower_role: followerRole,
        action: action
      });
      fetchData(); // Bildirimleri de yenile
    } catch (error) {
      Alert.alert("Hata", "İşlem başarısız.");
    }
  };

  // --- İSTEK KARTI (HEADER İÇİNDE) ---
  const renderRequestItem = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.reqInfo}>
        {item.profile_image ? (
            <Image source={{ uri: item.profile_image }} style={styles.reqAvatar} />
        ) : (
            <View style={styles.reqPlaceholder}><Text style={styles.reqPlaceholderText}>{item.name.charAt(0)}</Text></View>
        )}
        <View>
            <Text style={[styles.reqName, { color: theme.textColor }]}>{item.name} {item.lastname}</Text>
            <Text style={[styles.reqSub, { color: theme.subTextColor }]}>Takip isteği gönderdi</Text>
        </View>
      </View>
      <View style={styles.reqActions}>
        <TouchableOpacity style={styles.confirmBtn} onPress={() => handleResponse(item.follower_id, item.follower_role, 'accept')}>
            <Text style={styles.confirmText}>Onayla</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.deleteBtn, { borderColor: theme.borderColor }]} onPress={() => handleResponse(item.follower_id, item.follower_role, 'decline')}>
            <Icon name="close" size={20} color={theme.subTextColor} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- BİLDİRİM KARTI ---
  const renderNotificationItem = ({ item }) => {
    let message = "";
    let icon = "notifications";
    let iconColor = "#007bff";

    if (item.type === 'LIKE') { message = "gönderini beğendi."; icon = "heart"; iconColor="#e84118"; }
    else if (item.type === 'COMMENT') { message = "gönderine yorum yaptı."; icon = "chatbubble"; iconColor="#00cec9"; }
    else if (item.type === 'FOLLOW') { message = "seni takip etmeye başladı."; icon = "person-add"; iconColor="#6c5ce7"; }
    else if (item.type === 'FOLLOW_REQUEST') { return null; } 

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.cardBg, borderBottomColor: theme.borderColor }]} 
        onPress={() => navigation.navigate('UserProfile', { userId: item.actor_id, role: item.actor_role, currentUserId: userId, currentRole: role })}
      >
        {item.actor_image ? (
            <Image source={{ uri: item.actor_image }} style={styles.avatar} />
        ) : (
            <View style={styles.placeholder}><Text style={styles.placeholderText}>{item.actor_name.charAt(0)}</Text></View>
        )}
        <View style={styles.content}>
            <Text style={[styles.text, { color: theme.textColor }]}>
                <Text style={styles.bold}>{item.actor_name} {item.actor_lastname}</Text> {message}
            </Text>
            <Text style={[styles.time, { color: theme.subTextColor }]}>{new Date(item.created_at).toLocaleTimeString().slice(0,5)}</Text>
        </View>
        <Icon name={icon} size={20} color={iconColor} style={{ opacity: 0.8 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.headerTitle, { color: theme.textColor }]}>Bildirimler</Text>
      
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#007bff" style={{marginTop: 20}} />
      ) : (
        <FlatList
          data={notifications.filter(n => n.type !== 'FOLLOW_REQUEST')} 
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotificationItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007bff']} />}
          
          /* --- HEADER: TAKİP İSTEKLERİ --- */
          ListHeaderComponent={
            requests.length > 0 ? (
                <View style={styles.requestContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Takip İstekleri ({requests.length})</Text>
                    {requests.map(req => (
                        <View key={req.follow_id}>{renderRequestItem({ item: req })}</View>
                    ))}
                    <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />
                </View>
            ) : null
          }
          
          ListEmptyComponent={
            requests.length === 0 && <Text style={[styles.emptyText, { color: theme.subTextColor }]}>Henüz bildirim yok.</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', padding: 20 },
  
  // İstek Alanı Stilleri
  requestContainer: { paddingHorizontal: 15, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  requestCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  reqInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reqAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 10 },
  reqPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#00cec9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  reqPlaceholderText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  reqName: { fontWeight: 'bold', fontSize: 14 },
  reqSub: { fontSize: 12 },
  reqActions: { flexDirection: 'row', alignItems: 'center' },
  confirmBtn: { backgroundColor: '#007bff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  deleteBtn: { padding: 6, borderWidth: 1, borderRadius: 8 },
  divider: { height: 1, marginVertical: 10 },

  // Bildirim Stilleri
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  placeholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#a29bfe', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  placeholderText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1 },
  text: { fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: 'bold' },
  time: { fontSize: 11, marginTop: 4 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 }
});

export default NotificationScreen;