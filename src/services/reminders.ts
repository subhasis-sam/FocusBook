import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { setReminder } from '../db/database';
import { setTaskComplete } from '../db/database';
import type { Task } from '../types';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export async function scheduleTaskReminder(taskId: number, title: string, at: string | null) {
  const oldTask = await import('../db/database').then((module) => module.getTask(taskId));
  if (oldTask?.reminderId) await Notifications.cancelScheduledNotificationAsync(oldTask.reminderId).catch(() => undefined);
  if (!at) { await setReminder(taskId, null, null); return; }
  if (oldTask?.isComplete) { await setReminder(taskId, at, null); return; }
  const date = new Date(at);
  if (Number.isNaN(date.getTime()) || date <= new Date()) throw new Error('Reminder time must be in the future.');
  const permissions = await Notifications.requestPermissionsAsync();
  if (!permissions.granted) { await setReminder(taskId, null, null); throw new Error('Notification permission was not granted.'); }
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('reminders', { name: 'Task reminders', importance: Notifications.AndroidImportance.DEFAULT });
  const reminderId = await Notifications.scheduleNotificationAsync({ content: { title: 'FocusBook reminder', body: title, data: { taskId } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } });
  await setReminder(taskId, date.toISOString(), reminderId);
}

export async function cancelTaskReminder(taskId: number) {
  const database = await import('../db/database');
  const task = await database.getTask(taskId);
  if (!task) return;
  if (task.reminderId) await Notifications.cancelScheduledNotificationAsync(task.reminderId).catch(() => undefined);
  await database.setReminder(taskId, task.reminderAt, null);
}

export async function toggleTaskCompletion(task: Task) {
  const completing = !task.isComplete;
  await setTaskComplete(task.id, completing);
  if (completing) await cancelTaskReminder(task.id);
  else if (task.reminderAt && new Date(task.reminderAt) > new Date()) await scheduleTaskReminder(task.id, task.title, task.reminderAt);
}
