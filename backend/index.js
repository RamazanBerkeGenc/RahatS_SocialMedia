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
        // Dosya ismini benzersiz yap: tarih-orijinalad
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Max 50MB
});

// Statik klasörü dışarı aç (Videoların izlenebilmesi için)
app.use('/uploads', express.static('uploads'));

// --- VERİTABANI BAĞLANTISI ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error("Veritabanına bağlanılamadı: " + err.message);
    } else {
        console.log("MySQL Bağlantısı Başarılı!");
    }
});

// --- API ENDPOINT'LERİ ---

// 1. Giriş API'si
app.post('/api/auth/login', (req, res) => {
    const { tc_no, password, role } = req.body;
    const table = (role === 'teacher') ? 'ogretmenler' : 'ogrenci';
    const query = `SELECT id, name, lastname FROM ${table} WHERE tc = ? AND password = ?`;
    
    db.query(query, [tc_no, password], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.status(401).json({ success: false, message: "TC No veya Şifre hatalı!" });
        }
    });
});

// 2. Öğrenci Notları API'si (Öğrenci Paneli)
app.get('/api/student/dashboard/:studentId', (req, res) => {
    const { studentId } = req.params;

    const studentQuery = "SELECT id, name, lastname FROM ogrenci WHERE id = ?";
    const gradesQuery = `
        SELECT od.ders_id, d.name as lesson_name, 
        od.sinav1, od.sinav2, od.sozlu1, od.sozlu2, od.ortalama
        FROM ogrenci_ders od
        JOIN dersler d ON od.ders_id = d.id
        WHERE od.ogrenci_id = ?`;

    db.query(studentQuery, [studentId], (err, studentRes) => {
        if (err) return res.status(500).json({ message: "Hata" });
        db.query(gradesQuery, [studentId], (err, gradesRes) => {
            if (err) return res.status(500).json({ message: "Hata" });
            res.json({
                studentInfo: studentRes[0],
                grades: gradesRes
            });
        });
    });
});

// 3. Öğretmenin Sınıflarını Getir (Dinamik Sınıf Seçici İçin)
app.get('/api/teacher/classes/:teacherId', (req, res) => {
    const { teacherId } = req.params;
    const query = `
        SELECT DISTINCT s.id, s.name 
        FROM sinif s
        JOIN ogrenci o ON o.sinif_id = s.id
        JOIN ogrenci_ders od ON od.ogrenci_id = o.id
        WHERE od.ogretmen_id = ?`;

    db.query(query, [teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Sınıflar getirilemedi." });
        res.json(results);
    });
});

// 4. Öğretmenin Öğrencilerini Getir (Öğretmen Paneli - Filtreleme Destekli)
app.get('/api/teacher/students/:teacherId', (req, res) => {
    const { teacherId } = req.params;
    const query = `
        SELECT 
            o.id as student_id, 
            o.name, 
            o.lastname, 
            o.sinif_id,  -- Frontend filtrelemesi için ID gerekli
            s.name as class_name, 
            od.sinav1, od.sinav2, od.sozlu1, od.sozlu2, od.ortalama, 
            d.name as lesson_name, 
            od.ders_id
        FROM ogrenci_ders od
        JOIN ogrenci o ON od.ogrenci_id = o.id
        JOIN sinif s ON o.sinif_id = s.id 
        JOIN dersler d ON od.ders_id = d.id
        WHERE od.ogretmen_id = ?`;

    db.query(query, [teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Öğrenci listesi alınamadı." });
        res.json(results);
    });
});

// 5. Not Güncelleme API'si
app.post('/api/teacher/update-grades', (req, res) => {
    const { student_id, teacher_id, sinav1, sinav2, sozlu1, sozlu2 } = req.body;
    const query = `UPDATE ogrenci_ders SET sinav1 = ?, sinav2 = ?, sozlu1 = ?, sozlu2 = ? WHERE ogrenci_id = ? AND ogretmen_id = ?`;
    db.query(query, [sinav1, sinav2, sozlu1, sozlu2, student_id, teacher_id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: "Notlar başarıyla güncellendi." });
    });
});

// 6. Video/Materyal Yükleme API'si
app.post('/api/teacher/upload-material', upload.single('video'), (req, res) => {
    const { ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, baslik, icerik } = req.body;
    
    let finalIcerik = icerik;
    if (req.file) {
        // Eğer dosya yüklenmişse sunucu linkini oluştur
        finalIcerik = `http://10.0.2.2:3000/uploads/videos/${req.file.filename}`;
    }

    const query = `INSERT INTO egitim_materyalleri (ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, icerik, baslik) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, finalIcerik, baslik], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Materyal kaydedilemedi." });
        }
        res.json({ success: true, message: "Materyal başarıyla yüklendi!", path: finalIcerik });
    });
});

// 7. Akıllı Video Önerisi (Öğrenci ve Ders Odaklı)
app.get('/api/student/suggested-videos/:studentId/:dersId', (req, res) => {
    const { studentId, dersId } = req.params;
    
    const query = `
        SELECT em.* FROM egitim_materyalleri em
        JOIN ogrenci o ON o.id = ?
        JOIN sinif s ON o.sinif_id = s.id
        JOIN ogrenci_ders od ON od.ogrenci_id = o.id AND od.ders_id = em.ders_id
        WHERE em.ders_id = ? 
        AND s.name LIKE CONCAT(em.sinif_seviyesi, '%')
        AND em.hedef_aralik = (
            CASE 
                WHEN od.ortalama BETWEEN 0 AND 20 THEN '0-20'
                WHEN od.ortalama BETWEEN 21 AND 40 THEN '20-40'
                WHEN od.ortalama BETWEEN 41 AND 60 THEN '40-60'
                WHEN od.ortalama BETWEEN 61 AND 80 THEN '60-80'
                ELSE '80-100'
            END
        )`;

    db.query(query, [studentId, dersId], (err, results) => {
        if (err) return res.status(500).send("Video öneri hatası.");
        res.json(results);
    });
});

// Öğretmenin yüklediği materyalleri getir
app.get('/api/teacher/materials/:teacherId', (req, res) => {
    const { teacherId } = req.params;
    const query = `SELECT * FROM egitim_materyalleri WHERE ogretmen_id = ? ORDER BY yukleme_tarihi DESC`;
    db.query(query, [teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Materyal sil
app.delete('/api/teacher/materials/:id', (req, res) => {
    const { id } = req.params;
    db.query(`DELETE FROM egitim_materyalleri WHERE id = ?`, [id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`RahatS Sunucusu ${PORT} portunda başarıyla çalışıyor.`);
});