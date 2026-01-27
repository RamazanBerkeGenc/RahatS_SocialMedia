require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// --- DOSYA YÜKLEME YAPILANDIRMASI (MULTER) ---
const uploadDir = 'uploads/videos';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Max 50MB
});

app.use('/uploads', express.static('uploads'));

// --- VERİTABANI BAĞLANTISI ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true // Çoklu SELECT dönen prosedürler için gerekli
});

db.connect((err) => {
    if (err) console.error("Veritabanı bağlantı hatası: " + err.message);
    else console.log("MySQL Prosedür Bağlantısı Başarılı!");
});

// --- API ENDPOINT'LERİ (STORED PROCEDURES) ---

// 1. Giriş API
app.post('/api/auth/login', (req, res) => {
    const { tc_no, password, role } = req.body;
    db.query('CALL sp_LoginUser(?, ?, ?)', [tc_no, password, role], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        const user = results[0][0]; 
        if (user) res.json({ success: true, user });
        else res.status(401).json({ success: false, message: "TC veya Şifre hatalı!" });
    });
});

// 2. Öğrenci Dashboard API
app.get('/api/student/dashboard/:studentId', (req, res) => {
    db.query('CALL sp_GetStudentDashboard(?)', [req.params.studentId], (err, results) => {
        if (err) return res.status(500).json({ message: "Dashboard verisi alınamadı." });
        res.json({
            studentInfo: results[0][0], 
            grades: results[1]           
        });
    });
});

// 3. Öğretmen Sınıf Listesi
app.get('/api/teacher/classes/:teacherId', (req, res) => {
    db.query('CALL sp_GetTeacherClasses(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Sınıflar getirilemedi." });
        res.json(results[0]);
    });
});

// 4. Öğretmenin Öğrenci Listesi
app.get('/api/teacher/students/:teacherId', (req, res) => {
    db.query('CALL sp_GetTeacherStudents(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Öğrenci listesi alınamadı." });
        res.json(results[0]);
    });
});

// 5. Not Güncelleme API
app.post('/api/teacher/update-grades', (req, res) => {
    const { student_id, teacher_id, sinav1, sinav2, sozlu1, sozlu2 } = req.body;
    db.query('CALL sp_UpdateStudentGrades(?, ?, ?, ?, ?, ?)', 
    [student_id, teacher_id, sinav1, sinav2, sozlu1, sozlu2], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: "Notlar güncellendi." });
    });
});

// 6. Materyal Yükleme API
app.post('/api/teacher/upload-material', upload.single('video'), (req, res) => {
    const { ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, baslik, icerik } = req.body;
    let finalIcerik = req.file ? `http://10.0.2.2:3000/uploads/videos/${req.file.filename}` : icerik;

    db.query('CALL sp_UploadMaterial(?, ?, ?, ?, ?, ?, ?)', 
    [ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, finalIcerik, baslik], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: "Materyal yüklendi!" });
    });
});

// 7. Öğretmenin Materyalleri Listelemesi
app.get('/api/teacher/materials/:teacherId', (req, res) => {
    db.query('CALL sp_GetTeacherMaterials(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results[0]);
    });
});

// 8. Materyal Silme
app.delete('/api/teacher/materials/:id', (req, res) => {
    db.query('CALL sp_DeleteMaterial(?)', [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// 9. Akıllı Video Önerisi
app.get('/api/student/suggested-videos/:studentId/:dersId', (req, res) => {
    const { studentId, dersId } = req.params;
    db.query('CALL sp_GetSuggestedVideos(?, ?)', [studentId, dersId], (err, results) => {
        if (err) return res.status(500).send("Video öneri hatası.");
        res.json(results[0]);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`RahatS Sunucusu ${PORT} portunda prosedürlerle çalışıyor.`);
});