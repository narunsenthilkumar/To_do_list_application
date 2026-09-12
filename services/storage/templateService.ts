import { Project } from '../../models/project';
import { Tag } from '../../models/tag';
import { Task } from '../../models/task';
import { Repository, getTodayDateString, getTomorrowDateString } from './repository';

export interface TaskoraTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  projects: Project[];
  tags: Tag[];
  tasks: Task[];
}

export class TemplateService {
  public static getTemplates(): TaskoraTemplate[] {
    const nowISO = new Date().toISOString();
    return [
      {
        id: 'tpl-grocery',
        name: 'Weekly Grocery Shopping',
        category: 'Shopping',
        description: 'Organized grocery checklist categorized by produce, dairy, bakery & pantry.',
        icon: 'ShoppingCart',
        color: '#34C759',
        projects: [
          {
            id: 'proj-grocery',
            name: 'Weekly Grocery Shopping',
            icon: 'ShoppingCart',
            color: '#34C759',
            description: 'Things to buy for the week.',
            createdAt: nowISO,
            updatedAt: nowISO,
            archived: false,
            order: 0,
          },
        ],
        tags: [
          { id: 'tag-grocery', name: 'grocery', color: '#34C759', createdAt: nowISO },
          { id: 'tag-shopping', name: 'shopping', color: '#00C7BE', createdAt: nowISO },
        ],
        tasks: [
          { id: 'groc-1', title: 'Buy fresh vegetables (spinach, tomatoes, onions, carrots)', completed: false, priority: 'medium', dueDate: getTodayDateString(), projectId: 'proj-grocery', tags: ['grocery', 'shopping'], notes: 'Prefer organic section', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 0 },
          { id: 'groc-2', title: 'Buy fresh fruits (bananas, apples, oranges)', completed: false, priority: 'low', dueDate: getTodayDateString(), projectId: 'proj-grocery', tags: ['grocery', 'shopping'], notes: 'For morning snacks & smoothies', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 1 },
          { id: 'groc-3', title: 'Buy milk, curd, cheese & butter', completed: false, priority: 'high', dueDate: getTodayDateString(), projectId: 'proj-grocery', tags: ['grocery', 'shopping'], notes: 'Check expiry dates', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 2 },
          { id: 'groc-4', title: 'Buy whole wheat bread & eggs', completed: false, priority: 'medium', dueDate: getTodayDateString(), projectId: 'proj-grocery', tags: ['grocery', 'shopping'], notes: 'Brown bread & farm fresh eggs', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 3 },
          { id: 'groc-5', title: 'Restock rice, lentils, olive oil & spices', completed: false, priority: 'low', projectId: 'proj-grocery', tags: ['grocery', 'shopping'], notes: 'Pantry essentials', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 4 },
        ],
      },
      {
        id: 'tpl-travel',
        name: 'Travel & Packing Checklist',
        category: 'Travel',
        description: 'Complete vacation & business trip preparation checklist.',
        icon: 'Plane',
        color: '#FF9500',
        projects: [
          {
            id: 'proj-travel',
            name: 'Weekend Trip',
            icon: 'Plane',
            color: '#FF9500',
            description: 'Travel preparation checklist.',
            createdAt: nowISO,
            updatedAt: nowISO,
            archived: false,
            order: 1,
          },
        ],
        tags: [
          { id: 'tag-travel', name: 'travel', color: '#FF9500', createdAt: nowISO },
          { id: 'tag-packing', name: 'packing', color: '#5856D6', createdAt: nowISO },
        ],
        tasks: [
          { id: 'trv-1', title: 'Confirm train/flight tickets & hotel reservation', completed: false, priority: 'urgent', dueDate: getTomorrowDateString(), projectId: 'proj-travel', tags: ['travel'], notes: 'Keep digital and printed copies handy', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 0 },
          { id: 'trv-2', title: 'Pack clothes for 3 days', completed: false, priority: 'high', projectId: 'proj-travel', tags: ['travel', 'packing'], notes: 'Comfortable casuals, walking shoes & nightwear', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 1 },
          { id: 'trv-3', title: 'Pack chargers, power bank, headphones & adapter', completed: false, priority: 'high', projectId: 'proj-travel', tags: ['travel', 'packing'], notes: 'Electronics pouch', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 2 },
          { id: 'trv-4', title: 'Pack toiletries, sunscreen & basic medicine kit', completed: false, priority: 'medium', projectId: 'proj-travel', tags: ['travel', 'packing'], notes: 'Travel-size bottles', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 3 },
          { id: 'trv-5', title: 'Download offline maps & entertainment podcasts', completed: false, priority: 'low', projectId: 'proj-travel', tags: ['travel'], notes: 'Download Spotify playlist & Google Maps area', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 4 },
        ],
      },
      {
        id: 'tpl-daily',
        name: 'Daily Productivity Checklist',
        category: 'Productivity',
        description: 'Morning and evening routines to build consistency and stay focused.',
        icon: 'SquareCheck',
        color: '#007AFF',
        projects: [
          {
            id: 'proj-daily',
            name: 'Daily Checklist',
            icon: 'SquareCheck',
            color: '#007AFF',
            description: 'Daily routine & productivity checklist.',
            createdAt: nowISO,
            updatedAt: nowISO,
            archived: false,
            order: 2,
          },
        ],
        tags: [
          { id: 'tag-daily', name: 'daily', color: '#007AFF', createdAt: nowISO },
          { id: 'tag-routine', name: 'routine', color: '#AF52DE', createdAt: nowISO },
        ],
        tasks: [
          { id: 'chk-1', title: 'Drink 500ml water right after waking up', completed: false, priority: 'medium', dueDate: getTodayDateString(), dueTime: '06:30', projectId: 'proj-daily', tags: ['daily', 'routine'], notes: 'Morning hydration boost', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 0 },
          { id: 'chk-2', title: '10-minute morning stretch or light workout', completed: false, priority: 'low', dueDate: getTodayDateString(), dueTime: '07:00', projectId: 'proj-daily', tags: ['daily', 'routine'], notes: 'Yoga or mobility stretches', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 1 },
          { id: 'chk-3', title: 'Review today’s Top 3 priorities in KIVENTA', completed: false, priority: 'high', dueDate: getTodayDateString(), dueTime: '08:30', projectId: 'proj-daily', tags: ['daily', 'routine'], notes: 'Pick the most impactful goals', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 2 },
          { id: 'chk-4', title: '25-minute deep focus block without phone distraction', completed: false, priority: 'high', dueDate: getTodayDateString(), dueTime: '10:00', projectId: 'proj-daily', tags: ['daily', 'routine'], notes: 'Use KIVENTA Focus timer', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 3 },
          { id: 'chk-5', title: 'Evening wrap-up: check off completed tasks', completed: false, priority: 'low', dueDate: getTodayDateString(), dueTime: '21:00', projectId: 'proj-daily', tags: ['daily', 'routine'], notes: 'Plan tomorrow before sleeping', createdAt: nowISO, updatedAt: nowISO, subtasks: [], activityLogs: [], order: 4 },
        ],
      },
    ];
  }

  /**
   * Applies a template by explicitly appending its projects, tags, and tasks
   */
  public static async applyTemplate(templateId: string): Promise<boolean> {
    const tpl = this.getTemplates().find((t) => t.id === templateId);
    if (!tpl) return false;

    const existingTasks = await Repository.loadTasks();
    const existingProjects = await Repository.loadProjects();
    const existingTags = await Repository.loadTags();

    // Union merge
    const taskMap = new Map<string, Task>();
    existingTasks.forEach((t) => taskMap.set(t.id, t));
    tpl.tasks.forEach((t) => taskMap.set(t.id, t));

    const projMap = new Map<string, Project>();
    existingProjects.forEach((p) => projMap.set(p.id, p));
    tpl.projects.forEach((p) => projMap.set(p.id, p));

    const tagMap = new Map<string, Tag>();
    existingTags.forEach((tg) => tagMap.set(tg.name.toLowerCase(), tg));
    tpl.tags.forEach((tg) => tagMap.set(tg.name.toLowerCase(), tg));

    await Repository.saveProjects(Array.from(projMap.values()));
    await Repository.saveTags(Array.from(tagMap.values()));
    await Repository.saveTasks(Array.from(taskMap.values()));

    return true;
  }
}
