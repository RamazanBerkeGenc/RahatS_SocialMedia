import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  Alert, Modal, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import apiClient from '../api/apiClient';
import ClassChip from '../components/ClassChip';
import StudentCard from '../components/StudentCard';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';

const TeacherDashboard = ({ route, navigation }) => {
  const { teacherId } = route.params;
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [myMaterials, setMyMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('Hepsi');
  const [modalVisible, setModalVisible] = useState(false);

  const [videoFile, setVideoFile] = useState(null);
  const [videoData, setVideoData] = useState({ 
    baslik: '', 
    sinif: '9', 
    aralik: '0-20', 
    icerik: '' 
  });

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [studentsRes, classesRes, materialsRes] = await Promise.all([
        apiClient.get(`/teacher/students/${teacherId}`),
        apiClient.get(`/teacher/classes/${teacherId}`),
        apiClient.get(`/teacher/materials/${teacherId}`)
      ]);
      setStudents(studentsRes.data);
      setClasses([{ id: 'Hepsi', name: 'Tüm Sınıflar' }, ...classesRes.data]);
      setMyMaterials(materialsRes.data);
    } catch (error) { Alert.alert("Hata", "Veriler yüklenemedi."); }
    finally { setLoading(false); }
  };

  const handleVideoUpload = async () => {
    if (!videoData.baslik) return Alert.alert("Hata", "Lütfen bir başlık girin.");
    
    setUploading(true);
    const formData = new FormData();
    formData.append('ogretmen_id', teacherId);
    formData.append('ders_id', students[0]?.ders_id || 1);
    formData.append('sinif_seviyesi', videoData.sinif);
    formData.append('hedef_aralik', videoData.aralik);
    formData.append('tip', videoFile ? 'video' : 'url');
    formData.append('baslik', videoData.baslik);

    if (videoFile) {
      formData.append('video', { uri: videoFile.uri, type: videoFile.type, name: videoFile.fileName });
    } else {
      formData.append('icerik', videoData.icerik);
    }

    try {
      const res = await apiClient.post('/teacher/upload-material', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      if (res.data.success) {
        Alert.alert("Başarılı", "Materyal kaydedildi.");
        setModalVisible(false);
        setVideoFile(null);
        setVideoData({ baslik: '', sinif: '9', aralik: '0-20', icerik: '' });
        fetchInitialData();
      }
    } catch (e) { Alert.alert("Hata", "Yükleme başarısız."); }
    finally { setUploading(false); }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>RahatS Panel</Text>
          <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })}>
            <Text style={styles.logoutText}>🚪 Hesaptan Çık</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.videoBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.videoBtnText}>+ Yeni Materyal</Text>
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'students' && styles.activeTab]} onPress={() => setActiveTab('students')}>
          <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>Öğrenciler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'materials' && styles.activeTab]} onPress={() => setActiveTab('materials')}>
          <Text style={[styles.tabText, activeTab === 'materials' && styles.activeTabText]}>Materyallerim</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'students' ? (
        <View style={{flex: 1}}>
          <View style={styles.selectorWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {classes.map(c => <ClassChip key={c.id} label={c.name} isActive={selectedClassId === c.id} onPress={() => setSelectedClassId(c.id)} />)}
            </ScrollView>
          </View>
          <FlatList 
            data={students.filter(s => selectedClassId === 'Hepsi' || s.sinif_id === selectedClassId)} 
            renderItem={({ item }) => <StudentCard item={item} />} 
            contentContainerStyle={{ padding: 20 }} 
          />
        </View>
      ) : (
        <FlatList 
          data={myMaterials} 
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.materialCard}>
              <View style={{flex: 1}}>
                <Text style={styles.matTitle}>{item.baslik}</Text>
                <Text style={styles.matSub}>{item.sinif_seviyesi}. Sınıf | %{item.hedef_aralik} Başarı Aralığı</Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert("Sil", "Silinsin mi?", [{text:"Hayır"}, {text:"Evet", onPress: () => {}}])}>
                <Text style={{color: 'red'}}>Sil</Text>
              </TouchableOpacity>
            </View>
          )} 
          contentContainerStyle={{ padding: 20 }} 
        />
      )}

      {/* MATERYAL YÜKLEME MODALI */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
              <Text style={styles.modalTitle}>Materyal Detayları</Text>
              
              <CustomInput label="Başlık" placeholder="Örn: Limit ve Süreklilik" value={videoData.baslik} onChangeText={(t) => setVideoData({...videoData, baslik: t})} />
              
              <Text style={styles.label}>1. Video Kaynağı (Dosya veya URL)</Text>
              <TouchableOpacity style={styles.picker} onPress={() => launchImageLibrary({mediaType:'video'}, (res) => res.assets && setVideoFile(res.assets[0]))}>
                <Text style={{color: '#4a90e2'}}>{videoFile ? `✅ ${videoFile.fileName}` : "🎥 Galeriden Video Seç"}</Text>
              </TouchableOpacity>
              <CustomInput placeholder="Veya Video Linki Yapıştır" value={videoData.icerik} onChangeText={(t) => setVideoData({...videoData, icerik: t})} />

              <Text style={styles.label}>2. Hedef Sınıf Seviyesi</Text>
              <View style={styles.row}>{['9','10','11','12'].map(s => (
                <TouchableOpacity key={s} style={[styles.choiceBtn, videoData.sinif === s && styles.choiceActive]} onPress={() => setVideoData({...videoData, sinif: s})}>
                  <Text style={[styles.choiceText, videoData.sinif === s && {color: '#fff'}]}>{s}</Text>
                </TouchableOpacity>
              ))}</View>

              <Text style={styles.label}>3. Hedef Başarı Aralığı (%)</Text>
              <View style={styles.rangeRow}>{['0-20', '20-40', '40-60', '60-80', '80-100'].map(r => (
                <TouchableOpacity key={r} style={[styles.rangeBtn, videoData.aralik === r && styles.rangeActive]} onPress={() => setVideoData({...videoData, aralik: r})}>
                  <Text style={[styles.rangeText, videoData.aralik === r && {color: '#fff'}]}>{r}</Text>
                </TouchableOpacity>
              ))}</View>

              <View style={{marginTop: 20}}>
                <CustomButton title={uploading ? "Yükleniyor..." : "Sisteme Kaydet"} onPress={handleVideoUpload} color="#2ecc71" />
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}><Text style={{color:'red'}}>Vazgeç</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: '#4a90e2', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  logoutText: { color: '#d1e3f8', fontSize: 13, marginTop: 5 },
  videoBtn: { backgroundColor: '#f1c40f', padding: 10, borderRadius: 10 },
  videoBtnText: { fontWeight: 'bold', color: '#2d3436' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', elevation: 4 },
  tab: { flex: 1, padding: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#4a90e2' },
  tabText: { color: '#7f8c8d', fontWeight: 'bold' },
  activeTabText: { color: '#4a90e2' },
  selectorWrapper: { paddingVertical: 15, paddingLeft: 20 },
  materialCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  matTitle: { fontWeight: 'bold', fontSize: 16 },
  matSub: { fontSize: 12, color: '#7f8c8d' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#2d3436' },
  label: { fontWeight: 'bold', marginTop: 15, marginBottom: 8, color: '#636e72' },
  picker: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#4a90e2' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  choiceBtn: { padding: 12, borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 10, width: '22%', alignItems: 'center' },
  choiceActive: { backgroundColor: '#4a90e2', borderColor: '#4a90e2' },
  choiceText: { fontWeight: 'bold', color: '#636e72' },
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  rangeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 20 },
  rangeActive: { backgroundColor: '#e67e22', borderColor: '#e67e22' },
  rangeText: { fontSize: 12, color: '#636e72', fontWeight: 'bold' },
  closeBtn: { alignItems: 'center', marginTop: 15, padding: 10 }
});

export default TeacherDashboard;