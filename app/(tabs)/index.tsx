import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { listTasks } from "../../src/db/database";
import { TaskRow } from "../../src/components/TaskRow";
import { TaskEditor } from "../../src/components/TaskEditor";
import { toggleTaskCompletion } from "../../src/services/reminders";
import { Button, Card, Heading, Screen } from "../../src/components/UI";
import { useAppState } from "../../src/components/AppProvider";
import type { Task } from "../../src/types";
import { palette } from "../../src/theme";

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export default function TodayScreen() {
  const router = useRouter();
  const { revision, refresh } = useAppState();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editor, setEditor] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>();
  const [categoryId, setCategoryId] = useState<number | undefined>(0);
  const today = dateKey(new Date());
  const load = useCallback(async () => {
    const all = await listTasks();
    setTasks(all);
  }, [revision]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const priorities = useMemo(
    () =>
      tasks
        .filter((task) => !task.isComplete && task.isTopPriority)
        .slice(0, 3),
    [tasks],
  );
  const priorityIds = new Set(priorities.map((task) => task.id));
  const todayTasks = tasks.filter((task) => task.dueDate === today || task.scheduledDate === today);
  const completedToday = todayTasks.filter((task) => task.isComplete).length;
  const overdue = tasks.filter(
    (task) => !priorityIds.has(task.id) && !task.isComplete && task.dueDate && task.dueDate < today,
  );
  const due = tasks.filter(
    (task) => !priorityIds.has(task.id) && !task.isComplete && task.dueDate === today,
  );
  const scheduled = tasks.filter(
    (task) =>
      !priorityIds.has(task.id) &&
      !task.isComplete &&
      task.scheduledDate === today &&
      task.dueDate !== today &&
      (!task.dueDate || task.dueDate >= today),
  );
  const visibleTaskIds = new Set([...overdue, ...due, ...scheduled].map((task) => task.id));
  const reminders = tasks.filter((task) => !task.isComplete && !priorityIds.has(task.id) && task.reminderId && task.reminderAt && dateKey(new Date(task.reminderAt)) === today && !visibleTaskIds.has(task.id));
  const recentlyCompleted = tasks.filter((task) => task.isComplete && task.completedAt && dateKey(new Date(task.completedAt)) === today).slice(0, 5);
  const sections: Array<[string, Task[]]> = [
    ["Due today", due],
    ["Scheduled today", scheduled],
    ["Overdue", overdue],
    ["Reminders", reminders],
    ["Recently completed", recentlyCompleted],
  ];
  const toggle = async (task: Task) => {
    await toggleTaskCompletion(task);
    refresh();
    await load();
  };
  const edit = (task: Task) => {
    setEditTask(task);
    setEditor(true);
  };
  const add = () => {
    setEditTask(undefined);
    setCategoryId(0);
    setEditor(true);
  };
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateLine}>
          <Text style={styles.date}>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/categories")}
            style={styles.allTasks}
          >
            <Text style={styles.allText}>Notebook</Text>
            <Ionicons name="arrow-forward" size={15} color={palette.green} />
          </Pressable>
        </View>
        <Heading subtitle="A little progress, one check at a time.">
          Today
        </Heading>
        <Card style={styles.progressCard}>
          <Text style={styles.progressNumber}>{completedToday} / {todayTasks.length}</Text>
          <Text style={styles.progressLabel}>scheduled or due today</Text>
        </Card>
        <View style={styles.priorityHeading}>
          <Text style={styles.sectionTitle}>Top three</Text>
          <Text style={styles.count}>{priorities.length}/3</Text>
        </View>
        <Card style={styles.priorityCard}>
          {priorities.length ? (
            priorities.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={toggle}
                onEdit={edit}
              />
            ))
          ) : (
            <Text style={styles.empty}>
              Choose up to three priorities while adding or editing a task.
            </Text>
          )}
        </Card>
        {sections.map(([name, rows]) =>
          rows.length ? (
            <View key={name}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{name}</Text>
                <Text style={styles.count}>{rows.length}</Text>
              </View>
              <Card>
                {rows.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggle}
                    onEdit={edit}
                  />
                ))}
              </Card>
            </View>
          ) : null,
        )}
        {!sections.some(([, rows]) => rows.length) && todayTasks.length === 0 && (
          <Card style={styles.clearCard}>
            <Ionicons name="leaf-outline" size={22} color={palette.green} />
            <Text style={styles.clearText}>
              Your day is clear. Add a task or take a well-earned breather.
            </Text>
          </Card>
        )}
        <Button label="＋  Add task" onPress={add} />
      </ScrollView>
      <TaskEditor
        visible={editor}
        task={editTask}
        categoryId={categoryId}
        onClose={() => setEditor(false)}
        onSaved={() => {
          refresh();
          load();
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingTop: 14, paddingBottom: 28 },
  dateLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  date: { color: palette.muted, fontSize: 14, fontWeight: "500" },
  allTasks: { flexDirection: "row", alignItems: "center", gap: 5 },
  allText: { color: palette.green, fontWeight: "600", fontSize: 13 },
  priorityHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
    marginBottom: 8,
  },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "700" },
  count: { color: palette.muted, fontSize: 13, fontWeight: "600" },
  progressCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, marginBottom: 12 },
  progressNumber: { color: palette.green, fontSize: 21, fontWeight: "700" },
  progressLabel: { color: palette.muted, fontSize: 13 },
  priorityCard: { borderColor: "#DBE8DF" },
  empty: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  clearCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  clearText: { flex: 1, color: palette.muted, lineHeight: 21 },
});
