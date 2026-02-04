import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  RefreshControl, TouchableOpacity, ScrollView, Modal, Alert 
} from 'react-native';
import apiClient from '../api/apiClient';

const StudentDashboard = ({ route, navigation }) => {
  const { studentId } = route.params || {};
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedLessonVideos, setSelectedLessonVideos] = useState([]);
  const [selectedLessonName, setSelectedLessonName] = useState('');

  const fetchStudentData = async () => {
    if (!studentId) return;
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

  useEffect(() => { 
    if (studentId) {
      fetchStudentData(); 
    } else {
      Alert.alert("Hata", "Öğrenci bilgisi eksik, lütfen tekrar giriş yapın.");
    }
  }, [studentId]);

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

  // --- KRİTİK GÜNCELLEME: VideoPlayer Ekranına Yönlendirme ---
  const handleWatch = (item) => {
    if (item.icerik) {
      setVideoModalVisible(false); // Modalı kapat
      navigation.navigate('VideoPlayer', {
        materialId: item.id,
        userId: studentId,
        videoUrl: item.icerik,
        title: item.baslik
      });
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
            <Text style={styles.teacherName}>{item.teacher_name || 'Eğitmen Atanmadı'}</Text>
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
            { label: 'Sınav 1', val: item.sinav1 },
            { label: 'Sınav 2', val: item.sinav2 },
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Merhaba, {data?.studentInfo?.name || 'Öğrenci'}</Text>
            <Text style={styles.headerSubtitle}>RahatS Başarı Analizi</Text>
          </View>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color="#50c878" />
            <Text style={{marginTop: 10, color: '#666'}}>Başarı verilerin yükleniyor...</Text>
        </View>
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
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Henüz not girişi yapılmamış.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={videoModalVisible} onRequestClose={() => setVideoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.videoModalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>{selectedLessonName}</Text>
            <Text style={styles.modalSub}>Yapay zekanın senin için seçtiği materyaller:</Text>

            <FlatList
              data={selectedLessonVideos}
              keyExtractor={item => item.id.toString()}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.videoListCard} onPress={() => handleWatch(item)}>
                  <View style={styles.videoIconBox}>
                    <Text style={{fontSize: 20}}>{item.tip === 'url' || item.icerik.includes('youtube') ? '🔗' : '📺'}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.videoListTitle}>{item.baslik}</Text>
                    <Text style={styles.videoListMeta}>İhtiyaç Seviyesi: %{item.hedef_aralik}</Text>
                  </View>
                  <Text style={styles.watchText}>Uygulamada İzle</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Şu an uygun bir öneri bulunmuyor.</Text>}
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
    paddingTop: 50, paddingBottom: 25, paddingHorizontal: 25, 
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#e8f8f0', marginTop: 2 },
  listContainer: { padding: 15 },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f2f6', paddingBottom: 10, marginBottom: 12 },
  lessonName: { fontSize: 17, fontWeight: 'bold', color: '#2f3640' },
  teacherName: { fontSize: 11, color: '#7f8c8d' },
  studyButton: { backgroundColor: '#f1c40f', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  studyButtonText: { color: '#2f3640', fontWeight: 'bold', fontSize: 11 },
  avgBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center', minWidth: 50 },
  avgLabel: { fontSize: 7, fontWeight: 'bold', color: '#fff' },
  avgValue: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 9, color: '#a4b0be', marginBottom: 1 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#2f3640' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  videoModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '85%' },
  modalIndicator: { width: 40, height: 4, backgroundColor: '#dcdde1', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2f3640', textAlign: 'center' },
  modalSub: { fontSize: 11, color: '#7f8c8d', textAlign: 'center', marginTop: 3 },
  videoListCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 15, marginBottom: 10 },
  videoIconBox: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, elevation: 1 },
  videoListTitle: { fontSize: 14, fontWeight: 'bold', color: '#2f3640' },
  videoListMeta: { fontSize: 10, color: '#4a90e2', fontWeight: '600' },
  watchText: { color: '#50c878', fontWeight: 'bold', fontSize: 12 },
  closeModalBtn: { backgroundColor: '#e84118', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 5 },
  closeModalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', color: '#7f8c8d', fontSize: 14 }
});

export default StudentDashboard;