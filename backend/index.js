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
const jwt = require('jsonwebtoken'); 

// Uygulama Başlatma
const app = express();
app.use(cors()); // Farklı domainlerden (ör: mobilden) gelen isteklere izin ver
app.use(express.json()); // Gelen JSON verilerini okuyabilmemizi sağlar

// =============================================================
// 1. GÜVENLİK VE ŞİFRELEME AYARLARI
// =============================================================
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'cok_gizli_anahtar';
const IV_LENGTH = 16; 

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    console.error("❌ HATA: Şifreleme anahtarı eksik veya hatalı!");
    process.exit(1); 
}

// encrypt(): Metni veritabanına kaydetmeden önce şifreler (AES-256)
function encrypt(text) {
    if (!text) return text;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// decrypt(): Veritabanından gelen şifreli metni okunabilir hale getirir
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

// hashTC(): TC no ile hızlı arama yapmak için TC'nin özetini çıkarır (Geri döndürülemez)
function hashTC(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

// =============================================================
// 2. DOSYA YÜKLEME AYARLARI (MULTER)
// =============================================================

// A. Video Yükleme Ayarları
const uploadDir = 'uploads/videos';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

// B. [YENİ] Profil Resmi Yükleme Ayarları
const profileDir = 'uploads/profiles';
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profileDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-profile-' + file.originalname)
});

// Sadece resim dosyalarına izin ver ve boyutu 5MB ile sınırla
const uploadProfile = multer({ 
    storage: profileStorage, 
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyası yüklenebilir!'));
        }
    }
});

// 'uploads' klasörünü dış dünyaya açıyoruz (Videolar ve Profiller buradan erişilecek)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// =============================================================
// 3. VERİTABANI BAĞLANTISI
// =============================================================
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true 
});

db.connect((err) => {
    if (err) console.error("DB Hatası: " + err.message);
    else console.log("🚀 RahatS Aktif (Full Procedure Modu + Profil Foto)");
});

// =============================================================
// 4. YARDIMCI SERVİSLER (AI & MIDDLEWARE)
// =============================================================

// AI Kontrolü: İçerik temiz mi?
const checkContentSafety = async (text) => {
    try {
        const aiResponse = await axios.post('http://localhost:5000/predict', { text: text });
        return aiResponse.data.is_clean; 
    } catch (error) {
        console.error("AI Servis Hatası:", error.message);
        return true; 
    }
};

// Güvenlik Bekçisi: Token Kontrolü
const authorize = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) return res.status(401).json({ message: "Erişim reddedildi. Token yok." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Geçersiz Token." });
        req.user = user; 
        next(); 
    });
};


// =============================================================
// API ROTALARI (ENDPOINTLER)
// =============================================================

// --- GİRİŞ İŞLEMLERİ ---
app.post('/api/auth/login', async (req, res) => {
    const { tc_no, password, role } = req.body;
    const searchedHash = hashTC(tc_no);
    
    db.query('CALL sp_GetUserByHash(?, ?)', [searchedHash, role], async (err, result) => {
        const users = result[0]; 
        if (err || users.length === 0) return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı" });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            const token = jwt.sign(
                { id: user.id, role: role }, 
                JWT_SECRET, 
                { expiresIn: '30d' }
            );
            res.json({ 
                success: true, 
                token: token, 
                user: { id: user.id, name: user.name, lastname: user.lastname, email: user.email ? decrypt(user.email) : "" } 
            });
        } else res.status(401).json({ success: false, message: "Şifre hatalı" });
    });
});

// --- AKADEMİK (ÖĞRENCİ) ---
app.get('/api/student/dashboard/:studentId', authorize, (req, res) => {
    if (req.user.role === 'student' && req.user.id != req.params.studentId) {
        return res.status(403).json({ message: "Yetkisiz Erişim!" });
    }
    db.query('CALL sp_GetStudentDashboard(?)', [req.params.studentId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata" });
        res.json({ studentInfo: results[0][0], grades: results[1] });
    });
});

app.get('/api/student/suggested-videos/:studentId/:dersId', authorize, (req, res) => {
    db.query('CALL sp_GetSuggestedVideos(?, ?)', [req.params.studentId, req.params.dersId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata" });
        res.json(results[0]);
    });
});

// --- AKADEMİK (ÖĞRETMEN) ---
app.get('/api/teacher/students/:teacherId', authorize, (req, res) => {
    if (req.user.role === 'teacher' && req.user.id != req.params.teacherId) return res.status(403).json({message: "Yetkisiz"});
    db.query('CALL sp_GetTeacherStudents(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata" });
        res.json(results[0]); 
    });
});

app.get('/api/teacher/classes/:teacherId', authorize, (req, res) => {
    db.query('CALL sp_GetTeacherClasses(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata" });
        res.json(results[0]);
    });
});

app.get('/api/teacher/materials/:teacherId', authorize, (req, res) => {
    db.query('CALL sp_GetTeacherMaterials(?)', [req.params.teacherId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata" });
        res.json(results[0]);
    });
});

// --- MATERYAL İSTATİSTİK & TAKİP ---
app.get('/api/teacher/material-stats/:materialId', authorize, (req, res) => {
    db.query('CALL sp_GetMaterialStats(?)', [req.params.materialId], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata" });
        res.json(results[0]); 
    });
});

app.post('/api/academic/save-progress', authorize, (req, res) => {
    const { user_id, material_id, position, duration } = req.body;
    if(!duration) return res.json({success: false});
    if (req.user.id != user_id) return res.status(403).json({message: "Yetkisiz işlem"});

    db.query('CALL sp_SaveVideoProgress(?, ?, ?, ?)', 
        [user_id, material_id, position, duration], 
        (err) => res.json({ success: !err })
    );
});

app.get('/api/academic/get-progress/:userId/:materialId', authorize, (req, res) => {
    db.query('CALL sp_GetVideoProgress(?, ?)', 
        [req.params.userId, req.params.materialId], 
        (err, results) => {
            if (err) return res.status(500).json({ success: false });
            const pos = (results[0] && results[0].length > 0) ? results[0][0].last_position : 0;
            res.json({ position: pos });
        }
    );
});

// --- MATERYAL YÖNETİMİ ---
app.post('/api/teacher/upload-material', authorize, upload.single('video'), (req, res) => {
    const { ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, baslik, icerik } = req.body;
    let finalContent = tip === 'video' ? `http://10.0.2.2:3000/uploads/videos/${req.file.filename}` : icerik;
    
    db.query('CALL sp_UploadMaterial(?, ?, ?, ?, ?, ?, ?)', 
        [ogretmen_id, ders_id, sinif_seviyesi, hedef_aralik, tip, finalContent, baslik], 
        (err) => res.json({ success: !err })
    );
});

app.put('/api/teacher/update-material/:materialId', authorize, (req, res) => {
    const { teacherId, title, content, level, range } = req.body;
    db.query('CALL sp_UpdateMaterial(?, ?, ?, ?, ?, ?)', 
        [req.params.materialId, teacherId, title, content, level, range], 
        (err) => res.json({ success: !err })
    );
});

app.post('/api/teacher/update-grades', authorize, (req, res) => {
    const { student_id, teacher_id, sinav1, sinav2, sozlu1, sozlu2 } = req.body;
    db.query('CALL sp_UpdateStudentGrades(?, ?, ?, ?, ?, ?)', 
        [student_id, teacher_id, sinav1, sinav2, sozlu1, sozlu2], 
        (err) => res.json({ success: !err })
    );
});

app.delete('/api/teacher/delete-material/:materialId', authorize, (req, res) => {
    const { teacherId } = req.body;
    db.query('CALL sp_DeleteMaterial(?, ?)', [req.params.materialId, teacherId], (err) => res.json({ success: !err }));
});

// --- [YENİ] PROFİL RESMİ YÜKLEME ---
app.post('/api/user/upload-profile-image', authorize, uploadProfile.single('photo'), (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        if (!req.file) return res.status(400).json({ message: "Resim seçilmedi." });

        // Sunucudaki tam dosya yolu. 
        // NOT: Android Emülatör için 10.0.2.2 kullanılır. Gerçek telefonda bilgisayar IP'sini yazın.
        const imagePath = `http://10.0.2.2:3000/uploads/profiles/${req.file.filename}`;

        db.query('CALL sp_UpdateProfileImage(?, ?, ?)', 
            [userId, userRole, imagePath], 
            (err) => {
                if (err) {
                    console.error("Profil Resmi DB Hatası:", err);
                    return res.status(500).json({ success: false });
                }
                res.json({ success: true, imagePath: imagePath });
            }
        );
    } catch (error) {
        console.error("Profil Yükleme Hatası:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// --- SOSYAL MEDYA ---

app.post('/api/social/create-post', authorize, upload.single('image'), async (req, res) => {
    try {
        const { user_id, user_role, content } = req.body;
        if(req.user.id != user_id || req.user.role != user_role) return res.status(403).json({message: "Yetkisiz"});

        const isClean = await checkContentSafety(content);
        if (!isClean) return res.status(400).json({ success: false, message: "İçerik uygunsuz." });

        db.query('CALL sp_CreatePost(?, ?, ?)', [user_id, user_role, content], (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, message: "Gönderildi." });
        });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/social/feed/:userId/:role', authorize, (req, res) => {
    const { userId, role } = req.params;
    db.query('CALL sp_GetSocialFeed(?, ?)', [userId, role], (err, results) => res.json(results[0]));
});

app.post('/api/social/like', authorize, (req, res) => {
    const { post_id, user_id, user_role } = req.body;
    db.query('CALL sp_ToggleLike(?, ?, ?)', [post_id, user_id, user_role], (err, results) => 
        res.json({ success: true, is_liked: results[0][0].is_liked }));
});

app.post('/api/social/follow', authorize, (req, res) => {
    const { follower_id, follower_role, following_id, following_role } = req.body;
    if (req.user.id != follower_id || req.user.role != follower_role) return res.status(403).json({ message: "Yetkisiz işlem" });

    db.query('CALL sp_ToggleFollow(?, ?, ?, ?)', 
        [follower_id, follower_role, following_id, following_role], 
        (err, results) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, is_following: results[0][0].is_following }); 
        }
    );
});

app.get('/api/social/profile/:userId/:role/:currentUserId/:currentRole', authorize, (req, res) => {
    const { userId, role, currentUserId, currentRole } = req.params;
    db.query('CALL sp_GetUserProfilePosts(?, ?, ?, ?)', [userId, role, currentUserId, currentRole], (err, results) => res.json(results));
});

app.get('/api/social/comments/:postId', authorize, (req, res) => {
    db.query('CALL sp_GetPostComments(?)', [req.params.postId], (err, results) => res.json(results[0]));
});

app.post('/api/social/comment', authorize, async (req, res) => {
    try {
        const { post_id, user_id, user_role, comment_text } = req.body;
        const isClean = await checkContentSafety(comment_text);
        if (!isClean) return res.status(400).json({ success: false, message: "Uygunsuz yorum." });

        db.query('CALL sp_AddComment(?, ?, ?, ?)', [post_id, user_id, user_role, comment_text], (err) => res.json({ success: !err }));
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/social/comment/:commentId', authorize, (req, res) => {
    db.query('CALL sp_DeleteComment(?)', [req.params.commentId], (err) => res.json({ success: !err }));
});

app.delete('/api/social/post/:postId', authorize, (req, res) => {
    db.query('CALL sp_DeletePost(?)', [req.params.postId], (err) => res.json({ success: !err }));
});

app.get('/api/social/search', authorize, (req, res) => {
    const query = req.query.q; 
    if (!query || query.length < 2) return res.json([]); 
    db.query('CALL sp_SearchUser(?)', [query], (err, results) => {
        if (err) return res.status(500).json({ message: "Hata" });
        res.json(results[0]); 
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

// --- HASH GÖÇÜ (Sadece 1 kere çalıştırılmalı) ---
const migrateHashes = async () => {
    console.log("🔄 Hash güncelleme işlemi başlıyor...");
    
    const tables = ['ogrenci', 'ogretmenler'];
    
    for (const table of tables) {
        db.query(`SELECT id, tc FROM ${table} WHERE tc_hash IS NULL`, (err, rows) => {
            if (err) return console.error(err);
            
            rows.forEach(row => {
                // 1. Mevcut şifreli TC'yi çöz
                try {
                    const plainTC = decrypt(row.tc);
                    // 2. Hash oluştur
                    const hashedTC = hashTC(plainTC);
                    // 3. Veritabanına hash'i yaz
                    db.query(`UPDATE ${table} SET tc_hash = ? WHERE id = ?`, [hashedTC, row.id]);
                    console.log(`✅ ${table} ID ${row.id} hash'lendi.`);
                } catch (e) {
                    console.error(`Hata ID ${row.id}:`, e.message);
                }
            });
        });
    }
};

// Uygulama başladığında 3 saniye sonra çalışsın (DB bağlantısı otursun diye)
//setTimeout(migrateHashes, 3000);

