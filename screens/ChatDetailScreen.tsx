// screens/ChatDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av'; // using expo-av for now
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define the message type
type Message = {
  id: string;
  sender: string;
  text: string;
  type: 'text' | 'image' | 'audio';
  time: string;
};

// Dummy initial messages
const initialMessages: Message[] = [
  {
    id: '1',
    sender: 'Alex',
    text: "Hey! How's it going?",
    type: 'text',
    time: '7:45 PM',
  },
  {
    id: '2',
    sender: 'You',
    text: 'All good! Ready for the game?',
    type: 'text',
    time: '7:46 PM',
  },
];

const ChatDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [messageText, setMessageText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Set Android navigation bar to dark on mount (only on Android)
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#121212');
      NavigationBar.setButtonStyleAsync('light');
    }
  }, []);

  // Play an audio message with volume 1.0
  const handlePlayAudio = async (uri: string, id: string) => {
    try {
      setPlayingAudioId(id);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { volume: 1.0, shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && 'didJustFinish' in status && status.didJustFinish) {
          setPlayingAudioId(null);
          sound.unloadAsync();
        }
      });
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Playback Error', 'Could not play audio.');
      setPlayingAudioId(null);
    }
  };

  // Send a text message. ("You" messages show black text on a turquoise bubble)
  const handleSend = () => {
    if (messageText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'You',
        text: messageText,
        type: 'text',
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages([...messages, newMessage]);
      setMessageText('');
    }
  };

  // Start recording audio with proper iOS settings.
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable audio recording permissions.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: 1, // "do not mix"
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });
      const newRecording = new Audio.Recording();
      // Custom recording options (removing unsupported properties)
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 44100,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 3, // High quality
          sampleRate: 44100,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
        },
      };
      await newRecording.prepareToRecordAsync(recordingOptions as any);
      await newRecording.startAsync();
      setRecording(newRecording);
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  };

  // Stop recording and save as an audio message.
  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'You',
        text: uri || '',
        type: 'audio',
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages([...messages, newMessage]);
      console.log('Recording stopped and saved at:', uri);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Recording Error', 'Could not save the recording.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.flexContainer}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                item.sender === 'You' ? styles.yourMessage : styles.theirMessage,
              ]}
            >
              {item.type === 'text' && (
                <Text
                  style={[
                    styles.messageText,
                    item.sender === 'You' && styles.userMessageText,
                  ]}
                >
                  {item.text}
                </Text>
              )}
              {item.type === 'audio' && (
                <TouchableOpacity
                  onPress={() => handlePlayAudio(item.text, item.id)}
                  style={styles.audioMessageButton}
                >
                  {playingAudioId === item.id ? (
                    <MaterialIcons name="stop" size={28} color="#000" />
                  ) : (
                    <MaterialIcons name="play-arrow" size={28} color="#000" />
                  )}
                </TouchableOpacity>
              )}
              {item.type === 'image' && item.text ? (
                <Image source={{ uri: item.text }} style={styles.media} />
              ) : item.type === 'image' && !item.text ? (
                <Text style={styles.placeholderText}>Image not available</Text>
              ) : null}
              <Text
                style={[
                  styles.messageTime,
                  item.sender === 'You' && styles.userMessageTime,
                ]}
              >
                {item.time}
              </Text>
            </View>
          )}
        />
        {/* Input area wrapped in KeyboardAvoidingView */}
        <KeyboardAvoidingView
          behavior="position"
          keyboardVerticalOffset={0}
          style={{ backgroundColor: 'transparent' }}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type your message..."
              placeholderTextColor="#888"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.audioContainer}>
            <TouchableOpacity
              style={styles.audioButton}
              onPress={recording ? stopRecording : startRecording}
            >
              {recording ? (
                <MaterialIcons name="stop" size={24} color="#fff" />
              ) : (
                <Ionicons name="mic" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  messageList: {
    padding: 10,
    paddingBottom: 80, // extra bottom padding so messages aren't obscured
  },
  messageBubble: {
    marginVertical: 8,
    marginHorizontal: 10,
    padding: 10,
    borderRadius: 15,
    maxWidth: '75%',
  },
  yourMessage: {
    backgroundColor: '#1ae9ef',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#1e1e1e',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  userMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 12,
    color: '#ccc',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  userMessageTime: {
    color: '#007575',
  },
  media: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginVertical: 5,
  },
  placeholderText: {
    color: '#888',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#1e1e1e',
  },
  input: {
    flex: 1,
    height: 40,
    color: '#fff',
    paddingHorizontal: 10,
  },
  sendButton: {
    backgroundColor: '#1ae9ef',
    padding: 10,
    borderRadius: 20,
    marginLeft: 5,
  },
  audioContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1e1e1e',
  },
  audioButton: {
    backgroundColor: '#1ae9ef',
    padding: 10,
    borderRadius: 30,
  },
  audioMessageButton: {
    width: 60,
    height: 60,
    backgroundColor: '#1ae9ef',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
    marginVertical: 5,
  },
});

export default React.memo(ChatDetailScreen);