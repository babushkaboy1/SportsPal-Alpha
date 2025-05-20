import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  Platform,
  StatusBar,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { ActivityIcon } from '../components/ActivityIcons';
import { activities, Activity } from '../data/activitiesData';
import { ActivityProvider, useActivityContext } from '../context/ActivityContext';

const sportFilterOptions = [
  'All', 'Basketball', 'Soccer', 'Running', 'Gym',
  'Calisthenics', 'Padel', 'Tennis', 'Cycling',
  'Swimming', 'Badminton', 'Volleyball',
];

const DiscoverGamesScreen = ({ navigation }: any) => {
  const { toggleJoinActivity, isActivityJoined, joinedActivities } = useActivityContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [activitiesData, setActivitiesData] = useState<Activity[]>(activities);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isSortingByDistance, setIsSortingByDistance] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [originalActivities, setOriginalActivities] = useState<Activity[]>([]);

  useEffect(() => {
    getUserLocation();
    filterActivities();
  }, [searchQuery, selectedFilter, selectedDate]);

  useEffect(() => {
    // Store the original list of activities on mount
    setOriginalActivities([...activities]);
  }, []);

  const getUserLocation = async () => {
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
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const filterActivities = () => {
    let filtered = activities;

    if (selectedFilter !== 'All') {
      filtered = filtered.filter(activity => activity.activity === selectedFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.activity.toLowerCase().includes(query) ||
        activity.creator.toLowerCase().includes(query)
      );
    }

    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      filtered = filtered.filter(activity => activity.date === formattedDate);
    }

    if (isSortingByDistance && userLocation) {
      filtered.sort((a, b) =>
        calculateDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
        calculateDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
      );
    }

    setActivitiesData(filtered);
  };

  const handleActivityTap = (item: Activity) => {
    navigation.navigate('ActivityDetails', { activity: item });
  };

  const ActivityCard = ({ item, navigation }: { item: Activity; navigation: any }) => {
    const [isJoined, setIsJoined] = useState(item.isJoined);

    useEffect(() => {
      setIsJoined(item.isJoined);
    }, [item.isJoined]);

    const handleToggleJoin = async (item: Activity) => {
      try {
        await toggleJoinActivity(item);

        // Update the global context
        const isJoined = isActivityJoined(item.id);

        // Update local state to reflect the global state
        setActivitiesData((prev) =>
          prev.map((activity) =>
            activity.id === item.id ? { ...activity, isJoined } : activity
          )
        );
      } catch (error) {
        console.error("Error toggling join state:", error);
      }
    };

    const distance = userLocation
      ? `${calculateDistance(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude).toFixed(2)} km away`
      : "N/A";

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('ActivityDetails', { activity: item })}
      >
        <View style={styles.cardHeader}>
          <ActivityIcon activity={item.activity} size={32} />
          <Text style={styles.cardTitle}>{item.activity}</Text>
        </View>
        <Text style={styles.cardInfo}>Host: {item.creator}</Text>
        <Text style={styles.cardInfo}>Location: {item.location}</Text>
        <Text style={styles.cardInfo}>Date: {item.date} at {item.time}</Text>
        <Text style={styles.distanceText}>{distance}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.joinButton, isActivityJoined(item.id) && styles.joinButtonJoined]} 
            onPress={() => handleToggleJoin(item)}
          >
            <Text style={styles.joinButtonText}>
              {isActivityJoined(item.id) ? 'Leave' : 'Join'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={() => Share.share({ message: `Join me for ${item.activity} at ${item.location} on ${item.date}!` })}
          >
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const toggleSortByDistance = () => {
    if (isSortingByDistance) {
      // If turning off, revert to original order
      setActivitiesData([...activities]);
      setIsSortingByDistance(false);
    } else {
      // If turning on, sort by distance
      if (userLocation) {
        const sortedActivities = [...activities].sort((a, b) =>
          calculateDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
          calculateDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
        );
        setActivitiesData(sortedActivities);
      }
      setIsSortingByDistance(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topSection}>
        <Text style={styles.headerTitle}>Discover Activities</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by sport or host..."
          placeholderTextColor="#bbb"
          onChangeText={setSearchQuery}
        />
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, isSortingByDistance && styles.activeButton]}
            onPress={toggleSortByDistance}
          >
            <Text style={styles.sortButtonText}>Sort by Distance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setDatePickerVisible(true)}
          >
            <Text style={styles.sortButtonText}>
              {selectedDate ? selectedDate.toDateString() : 'Select Date'}
            </Text>
          </TouchableOpacity>
          {selectedDate && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSelectedDate(null);
                setActivitiesData([...activities]); // Reset to show all activities
              }}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal style={styles.filterWrapper}>
          {sportFilterOptions.map((option) => (
            <TouchableOpacity key={option} style={[styles.filterChip, selectedFilter === option && styles.filterChipActive]} onPress={() => setSelectedFilter(option)}>
              <Text style={styles.filterChipText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={activitiesData}
        renderItem={({ item }) => (
          <ActivityCard item={item} navigation={navigation} />
        )}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={filterActivities} />
        }
        contentContainerStyle={styles.listContainer}
      />
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={(date) => { setSelectedDate(date); setDatePickerVisible(false); }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

export default DiscoverGamesScreen;


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? ((StatusBar.currentHeight || 0) + 10) : 0,
  },
  topSection: {
    padding: 15,
  },
  headerTitle: {
    fontSize: 28,
    color: '#1ae9ef',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  searchInput: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#333',
    borderRadius: 5,
    marginRight: 8,
  },
  activeButton: {
    backgroundColor: '#1ae9ef',
  },
  sortButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginLeft: 5,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterWrapper: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#333',
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#1ae9ef',
  },
  filterChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 18,
    color: '#1ae9ef',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  cardInfo: {
    fontSize: 14,
    color: '#ccc',
    marginVertical: 2,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#1ae9ef',  // Terea Turquoise for Join
    borderRadius: 5,
  },
  joinButtonJoined: {
    backgroundColor: '#007b7b',  // Darker Turquoise for Leave
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  shareButton: {
    padding: 8,
    backgroundColor: '#1e1e1e',
    borderRadius: 5,
  },
  mapView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  debugContainer: {
    padding: 15,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  debugTitle: {
    color: '#1ae9ef',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugText: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
  distanceText: {
    color: '#1ae9ef',
    fontSize: 14,
    marginTop: 2,
    fontWeight: 'bold',
  },
  joinShareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  iconText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  distanceInfo: {
    color: '#1ae9ef',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
});

