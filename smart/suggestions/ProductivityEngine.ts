import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../../models/task';
import { SmartSuggestion } from '../types';
import { SuggestionRules } from './SuggestionRules';

const STORAGE_KEY_DISMISSED = '@taskora_dismissed_suggestions';

export class ProductivityEngine {
  private static dismissedIds: Set<string> = new Set();
  private static isLoaded = false;

  private static async loadDismissed() {
    if (this.isLoaded) return;
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_DISMISSED);
      if (data) {
        const parsed: string[] = JSON.parse(data);
        this.dismissedIds = new Set(parsed);
      }
      this.isLoaded = true;
    } catch {
      this.dismissedIds = new Set();
    }
  }

  public static async getActiveSuggestions(
    tasks: Task[],
    todayStr: string,
    currentStreak: number = 0
  ): Promise<SmartSuggestion[]> {
    await this.loadDismissed();

    const raw = SuggestionRules.generateSuggestions(tasks, todayStr, currentStreak);
    // Filter out dismissed suggestions
    return raw.filter((s) => !this.dismissedIds.has(s.id));
  }

  public static async dismissSuggestion(suggestionId: string): Promise<void> {
    await this.loadDismissed();
    this.dismissedIds.add(suggestionId);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_DISMISSED,
        JSON.stringify(Array.from(this.dismissedIds))
      );
    } catch (e) {
      console.warn('Failed to save dismissed suggestion', e);
    }
  }

  public static async resetSuggestionHistory(): Promise<void> {
    this.dismissedIds.clear();
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_DISMISSED);
    } catch (e) {
      console.warn('Failed to reset suggestion history', e);
    }
  }
}
