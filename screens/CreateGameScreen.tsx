import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ActivityIcon } from '../components/ActivityIcons';
import { useActivityContext } from '../context/ActivityContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

const THEME_COLOR = '#1ae9ef';

const sportOptions = [
  'Basketball', 'Soccer', 'Running', 'Gym',
  'Calisthenics', 'Padel', 'Tennis', 'Cycling',
  'Swimming', 'Badminton', 'Volleyball',
];

type NavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
];

const CreateGameScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { toggleJoinActivity } = useActivityContext();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateGame'>>();

  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [maxParticipants, setMaxParticipants] = useState<number>(10);
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Picker modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showParticipantsPicker, setShowParticipantsPicker] = useState(false);

  useEffect(() => {
    const setAddressFromCoords = async () => {
      if (selectedCoords) {
        try {
          const [address] = await Location.reverseGeocodeAsync(selectedCoords);
          if (address) {
            const addressString = `${address.name ? address.name + ', ' : ''}${address.street ? address.street + ', ' : ''}${address.city ? address.city + ', ' : ''}${address.region ? address.region + ', ' : ''}${address.country ? address.country : ''}`;
            setLocation(addressString.trim().replace(/,\s*$/, ''));
          } else {
            setLocation(`Lat: ${selectedCoords.latitude.toFixed(5)}, Lng: ${selectedCoords.longitude.toFixed(5)}`);
          }
        } catch (e) {
          setLocation(`Lat: ${selectedCoords.latitude.toFixed(5)}, Lng: ${selectedCoords.longitude.toFixed(5)}`);
        }
      }
    };
    setAddressFromCoords();
  }, [selectedCoords]);

  // Reset form fields
  const resetForm = () => {
    setActivityName('');
    setDescription('');
    setSport('');
    setLocation('');
    setDate('');
    setTime('');
    setMaxParticipants(10);
    setSelectedCoords(null);
  };

  const handleCreateGame = () => {
    if (!activityName || !sport || !location || !date || !time) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }

    const latitude = selectedCoords?.latitude ?? 37.9838;
    const longitude = selectedCoords?.longitude ?? 23.7275;

    const newGame = {
      id: Math.random().toString(),
      name: activityName,
      description,
      activity: sport,
      location,
      date,
      time,
      creator: 'You',
      joinedCount: 1,
      maxParticipants,
      isJoined: true,
      distance: 0,
      latitude,
      longitude,
    };

    toggleJoinActivity(newGame);
    Alert.alert('Game Created', 'Your game has been successfully created!');
    // Reset only after creation
    resetForm();
    // Navigate to Calendar and pass the date to select
    navigation.navigate('MainTabs', {
      screen: 'Calendar',
      params: { selectedDate: date }, // date must be "YYYY-MM-DD"
    });
  };

  useEffect(() => {
    // Only restore form state if coming back from PickLocation (pickedCoords is present)
    if (route.params?.pickedCoords) {
      if (route.params?.formState) {
        setActivityName(route.params.formState.activityName || '');
        setDescription(route.params.formState.description || '');
        setSport(route.params.formState.sport || '');
        setDate(route.params.formState.date || new Date().toISOString().split('T')[0]);
        setTime(route.params.formState.time || (() => {
          const now = new Date();
          return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        })());
        setMaxParticipants(route.params.formState.maxParticipants || 10);
      }
      setSelectedCoords(route.params.pickedCoords);
    }
    // Do NOT reset form fields unless a game is created!
  }, [route.params?.pickedCoords]);

  // Date/time picker handlers
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate.toISOString().split('T')[0]);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Activity</Text>
      </View>
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.sectionLabel}>Name your activity</Text>
        <TextInput
          style={styles.input}
          placeholder="Activity Name"
          placeholderTextColor="#ccc"
          value={activityName}
          onChangeText={setActivityName}
        />

        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Description"
          placeholderTextColor="#ccc"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.sectionLabel}>Select Sport</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {sportOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.sportButton, sport === option && styles.activeButton]}
              onPress={() => setSport(option)}
            >
              <ActivityIcon
                activity={option}
                size={32}
                color={sport === option ? '#fff' : THEME_COLOR}
              />
              <Text style={styles.sportText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Pick a location"
          placeholderTextColor="#ccc"
          value={location}
          editable={false}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() =>
              navigation.navigate('PickLocation', {
                initialCoords: selectedCoords,
                darkMapStyle,
                returnTo: 'CreateGame',
                formState: {
                  activityName,
                  description,
                  sport,
                  date,
                  time,
                  maxParticipants,
                },
              })
            }
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {selectedCoords ? 'Change Location on Map' : 'Pick on Map'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Date</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#ccc"
            value={date}
            editable={false}
            pointerEvents="none"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapButton} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Choose Date</Text>
        </TouchableOpacity>
        {/* Date Picker Modal (iOS only) */}
        {Platform.OS === 'ios' && (
          <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
            <View style={styles.pickerModal}>
              <View style={styles.rollerContainer}>
                <View style={styles.rollerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.rollerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.rollerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={date ? new Date(date) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (event.type === 'set' && selectedDate) {
                      setDate(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                  minimumDate={new Date()}
                  style={styles.rollerPicker}
                />
              </View>
            </View>
          </Modal>
        )}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={date ? new Date(date) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate.toISOString().split('T')[0]);
            }}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.sectionLabel}>Time</Text>
        <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
          <TextInput
            style={styles.input}
            placeholder="HH:MM"
            placeholderTextColor="#ccc"
            value={time}
            editable={false}
            pointerEvents="none"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapButton} onPress={() => setShowTimePicker(true)}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Choose Time</Text>
        </TouchableOpacity>
        {/* Time Picker Modal (iOS only) */}
        {Platform.OS === 'ios' && (
          <Modal transparent animationType="slide" visible={showTimePicker} onRequestClose={() => setShowTimePicker(false)}>
            <View style={styles.pickerModal}>
              <View style={styles.rollerContainer}>
                <View style={styles.rollerHeader}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.rollerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.rollerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={time ? new Date(`1970-01-01T${time}:00`) : new Date()}
                  mode="time"
                  display="spinner"
                  onChange={(event, selectedTime) => {
                    if (event.type === 'set' && selectedTime) {
                      const hours = selectedTime.getHours().toString().padStart(2, '0');
                      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                      setTime(`${hours}:${minutes}`);
                    }
                  }}
                  style={styles.rollerPicker}
                />
              </View>
            </View>
          </Modal>
        )}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={time ? new Date(`1970-01-01T${time}:00`) : new Date()}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) {
                const hours = selectedTime.getHours().toString().padStart(2, '0');
                const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                setTime(`${hours}:${minutes}`);
              }
            }}
          />
        )}

        <Text style={styles.sectionLabel}>Max Participants</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowParticipantsPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            {maxParticipants}
          </Text>
        </TouchableOpacity>
        {/* Max Participants Picker Modal (iOS only) */}
        {Platform.OS === 'ios' && (
          <Modal transparent animationType="slide" visible={showParticipantsPicker} onRequestClose={() => setShowParticipantsPicker(false)}>
            <View style={styles.pickerModal}>
              <View style={styles.rollerContainer}>
                <View style={styles.rollerHeader}>
                  <TouchableOpacity onPress={() => setShowParticipantsPicker(false)}>
                    <Text style={styles.rollerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowParticipantsPicker(false)}>
                    <Text style={styles.rollerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <Picker
                  selectedValue={maxParticipants}
                  onValueChange={setMaxParticipants}
                  style={{ width: '100%', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontSize: 22 }}
                >
                  {[...Array(29)].map((_, i) => (
                    <Picker.Item key={i + 2} label={`${i + 2}`} value={i + 2} />
                  ))}
                </Picker>
              </View>
            </View>
          </Modal>
        )}
        {Platform.OS === 'android' && showParticipantsPicker && (
          <Modal transparent animationType="slide" visible={showParticipantsPicker} onRequestClose={() => setShowParticipantsPicker(false)}>
            <View style={styles.pickerModal}>
              <View style={styles.rollerContainer}>
                <Picker
                  selectedValue={maxParticipants}
                  onValueChange={(value) => {
                    setMaxParticipants(value);
                    setShowParticipantsPicker(false);
                  }}
                  style={{ width: '100%' }}
                  itemStyle={{ fontSize: 22 }}
                >
                  {[...Array(29)].map((_, i) => (
                    <Picker.Item key={i + 2} label={`${i + 2}`} value={i + 2} />
                  ))}
                </Picker>
              </View>
            </View>
          </Modal>
        )}

        <TouchableOpacity style={styles.createButton} onPress={handleCreateGame}>
          <Text style={styles.createButtonText}>Create Activity</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateGameScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 10,
    paddingTop:
      Platform.OS === 'android'
        ? (StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 25)
        : 10,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 28,
    color: THEME_COLOR,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  form: {
    paddingBottom: 20,
  },
  sectionLabel: {
    color: THEME_COLOR,
    fontSize: 18,
    marginVertical: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 8,
    color: '#fff',
    marginBottom: 10,
    fontWeight: '500',
  },
  sportButton: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 5,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#1e1e1e',
  },
  activeButton: {
    backgroundColor: THEME_COLOR,
  },
  sportText: {
    color: '#fff',
    marginTop: 5,
    fontWeight: '500',
  },
  mapButton: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 6,
    alignSelf: 'flex-start',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  participantButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: THEME_COLOR,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLOR,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  pickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  rollerContainer: {
    backgroundColor: Platform.OS === 'ios' ? '#222' : '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 0,
    paddingTop: 8,
    alignItems: 'center',
  },
  rollerHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  rollerCancel: {
    color: '#ff5a5f',
    fontWeight: 'bold',
    fontSize: 18,
    paddingVertical: 8,
  },
  rollerDone: {
    color: THEME_COLOR,
    fontWeight: 'bold',
    fontSize: 18,
    paddingVertical: 8,
  },
  rollerPicker: {
    width: '100%',
    backgroundColor: 'transparent',
  },
});