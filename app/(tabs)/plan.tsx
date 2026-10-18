import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listTasks } from '../../src/db/database';
import { Button, Card, Field, Heading, Screen } from '../../src/components/UI';
import { TaskRow } from '../../src/components/TaskRow';
import { TaskEditor } from '../../src/components/TaskEditor';
import { useAppState } from '../../src/components/AppProvider';
import { toggleTaskCompletion } from '../../src/services/reminders';
import type { Task } from '../../src/types';
import { palette } from '../../src/theme';

type Phase = 'foundation' | 'projects' | 'interviews';
type Milestone = { id: string; title: string; phase: Phase; targetDate: string | null };
const phases: Array<{ id: Phase; title: string; start: number; end: number }> = [
  { id: 'foundation', title: 'Foundations', start: 0, end: 29 },
  { id: 'projects', title: 'Projects', start: 30, end: 59 },
  { id: 'interviews', title: 'Interview readiness', start: 60, end: 89 },
];
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const isDateOnly = (value: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00`); return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10)); };

export default function PlanScreen() {
  const { revision, refresh } = useAppState();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [startDate, setStartDate] = useState(dayKey(new Date()));
  const [draft, setDraft] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [phase, setPhase] = useState<Phase>('foundation');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editor, setEditor] = useState(false);
  const [selected, setSelected] = useState<Task>();
  const [weekStart, setWeekStart] = useState<'monday' | 'sunday'>('monday');
  const load = useCallback(async () => setTasks(await listTasks()), [revision]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    AsyncStorage.getItem('focusbook.roadmap').then((raw) => {
      if (!raw) return;
      const saved: unknown = JSON.parse(raw);
      if (Array.isArray(saved) && saved.every((item) => typeof item === 'string')) {
        setMilestones(saved.map((title, index) => ({ id: `legacy-${index}`, title: String(title), phase: 'foundation' as Phase, targetDate: null })));
      } else if (Array.isArray(saved)) setMilestones(saved as Milestone[]);
    }).catch(() => undefined);
    AsyncStorage.getItem('focusbook.roadmap.startDate').then((value) => { if (value && isDateOnly(value)) setStartDate(value); }).catch(() => undefined);
    AsyncStorage.getItem('focusbook.weekStart').then((value) => { if (value === 'sunday' || value === 'monday') setWeekStart(value); }).catch(() => undefined);
  }, []);
  const weekdays = useMemo(() => { const now = new Date(); const firstDay = weekStart === 'monday' ? 1 : 0; const offset = (now.getDay() - firstDay + 7) % 7; const start = addDays(now, -offset); return Array.from({ length: 7 }, (_, index) => addDays(start, index)); }, [weekStart]);
  const roadmapDates = useMemo(() => { const start = isDateOnly(startDate) ? new Date(`${startDate}T00:00:00`) : new Date(); return phases.map((item) => ({ ...item, from: addDays(start, item.start), to: addDays(start, item.end) })); }, [startDate]);
  const saveMilestones = async (next: Milestone[]) => { setMilestones(next); await AsyncStorage.setItem('focusbook.roadmap', JSON.stringify(next)); };
  const updateStartDate = async (value: string) => { setStartDate(value); if (isDateOnly(value)) await AsyncStorage.setItem('focusbook.roadmap.startDate', value); };
  const saveMilestone = async () => {
    if (!draft.trim()) { Alert.alert('Add a milestone', 'Enter a short outcome for your roadmap.'); return; }
    if (targetDate.trim() && !isDateOnly(targetDate.trim())) { Alert.alert('Check target date', 'Use the YYYY-MM-DD format.'); return; }
    const milestone: Milestone = { id: editingId ?? `${Date.now()}`, title: draft.trim(), phase, targetDate: targetDate.trim() || null };
    await saveMilestones(editingId ? milestones.map((item) => item.id === editingId ? milestone : item) : [...milestones, milestone]);
    setDraft(''); setTargetDate(''); setEditingId(null);
  };
  const editMilestone = (item: Milestone) => { setEditingId(item.id); setDraft(item.title); setTargetDate(item.targetDate ?? ''); setPhase(item.phase); };
  const removeMilestone = (item: Milestone) => Alert.alert('Remove milestone?', item.title, [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => saveMilestones(milestones.filter((value) => value.id !== item.id)) }]);
  const toggle = async (task: Task) => { await toggleTaskCompletion(task); refresh(); await load(); };
  const editTask = (task: Task) => { setSelected(task); setEditor(true); };
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Heading subtitle="Make a plan that still leaves room to breathe.">Plan</Heading>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>This week</Text><Text style={styles.caption}>{weekStart === 'monday' ? 'Monday to Sunday' : 'Sunday to Saturday'}</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.week}>{weekdays.map((day) => { const key = dayKey(day); const rows = tasks.filter((task) => !task.isComplete && (task.scheduledDate === key || task.dueDate === key)); return <View key={key} style={[styles.dayCard, key === dayKey(new Date()) && styles.todayCard]}><Text style={styles.dayName}>{day.toLocaleDateString(undefined, { weekday: 'short' })}</Text><Text style={styles.dayDate}>{day.getDate()}</Text><View style={styles.dayLine} /><Text style={styles.dayCount}>{rows.length} task{rows.length === 1 ? '' : 's'}</Text></View>; })}</ScrollView>
    {weekdays.map((day) => { const key = dayKey(day); const rows = tasks.filter((task) => !task.isComplete && (task.scheduledDate === key || task.dueDate === key)); if (!rows.length) return null; return <View key={`tasks-${key}`}><Text style={styles.dayLabel}>{day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text><Card>{rows.map((task) => <TaskRow key={task.id} task={task} onToggle={toggle} onEdit={editTask} />)}</Card></View>; })}
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>90-day roadmap</Text><Text style={styles.caption}>Set your own start date</Text></View>
    <Card><View style={styles.roadmapHead}><Ionicons name="flag-outline" size={20} color={palette.green} /><Text style={styles.roadmapTitle}>Three phases, shaped around your goals</Text></View>
      <Field label="Roadmap start date (YYYY-MM-DD)" value={startDate} onChangeText={updateStartDate} placeholder={dayKey(new Date())} autoCapitalize="none" />
      {roadmapDates.map((item) => <View key={item.id} style={styles.phaseBlock}><View style={styles.phaseHeader}><Text style={styles.phaseTitle}>{item.title}</Text><Text style={styles.phaseDates}>{dayKey(item.from)} – {dayKey(item.to)}</Text></View>{milestones.filter((goal) => goal.phase === item.id).map((goal) => <View key={goal.id} style={styles.goalRow}><View style={styles.goalBullet} /><View style={styles.goalCopy}><Text style={styles.goal}>{goal.title}</Text>{goal.targetDate ? <Text style={styles.caption}>Target · {goal.targetDate}</Text> : null}</View><Pressable onPress={() => editMilestone(goal)} hitSlop={8} accessibilityLabel="Edit milestone"><Ionicons name="create-outline" size={20} color={palette.green} /></Pressable><Pressable onPress={() => removeMilestone(goal)} hitSlop={8} accessibilityLabel="Remove milestone"><Ionicons name="close-circle-outline" size={20} color={palette.muted} /></Pressable></View>)}</View>)}
      {!milestones.length ? <Text style={styles.empty}>Add a few outcomes you hope to reach over the next 90 days.</Text> : null}
      <View style={styles.phasePicker}>{phases.map((item) => <Pressable key={item.id} onPress={() => setPhase(item.id)} style={[styles.phaseChip, phase === item.id && styles.phaseChipActive]}><Text style={[styles.phaseChipText, phase === item.id && styles.phaseChipTextActive]}>{item.title}</Text></Pressable>)}</View>
      <Field label="Milestone" value={draft} onChangeText={setDraft} placeholder="e.g. Finish my research review" returnKeyType="done" onSubmitEditing={saveMilestone} />
      <Field label="Target date (optional)" value={targetDate} onChangeText={setTargetDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      <Button label={editingId ? 'Save milestone' : 'Add milestone'} onPress={saveMilestone} secondary />
      {editingId ? <Button label="Cancel edit" onPress={() => { setEditingId(null); setDraft(''); setTargetDate(''); }} secondary compact /> : null}
    </Card>
  </ScrollView><TaskEditor visible={editor} task={selected} onClose={() => setEditor(false)} onSaved={() => { refresh(); load(); }} /></Screen>;
}
const styles = StyleSheet.create({ content: { paddingTop: 14, paddingBottom: 30 }, sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }, sectionTitle: { fontSize: 18, fontWeight: '700', color: palette.ink }, caption: { fontSize: 12, color: palette.muted }, week: { gap: 9, paddingBottom: 14 }, dayCard: { width: 68, height: 112, borderRadius: 16, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line, alignItems: 'center', paddingTop: 11 }, todayCard: { backgroundColor: palette.greenSoft, borderColor: '#C6D9CC' }, dayName: { fontSize: 12, fontWeight: '600', color: palette.muted }, dayDate: { fontSize: 25, fontWeight: '700', color: palette.ink, marginTop: 2 }, dayLine: { height: 1, width: 28, backgroundColor: palette.line, marginTop: 5 }, dayCount: { fontSize: 10, color: palette.muted, marginTop: 6 }, dayLabel: { fontSize: 14, fontWeight: '700', color: palette.ink, marginTop: 7, marginBottom: 6 }, roadmapHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }, roadmapTitle: { fontSize: 15, fontWeight: '600', color: palette.ink, flex: 1 }, phaseBlock: { marginBottom: 14 }, phaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }, phaseTitle: { fontSize: 14, fontWeight: '700', color: palette.ink }, phaseDates: { fontSize: 11, color: palette.muted }, goalRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, goalBullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.coral }, goalCopy: { flex: 1 }, goal: { color: palette.ink, fontSize: 14, lineHeight: 20 }, phasePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 2, marginBottom: 14 }, phaseChip: { borderRadius: 15, backgroundColor: '#EEEBE5', paddingHorizontal: 11, paddingVertical: 8 }, phaseChipActive: { backgroundColor: palette.green }, phaseChipText: { color: palette.muted, fontSize: 12, fontWeight: '600' }, phaseChipTextActive: { color: 'white' }, empty: { color: palette.muted, fontSize: 13, lineHeight: 20, marginBottom: 12 } });
