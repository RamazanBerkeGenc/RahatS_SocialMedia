RahatS, öğretmenlerin öğrenci başarılarını takip edebildiği ve birbirleri ile iletişime girebilecekleri bir sosyal medya platformudur. Proje, React Native (Mobil) ve Node.js (Backend) mimarisi üzerine kurulmuş olup, tüm veritabanı işlemleri güvenlik amacıyla Stored Procedures üzerinden yürütülmektedir.

Akıllı Öneri Sistemi: Öğrencinin sınav ortalamasına göre izlemesi gereken videolar otomatik olarak listelenir.

Öğretmen Paneli: Sınıf bazlı öğrenci listeleme, not girişi, video ve URL tabanlı materyal yükleme.

Öğrenci Paneli: Kişiselleştirilmiş başarı çizelgesi ve ders bazlı çalışma önerileri.

🚀 Kurulum ve Kullanım Talimatları
Projeyi yerel bilgisayarınızda çalıştırmak için aşağıdaki adımları sırasıyla takip edin.

1. Veritabanı Hazırlığı
Bir MySQL veritabanı oluşturun.

Proje içindeki SQL klasöründe bulunan tablo yapılarını ve Stored Procedures kodlarını veritabanınızda çalıştırın.

2. Backend Kurulumu (Node.js)
backend klasörüne gidin.

.env.example dosyasının adını .env olarak değiştirin ve kendi veritabanı bilgilerinizi girin.

Bağımlılıkları yükleyin:

Bash

npm install
Sunucuyu başlatın:

Bash

npm start
3. Mobil Uygulama Kurulumu (React Native)
Ana dizinde veya mobile klasöründe bağımlılıkları yükleyin:

Bash

npm install
Android SDK Yolu: android/local.properties dosyasını oluşturun ve kendi SDK yolunuzu ekleyin: sdk.dir=C\:\\Users\\Kullanici\\AppData\\Local\\Android\\Sdk

API Bağlantısı: src/api/apiClient.js dosyasındaki baseURL kısmını, bilgisayarınızın yerel IP adresi veya emülatör için http://10.0.2.2:3000/api olarak güncelleyin.

Uygulamayı çalıştırın:

Bash

npx react-native run-android
