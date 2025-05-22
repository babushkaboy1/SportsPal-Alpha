import * as Notifications from 'expo-notifications';

export const scheduleActivityNotifications = async (activityDate: Date) => {
  const now = new Date();

  // 8am notification (if joining before 8am)
  const eightAM = new Date(activityDate);
  eightAM.setHours(8, 0, 0, 0);
  if (now < eightAM) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Today's Activity Reminder",
        body: "You have an activity today! Get ready!",
        sound: true,
      },
      trigger: { type: 'scheduled', date: eightAM } as any, // workaround here
    });
  }

  // 1 hour before notification
  const oneHourBefore = new Date(activityDate.getTime() - 60 * 60 * 1000);
  if (oneHourBefore > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Upcoming Activity",
        body: "Your activity starts in 1 hour!",
        sound: true,
      },
      trigger: { type: 'scheduled', date: oneHourBefore } as any, // workaround here
    });
  }

  // 3 hours after notification
  const threeHoursAfter = new Date(activityDate.getTime() + 3 * 60 * 60 * 1000);
  if (threeHoursAfter > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "How did it go?",
        body: "How was your activity? Tap to rate and share your experience!",
        sound: true,
      },
      trigger: { type: 'scheduled', date: threeHoursAfter } as any, // workaround here
    });
  }
};