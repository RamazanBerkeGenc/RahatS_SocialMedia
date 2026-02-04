require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// --- GÜVENLİK YAPILANDIRMASI ---
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; 
const IV_LENGTH = 16; 

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    console.error("❌ HATA: .env dosyasındaki ENCRYPTION_KEY bulunamadı veya 32 karakter değil!");
    process.exit(1); 
}

function encrypt(text) {
    if (!text) return text;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// --- DOSYA YÜKLEME ---
const uploadDir = 'uploads/videos';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- VERİTABANI BAĞLANTISI ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true 
});

db.connect((err) => {
    if (err) console.error("Veritabanı bağlantı hatası: " + err.message);
    else console.log("🚀 RahatS MySQL - Güvenli Akademik ve Sosyal Medya Aktif!");
});

// --- AI GÜVENLİK YARDIMCI FONKSİYONU ---
const checkContentSafety = async (text) => {
    try {
        const aiResponse = await axios.post('http://localhost:5000/predict', { text: text });
        return aiResponse.data.is_clean; 
    } catch (error) {
        console.error("AI Servis Hatası:", error.message);
        return true; 
    }
};

// ==========================================
// 1. AUTH API'LERİ
// ==========================================

app.post('/api/auth/login', async (req, res) => {
    const { tc_no, password, role } = req.body;
    const table = role === 'teacher' ? 'ogretmenler' : 'ogrenci';
    
    db.query(`SELECT * FROM ${table}`, async (err, users) => {
        if (err) return res.status(500).json({ success: false });
        const user = users.find(u => decrypt(u.tc) === tc_no);
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                res.json({ 
                    success: true, 
                    user: { id: user.id, name: user.name, lastname: user.lastname, email: decrypt(user.email) } 
                });
            } else res.status(401).json({ success: false, message: "Şifre hatalı!" });
        } else res.status(401).json({ success: false, message: "Kullanıcı bulunamadı!" });
    });
});

// ==========================================
// 2. AKADEMİK DASHBOARD SORGULARI (Öğretmen & Öğrenci)
// ==========================================

app.get('/api/student/dashboard/:studentId', (req, res) => {
    db.query('CALL sp_GetStudentDashboard(?)', [req.params.studentId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        res.json({ studentInfo: results[0][0], grades: results[1] });
    });
});

app.get('/api/student/suggested-videos/:studentId/:dersId', (req, res) => {
    db.query('CALL sp_GetSuggestedVideos(?, ?)', [req.params.studentId, req.params.dersId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        res.json(results[0]);
    });
});

app.get('/api/teacher/students/:teacherId', (req, res) => {
    db.query('CALL sp_GetTeacherStudents(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        res.json(results[0]); 
    });
});

app.get('/api/teacher/classes/:teacherId', (req, res) => {
    db.query('CALL sp_GetTeacherClasses(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        res.json(results[0]);
    });
});

app.get('/api/teacher/materials/:teacherId', (req, res) => {
    db.query('CALL sp_GetTeacherMaterials(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        res.json(results[0]);
    });
});

// ==========================================
// 3. İSTATİSTİK VE VİDEO TAKİP (KRİTİK DÜZELTME)
// ==========================================
// Materyal İzleme İstatistiklerini Getir (Tablo Hatası Giderildi)
app.get('/api/teacher/material-stats/:materialId', (req, res) => {
    const query = `
        SELECT 
            o.name, 
            o.lastname, 
            IFNULL(s.name, CONCAT(o.sinif_id, '. Sınıf')) as sinif_adi, 
            vp.is_completed, 
            vp.last_position, 
            vp.duration,
            CASE 
                WHEN vp.duration > 0 THEN ROUND((vp.last_position / vp.duration) * 100) 
                ELSE 0 
            END as watch_percent
        FROM video_progress vp
        INNER JOIN ogrenci o ON vp.user_id = o.id
        LEFT JOIN sinif s ON o.sinif_id = s.id 
        WHERE vp.material_id = ?`;

    db.query(query, [req.params.materialId], (err, results) => {
        if (err) {
            console.error("İstatistik Sorgu Hatası:", err);
            return res.status(500).json({ message: "Veritabanı hatası!" });
        }
        res.json(results);
    });
});

app.post('/api/academic/save-progress', (req, res) => {
    const { user_id, material_id, position, duration } = req.body;
    if(!duration) return res.json({success: false});
    const isCompleted = (position / duration) >= 0.9 ? 1 : 0;
    const query = `
        INSERT INTO video_progress (user_id, material_id, last_position, duration, is_completed)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            last_position = VALUES(last_position), 
            duration = VALUES(duration), 
            is_completed = VALUES(is_completed)`;
    db.query(query, [user_id, material_id, position, duration, isCompleted], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/api/academic/get-progress/:userId/:materialId', (req, res) => {
    db.query('SELECT last_position FROM video_progress WHERE user_id = ? AND material_id = ?', 
    [req.params.userId, req.params.materialId], (err, results) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ position: results.length > 0 ? results[0].last_position : 0 });
    });
});

// ==========================================
// 4. MATERYAL YÖNETİMİ
// ==========================================
app.post('/api/teacher/upload-material', upload.single('video'), (req, res) => {
    const { ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, baslik, icerik } = req.body;
    let finalContent = tip === 'video' ? `http://10.0.2.2:3000/uploads/videos/${req.file.filename}` : icerik;
    db.query('CALL sp_UploadMaterial(?, ?, ?, ?, ?, ?, ?)', 
    [ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, finalContent, baslik], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.put('/api/teacher/update-material/:materialId', (req, res) => {
    const { teacherId, title, content, level, range } = req.body;
    db.query('CALL sp_UpdateMaterial(?, ?, ?, ?, ?, ?)', 
    [req.params.materialId, teacherId, title, content, level, range], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.post('/api/teacher/update-grades', (req, res) => {
    const { student_id, teacher_id, sinav1, sinav2, sozlu1, sozlu2 } = req.body;
    db.query('CALL sp_UpdateStudentGrades(?, ?, ?, ?, ?, ?)', 
    [student_id, teacher_id, sinav1, sinav2, sozlu1, sozlu2], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.delete('/api/teacher/delete-material/:materialId', (req, res) => {
    const { teacherId } = req.body;
    db.query('CALL sp_DeleteMaterial(?, ?)', [req.params.materialId, teacherId], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// ==========================================
// 5. SOSYAL MEDYA (ROTA SIRALAMASI DÜZELTİLDİ)
// ==========================================
app.get('/api/social/feed/:userId/:role', (req, res) => {
    const { userId, role } = req.params;
    db.query('CALL sp_GetSocialFeed(?, ?)', [userId, role], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        res.json(results[0]); 
    });
});

app.post('/api/social/like', (req, res) => {
    const { post_id, user_id, user_role } = req.body;
    db.query('CALL sp_ToggleLike(?, ?, ?)', [post_id, user_id, user_role], (err, results) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, is_liked: results[0][0].is_liked }); 
    });
});

app.get('/api/social/profile/:userId/:role/:currentUserId/:currentRole', (req, res) => {
    const { userId, role, currentUserId, currentRole } = req.params;
    db.query('CALL sp_GetUserProfilePosts(?, ?, ?, ?)', [userId, role, currentUserId, currentRole], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        res.json(results); 
    });
});

app.get('/api/social/comments/:postId', (req, res) => {
    const query = `
        SELECT c.*, COALESCE(CONCAT(o.name, ' ', o.lastname), CONCAT(t.name, ' ', t.lastname)) as author_name
        FROM post_comments c
        LEFT JOIN ogrenci o ON c.user_id = o.id AND c.user_role = 'student'
        LEFT JOIN ogretmenler t ON c.user_id = t.id AND c.user_role = 'teacher'
        WHERE c.post_id = ? ORDER BY c.created_at ASC`;
    db.query(query, [req.params.postId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata!" });
        res.json(results);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 RahatS Aktif: ${PORT}`));


// --- VERİ MİGRASYONU (TEK SEFERLİK) ---
const migrateData = async () => {
    console.log("🔐 Veri dönüştürme işlemi başlıyor...");
    db.query('SELECT id, tc, password, email FROM ogrenci', async (err, students) => {
        if (err) return;
        for (let student of students) {
            if (student.tc.includes(':')) continue;
            const encTC = encrypt(student.tc);
            const encEmail = encrypt(student.email);
            const hashedPw = await bcrypt.hash(student.password, 10);
            db.query('UPDATE ogrenci SET tc = ?, password = ?, email = ? WHERE id = ?', [encTC, hashedPw, encEmail, student.id]);
        }
    });
    db.query('SELECT id, tc, password, email FROM ogretmenler', async (err, teachers) => {
        if (err) return;
        for (let teacher of teachers) {
            if (teacher.tc.includes(':')) continue;
            const encTC = encrypt(teacher.tc);
            const encEmail = encrypt(teacher.email);
            const hashedPw = await bcrypt.hash(teacher.password, 10);
            db.query('UPDATE ogretmenler SET tc = ?, password = ?, email = ? WHERE id = ?', [encTC, hashedPw, encEmail, teacher.id]);
        }
    });
    console.log("✅ Dönüştürme tamamlandı. Lütfen migrateData() çağrısını yorum satırı yapın.");
};
// migrateData(); // <--- Verileri bir kez şifrelemek için bu satırı açın ve sunucuyu başlatın. Sonra geri kapatın.

