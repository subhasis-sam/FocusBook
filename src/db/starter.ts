import type { StarterBundle } from '../types';

export function normalizeStarterBundle(bundle: StarterBundle) {
  if (!Array.isArray(bundle.categories)) {
    throw new Error('Starter data must contain a categories array.');
  }
  if (bundle.categories.some((category) => !category || !Array.isArray(category.tasks))) throw new Error('Each starter category must contain a task array.');
  const names = new Set(bundle.categories.map((category) => category.name?.trim()));
  if (bundle.categories.length !== 10 || names.size !== 10 || names.has('') || names.has(undefined)) throw new Error('Starter data must contain exactly ten unique, non-empty categories.');
  const ids = bundle.categories.map((category) => category.id).filter((id) => id !== undefined && id !== null).map(String);
  if (ids.length !== 10 || new Set(ids).size !== ids.length) throw new Error('Starter category IDs must be unique and present.');
  const tasks = bundle.categories.flatMap((category) => category.tasks.map((task) => ({
    ...task,
    categoryId: category.id,
    categoryName: category.name,
  })));
  if (tasks.length !== 85) throw new Error(`Expected exactly 85 starter tasks; found ${tasks.length}.`);
  const taskIds = tasks.map((task) => task.id).filter((id) => id !== undefined && id !== null).map(String);
  if (taskIds.length !== 85 || new Set(taskIds).size !== taskIds.length) throw new Error('Starter task IDs must be unique and present.');
  for (const task of tasks) if (!task.title?.trim()) throw new Error(`Invalid starter task: ${task.title || '(empty title)'}`);
  return { categories: bundle.categories, tasks };
}
