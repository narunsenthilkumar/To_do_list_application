export interface CategoryDefinition {
  name: string;
  icon: string;
  keywords: string[];
  priorityWeight?: number;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    name: 'Study',
    icon: '📚',
    keywords: [
      'study', 'assignment', 'exam', 'homework', 'college', 'university', 'lecture',
      'notes', 'syllabus', 'revision', 'math', 'physics', 'chemistry', 'biology',
      'quiz', 'test', 'chapter', 'textbook', 'course', 'essay', 'thesis', 'learn'
    ],
  },
  {
    name: 'Coding',
    icon: '💻',
    keywords: [
      'code', 'coding', 'programming', 'react', 'python', 'javascript', 'typescript',
      'github', 'git', 'debug', 'bug', 'database', 'api', 'backend', 'frontend',
      'css', 'html', 'algorithm', 'refactor', 'deploy', 'pr', 'pull request',
      'node', 'express', 'sql', 'unit test', 'app', 'component', 'software', 'fix bug'
    ],
  },
  {
    name: 'Work',
    icon: '💼',
    keywords: [
      'work', 'client', 'presentation', 'report', 'standup', 'email', 'slack',
      'project', 'proposal', 'review', 'demo', 'stakeholder', 'contract',
      'deliverable', 'customer', 'boss', 'manager', 'pitch', 'deck', 'resume', 'office'
    ],
  },
  {
    name: 'Shopping',
    icon: '🛒',
    keywords: [
      'buy', 'purchase', 'shopping', 'groceries', 'milk', 'vegetables', 'fruit',
      'supermarket', 'store', 'amazon', 'order', 'cart', 'eggs', 'bread', 'snacks',
      'clothes', 'items', 'market', 'mall', 'grocery', 'produce'
    ],
  },
  {
    name: 'Finance',
    icon: '💰',
    keywords: [
      'bill', 'payment', 'bank', 'rent', 'salary', 'tax', 'electricity', 'budget',
      'expense', 'transfer', 'subscription', 'pay', 'credit card', 'loan', 'savings',
      'invest', 'fee', 'utility', 'pay electricity bill', 'pay bill'
    ],
  },
  {
    name: 'Travel',
    icon: '✈️',
    keywords: [
      'trip', 'travel', 'flight', 'train', 'hotel', 'airport', 'ticket', 'passport',
      'luggage', 'packing', 'booking', 'commute', 'vacation', 'bus', 'boarding',
      'destination', 'resort', 'flight tickets'
    ],
  },
  {
    name: 'Health/Fitness',
    icon: '🏋️',
    keywords: [
      'gym', 'workout', 'fitness', 'run', 'running', 'exercise', 'yoga', 'doctor',
      'medicine', 'dentist', 'walk', 'health', 'water', 'pills', 'therapy',
      'cardio', 'weights', 'stretch', 'appointment', 'hospital', 'clinic'
    ],
  },
  {
    name: 'Personal',
    icon: '🏠',
    keywords: [
      'home', 'personal', 'clean', 'room', 'laundry', 'repair', 'organize', 'cook',
      'dinner', 'lunch', 'breakfast', 'chore', 'kitchen', 'plant', 'water plants',
      'car', 'wash', 'trash', 'vacuum', 'dishes', 'clean room'
    ],
  },
  {
    name: 'Family',
    icon: '👨‍👩‍👧',
    keywords: [
      'mom', 'dad', 'brother', 'sister', 'family', 'kids', 'parents', 'call mom',
      'visit parents', 'son', 'daughter', 'wife', 'husband', 'anniversary', 'birthday',
      'relatives', 'call dad'
    ],
  },
  {
    name: 'Meetings',
    icon: '📅',
    keywords: [
      'meeting', 'zoom', 'sync', '1:1', 'discussion', 'interview', 'conference',
      'huddle', 'call client', 'team sync', 'catchup'
    ],
  },
  {
    name: 'Goals',
    icon: '🎯',
    keywords: [
      'goal', 'habit', 'read', 'book', 'meditation', 'journal', 'practice',
      'progress', 'daily habit', 'reflection', 'mindfulness'
    ],
  },
  {
    name: 'General',
    icon: '📝',
    keywords: ['general', 'task', 'todo', 'item', 'misc'],
  },
];
