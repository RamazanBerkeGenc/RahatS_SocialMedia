import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  RefreshControl, TouchableOpacity, ScrollView, Linking, Modal, Alert 
} from 'react-native';
import apiClient from '../api/apiClient';

const StudentDashboard = ({ route, navigation }) => {
  const { studentId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Video Modal State'leri
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedLessonVideos, setSelectedLessonVideos] = useState([]);
  const [selectedLessonName, setSelectedLessonName] = useState('');

  const fetchStudentData = async () => {
    try {
      const response = await apiClient.get(`/student/dashboard/${studentId}`);
      setData(response.data);
    } catch (error) {
      console.error("Dashboard hatası:", error);
      Alert.alert("Hata", "Not bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStudentData(); }, []);

  const handleStudy = async (dersId, lessonName) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/student/suggested-videos/${studentId}/${dersId}`);
      setSelectedLessonVideos(response.data);
      setSelectedLessonName(lessonName);
      setVideoModalVisible(true);
    } catch (error) {
      Alert.alert("Hata", "Öneriler getirilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleWatch = (url) => {
    // URL boş değilse tarayıcıda açar
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert("Hata", "Bağlantı açılamadı."));
    }
  };

  const getGradeColor = (score) => {
    if (score === null || score === undefined) return '#dcdde1';
    if (score >= 85) return '#44bd32'; 
    if (score >= 50) return '#e1b12c'; 
    return '#e84118'; 
  };

  const renderGradeCard = (item) => {
    const formatValue = (val) => (val !== null && val !== undefined ? val : '-');
    return (
      <View key={item.ders_id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lessonName}>{item.lesson_name}</Text>
            <Text style={styles.teacherName}>{item.teacher_name || 'Hoca Atanmadı'}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.studyButton} 
            onPress={() => handleStudy(item.ders_id, item.lesson_name)}
          >
            <Text style={styles.studyButtonText}>📖 Çalış</Text>
          </TouchableOpacity>

          {item.ortalama !== null && (
            <View style={[styles.avgBadge, { backgroundColor: getGradeColor(item.ortalama), marginLeft: 10 }]}>
              <Text style={styles.avgLabel}>ORT</Text>
              <Text style={styles.avgValue}>{item.ortalama}</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsGrid}>
          {[
            { label: '1. Sınav', val: item.sinav1 },
            { label: '2. Sınav', val: item.sinav2 },
            { label: 'Sözlü 1', val: item.sozlu1 },
            { label: 'Sözlü 2', val: item.sozlu2 },
          ].map((detail, idx) => (
            <View key={idx} style={styles.detailItem}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{formatValue(detail.val)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Merhaba, {data?.studentInfo?.name || 'Öğrenci'}</Text>
            <Text style={styles.headerSubtitle}>RahatS Başarı Çizelgesi</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => navigation.reset({index:0, routes:[{name:'Welcome'}]})}
          >
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#50c878" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView 
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => {setRefreshing(true); fetchStudentData();}} 
              colors={['#50c878']}
            />
          }
          contentContainerStyle={styles.listContainer}
        >
          {data?.grades && data.grades.length > 0 ? (
            data.grades.map(item => renderGradeCard(item))
          ) : (
            <Text style={styles.emptyText}>Kayıtlı ders ve not bulunamadı.</Text>
          )}
        </ScrollView>
      )}

      {/* Video Önerileri Modalı */}
      <Modal animationType="slide" transparent={true} visible={videoModalVisible} onRequestClose={() => setVideoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.videoModalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>{selectedLessonName}</Text>
            <Text style={styles.modalSub}>Seviyene göre seçilen içerikler:</Text>

            <FlatList
              data={selectedLessonVideos}
              keyExtractor={item => item.id.toString()}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.videoListCard} onPress={() => handleWatch(item.icerik)}>
                  <View style={styles.videoIconBox}>
                    <Text style={{fontSize: 20}}>{item.tip === 'url' ? '🔗' : '📺'}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.videoListTitle}>{item.baslik}</Text>
                    <Text style={styles.videoListMeta}>Aralık: %{item.hedef_aralik}</Text>
                  </View>
                  <Text style={styles.watchText}>İzle</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Bu ders için uygun öneri bulunamadı.</Text>}
              style={{ marginVertical: 15 }}
            />

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setVideoModalVisible(false)}>
              <Text style={styles.closeModalBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { 
    backgroundColor: '#50c878', 
    paddingTop: 60, paddingBottom: 30, paddingHorizontal: 25, 
    borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 8
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoutButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)' },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#e8f8f0', marginTop: 2 },
  listContainer: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 15, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f2f6', paddingBottom: 12, marginBottom: 15 },
  lessonName: { fontSize: 18, fontWeight: 'bold', color: '#2f3640' },
  teacherName: { fontSize: 12, color: '#7f8c8d' },
  studyButton: { backgroundColor: '#f1c40f', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, elevation: 2 },
  studyButtonText: { color: '#2f3640', fontWeight: 'bold', fontSize: 12 },
  avgBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignItems: 'center', minWidth: 55 },
  avgLabel: { fontSize: 8, fontWeight: 'bold', color: '#fff' },
  avgValue: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 10, color: '#a4b0be', marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#2f3640' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  videoModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalIndicator: { width: 40, height: 5, backgroundColor: '#dcdde1', borderRadius: 5, alignSelf: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2f3640', textAlign: 'center' },
  modalSub: { fontSize: 12, color: '#7f8c8d', textAlign: 'center', marginTop: 5 },
  videoListCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 18, marginBottom: 12 },
  videoIconBox: { width: 45, height: 45, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2 },
  videoListTitle: { fontSize: 15, fontWeight: 'bold', color: '#2f3640' },
  videoListMeta: { fontSize: 11, color: '#4a90e2', fontWeight: '600' },
  watchText: { color: '#50c878', fontWeight: 'bold', fontSize: 13 },
  closeModalBtn: { backgroundColor: '#e84118', padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  closeModalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#7f8c8d', marginTop: 20 }
});

export default StudentDashboard;