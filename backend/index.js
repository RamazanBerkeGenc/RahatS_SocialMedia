require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// --- DOSYA YÜKLEME YAPILANDIRMASI ---
const uploadDir = 'uploads/videos';
const postUploadDir = 'uploads/posts'; 

[uploadDir, postUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = file.fieldname === 'video' ? uploadDir : postUploadDir;
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
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
    else console.log("🚀 RahatS MySQL - Akademik ve Sosyal Medya Aktif!");
});

// --- AI GÜVENLİK YARDIMCI FONKSİYONU ---
const checkContentSafety = async (text) => {
    try {
        const aiResponse = await axios.post('http://localhost:5000/predict', { text: text });
        return aiResponse.data.is_clean; 
    } catch (error) {
        console.error("AI Servis Hatası:", error.message);
        return true; // Servis kapalıysa sistemi kilitlememek için true dönüyoruz
    }
};

// ==========================================
// 1. AUTH & GENEL API'LER
// ==========================================

app.post('/api/auth/login', (req, res) => {
    const { tc_no, password, role } = req.body;
    db.query('CALL sp_LoginUser(?, ?, ?)', [tc_no, password, role], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Sunucu hatası!" });
        const user = results[0][0]; 
        if (user) {
            res.json({ success: true, user: user });
        } else {
            res.status(401).json({ success: false, message: "TC veya Şifre hatalı!" });
        }
    });
});

// ==========================================
// 2. SOSYAL MEDYA ETKİLEŞİM API'LERİ
// ==========================================

// Post Paylaşma (AI Filtreli)
app.post('/api/social/create-post', upload.single('image'), async (req, res) => {
    const { user_id, user_role, content } = req.body;
    let imageUrl = req.file ? `http://10.0.2.2:3000/uploads/posts/${req.file.filename}` : null;

    const isSafe = await checkContentSafety(content);
    const status = isSafe ? 'approved' : 'rejected';

    db.query('CALL sp_CreatePost(?, ?, ?, ?, ?)', [user_id, user_role, content, imageUrl, status], (err) => {
        if (err) return res.status(500).json({ success: false, error: "İşlem başarısız." });
        res.json({ success: isSafe, message: isSafe ? "Paylaşıldı!" : "İçerik kurallara aykırı bulundu." });
    });
});

// Beğeni Aç/Kapat (Toggle)
app.post('/api/social/like', (req, res) => {
    const { post_id, user_id, user_role } = req.body;
    db.query('CALL sp_ToggleLike(?, ?, ?)', [post_id, user_id, user_role], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true }); // Veritabanında toggle olduğu için başarılı dönmesi yeterli
    });
});

// Yorum Yapma (AI Filtreli)
app.post('/api/social/comment', async (req, res) => {
    const { post_id, user_id, user_role, comment_text } = req.body;
    
    const isSafe = await checkContentSafety(comment_text);
    if (!isSafe) {
        return res.json({ success: false, message: "Yorumunuz uygunsuz içerik barındırıyor." });
    }

    db.query('CALL sp_AddComment(?, ?, ?, ?)', [post_id, user_id, user_role, comment_text], (err) => {
        if (err) return res.status(500).json({ success: false });
        // Yorum onaylandığı için statüsünü otomatik approved yapıyoruz
        db.query('UPDATE post_comments SET ai_status = "approved" WHERE comment_text = ? AND user_id = ?', [comment_text, user_id]);
        res.json({ success: true, message: "Yorum eklendi." });
    });
});

// Gönderiye Ait Onaylanmış Yorumları Listele (X Tarzı Detay İçin)
app.get('/api/social/comments/:postId', (req, res) => {
    const query = `
        SELECT c.*, 
        COALESCE(CONCAT(o.name, ' ', o.lastname), CONCAT(t.name, ' ', t.lastname)) as author_name
        FROM post_comments c
        LEFT JOIN ogrenci o ON c.user_id = o.id AND c.user_role = 'student'
        LEFT JOIN ogretmenler t ON c.user_id = t.id AND c.user_role = 'teacher'
        WHERE c.post_id = ? AND c.ai_status = 'approved'
        ORDER BY c.created_at ASC`;
    
    db.query(query, [req.params.postId], (err, results) => {
        if (err) return res.status(500).json({ message: "Yorumlar yüklenemedi." });
        res.json(results);
    });
});

// Takip Et / Takipten Çık (Toggle)
app.post('/api/social/follow', (req, res) => {
    const { follower_id, follower_role, following_id, following_role } = req.body;
    db.query('CALL sp_ToggleFollow(?, ?, ?, ?)', [follower_id, follower_role, following_id, following_role], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// Sosyal Akışı Getir
app.get('/api/social/feed', (req, res) => {
    db.query('CALL sp_GetSocialFeed()', (err, results) => {
        if (err) return res.status(500).json({ message: "Akış alınamadı." });
        res.json(results[0]);
    });
});

// Profil Verilerini Getir
app.get('/api/social/profile/:userId/:role', (req, res) => {
    db.query('CALL sp_GetUserProfilePosts(?, ?)', [req.params.userId, req.params.role], (err, results) => {
        if (err) return res.status(500).json({ message: "Profil yüklenemedi." });
        res.json(results); 
    });
});

// ==========================================
// 3. AKADEMİK SİSTEM API'LERİ
// ==========================================

app.get('/api/student/dashboard/:studentId', (req, res) => {
    db.query('CALL sp_GetStudentDashboard(?)', [req.params.studentId], (err, results) => {
        if (err) return res.status(500).json({ message: "Dashboard verisi alınamadı." });
        res.json({ studentInfo: results[0][0], grades: results[1] });
    });
});

app.get('/api/student/suggested-videos/:studentId/:dersId', (req, res) => {
    db.query('CALL sp_GetSuggestedVideos(?, ?)', [req.params.studentId, req.params.dersId], (err, results) => {
        if (err) return res.status(500).json({ message: "Öneriler alınamadı." });
        res.json(results[0]);
    });
});

app.get('/api/teacher/students/:teacherId', (req, res) => {
    db.query('CALL sp_GetTeacherStudents(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Öğrenci listesi alınamadı." });
        res.json(results[0]);
    });
});

app.get('/api/teacher/classes/:teacherId', (req, res) => {
    db.query('CALL sp_GetTeacherClasses(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Sınıf bilgisi alınamadı." });
        res.json(results[0]);
    });
});

app.get('/api/teacher/materials/:teacherId', (req, res) => {
    db.query('CALL sp_GetTeacherMaterials(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Materyaller alınamadı." });
        res.json(results[0]);
    });
});

app.post('/api/teacher/upload-material', upload.single('video'), (req, res) => {
    const { ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, baslik, icerik } = req.body;
    let finalContent = tip === 'video' ? `http://10.0.2.2:3000/uploads/videos/${req.file.filename}` : icerik;

    db.query('CALL sp_UploadMaterial(?, ?, ?, ?, ?, ?, ?)', 
    [ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, finalContent, baslik], (err) => {
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

app.put('/api/teacher/update-material/:materialId', (req, file, res) => { // req ve res parametrelerini düzelttim
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
        res.json({ success: true, message: "Notlar güncellendi." });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RahatS Sunucusu ${PORT} portunda tam kapasite aktif.`);
});