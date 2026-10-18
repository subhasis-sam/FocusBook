import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listCategories, listTasks } from '../../src/db/database';
import { Button, Card, Field, Heading, Screen } from '../../src/components/UI';
import { CategoryEditor } from '../../src/components/CategoryEditor';
import { TaskRow } from '../../src/components/TaskRow';
import { TaskEditor } from '../../src/components/TaskEditor';
import { useAppState } from '../../src/components/AppProvider';
import { toggleTaskCompletion } from '../../src/services/reminders';
import type { Category, Task } from '../../src/types';
import { palette } from '../../src/theme';

type CategorySummary = Category & { total: number; completed: number };
export default function CategoriesScreen() {
  const router = useRouter();
  const { revision, refresh } = useAppState();
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Task[]>([]);
  const [editor, setEditor] = useState(false);
  const [categoryEditor, setCategoryEditor] = useState(false);
  const [selected, setSelected] = useState<Task>();
  const load = useCallback(async () => {
    setCategories(await listCategories());
    if (query.trim()) setMatches(await listTasks({ query }));
  }, [revision, query]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const search = async (value: string) => { setQuery(value); setMatches(value.trim() ? await listTasks({ query: value }) : []); };
  const toggle = async (task: Task) => { await toggleTaskCompletion(task); refresh(); await load(); };
  const edit = (task: Task) => { setSelected(task); setEditor(true); };
  const addTask = () => { setSelected(undefined); setEditor(true); };
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Heading subtitle="Every part of your notebook, in one place.">Categories</Heading>
    <Field label="Search tasks" value={query} onChangeText={search} placeholder="Search your notebook" returnKeyType="search" />
    {query.trim() ? <><Text style={styles.results}>{matches.length} matching task{matches.length === 1 ? '' : 's'}</Text><Card>{matches.length ? matches.map((task) => <TaskRow key={task.id} task={task} onToggle={toggle} onEdit={edit} />) : <Text style={styles.empty}>No matching tasks.</Text>}</Card></> : <>
      <View style={styles.actions}><Button label="＋  Add task" onPress={addTask} /><Button label="＋  Add category" onPress={() => setCategoryEditor(true)} secondary compact /></View>
      <View style={styles.grid}>{categories.map((category) => { const progress = category.total ? category.completed / category.total : 0; return <Pressable key={category.id} onPress={() => router.push({ pathname: '/category/[id]', params: { id: category.id === 0 ? 'inbox' : String(category.id) } })} style={[styles.categoryCard, { backgroundColor: category.color }]} accessibilityRole="button"><View style={styles.categoryTop}><Text style={styles.icon}>{category.id === 0 ? '▤' : category.icon}</Text><Ionicons name="arrow-up-right" size={17} color={palette.muted} /></View><Text style={styles.name}>{category.name}</Text><Text style={styles.progressText}>{category.completed} of {category.total} complete</Text><View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View></Pressable>; })}</View>
    </>}
  </ScrollView>
    <TaskEditor visible={editor} task={selected} onClose={() => setEditor(false)} onSaved={() => { refresh(); load(); }} />
    <CategoryEditor visible={categoryEditor} onClose={() => setCategoryEditor(false)} onSaved={() => { refresh(); load(); }} />
  </Screen>;
}
const styles = StyleSheet.create({ content: { paddingTop: 14, paddingBottom: 28 }, actions: { gap: 9, marginBottom: 4 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginTop: 12 }, categoryCard: { width: '48%', minHeight: 142, borderRadius: 18, padding: 14, justifyContent: 'space-between' }, categoryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, icon: { fontSize: 21, color: palette.ink }, name: { fontSize: 15, fontWeight: '700', color: palette.ink, marginTop: 12 }, progressText: { fontSize: 12, color: '#66716A', marginTop: 4 }, track: { height: 5, backgroundColor: '#FFFFFF99', borderRadius: 8, overflow: 'hidden', marginTop: 10 }, fill: { height: 5, backgroundColor: palette.green, borderRadius: 8 }, results: { color: palette.muted, fontSize: 13, marginBottom: 8 }, empty: { color: palette.muted, paddingVertical: 12 } });
