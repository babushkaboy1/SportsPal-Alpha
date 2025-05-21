import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useActivityContext } from '../context/ActivityContext';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activities } from '../data/activitiesData';

const ActivityDetailsScreen = ({ route, navigation }: any) => {
  const { activityId } = route.params;
  const { joinedActivities } = useActivityContext();

  // Try to find in joinedActivities, fallback to all activities
  const activity =
    joinedActivities.find(a => a.id === activityId) ||
    activities.find(a => a.id === activityId);

  if (!activity) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Activity not found.</Text>
      </SafeAreaView>
    );
  }

  const { toggleJoinActivity, isActivityJoined, loadJoinedActivities, setJoinedActivities } = useActivityContext();
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Try last known location first (fast)
          let location = await Location.getLastKnownPositionAsync({});
          if (!location) {
            // Fallback to current position (slower)
            location = await Location.getCurrentPositionAsync({});
          }
          if (location) {
            setUserLocation(location.coords);
          }
        }
      } catch (e) {
        // handle error
      }
    })();
  }, []);

  // Calculate distance in km
  const getDistance = () => {
    if (!userLocation) return null;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(activity.latitude - userLocation.latitude);
    const dLon = toRad(activity.longitude - userLocation.longitude);
    const lat1 = toRad(userLocation.latitude);
    const lat2 = toRad(activity.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  // Navigate to Chat screen
  const handleChat = () => {
    navigation.navigate('Chat', { activityId: activity.id });
  };

  // Get directions using the preferred maps app
  const handleGetDirections = async () => {
    let currentLocation;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Location Permission Denied", "Permission to access location was denied.");
        return;
      }
      const locationResult = await Location.getCurrentPositionAsync({});
      currentLocation = `${locationResult.coords.latitude},${locationResult.coords.longitude}`;
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch your current location.");
      return;
    }
    const destination = `${activity.latitude},${activity.longitude}`;
    Alert.alert(
      'Choose Map',
      'Select which map app to use for directions.',
      [
        {
          text: 'Google Maps',
          onPress: () => {
            const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation}&destination=${destination}&travelmode=driving`;
            Linking.openURL(url);
          },
        },
        {
          text: 'Apple Maps',
          onPress: () => {
            const url = `http://maps.apple.com/?saddr=${currentLocation}&daddr=${destination}&dirflg=d`;
            Linking.openURL(url);
          },
        },
        {
          text: 'Waze',
          onPress: () => {
            const url = `https://waze.com/ul?ll=${destination}&navigate=yes`;
            Linking.openURL(url);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleJoinLeave = async () => {
    try {
      await toggleJoinActivity(activity);
      const updatedJoined = isActivityJoined(activity.id);

      // Update local state from global context
      setJoinedActivities((prev) =>
        prev.map((act) =>
          act.id === activity.id ? { ...act, isJoined: updatedJoined } : act
        )
      );
    } catch (error) {
      console.error('Error joining/leaving activity:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{activity.activity} Details</Text>
        </View>

        {/* Map Overview */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={{ flex: 1, borderRadius: 10 }}
            initialRegion={{
              latitude: activity.latitude,
              longitude: activity.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={!!userLocation}
            showsMyLocationButton={false} // Only your custom button will show
          >
            <Marker
              coordinate={{
                latitude: activity.latitude,
                longitude: activity.longitude,
              }}
              title={activity.activity}
              description={activity.location}
            />
          </MapView>
          {userLocation && (
            <TouchableOpacity
              style={styles.myLocationButton}
              onPress={() => {
                mapRef.current?.animateToRegion({
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="locate" size={28} color="#1ae9ef" />
            </TouchableOpacity>
          )}
        </View>

        {/* Activity Information */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{activity.activity}</Text>
          <Text style={styles.location}>{activity.location}</Text>
          {userLocation && (
            <Text style={styles.distanceText}>
              {getDistance()} km away
            </Text>
          )}
          <Text style={styles.detail}>
            Date: {activity.date} at {activity.time}
          </Text>
          <Text style={styles.detail}>Hosted by: {activity.creator}</Text>
          <View style={styles.joinContainer}>
            <Text style={styles.joinText}>
              {activity.joinedCount} / {activity.maxParticipants} joined
            </Text>
          </View>
          <Text style={styles.description}>
            Stay active and make new friends by joining this exciting {activity.activity} event!
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isActivityJoined(activity.id) && styles.actionButtonJoined,
              ]}
              onPress={handleJoinLeave}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.actionText,
                  isActivityJoined(activity.id) && styles.actionTextJoined,
                ]}
              >
                {isActivityJoined(activity.id) ? 'Leave Activity' : 'Join Activity'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleChat}>
              <Ionicons name="chatbubbles" size={24} style={styles.actionIconBold} />
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
              <Ionicons name="navigate" size={24} style={styles.actionIconBold} />
              <Text style={styles.actionText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("MainTabs", { screen: "Discover" })}>
          <Text>Go to Discover</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActivityDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? ((StatusBar.currentHeight || 0) + 10) : 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  mapContainer: {
    height: 250,
    width: '100%',
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  infoContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  title: {
    color: '#1ae9ef',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  location: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 10,
  },
  distanceText: {
    color: '#1ae9ef',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  detail: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  joinContainer: {
    marginVertical: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
  },
  joinText: {
    color: '#1ae9ef',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 15,
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#1ae9ef',  // Terea Turquoise for Join
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
  },
  actionButtonJoined: {
    backgroundColor: '#007b7b',  // Darker Turquoise for Leave
  },
  actionText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.1,
  },
  actionTextJoined: {
    color: '#fff',
  },
  actionIcon: {
    color: '#121212',
  },
  actionIconBold: {
    color: '#121212',
    fontWeight: 'bold',
    marginRight: 6,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 24,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    zIndex: 10,
  },
});
