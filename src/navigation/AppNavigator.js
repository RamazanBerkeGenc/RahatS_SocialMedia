import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

// Ekranlar
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import TeacherDashboard from '../screens/TeacherDashboard';
import StudentDashboard from '../screens/StudentDashboard';
import FeedScreen from '../screens/FeedScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import VideoPlayerScreen from '../screens/VideoPlayerScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- SOSYAL STACK (Sosyal Akış ve Detay Gezintisi) ---
function SocialStack({ route }) {
  const { userId, role } = route.params || {};

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#fff' } }}>
      <Stack.Screen 
        name="RahatS Sosyal" 
        component={FeedScreen} 
        initialParams={{ userId, role }} 
        options={{ title: 'RahatS Sosyal' }}
      />
      <Stack.Screen 
        name="NewPost" 
        component={CreatePostScreen} 
        options={{ title: 'Yeni Paylaşım' }}
      />
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen} 
        options={{ title: 'Gönderi' }} 
      />
      
      {/* --- KRİTİK EKLEME: BAŞKASININ PROFİLİ --- */}
      {/* FeedScreen'den 'UserProfile' adıyla buraya yönlendirme yapıyoruz. */}
      <Stack.Screen 
        name="UserProfile" 
        component={ProfileScreen} 
        // initialParams vermiyoruz, çünkü tıklanan kişiye göre değişecek
        options={{ title: 'Kullanıcı Profili' }}
      />
    </Stack.Navigator>
  );
}

// --- ANA TAB NAVIGATOR (Alt Menü) ---
function MainTabs({ route }) {
  const { role, userId } = route.params || {}; 

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Sosyal') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Akademik') iconName = focused ? 'school' : 'school-outline';
          else if (route.name === 'Profilim') iconName = focused ? 'person' : 'person-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      {/* 1. SOSYAL SEKME */}
      <Tab.Screen 
        name="Sosyal" 
        component={SocialStack} 
        initialParams={{ userId, role }} 
      />
      
      {/* 2. AKADEMİK SEKME (Öğretmen/Öğrenci ayrımı burada yapılır) */}
      <Tab.Screen name="Akademik">
        {(props) => role === 'teacher' 
          ? <TeacherDashboard {...props} route={{ params: { teacherId: userId } }} /> 
          : <StudentDashboard {...props} route={{ params: { studentId: userId } }} />
        }
      </Tab.Screen>
      
      {/* 3. KENDİ PROFİLİM SEKMESİ (Sabit: Giriş Yapan Kişi) */}
      <Tab.Screen name="Profilim">
        {(props) => (
          <ProfileScreen 
            {...props} 
            route={{ 
              params: { 
                userId: userId, // Profil sahibi (kendisi)
                role: role, 
                currentUserId: userId, // Giriş yapan (kendisi)
                currentRole: role 
              } 
            }} 
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// --- ANA ROOT NAVIGATOR (En Dış Katman) ---
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      
      {/* Video Oynatıcı: Buraya eklendi çünkü video açıldığında 
          alttaki sekmelerin (Tab Bar) gizlenmesini istiyoruz. 
      */}
      <Stack.Screen 
        name="VideoPlayer" 
        component={VideoPlayerScreen} 
        options={{ 
          headerShown: true, 
          title: 'Ders Videosu',
          headerTintColor: '#007bff',
          headerBackTitle: 'Geri',
          headerStyle: { elevation: 0, shadowOpacity: 0 } // Temiz görünüm
        }} 
      />
    </Stack.Navigator>
  );
}