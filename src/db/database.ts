import * as SQLite from 'expo-sqlite';
import starterBundle from '../../assets/starter-tasks.json';
import { normalizeStarterBundle } from './starter';
import type { Category, Priority, StarterBundle, Task, TaskInput } from '../types';

const DB_NAME = 'focusbook.db';
let database: Promise<SQLite.SQLiteDatabase> | undefined;

const STARTER = starterBundle as StarterBundle;

export async function getDatabase() {
  if (!database) database = initialize();
  return database;
}

async function initialize() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT UNIQUE, name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#E8EFE8', icon TEXT NOT NULL DEFAULT '○', sort_order INTEGER NOT NULL DEFAULT 0,
      seeded INTEGER NOT NULL DEFAULT 0 CHECK (seeded IN (0,1))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, source_key TEXT UNIQUE,
      title TEXT NOT NULL, notes TEXT, category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      is_complete INTEGER NOT NULL DEFAULT 0 CHECK (is_complete IN (0,1)),
      completed_at TEXT, priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
      due_date TEXT, reminder_at TEXT, reminder_id TEXT, is_top_priority INTEGER NOT NULL DEFAULT 0,
      scheduled_date TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks(category_id, is_complete);
    CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
  `);
  const migration = await db.getFirstAsync<{ version: number }>('SELECT version FROM schema_migrations WHERE version = 1');
  if (!migration) {
    await db.runAsync('INSERT INTO schema_migrations(version, applied_at) VALUES(1, ?)', new Date().toISOString());
  }
  await seedIfNeeded(db, STARTER);
  return db;
}

async function seedIfNeeded(db: SQLite.SQLiteDatabase, input: StarterBundle) {
  const seeded = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'seed_data_version'");
  if (seeded) return;
  const counts = await db.getFirstAsync<{ categories: number; tasks: number }>('SELECT (SELECT count(*) FROM categories) AS categories, (SELECT count(*) FROM tasks) AS tasks');
  // A previously used database wins over seed files added by an app update.
  if ((counts?.categories ?? 0) > 0 || (counts?.tasks ?? 0) > 0) {
    await db.runAsync("INSERT OR IGNORE INTO app_meta(key, value) VALUES('seed_data_version','preserved-existing-data')");
    return;
  }
  const bundle = normalizeStarterBundle(input);
  await db.withTransactionAsync(async () => {
    const ids = new Map<string, number>();
    for (const category of bundle.categories) {
      const result = await db.runAsync(
        'INSERT INTO categories(source_id,name,color,icon,sort_order,seeded) VALUES(?,?,?,?,?,1)',
        String(category.id), category.name.trim(), category.color ?? categoryColors[category.sortOrder ?? 0], category.icon ?? '○', category.sortOrder ?? 0,
      );
      ids.set(String(category.id), Number(result.lastInsertRowId));
    }
    const now = new Date().toISOString();
    for (const task of bundle.tasks) {
      const categoryId = ids.get(String(task.categoryId));
      if (!categoryId) throw new Error(`Unknown category for starter task: ${task.title}`);
      await db.runAsync(
        'INSERT INTO tasks(source_key,title,category_id,is_complete,completed_at,priority,due_date,reminder_at,sort_order,created_at,updated_at) VALUES(?,?,?,0,NULL,?,?,?,?,?,?)',
        String(task.id), task.title.trim(), categoryId, isPriority(task.priority) ? task.priority : 'normal', task.dueAt ?? null,
        task.reminderAt ?? null, task.sortOrder ?? 0, now, now,
      );
    }
    await db.runAsync("INSERT INTO app_meta(key, value) VALUES('seed_data_version', ?)", String(input.version ?? 1));
  });
}

const categoryColors = ['#E9EAF7','#F6E9DB','#E2EFE7','#F4E4E6','#E5EEF1','#F4EFDC','#EBE5F2','#E8EDDF','#F5E8D7','#E1EBE7'];
function isPriority(value?: string): value is Priority { return value === 'low' || value === 'normal' || value === 'high'; }

const taskSelect = `SELECT t.id,t.source_key AS sourceKey,t.title,t.notes,t.category_id AS categoryId,t.is_complete AS isComplete,t.priority,
  t.completed_at AS completedAt,
  t.due_date AS dueDate,t.reminder_at AS reminderAt,t.reminder_id AS reminderId,t.is_top_priority AS isTopPriority,
  t.scheduled_date AS scheduledDate,t.sort_order AS sortOrder,t.created_at AS createdAt,t.updated_at AS updatedAt,
  COALESCE(c.name,'Inbox') AS categoryName,COALESCE(c.color,'#E7ECE8') AS categoryColor FROM tasks t LEFT JOIN categories c ON c.id=t.category_id`;

export async function listCategories(): Promise<Array<Category & { total: number; completed: number }>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Category & { total: number; completed: number }>(`SELECT c.id,c.source_id AS sourceId,c.name,c.color,c.icon,c.sort_order AS sortOrder,c.seeded AS seeded,COUNT(t.id) AS total,COALESCE(SUM(t.is_complete),0) AS completed
    FROM categories c LEFT JOIN tasks t ON t.category_id=c.id GROUP BY c.id ORDER BY c.sort_order,c.name`);
  const inbox = await db.getFirstAsync<{ total: number; completed: number }>('SELECT COUNT(*) AS total,COALESCE(SUM(is_complete),0) AS completed FROM tasks WHERE category_id IS NULL');
  return [...rows.map((row) => ({ ...row, seeded: Boolean(row.seeded) })), { id: 0, sourceId: null, name: 'Inbox', color: '#E7ECE8', icon: 'tray-outline', sortOrder: 9999, seeded: false, total: inbox?.total ?? 0, completed: inbox?.completed ?? 0 }];
}

export async function listTasks(options: { categoryId?: number | null; query?: string; status?: 'all'|'active'|'completed'; date?: string; includeScheduled?: boolean } = {}): Promise<Task[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const args: Array<string|number> = [];
  if (options.categoryId === 0) clauses.push('t.category_id IS NULL');
  else if (options.categoryId !== undefined && options.categoryId !== null) { clauses.push('t.category_id = ?'); args.push(options.categoryId); }
  if (options.query?.trim()) { clauses.push('(t.title LIKE ? OR COALESCE(t.notes,\'\') LIKE ?)'); args.push(`%${options.query.trim()}%`, `%${options.query.trim()}%`); }
  if (options.status === 'active') clauses.push('t.is_complete = 0');
  if (options.status === 'completed') clauses.push('t.is_complete = 1');
  if (options.date) { clauses.push('(t.due_date = ? OR t.scheduled_date = ?)'); args.push(options.date, options.date); }
  if (options.includeScheduled === false) clauses.push('t.scheduled_date IS NULL');
  const rows = await db.getAllAsync<Task>(`${taskSelect}${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY t.is_complete ASC, c.sort_order, t.sort_order, t.id`, ...args);
  return rows.map(decodeTask);
}

export async function getTask(id: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Task>(`${taskSelect} WHERE t.id = ?`, id);
  return row ? decodeTask(row) : null;
}

export async function addTask(input: TaskInput) {
  const db = await getDatabase(); const now = new Date().toISOString();
  await assertTopThree(db, input.isTopPriority);
  const order = await db.getFirstAsync<{ nextOrder: number }>('SELECT COALESCE(MAX(sort_order),-1)+1 AS nextOrder FROM tasks WHERE category_id IS ?', input.categoryId);
  const result = await db.runAsync('INSERT INTO tasks(title,notes,category_id,priority,due_date,reminder_at,is_top_priority,scheduled_date,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    input.title.trim(), input.notes ?? null, input.categoryId, input.priority ?? 'normal', input.dueDate ?? null,
    input.reminderAt ?? null, input.isTopPriority ? 1 : 0, input.scheduledDate ?? null, order?.nextOrder ?? 0, now, now);
  return Number(result.lastInsertRowId);
}

export async function updateTask(id: number, input: TaskInput) {
  const db = await getDatabase();
  await assertTopThree(db, input.isTopPriority, id);
  await db.runAsync('UPDATE tasks SET title=?,notes=?,category_id=?,priority=?,due_date=?,reminder_at=?,is_top_priority=CASE WHEN is_complete=1 THEN 0 ELSE ? END,scheduled_date=?,updated_at=? WHERE id=?',
    input.title.trim(), input.notes ?? null, input.categoryId, input.priority ?? 'normal', input.dueDate ?? null,
    input.reminderAt ?? null, input.isTopPriority ? 1 : 0, input.scheduledDate ?? null, new Date().toISOString(), id);
}

export async function setTaskComplete(id: number, complete: boolean) {
  const db = await getDatabase();
  const completedAt = complete ? new Date().toISOString() : null;
  await db.runAsync('UPDATE tasks SET is_complete=?,completed_at=?,is_top_priority=CASE WHEN ?=1 THEN 0 ELSE is_top_priority END,updated_at=? WHERE id=?', complete ? 1 : 0, completedAt, complete ? 1 : 0, new Date().toISOString(), id);
}

export async function deleteTask(id: number) { const db = await getDatabase(); await db.runAsync('DELETE FROM tasks WHERE id=?', id); }

export async function addCategory(name: string) {
  const db = await getDatabase(); const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a category name.');
  const order = await db.getFirstAsync<{ nextOrder: number }>('SELECT COALESCE(MAX(sort_order),-1)+1 AS nextOrder FROM categories');
  const result = await db.runAsync('INSERT INTO categories(name,color,icon,sort_order,seeded) VALUES(?,?,?, ?,0)', trimmed, categoryColors[(order?.nextOrder ?? 0) % categoryColors.length], '○', order?.nextOrder ?? 0);
  return Number(result.lastInsertRowId);
}

export async function renameCategory(id: number, name: string) {
  const db = await getDatabase(); const category = await db.getFirstAsync<{ seeded: number }>('SELECT seeded FROM categories WHERE id=?', id);
  if (!category || category.seeded) throw new Error('Preset categories cannot be renamed.');
  if (!name.trim()) throw new Error('Enter a category name.');
  await db.runAsync('UPDATE categories SET name=? WHERE id=?', name.trim(), id);
}

export async function deleteCategory(id: number) {
  const db = await getDatabase(); const category = await db.getFirstAsync<{ seeded: number }>('SELECT seeded FROM categories WHERE id=?', id);
  if (!category || category.seeded) throw new Error('Preset categories cannot be deleted.');
  await db.runAsync('UPDATE tasks SET category_id=NULL,updated_at=? WHERE category_id=?', new Date().toISOString(), id);
  await db.runAsync('DELETE FROM categories WHERE id=?', id);
}

export async function setReminder(id: number, reminderAt: string | null, reminderId: string | null) {
  const db = await getDatabase();
  await db.runAsync('UPDATE tasks SET reminder_at=?,reminder_id=?,updated_at=? WHERE id=?', reminderAt, reminderId, new Date().toISOString(), id);
}

export async function getBackup() {
  const categories = await listCategories(); const tasks = await listTasks();
  return { format: 'focusbook-backup', version: 1, exportedAt: new Date().toISOString(), categories: categories.filter((category) => category.id !== 0).map(({ total, completed, ...category }) => category), tasks: tasks.map((task) => ({ ...task, reminderId: null })) };
}

async function assertTopThree(db: SQLite.SQLiteDatabase, makeTop: boolean | undefined, exceptId?: number) {
  if (!makeTop) return;
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM tasks WHERE is_top_priority=1 AND is_complete=0${exceptId ? ' AND id != ?' : ''}`, ...(exceptId ? [exceptId] : []));
  if ((row?.count ?? 0) >= 3) throw new Error('Only three active tasks can be marked as top priorities.');
}

function decodeTask(task: Task): Task {
  return { ...task, isComplete: Boolean(task.isComplete), isTopPriority: Boolean(task.isTopPriority) };
}

export async function importBackup(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('This file is not a valid FocusBook backup.');
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.categories) || !Array.isArray(candidate.tasks)) throw new Error('This file is not a valid FocusBook backup.');
  const envelope = candidate as { format?: unknown; version?: unknown; categories: unknown[]; tasks: unknown[] };
  if (envelope.format !== 'focusbook-backup' || envelope.version !== 1) throw new Error('This backup version is not supported.');
  const categories = envelope.categories.filter(isBackupCategory);
  const tasks = envelope.tasks.filter(isBackupTask);
  if (categories.length === 0 || categories.length > 200 || categories.length !== envelope.categories.length) throw new Error('The backup must contain named categories.');
  if (tasks.length !== envelope.tasks.length || new Set(tasks.map((task) => task.id)).size !== tasks.length || tasks.filter((task) => task.isTopPriority && !task.isComplete).length > 3) throw new Error('The backup contains invalid tasks or more than three active top priorities.');
  const backup = { categories, tasks };
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM tasks; DELETE FROM categories;');
    const idMap = new Map<number, number>();
    for (const category of backup.categories) {
      const result = await db.runAsync('INSERT INTO categories(source_id,name,color,icon,sort_order,seeded) VALUES(?,?,?,?,?,?)', category.sourceId ?? null, category.name, category.color ?? '#E8EFE8', category.icon ?? '○', category.sortOrder ?? 0, category.seeded ? 1 : 0);
      if (category.id !== undefined) idMap.set(category.id, Number(result.lastInsertRowId));
    }
    for (const task of backup.tasks) {
      let categoryId: number | null = null;
      if (typeof task.categoryId === 'number' && task.categoryId !== 0) {
        categoryId = idMap.get(task.categoryId) ?? (await db.getFirstAsync<{id:number}>('SELECT id FROM categories WHERE name=?', task.categoryName ?? ''))?.id ?? null;
        if (categoryId === null) throw new Error(`Missing category for task “${task.title}”.`);
      }
      await db.runAsync('INSERT INTO tasks(id,source_key,title,notes,category_id,is_complete,completed_at,priority,due_date,reminder_at,is_top_priority,scheduled_date,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        task.id, task.sourceKey ?? null, task.title, task.notes ?? null, categoryId, task.isComplete ? 1 : 0, task.completedAt ?? null, isPriority(task.priority) ? task.priority : 'normal', task.dueDate ?? null,
        task.reminderAt ?? null, task.isTopPriority ? 1 : 0, task.scheduledDate ?? null, task.sortOrder ?? 0, task.createdAt ?? new Date().toISOString(), task.updatedAt ?? new Date().toISOString());
    }
  });
}

type BackupCategory = { id?: number; sourceId?: string | null; name: string; color?: string; icon?: string; sortOrder?: number; seeded?: boolean };
type BackupTask = { id: number; sourceKey?: string | null; title: string; notes?: string | null; categoryId?: number | null; categoryName?: string; isComplete: boolean; completedAt?: string | null; priority: Priority; dueDate?: string | null; reminderAt?: string | null; isTopPriority?: boolean; scheduledDate?: string | null; sortOrder?: number; createdAt?: string; updatedAt?: string };
function isBackupCategory(value: unknown): value is BackupCategory {
  if (!value || typeof value !== 'object') return false;
  const category = value as BackupCategory;
  return typeof category.name === 'string' && Boolean(category.name.trim()) && (category.id === undefined || Number.isInteger(category.id)) && (category.sourceId === undefined || category.sourceId === null || typeof category.sourceId === 'string');
}
function isBackupTask(value: unknown): value is BackupTask {
  if (!value || typeof value !== 'object') return false;
  const task = value as BackupTask;
  return Number.isInteger(task.id) && typeof task.title === 'string' && Boolean(task.title.trim()) && typeof task.isComplete === 'boolean' && isPriority(task.priority) && (task.categoryId === undefined || task.categoryId === null || Number.isInteger(task.categoryId)) && (task.isTopPriority === undefined || typeof task.isTopPriority === 'boolean');
}
