// context/ActivityContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Activity } from '../data/activitiesData';
import { saveJoinedActivity, removeJoinedActivity, loadJoinedActivities as loadActivitiesFromStorage } from '../utils/storage';
import { scheduleActivityNotifications } from '../utils/notifications';

type ActivityContextType = {
  joinedActivities: Activity[];
  toggleJoinActivity: (activity: Activity) => Promise<void>;
  isActivityJoined: (activityId: string) => boolean;
  loadJoinedActivities: () => Promise<Activity[]>;
  setJoinedActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
};

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const useActivityContext = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivityContext must be used within an ActivityProvider');
  }
  return context;
};

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [joinedActivities, setJoinedActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const activities = await loadActivitiesFromStorage();
        if (Array.isArray(activities)) {
          setJoinedActivities(activities); 
          console.log('Loaded activities on context initialization:', activities);
        } else {
          console.warn('Loaded activities is not an array:', activities);
          setJoinedActivities([]);
        }
      } catch (error) {
        console.error('Error loading activities:', error);
        setJoinedActivities([]);
      }
    };
    loadActivities();
  }, []); // Only run once when the context initializes

  useEffect(() => {
    console.log('Joined Activities from Context:', joinedActivities);
  }, [joinedActivities]);

  const toggleJoinActivity = async (activity: Activity): Promise<void> => {
    try {
      const isJoined = joinedActivities.some((a) => a.id === activity.id);
      let updatedJoinedActivities;

      if (isJoined) {
        updatedJoinedActivities = joinedActivities.filter((a) => a.id !== activity.id);
        await removeJoinedActivity(activity.id);
      } else {
        const newActivity = { ...activity, joined: true, isJoined: true };
        updatedJoinedActivities = [...joinedActivities, newActivity];
        await saveJoinedActivity(newActivity);

        // Schedule notifications for the activity
        // Combine date and time into a Date object
        const [year, month, day] = newActivity.date.split('-').map(Number);
        const [hour, minute] = newActivity.time.split(':').map(Number);
        const activityDateObj = new Date(year, month - 1, day, hour, minute);
        scheduleActivityNotifications(activityDateObj);
      }

      setJoinedActivities(updatedJoinedActivities);

      // Trigger a global state update by reloading activities from storage
      const refreshedActivities = await loadJoinedActivities();
      setJoinedActivities(refreshedActivities);
    } catch (error) {
      console.error('Error toggling join state:', error);
    }
  };

  const isActivityJoined = (activityId: string) => {
    return joinedActivities.some(a => a.id === activityId);
  };

  const loadJoinedActivities = async (): Promise<Activity[]> => {
    try {
      const activities = await loadActivitiesFromStorage();
      setJoinedActivities(activities || []); // Properly set the joined activities
      return activities;
    } catch (error) {
      console.error('Error loading joined activities:', error);
      setJoinedActivities([]); // Fallback to an empty array
      return [];
    }
  };

  return (
    <ActivityContext.Provider
      value={{
        joinedActivities,
        toggleJoinActivity,
        isActivityJoined,
        loadJoinedActivities,
        setJoinedActivities,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
};
