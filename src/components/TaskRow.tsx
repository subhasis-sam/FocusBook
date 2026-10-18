import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '../types';
import { palette } from '../theme';

export function TaskRow({ task, onToggle, onEdit }: { task: Task; onToggle: (task: Task) => void; onEdit: (task: Task) => void }) {
  return <View style={styles.row}>
    <Pressable onPress={() => onToggle(task)} accessibilityRole="checkbox" accessibilityState={{ checked: task.isComplete }} accessibilityLabel={`${task.isComplete ? 'Mark incomplete' : 'Complete'} ${task.title}`} hitSlop={8} style={styles.checkbox}>
      <View style={[styles.box, task.isComplete && styles.checked]}>{task.isComplete ? <Ionicons name="checkmark" size={19} color="white" /> : null}</View>
    </Pressable>
    <Pressable onPress={() => onEdit(task)} style={styles.content} accessibilityRole="button">
      <Text style={[styles.title, task.isComplete && styles.done]}>{task.title}</Text>
      <View style={styles.meta}><Text style={styles.category}>{task.categoryName}</Text>{task.dueDate ? <Text style={styles.date}> · {task.dueDate}</Text> : null}{task.priority === 'high' ? <Text style={styles.priority}> · High priority</Text> : null}</View>
    </Pressable>
    <Pressable onPress={() => onEdit(task)} hitSlop={10} accessibilityLabel="Edit task"><Ionicons name="ellipsis-horizontal" color={palette.muted} size={19} /></Pressable>
  </View>;
}
const styles = StyleSheet.create({ row: { minHeight: 66, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line, gap: 12 }, checkbox: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, box: { width: 27, height: 27, borderRadius: 9, borderWidth: 1.7, borderColor: '#B7C0B8', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }, checked: { backgroundColor: palette.green, borderColor: palette.green }, content: { flex: 1, minHeight: 40, justifyContent: 'center' }, title: { color: palette.ink, fontSize: 15, lineHeight: 21, fontWeight: '500' }, done: { color: '#969B95', textDecorationLine: 'line-through' }, meta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 }, category: { color: palette.muted, fontSize: 12 }, date: { color: palette.muted, fontSize: 12 }, priority: { color: palette.coral, fontSize: 12 } });
