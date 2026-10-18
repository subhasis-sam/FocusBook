import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listCategories, listTasks } from '../../src/db/database';
import { CategoryEditor } from '../../src/components/CategoryEditor';
import { TaskEditor } from '../../src/components/TaskEditor';
import { TaskRow } from '../../src/components/TaskRow';
import { Button, Card, Field, Screen } from '../../src/components/UI';
import { useAppState } from '../../src/components/AppProvider';
import { toggleTaskCompletion } from '../../src/services/reminders';
import type { Category, Task } from '../../src/types';
import { palette } from '../../src/theme';

type CategorySummary = Category & { total: number; completed: number };
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const categoryId = id === 'inbox' ? 0 : Number(id);
  const { revision, refresh } = useAppState();
  const [category, setCategory] = useState<CategorySummary>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(false);
  const [categoryEditor, setCategoryEditor] = useState(false);
  const [selected, setSelected] = useState<Task>();
  const load = useCallback(async () => {
    const categories = await listCategories();
    setCategory(categories.find((item) => item.id === categoryId));
    setTasks(await listTasks({ categoryId, status: filter, query }));
  }, [categoryId, filter, query, revision]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const toggle = async (task: Task) => { await toggleTaskCompletion(task); refresh(); await load(); };
  const edit = (task: Task) => { setSelected(task); setEditor(true); };
  const add = () => { setSelected(undefined); setEditor(true); };
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={palette.green} /><Text style={styles.backText}>Categories</Text></Pressable>
    <View style={[styles.hero, { backgroundColor: category?.color ?? '#E9EAF7' }]}><View style={styles.heroRow}><Text style={styles.icon}>{categoryId === 0 ? '▤' : category?.icon ?? '○'}</Text>{category && category.id > 0 && !category.seeded ? <Pressable onPress={() => setCategoryEditor(true)} accessibilityLabel="Edit category"><Ionicons name="ellipsis-horizontal" size={22} color={palette.muted} /></Pressable> : null}</View><Text style={styles.title}>{category?.name ?? 'Tasks'}</Text><Text style={styles.sub}>{category?.completed ?? 0} of {category?.total ?? tasks.length} complete</Text></View>
    <Field label="Find in this category" value={query} onChangeText={setQuery} placeholder="Search tasks" />
    <View style={styles.filters}>{(['all', 'active', 'completed'] as const).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterOn]}><Text style={[styles.filterText, filter === item && styles.filterTextOn]}>{item === 'all' ? 'All' : item === 'active' ? 'Pending' : 'Completed'}</Text></Pressable>)}</View>
    <Card>{tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggle} onEdit={edit} />) : <Text style={styles.empty}>Nothing here yet. Add a task to get started.</Text>}</Card>
    <Button label="＋  Add task" onPress={add} />
  </ScrollView>
    <TaskEditor visible={editor} task={selected} categoryId={categoryId} onClose={() => setEditor(false)} onSaved={() => { refresh(); load(); }} />
    <CategoryEditor visible={categoryEditor} category={category} onClose={() => setCategoryEditor(false)} onSaved={() => { refresh(); load(); }} onDeleted={() => router.back()} />
  </Screen>;
}
const styles = StyleSheet.create({ content: { paddingTop: 14, paddingBottom: 30 }, back: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 15, paddingVertical: 5 }, backText: { color: palette.green, fontSize: 14, fontWeight: '600' }, hero: { borderRadius: 20, padding: 20, marginBottom: 18 }, heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, icon: { fontSize: 23, color: palette.ink }, title: { color: palette.ink, fontSize: 25, fontWeight: '700', marginTop: 12 }, sub: { color: '#65716A', fontSize: 13, marginTop: 5 }, filters: { flexDirection: 'row', gap: 8, marginBottom: 12 }, filter: { borderRadius: 15, backgroundColor: '#EEEBE5', paddingHorizontal: 14, paddingVertical: 8 }, filterOn: { backgroundColor: palette.green }, filterText: { color: palette.muted, fontSize: 13, fontWeight: '600' }, filterTextOn: { color: 'white' }, empty: { color: palette.muted, paddingVertical: 12 } });
