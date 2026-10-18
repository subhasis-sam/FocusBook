import starterData from '../assets/starter-tasks.json';
import { normalizeStarterBundle } from '../src/db/starter';
import type { StarterBundle } from '../src/types';

describe('FocusBook starter data', () => {
  it('contains exactly ten supplied categories and 85 supplied tasks in source order', () => {
    const normalized = normalizeStarterBundle(starterData as StarterBundle);
    expect(normalized.categories).toHaveLength(10);
    expect(normalized.tasks).toHaveLength(85);
    expect(normalized.categories.map((category) => category.name)).toEqual([
      '01. M.Tech Academics',
      '02. Research & M.Tech Project',
      '03. DSA & Coding Interviews',
      '04. Core CS Interview Subjects',
      '05. Backend Development',
      '06. Python, AI & ML Skills',
      '07. Projects & Portfolio',
      '08. Resume, Profile & Interview',
      '09. Jobs, Internships & Networking',
      '10. Personal, Admin & Growth',
    ]);
    expect(normalized.tasks.every((task) => task.completed === false)).toBe(true);
    expect(normalized.categories[0].name).toBe('01. M.Tech Academics');
    expect(normalized.tasks[0].title).toBe('Review all subject syllabi and pending work');
    expect(normalized.tasks[84].title).toBe('Review unfinished tasks every Sunday');
  });

  it('rejects a missing starter task before SQLite is modified', () => {
    const incomplete = structuredClone(starterData) as StarterBundle;
    incomplete.categories[0].tasks.pop();
    expect(() => normalizeStarterBundle(incomplete)).toThrow('Expected exactly 85 starter tasks');
  });

  it('rejects an empty or unidentified task', () => {
    const invalid = structuredClone(starterData) as StarterBundle;
    invalid.categories[0].tasks[0].id = '';
    expect(() => normalizeStarterBundle(invalid)).toThrow('Invalid starter task');
  });
});
