import React, { useContext } from 'react';
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
import NotificationScreen from '../screens/NotificationScreen';
import { ThemeProvider, ThemeContext } from '../context/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- ORTAK HEADER AYARLARI (Kod tekrarını önlemek için) ---
const getHeaderOptions = (theme) => ({
  headerStyle: { 
    backgroundColor: theme.cardBg, 
    shadowColor: theme.borderColor,
    elevation: 0 
  },
  headerTintColor: theme.textColor,
  headerTitleStyle: { color: theme.textColor }
});

// --- 1. SOSYAL STACK ---
function SocialStack({ route }) {
  const { userId, role } = route.params || {};
  const { theme } = useContext(ThemeContext);

  return (
    <Stack.Navigator screenOptions={getHeaderOptions(theme)}>
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
      <Stack.Screen 
        name="UserProfile" 
        component={ProfileScreen} 
        options={{ title: 'Kullanıcı Profili' }}
      />
    </Stack.Navigator>
  );
}

// --- [YENİ] 2. PROFIL STACK (Profil Sekmesi İçin) ---
function ProfileStack({ route }) {
  const { userId, role } = route.params || {};
  const { theme } = useContext(ThemeContext);

  return (
    <Stack.Navigator screenOptions={getHeaderOptions(theme)}>
      {/* Ana Profil Ekranı */}
      <Stack.Screen 
        name="MyProfile" 
        component={ProfileScreen} 
        initialParams={{ 
          userId: userId, 
          role: role, 
          currentUserId: userId, 
          currentRole: role 
        }} 
        options={{ title: 'Profilim' }}
      />
      
      {/* Profil içinden detaya gitmek için gerekli ekranlar */}
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen} 
        options={{ title: 'Gönderi' }} 
      />
      <Stack.Screen 
        name="UserProfile" 
        component={ProfileScreen} 
        options={{ title: 'Kullanıcı Profili' }}
      />
    </Stack.Navigator>
  );
}

// --- ANA TAB NAVIGATOR (Alt Menü) ---
function MainTabs({ route }) {
  const { role, userId } = route.params || {}; 
  const { theme } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Sosyal') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Akademik') iconName = focused ? 'school' : 'school-outline';
          else if (route.name === 'Bildirimler') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Profilim') iconName = focused ? 'person' : 'person-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: theme.subTextColor,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.cardBg,
          borderTopColor: theme.borderColor,
          borderTopWidth: 1,
        }
      })}
    >
      <Tab.Screen name="Sosyal" component={SocialStack} initialParams={{ userId, role }} />
      
      <Tab.Screen name="Akademik">
        {(props) => role === 'teacher' 
          ? <TeacherDashboard {...props} route={{ params: { teacherId: userId } }} /> 
          : <StudentDashboard {...props} route={{ params: { studentId: userId } }} />
        }
      </Tab.Screen>

      <Tab.Screen name="Bildirimler" component={NotificationScreen} initialParams={{ userId, role }} />
      
      {/* [GÜNCELLENDİ] Artık Stack Kullanıyor */}
      <Tab.Screen name="Profilim" component={ProfileStack} initialParams={{ userId, role }} />
    </Tab.Navigator>
  );
}

// --- ANA ROOT NAVIGATOR ---
function RootNavigator() {
  const { theme } = useContext(ThemeContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      
      <Stack.Screen 
        name="VideoPlayer" 
        component={VideoPlayerScreen} 
        options={{ 
          headerShown: true, 
          title: 'Ders Videosu',
          headerTintColor: '#007bff',
          headerBackTitle: 'Geri',
          headerStyle: { 
            elevation: 0, 
            shadowOpacity: 0,
            backgroundColor: theme.cardBg 
          },
          headerTitleStyle: { color: theme.textColor }
        }} 
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}