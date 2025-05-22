import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { enableScreens } from 'react-native-screens';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Import your screens
import DiscoverGamesScreen from './screens/DiscoverGamesScreen';
import ChatsScreen from './screens/ChatsScreen';
import CreateGameScreen from './screens/CreateGameScreen';
import CalendarScreen from './screens/CalendarScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import CreateProfileScreen from './screens/CreateProfileScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import ActivityDetailsScreen from './screens/ActivityDetailsScreen';
import ChatDetailScreen from './screens/ChatDetailScreen';
import PickLocationScreen from './screens/PickLocationScreen';

// Import the ActivityProvider
import { ActivityProvider } from './context/ActivityContext';
import { RootStackParamList } from './types/navigation';
import { clearProfile, clearJoinedActivities } from './utils/storage'; // Add this import

enableScreens(true);

// Always clear profile and joined activities on app start
clearProfile();
clearJoinedActivities();

const MyTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121212',
  },
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  tabBarStyle: {
    backgroundColor: '#121212',
    borderTopWidth: 0,
  }
});

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1ae9ef',
        tabBarInactiveTintColor: '#ccc',
        tabBarStyle: styles.tabBarStyle,
        tabBarPressColor: 'transparent',
        tabBarButton: (props) => {
          const cleanedProps = Object.fromEntries(
            Object.entries(props).filter(([_, v]) => v !== null)
          );
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              {...cleanedProps}
            />
          );
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'alert-circle-outline';
          switch (route.name) {
            case 'Discover':
              iconName = 'search-outline';
              break;
            case 'Calendar':
              iconName = 'calendar-outline';
              break;
            case 'CreateGame':
              iconName = 'add-circle-outline';
              break;
            case 'Profile':
              iconName = 'person-outline';
              break;
            case 'Chats':
              iconName = 'chatbubbles-outline';
              break;
          }
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Discover" component={DiscoverGamesScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen
        name="CreateGame"
        component={CreateGameScreen}
        options={{ tabBarLabel: 'Create Event' }} // or 'Create'
      />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
};

export default function App() {
  useEffect(() => {
    const getPermissions = async () => {
      if (Device.isDevice) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Enable notifications to get reminders.');
        }
      }
    };
    getPermissions();
  }, []);

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true, // <-- add this
      shouldShowList: true,   // <-- and this
    }),
  });

  return (
    <ActivityProvider>
      <NavigationContainer theme={MyTheme}>
        <StatusBar style="light" backgroundColor="#121212" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationTypeForReplace: 'push',
            cardStyle: { backgroundColor: '#121212' }, // Prevents white flashes
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ActivityDetails" component={ActivityDetailsScreen} />
          <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
          <Stack.Screen name="PickLocation" component={PickLocationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ActivityProvider>
  );
}
