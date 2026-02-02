import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, 
  Modal, ScrollView, TouchableOpacity, KeyboardAvoidingView, 
  Platform, RefreshControl, TextInput 
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import apiClient from '../api/apiClient';
import ClassChip from '../components/ClassChip';
import StudentCard from '../components/StudentCard';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';

const TeacherDashboard = ({ route }) => {
  const { teacherId } = route.params || {};
  
  // State Yönetimi
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [myMaterials, setMyMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('Hepsi');
  const [searchQuery, setSearchQuery] = useState('');

  // Not Giriş State'leri
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [grades, setGrades] = useState({ s1: '', s2: '', sz1: '', sz2: '' });

  // Materyal Düzenleme State'leri
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoData, setVideoData] = useState({ 
    baslik: '', sinif: '9', aralik: '0-20', icerik: '' 
  });

  useEffect(() => { if (teacherId) fetchInitialData(); }, [teacherId]);

  useEffect(() => {
    let result = students;
    if (selectedClassId !== 'Hepsi') result = result.filter(s => s.sinif_id === selectedClassId);
    if (searchQuery) {
      result = result.filter(s => 
        `${s.name} ${s.lastname}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredStudents(result);
  }, [searchQuery, selectedClassId, students]);

  const fetchInitialData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const [studentsRes, classesRes, materialsRes] = await Promise.all([
        apiClient.get(`/teacher/students/${teacherId}`),
        apiClient.get(`/teacher/classes/${teacherId}`),
        apiClient.get(`/teacher/materials/${teacherId}`)
      ]);
      setStudents(studentsRes.data || []);
      setClasses([{ id: 'Hepsi', name: 'Tüm Sınıflar' }, ...(classesRes.data || [])]);
      setMyMaterials(materialsRes.data || []);
    } catch (error) { 
      Alert.alert("Hata", "Veriler güncellenemedi."); 
    } finally { 
      setLoading(false); 
      setRefreshing(false);
    }
  };

  // --- NOT GÜNCELLEME İŞLEMLERİ ---
  const openGradeModal = (student) => {
    setSelectedStudent(student);
    setGrades({
      s1: student.sinav1?.toString() || '',
      s2: student.sinav2?.toString() || '',
      sz1: student.sozlu1?.toString() || '',
      sz2: student.sozlu2?.toString() || ''
    });
    setGradeModalVisible(true);
  };

  const handleUpdateGrades = async () => {
    try {
      const response = await apiClient.post('/teacher/update-grades', {
        student_id: selectedStudent.student_id,
        teacher_id: teacherId,
        sinav1: grades.s1,
        sinav2: grades.s2,
        sozlu1: grades.sz1,
        sozlu2: grades.sz2
      });
      if (response.data.success) {
        Alert.alert("Başarılı", "Notlar güncellendi.");
        setGradeModalVisible(false);
        fetchInitialData();
      }
    } catch (error) {
      Alert.alert("Hata", "Notlar kaydedilemedi.");
    }
  };

  // --- MATERYAL İŞLEMLERİ ---
  const handleSaveMaterial = async () => {
    if (!videoData.baslik) return Alert.alert("Hata", "Lütfen bir başlık girin.");
    const teacherBranchId = students.length > 0 ? students[0].ders_id : 1;

    setUploading(true);
    try {
      if (isEditing) {
        await apiClient.put(`/teacher/update-material/${selectedMaterialId}`, {
          teacherId, title: videoData.baslik, content: videoData.icerik, level: videoData.sinif, range: videoData.aralik
        });
        Alert.alert("Başarılı", "Materyal güncellendi.");
      } else {
        const formData = new FormData();
        formData.append('ogretmen_id', teacherId);
        formData.append('ders_id', teacherBranchId);
        formData.append('sinif_seviyesi', videoData.sinif);
        formData.append('hedef_aralik', videoData.aralik);
        formData.append('tip', videoFile ? 'video' : 'url');
        formData.append('baslik', videoData.baslik);
        if (videoFile) {
          formData.append('video', { uri: videoFile.uri, type: videoFile.type || 'video/mp4', name: videoFile.fileName || 'upload.mp4' });
        } else {
          formData.append('icerik', videoData.icerik);
        }
        await apiClient.post('/teacher/upload-material', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        Alert.alert("Başarılı", "Materyal eklendi.");
      }
      resetForm();
      setActiveTab('materials');
      fetchInitialData();
    } catch (e) { Alert.alert("Hata", "İşlem başarısız."); } 
    finally { setUploading(false); }
  };

  const handleDeleteMaterial = (id) => {
    Alert.alert("Sil", "Emin misiniz?", [
      { text: "Vazgeç" },
      { text: "Sil", onPress: async () => {
          try {
            await apiClient.delete(`/teacher/delete-material/${id}`, { data: { teacherId } });
            fetchInitialData();
          } catch (e) { Alert.alert("Hata", "Silme başarısız."); }
      }}
    ]);
  };

  const openEditMode = (item) => {
    setIsEditing(true);
    setSelectedMaterialId(item.id);
    setVideoData({ baslik: item.baslik, sinif: item.sinif_seviyesi.toString(), aralik: item.hedef_aralik, icerik: item.icerik });
    setActiveTab('form');
  };

  const resetForm = () => {
    setVideoData({ baslik: '', sinif: '9', aralik: '0-20', icerik: '' });
    setVideoFile(null); setIsEditing(false); setSelectedMaterialId(null);
  };

  if (loading && !refreshing) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#4a90e2" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>RahatS Panel</Text>
          <Text style={styles.headerSubtitle}>Eğitmen Yönetimi</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setActiveTab('form'); }}>
          <Icon name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Yeni Materyal</Text>
        </TouchableOpacity>
      </View>

      {/* TAB BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'students' && styles.activeTabItem]} onPress={() => setActiveTab('students')}>
          <Text style={[styles.tabLabel, activeTab === 'students' && styles.activeTabLabel]}>Öğrenciler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'materials' && styles.activeTabItem]} onPress={() => setActiveTab('materials')}>
          <Text style={[styles.tabLabel, activeTab === 'materials' && styles.activeTabLabel]}>Materyallerim</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'students' ? (
        <View style={{flex: 1}}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#95a5a6" />
            <TextInput style={styles.searchInput} placeholder="Öğrenci ara..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>

          <View style={styles.fixedFilterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {classes.map(c => (
                <ClassChip key={c.id.toString()} label={c.name} isActive={selectedClassId === c.id} onPress={() => setSelectedClassId(c.id)} />
              ))}
            </ScrollView>
          </View>

          <FlatList 
            data={filteredStudents} 
            keyExtractor={(item) => item.student_id.toString()}
            renderItem={({ item }) => <StudentCard item={item} onPress={() => openGradeModal(item)} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchInitialData();}} />}
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }} 
          />
        </View>
      ) : activeTab === 'materials' ? (
        <FlatList 
          data={myMaterials} 
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.materialCard}>
              <View style={{flex: 1}}>
                <Text style={styles.matTitle}>{item.baslik}</Text>
                <Text style={styles.matMeta}>{item.sinif_seviyesi}. Sınıf | %{item.hedef_aralik}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => openEditMode(item)} style={{marginRight: 15}}><Icon name="create-outline" size={22} color="#4a90e2" /></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteMaterial(item.id)}><Icon name="trash-outline" size={22} color="#e84118" /></TouchableOpacity>
              </View>
            </View>
          )} 
          contentContainerStyle={{ padding: 15 }} 
        />
      ) : (
        /* FORM EKRANI */
        <ScrollView style={styles.formContainer} contentContainerStyle={{paddingBottom: 40}}>
            <Text style={styles.formTitle}>{isEditing ? "Materyali Düzenle" : "Yeni Materyal"}</Text>
            <CustomInput label="Başlık" value={videoData.baslik} onChangeText={(t) => setVideoData({...videoData, baslik: t})} />
            
            <Text style={styles.inputLabel}>Sınıf Seviyesi</Text>
            <View style={styles.selectionRow}>
                {['9', '10', '11', '12'].map(lvl => (
                    <TouchableOpacity key={lvl} style={[styles.smallChip, videoData.sinif === lvl && styles.activeBlueChip]} onPress={() => setVideoData({...videoData, sinif: lvl})}>
                        <Text style={[styles.chipText, videoData.sinif === lvl && styles.whiteText]}>{lvl}. Sınıf</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.inputLabel}>Başarı Aralığı</Text>
            <View style={styles.selectionRow}>
                {['0-20', '20-40', '40-60', '60-80', '80-100'].map(range => (
                    <TouchableOpacity key={range} style={[styles.rangeChip, videoData.aralik === range && styles.activeYellowChip]} onPress={() => setVideoData({...videoData, aralik: range})}>
                        <Text style={[styles.rangeText, videoData.aralik === range && styles.whiteText]}>%{range}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {!isEditing && (
              <TouchableOpacity style={styles.filePicker} onPress={() => launchImageLibrary({mediaType:'video'}, (res) => res.assets && setVideoFile(res.assets[0]))}>
                  <Icon name="videocam-outline" size={24} color="#4a90e2" />
                  <Text style={{marginLeft: 10, color: '#4a90e2'}}>{videoFile ? videoFile.fileName : "Video Seç"}</Text>
              </TouchableOpacity>
            )}

            <CustomInput label="Video/URL" value={videoData.icerik} onChangeText={(t) => setVideoData({...videoData, icerik: t})} />

            <View style={{marginTop: 20}}>
                <CustomButton title={uploading ? "İşleniyor..." : (isEditing ? "Güncelle" : "Yayınla")} onPress={handleSaveMaterial} color="#2ecc71" />
                <TouchableOpacity onPress={() => { resetForm(); setActiveTab('students'); }} style={styles.cancelBtn}><Text>Vazgeç</Text></TouchableOpacity>
            </View>
        </ScrollView>
      )}

      {/* NOT GİRİŞ MODALI */}
      <Modal visible={gradeModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.gradeModalContent}>
            <Text style={styles.modalTitle}>{selectedStudent?.name} {selectedStudent?.lastname}</Text>
            <Text style={styles.modalSub}>{selectedStudent?.lesson_name} Notları</Text>
            
            <View style={styles.gradeInputRow}>
                <View style={{flex:1, marginRight:5}}><CustomInput label="Sınav 1" value={grades.s1} onChangeText={(t)=>setGrades({...grades, s1:t})} keyboardType="numeric" maxLength={3}/></View>
                <View style={{flex:1}}><CustomInput label="Sınav 2" value={grades.s2} onChangeText={(t)=>setGrades({...grades, s2:t})} keyboardType="numeric" maxLength={3}/></View>
            </View>
            <View style={styles.gradeInputRow}>
                <View style={{flex:1, marginRight:5}}><CustomInput label="Sözlü 1" value={grades.sz1} onChangeText={(t)=>setGrades({...grades, sz1:t})} keyboardType="numeric" maxLength={3}/></View>
                <View style={{flex:1}}><CustomInput label="Sözlü 2" value={grades.sz2} onChangeText={(t)=>setGrades({...grades, sz2:t})} keyboardType="numeric" maxLength={3}/></View>
            </View>

            <CustomButton title="Kaydet" onPress={handleUpdateGrades} color="#2ecc71" />
            <TouchableOpacity onPress={() => setGradeModalVisible(false)} style={styles.cancelBtn}><Text style={{color:'#e84118'}}>Kapat</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#4a90e2', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#d1e3f8', fontSize: 11 },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  addBtnText: { color: '#fff', marginLeft: 5, fontSize: 12 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabItem: { flex: 1, padding: 15, alignItems: 'center' },
  activeTabItem: { borderBottomWidth: 3, borderBottomColor: '#4a90e2' },
  tabLabel: { color: '#7f8c8d', fontWeight: 'bold' },
  activeTabLabel: { color: '#4a90e2' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, paddingHorizontal: 15, borderRadius: 10, height: 45, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  fixedFilterSection: { paddingVertical: 10, paddingLeft: 15, height: 60, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  formContainer: { padding: 20 },
  formTitle: { fontSize: 22, fontWeight: 'bold', color: '#2d3436', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#636e72', marginTop: 15, marginBottom: 8 },
  selectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallChip: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#dfe6e9', minWidth: 70, alignItems: 'center', backgroundColor: '#fff' },
  rangeChip: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#dfe6e9', flex: 1, minWidth: '30%', alignItems: 'center', backgroundColor: '#fff' },
  activeBlueChip: { backgroundColor: '#4a90e2', borderColor: '#4a90e2' },
  activeYellowChip: { backgroundColor: '#f1c40f', borderColor: '#f1c40f' },
  whiteText: { color: '#fff', fontWeight: 'bold' },
  chipText: { fontSize: 12, color: '#636e72' },
  rangeText: { fontSize: 11, color: '#636e72' },
  filePicker: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 12, alignItems: 'center', marginVertical: 15, flexDirection: 'row', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#4a90e2' },
  materialCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#f1c40f' },
  matTitle: { fontWeight: 'bold', fontSize: 15 },
  matMeta: { fontSize: 11, color: '#7f8c8d', marginTop: 3 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  gradeModalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#2d3436' },
  modalSub: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  gradeInputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { alignItems: 'center', marginTop: 15, padding: 5 }
});

export default TeacherDashboard;