const assert = require('assert');

// 1. Test Task Data Model & Multi-Criteria Filtering Logic
const mockTasks = [
  {
    id: 'task-1',
    title: 'Complete urgent client proposal',
    completed: false,
    dueDate: '2026-08-22', // Today
    priority: 'urgent',
    inbox: true,
    isFavorite: true,
    isPinned: true,
    projectIds: ['proj-work'],
  },
  {
    id: 'task-2',
    title: 'Study React Native & Electron architecture',
    completed: false,
    dueDate: '2026-08-25', // Upcoming
    priority: 'high',
    inbox: false,
    isFavorite: true,
    isPinned: false,
    projectIds: ['proj-studies', 'proj-coding'],
  },
  {
    id: 'task-3',
    title: 'Old overdue invoice check',
    completed: false,
    dueDate: '2026-08-10', // Overdue
    priority: 'medium',
    inbox: true,
    isFavorite: false,
    isPinned: false,
    projectIds: [],
  },
  {
    id: 'task-4',
    title: 'Weekly grocery shopping list',
    completed: true,
    dueDate: '2026-08-22',
    priority: 'low',
    inbox: false,
    isFavorite: true,
    isPinned: false,
    projectIds: ['proj-personal'],
  },
];

const todayStr = '2026-08-22';

function applyTaskFilters(tasks, state) {
  return tasks.filter((t) => {
    // 1. Status Filter
    if (state.status === 'incomplete' && t.completed) return false;
    if (state.status === 'completed' && !t.completed) return false;

    // 2. Smart Due Date Filter
    if (state.smartDate === 'today' && t.dueDate !== todayStr) return false;
    if (state.smartDate === 'upcoming' && (!t.dueDate || t.dueDate <= todayStr)) return false;
    if (state.smartDate === 'overdue' && (!t.dueDate || t.dueDate >= todayStr || t.completed)) return false;

    // 3. Organization Filter
    if (state.org === 'inbox' && !t.inbox) return false;
    if (state.org === 'favorites' && !t.isFavorite) return false;
    if (state.org === 'pinned' && !t.isPinned) return false;
    if (state.org !== 'all' && state.org !== 'inbox' && state.org !== 'favorites' && state.org !== 'pinned') {
      const inProject = t.projectIds ? t.projectIds.includes(state.org) : t.projectId === state.org;
      if (!inProject) return false;
    }

    // 4. Priority Filter
    if (state.priority !== 'all' && t.priority !== state.priority) return false;

    // 5. Search Query
    if (state.searchQuery && state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      const matchesTitle = t.title.toLowerCase().includes(q);
      const matchesNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
      if (!matchesTitle && !matchesNotes) return false;
    }

    return true;
  });
}

console.log('Testing Multi-Criteria AND Logic Filtering:');

// Test 1: Incomplete + Favorite + Urgent
const r1 = applyTaskFilters(mockTasks, {
  status: 'incomplete',
  smartDate: 'all',
  org: 'favorites',
  priority: 'urgent',
  searchQuery: '',
});
assert.strictEqual(r1.length, 1);
assert.strictEqual(r1[0].id, 'task-1');
console.log('✔ Incomplete + Favorite + Urgent returned 1 expected task');

// Test 2: Incomplete + Favorite (should match task-1 and task-2)
const r2 = applyTaskFilters(mockTasks, {
  status: 'incomplete',
  smartDate: 'all',
  org: 'favorites',
  priority: 'all',
  searchQuery: '',
});
assert.strictEqual(r2.length, 2);
console.log('✔ Incomplete + Favorite returned 2 tasks (task-1, task-2)');

// Test 3: Pinned tasks
const r3 = applyTaskFilters(mockTasks, {
  status: 'all',
  smartDate: 'all',
  org: 'pinned',
  priority: 'all',
  searchQuery: '',
});
assert.strictEqual(r3.length, 1);
assert.strictEqual(r3[0].id, 'task-1');
console.log('✔ Pinned filter returned 1 task');

// Test 4: Project filtering with multi-project assignment
const r4 = applyTaskFilters(mockTasks, {
  status: 'all',
  smartDate: 'all',
  org: 'proj-coding',
  priority: 'all',
  searchQuery: '',
});
assert.strictEqual(r4.length, 1);
assert.strictEqual(r4[0].id, 'task-2');
console.log('✔ Project filter matched task-2 belonging to multiple projects');

// Test 5: Overdue filter
const r5 = applyTaskFilters(mockTasks, {
  status: 'all',
  smartDate: 'overdue',
  org: 'all',
  priority: 'all',
  searchQuery: '',
});
assert.strictEqual(r5.length, 1);
assert.strictEqual(r5[0].id, 'task-3');
console.log('✔ Overdue filter returned task-3');

// Test 6: Calendar Month Grid Generation
function generateMonthDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    const m = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    days.push({
      dateString: `${year}-${m}-${dayStr}`,
      dayNumber: d,
      isCurrentMonth: true,
    });
  }
  return days;
}

const august2026 = generateMonthDays(2026, 7); // August 2026 (0-indexed month 7)
// August 1, 2026 is a Saturday (day index 6)
assert.strictEqual(august2026[0], null);
assert.strictEqual(august2026[5], null);
assert.strictEqual(august2026[6].dateString, '2026-08-01');
assert.strictEqual(august2026[6].dayNumber, 1);
assert.strictEqual(august2026[36].dateString, '2026-08-31');
console.log('✔ August 2026 month grid successfully generated with 31 days aligned to Saturday');

console.log('\nALL UNIT & LOGIC TESTS PASSED SUCCESSFULLY (100% PASS RATE)!');
