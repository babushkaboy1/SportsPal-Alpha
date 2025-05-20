// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { Activity } from '../data/activitiesData';

// Normalize date to dd-mm-yyyy format
export const normalizeDateFormat = (date: string): string => {
  // If already yyyy-mm-dd, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  // If dd-mm-yyyy, convert to yyyy-mm-dd
  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    const [dd, mm, yyyy] = date.split('-');
    return `${yyyy}-${mm}-${dd}`;
  }
  // Otherwise, return as is
  console.warn(`Unrecognized date format: ${date}`);
  return date;
};

export const convertToCalendarFormat = (date: string): string => {
  if (date.includes('-')) {
    const parts = date.split('-');
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1]}-${parts[2]}`; // yyyy-mm-dd
    }
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // dd-mm-yyyy to yyyy-mm-dd
  }
  return date;
};

// Check if an activity is joined
export const isActivityJoined = async (activityId: string) => {
  try {
    const existingData = await AsyncStorage.getItem('joinedActivities');
    const joinedActivities = existingData ? JSON.parse(existingData) : [];
    return joinedActivities.some((a: any) => a.id === activityId);
  } catch (error) {
    console.error('Error checking joined activity:', error);
    return false;
  }
};

// Save Profile
export const saveProfile = async (profileData: any) => {
  try {
    await AsyncStorage.setItem('profileData', JSON.stringify(profileData));
    console.log('Profile saved successfully!');
  } catch (error) {
    console.error('Error saving profile data:', error);
  }
};

// Load Profile
export const loadProfile = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem('profileData');
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error loading profile data:', error);
    return null;
  }
};

// Update Profile
export const updateProfile = async (newData: any) => {
  try {
    const currentData = await loadProfile();
    const updatedData = { ...currentData, ...newData };
    await saveProfile(updatedData);
    console.log('Profile updated successfully!');
  } catch (error) {
    console.error('Error updating profile data:', error);
  }
};

// Clear Profile
export const clearProfile = async () => {
  try {
    await AsyncStorage.removeItem('profileData');
    console.log('Profile cleared successfully!');
  } catch (error) {
    console.error('Error clearing profile data:', error);
  }
};

// Save a joined activity
export const saveJoinedActivity = async (activity: any) => {
  try {
    activity.date = normalizeDateFormat(activity.date); // Ensure consistent date format
    const existingData = await AsyncStorage.getItem('joinedActivities');
    const joinedActivities = existingData ? JSON.parse(existingData) : [];

    const isAlreadyJoined = joinedActivities.some((a: any) => a.id === activity.id);
    if (!isAlreadyJoined) {
      joinedActivities.push(activity);
      await AsyncStorage.setItem('joinedActivities', JSON.stringify(joinedActivities));
    }
  } catch (error) {
    console.error('Error saving joined activity:', error);
  }
};

// Remove a joined activity
export const removeJoinedActivity = async (activityId: string) => {
  try {
    const existingData = await AsyncStorage.getItem('joinedActivities');
    const joinedActivities = existingData ? JSON.parse(existingData) : [];
    const updatedActivities = joinedActivities.filter((a: any) => a.id !== activityId);
    await AsyncStorage.setItem('joinedActivities', JSON.stringify(updatedActivities));
  } catch (error) {
    console.error('Error removing joined activity:', error);
  }
};

// Load joined activities
export const loadJoinedActivities = async (): Promise<Activity[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem('joinedActivities');
    const activities: Activity[] = jsonValue ? JSON.parse(jsonValue) : [];
    const normalizedActivities = activities.map((activity: any) => ({
      ...activity,
      joined: activity.joined || false,
      isJoined: activity.isJoined || false,
    }));
    console.log('Loaded Joined Activities:', normalizedActivities);
    return normalizedActivities;
  } catch (error) {
    console.error('Error loading joined activities:', error);
    return [];
  }
};

// Toggle join state of an activity
export const toggleJoinedActivity = async (activity: any) => {
  try {
    const joined = await isActivityJoined(activity.id);
    if (joined) {
      await removeJoinedActivity(activity.id);
    } else {
      await saveJoinedActivity(activity);
    }
  } catch (error) {
    console.error('Error toggling join state:', error);
  }
};

// Clear Joined Activities
export const clearJoinedActivities = async () => {
  try {
    await AsyncStorage.removeItem('joinedActivities');
    console.log('Cleared joined activities');
  } catch (error) {
    console.error('Error clearing joined activities:', error);
  }
};
