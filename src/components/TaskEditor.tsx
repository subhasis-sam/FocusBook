import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addTask, deleteTask, listCategories, updateTask } from '../db/database';
import { scheduleTaskReminder } from '../services/reminders';
import { cancelTaskReminder } from '../services/reminders';
import type { Category, Task, TaskInput } from '../types';
import { palette, space } from '../theme';
import { Button, Field } from './UI';

export function TaskEditor({ visible, task, categoryId, onClose, onSaved }: { visible: boolean; task?: Task; categoryId?: number; onClose: () => void; onSaved: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]); const [title, setTitle] = useState(''); const [notes, setNotes] = useState(''); const [selectedCategory, setSelectedCategory] = useState<number>(categoryId ?? 0);
  const [priority, setPriority] = useState<'low'|'normal'|'high'>('normal'); const [dueDate, setDueDate] = useState(''); const [scheduledDate, setScheduledDate] = useState(''); const [reminderAt, setReminderAt] = useState(''); const [top, setTop] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!visible) return; listCategories().then(setCategories); setTitle(task?.title ?? ''); setNotes(task?.notes ?? ''); setSelectedCategory(task?.categoryId ?? categoryId ?? 0); setPriority(task?.priority ?? 'normal'); setDueDate(task?.dueDate ?? ''); setScheduledDate(task?.scheduledDate ?? ''); setReminderAt(task?.reminderAt ? toLocalInput(task.reminderAt) : ''); setTop(Boolean(task?.isTopPriority)); }, [visible, task, categoryId]);
  const save = async () => {
    if (!title.trim()) { Alert.alert('Add a task title', 'Enter a short task name.'); return; }
    for (const [label, value] of [['Due date', dueDate], ['Scheduled date', scheduledDate]] as const) {
      if (value.trim() && !isDateOnly(value.trim())) { Alert.alert(`Check ${label.toLowerCase()}`, 'Use the YYYY-MM-DD format.'); return; }
    }
    let parsedReminder: string | null = null;
    if (reminderAt.trim()) {
      const date = new Date(reminderAt.trim());
      if (Number.isNaN(date.getTime())) { Alert.alert('Check reminder date', 'Use YYYY-MM-DDTHH:mm, for example 2026-10-18T16:30.'); return; }
      if (date <= new Date()) { Alert.alert('Choose a future time', 'A reminder needs to be scheduled after now.'); return; }
      parsedReminder = date.toISOString();
    }
    const input: TaskInput = { title, notes: notes.trim() || null, categoryId: selectedCategory === 0 ? null : selectedCategory, priority, dueDate: dueDate.trim() || null, scheduledDate: scheduledDate.trim() || null, reminderAt: parsedReminder, isTopPriority: top };
    setBusy(true);
    try {
      let savedId = task?.id;
      if (task) await updateTask(task.id, input);
      else savedId = await addTask(input);
      if (savedId !== undefined) {
        try { await scheduleTaskReminder(savedId, input.title, input.reminderAt ?? null); }
        catch (error) { Alert.alert('Task saved, reminder not set', error instanceof Error ? error.message : 'Check notification permissions and try again.'); }
      }
      onSaved(); onClose();
    }
    catch (error) { Alert.alert('Could not save task', error instanceof Error ? error.message : 'Try again.'); }
    finally { setBusy(false); }
  };
  const remove = () => Alert.alert('Delete task?', 'This task will be removed from your notebook.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { if (task) { await cancelTaskReminder(task.id); await deleteTask(task.id); onSaved(); onClose(); } } }]);
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={styles.container}><View style={styles.topbar}><Text style={styles.heading}>{task ? 'Edit task' : 'New task'}</Text><Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><Ionicons name="close" size={24} color={palette.ink} /></Pressable></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
      <Field label="Task" value={title} onChangeText={setTitle} placeholder="What do you need to do?" maxLength={200} autoFocus />
      <Text style={styles.label}>Category</Text><View style={styles.chips}>{categories.map((category) => <Pressable key={category.id} onPress={() => setSelectedCategory(category.id)} style={[styles.chip, { backgroundColor: category.color }, selectedCategory === category.id && styles.chipActive]}><Text style={styles.chipText}>{category.name}</Text></Pressable>)}</View>
      <Text style={styles.label}>Priority</Text><View style={styles.priorityRow}>{(['low','normal','high'] as const).map((item) => <Pressable key={item} onPress={() => setPriority(item)} style={[styles.priority, priority === item && styles.prioritySelected]}><Text style={[styles.priorityText, priority === item && styles.priorityTextSelected]}>{item[0].toUpperCase()+item.slice(1)}</Text></Pressable>)}</View>
      <Field label="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} placeholder="Optional" autoCapitalize="none" />
      <Field label="Scheduled date (YYYY-MM-DD)" value={scheduledDate} onChangeText={setScheduledDate} placeholder="Optional" autoCapitalize="none" />
      <Field label="Reminder (YYYY-MM-DDTHH:mm)" value={reminderAt} onChangeText={setReminderAt} placeholder="2026-10-18T16:30" autoCapitalize="none" />
      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional details" multiline numberOfLines={3} />
      <View style={styles.switchRow}><Text style={styles.switchLabel}>Top three priority</Text><Switch value={top} onValueChange={setTop} trackColor={{ true: palette.green }} /></View>
      <Button label={busy ? 'Saving…' : task ? 'Save changes' : 'Add task'} onPress={save} />
      {task ? <Button label="Delete task" onPress={remove} secondary /> : null}
    </ScrollView></View>
  </Modal>;
}
function isDateOnly(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [year, month, day] = value.split('-').map(Number); const date = new Date(year, month - 1, day); return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day; }
function toLocalInput(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const pad = (part: number) => String(part).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: palette.paper }, topbar: { paddingHorizontal: space.md, paddingVertical: 16, borderBottomWidth: 1, borderColor: palette.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { fontSize: 20, fontWeight: '700', color: palette.ink }, form: { padding: space.md, paddingBottom: 36 }, label: { fontSize: 13, color: palette.muted, marginBottom: 8, fontWeight: '600' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }, chip: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: 'transparent' }, chipActive: { borderColor: palette.green, borderWidth: 2 }, chipText: { fontSize: 13, color: palette.ink }, priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 18 }, priority: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card, flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12 }, prioritySelected: { borderColor: palette.green, backgroundColor: palette.greenSoft }, priorityText: { fontSize: 14, color: palette.muted }, priorityTextSelected: { color: palette.green, fontWeight: '700' }, switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4, marginBottom: 18 }, switchLabel: { color: palette.ink, fontSize: 15 } });
