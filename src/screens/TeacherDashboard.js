import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, 
  Modal, ScrollView, TouchableOpacity, RefreshControl, TextInput 
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import apiClient from '../api/apiClient';
import ClassChip from '../components/ClassChip';
import StudentCard from '../components/StudentCard';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { ThemeContext } from '../context/ThemeContext'; // [YENİ] Tema Context

const TeacherDashboard = ({ route }) => {
  const { teacherId } = route.params || {};
  
  // [YENİ] Tema Bağlantısı
  const { theme } = useContext(ThemeContext);

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

  // İstatistik Modal State'leri
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [materialStats, setMaterialStats] = useState([]);
  const [selectedMaterialTitle, setSelectedMaterialTitle] = useState('');

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

  // --- İZLEME İSTATİSTİKLERİNİ GETİR ---
  const fetchMaterialStats = async (material) => {
    try {
      setSelectedMaterialTitle(material.baslik);
      const res = await apiClient.get(`/teacher/material-stats/${material.id}`);
      setMaterialStats(res.data);
      setStatsModalVisible(true);
    } catch (error) {
      Alert.alert("Hata", "İstatistikler yüklenemedi.");
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
    return <View style={[styles.centerContainer, { backgroundColor: theme.backgroundColor }]}><ActivityIndicator size="large" color="#4a90e2" /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.isDark ? theme.headerBg : '#4a90e2' }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.isDark ? theme.textColor : '#fff' }]}>RahatS Panel</Text>
          <Text style={[styles.headerSubtitle, { color: theme.isDark ? theme.subTextColor : '#d1e3f8' }]}>Eğitmen Yönetimi</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setActiveTab('form'); }}>
          <Icon name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Yeni Materyal</Text>
        </TouchableOpacity>
      </View>

      {/* TAB BAR */}
      <View style={[styles.tabBar, { backgroundColor: theme.cardBg, borderBottomColor: theme.borderColor }]}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'students' && styles.activeTabItem]} onPress={() => setActiveTab('students')}>
          <Text style={[styles.tabLabel, { color: theme.subTextColor }, activeTab === 'students' && styles.activeTabLabel]}>Öğrenciler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'materials' && styles.activeTabItem]} onPress={() => setActiveTab('materials')}>
          <Text style={[styles.tabLabel, { color: theme.subTextColor }, activeTab === 'materials' && styles.activeTabLabel]}>Materyallerim</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'students' ? (
        <View style={{flex: 1}}>
          <View style={[styles.searchContainer, { backgroundColor: theme.cardBg }]}>
            <Icon name="search" size={20} color={theme.subTextColor} />
            <TextInput 
                style={[styles.searchInput, { color: theme.textColor }]} 
                placeholder="Öğrenci ara..." 
                placeholderTextColor={theme.subTextColor}
                value={searchQuery} 
                onChangeText={setSearchQuery} 
            />
          </View>

          <View style={[styles.fixedFilterSection, { borderBottomColor: theme.borderColor }]}>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchInitialData();}} colors={['#4a90e2']} />}
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }} 
          />
        </View>
      ) : activeTab === 'materials' ? (
        <FlatList 
          data={myMaterials} 
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.materialCard, { backgroundColor: theme.cardBg }]}>
              <View style={{flex: 1}}>
                <Text style={[styles.matTitle, { color: theme.textColor }]}>{item.baslik}</Text>
                <Text style={[styles.matMeta, { color: theme.subTextColor }]}>{item.sinif_seviyesi}. Sınıf | %{item.hedef_aralik}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => fetchMaterialStats(item)} style={{marginRight: 15}}><Icon name="stats-chart-outline" size={22} color="#50c878" /></TouchableOpacity>
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
            <Text style={[styles.formTitle, { color: theme.textColor }]}>{isEditing ? "Materyali Düzenle" : "Yeni Materyal"}</Text>
            
            <View style={{ marginBottom: 10 }}>
                <Text style={{color: theme.subTextColor, marginBottom:5, fontSize:12, fontWeight:'bold'}}>BAŞLIK</Text>
                <CustomInput value={videoData.baslik} onChangeText={(t) => setVideoData({...videoData, baslik: t})} />
            </View>
            
            <Text style={[styles.inputLabel, { color: theme.subTextColor }]}>Sınıf Seviyesi</Text>
            <View style={styles.selectionRow}>
                {['9', '10', '11', '12'].map(lvl => (
                    <TouchableOpacity 
                        key={lvl} 
                        style={[styles.smallChip, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }, videoData.sinif === lvl && styles.activeBlueChip]} 
                        onPress={() => setVideoData({...videoData, sinif: lvl})}
                    >
                        <Text style={[styles.chipText, { color: theme.textColor }, videoData.sinif === lvl && styles.whiteText]}>{lvl}. Sınıf</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.subTextColor }]}>Başarı Aralığı</Text>
            <View style={styles.selectionRow}>
                {['0-20', '20-40', '40-60', '60-80', '80-100'].map(range => (
                    <TouchableOpacity 
                        key={range} 
                        style={[styles.rangeChip, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }, videoData.aralik === range && styles.activeYellowChip]} 
                        onPress={() => setVideoData({...videoData, aralik: range})}
                    >
                        <Text style={[styles.rangeText, { color: theme.textColor }, videoData.aralik === range && styles.whiteText]}>%{range}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {!isEditing && (
              <TouchableOpacity style={[styles.filePicker, { backgroundColor: theme.inputBg, borderColor: theme.borderColor }]} onPress={() => launchImageLibrary({mediaType:'video'}, (res) => res.assets && setVideoFile(res.assets[0]))}>
                  <Icon name="videocam-outline" size={24} color="#4a90e2" />
                  <Text style={{marginLeft: 10, color: '#4a90e2'}}>{videoFile ? videoFile.fileName : "Video Seç"}</Text>
              </TouchableOpacity>
            )}

            <View style={{ marginTop: 10 }}>
                <Text style={{color: theme.subTextColor, marginBottom:5, fontSize:12, fontWeight:'bold'}}>İÇERİK (URL/METİN)</Text>
                <CustomInput value={videoData.icerik} onChangeText={(t) => setVideoData({...videoData, icerik: t})} />
            </View>

            <View style={{marginTop: 20}}>
                <CustomButton title={uploading ? "İşleniyor..." : (isEditing ? "Güncelle" : "Yayınla")} onPress={handleSaveMaterial} color="#2ecc71" />
                <TouchableOpacity onPress={() => { resetForm(); setActiveTab('students'); }} style={styles.cancelBtn}><Text style={{color: theme.subTextColor}}>Vazgeç</Text></TouchableOpacity>
            </View>
        </ScrollView>
      )}

      {/* İZLEME İSTATİSTİK MODALI */}
      <Modal visible={statsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.statsModalContent, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>İzleme Raporu</Text>
            <Text style={[styles.modalSub, { color: theme.subTextColor }]}>{selectedMaterialTitle}</Text>
            
            <FlatList 
              data={materialStats}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={[styles.statsRow, { borderBottomColor: theme.borderColor }]}>
                  <View style={{flex: 1}}>
                    <Text style={[styles.studentNameText, { color: theme.textColor }]}>
                        {item.name} {item.lastname} 
                        <Text style={{color: theme.subTextColor, fontSize: 12}}> ({item.sinif_adi || 'Sınıf Belirsiz'})</Text>
                    </Text>
                    
                    <View style={[styles.progressBarContainer, { backgroundColor: theme.inputBg }]}>
                      <View style={[
                        styles.progressBarFill, 
                        { width: `${item.watch_percent}%`, backgroundColor: item.is_completed ? '#50c878' : '#f1c40f' }
                      ]} />
                    </View>
                  </View>
                  <Text style={styles.percentText}>%{item.watch_percent}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.subTextColor }]}>Henüz kimse izlemedi.</Text>}
              style={{maxHeight: 400, marginVertical: 20}}
            />

            <CustomButton title="Kapat" onPress={() => setStatsModalVisible(false)} color="#4a90e2" />
          </View>
        </View>
      </Modal>

      {/* NOT GİRİŞ MODALI */}
      <Modal visible={gradeModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.gradeModalContent, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>{selectedStudent?.name} {selectedStudent?.lastname}</Text>
            <Text style={[styles.modalSub, { color: theme.subTextColor }]}>{selectedStudent?.lesson_name} Notları</Text>
            
            <View style={styles.gradeInputRow}>
                <View style={{flex:1, marginRight:5}}>
                    <Text style={{color: theme.subTextColor, fontSize:10, marginBottom:2}}>Sınav 1</Text>
                    <CustomInput value={grades.s1} onChangeText={(t)=>setGrades({...grades, s1:t})} keyboardType="numeric" maxLength={3}/>
                </View>
                <View style={{flex:1}}>
                    <Text style={{color: theme.subTextColor, fontSize:10, marginBottom:2}}>Sınav 2</Text>
                    <CustomInput value={grades.s2} onChangeText={(t)=>setGrades({...grades, s2:t})} keyboardType="numeric" maxLength={3}/>
                </View>
            </View>
            <View style={styles.gradeInputRow}>
                <View style={{flex:1, marginRight:5}}>
                    <Text style={{color: theme.subTextColor, fontSize:10, marginBottom:2}}>Sözlü 1</Text>
                    <CustomInput value={grades.sz1} onChangeText={(t)=>setGrades({...grades, sz1:t})} keyboardType="numeric" maxLength={3}/>
                </View>
                <View style={{flex:1}}>
                    <Text style={{color: theme.subTextColor, fontSize:10, marginBottom:2}}>Sözlü 2</Text>
                    <CustomInput value={grades.sz2} onChangeText={(t)=>setGrades({...grades, sz2:t})} keyboardType="numeric" maxLength={3}/>
                </View>
            </View>

            <View style={{marginTop: 15}}>
                <CustomButton title="Kaydet" onPress={handleUpdateGrades} color="#2ecc71" />
            </View>
            <TouchableOpacity onPress={() => setGradeModalVisible(false)} style={styles.cancelBtn}><Text style={{color:'#e84118'}}>Kapat</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, // Arka plan dinamik
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 11 },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  addBtnText: { color: '#fff', marginLeft: 5, fontSize: 12 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, padding: 15, alignItems: 'center' },
  activeTabItem: { borderBottomWidth: 3, borderBottomColor: '#4a90e2' },
  tabLabel: { fontWeight: 'bold' },
  activeTabLabel: { color: '#4a90e2' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 15, paddingHorizontal: 15, borderRadius: 10, height: 45, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  fixedFilterSection: { paddingVertical: 10, paddingLeft: 15, height: 60, borderBottomWidth: 1 },
  formContainer: { padding: 20 },
  formTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  selectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallChip: { padding: 10, borderRadius: 10, borderWidth: 1, minWidth: 70, alignItems: 'center' },
  rangeChip: { padding: 10, borderRadius: 10, borderWidth: 1, flex: 1, minWidth: '30%', alignItems: 'center' },
  activeBlueChip: { backgroundColor: '#4a90e2', borderColor: '#4a90e2' },
  activeYellowChip: { backgroundColor: '#f1c40f', borderColor: '#f1c40f' },
  whiteText: { color: '#fff', fontWeight: 'bold' },
  chipText: { fontSize: 12 },
  rangeText: { fontSize: 11 },
  filePicker: { padding: 15, borderRadius: 12, alignItems: 'center', marginVertical: 15, flexDirection: 'row', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1 },
  materialCard: { padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#f1c40f' },
  matTitle: { fontWeight: 'bold', fontSize: 15 },
  matMeta: { fontSize: 11, marginTop: 3 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  gradeModalContent: { borderRadius: 20, padding: 25, elevation: 5 },
  statsModalContent: { borderRadius: 20, padding: 25, elevation: 5, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  modalSub: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  gradeInputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cancelBtn: { alignItems: 'center', marginTop: 15, padding: 5 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1 },
  studentNameText: { fontSize: 14, fontWeight: '600', marginBottom: 5 },
  progressBarContainer: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  percentText: { marginLeft: 15, fontSize: 14, fontWeight: 'bold', color: '#4a90e2', width: 45, textAlign: 'right' },
  emptyText: { textAlign: 'center', fontStyle: 'italic' }
});

export default TeacherDashboard;