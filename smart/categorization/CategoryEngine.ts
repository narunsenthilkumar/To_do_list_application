import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryRules } from './CategoryRules';
import { CATEGORY_DEFINITIONS } from './KeywordMap';
import { CategoryResult } from '../types';

const STORAGE_KEY_CORRECTIONS = '@taskora_category_corrections';

export class CategoryEngine {
  private static userCorrections: Record<string, string> = {};
  private static isLoaded = false;

  private static async loadCorrections() {
    if (this.isLoaded) return;
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_CORRECTIONS);
      if (data) {
        this.userCorrections = JSON.parse(data);
      }
      this.isLoaded = true;
    } catch {
      this.userCorrections = {};
    }
  }

  public static async categorize(text: string): Promise<CategoryResult> {
    await this.loadCorrections();

    const lower = text.toLowerCase().trim();

    // Check user corrections first
    for (const [phrase, categoryName] of Object.entries(this.userCorrections)) {
      if (lower.includes(phrase.toLowerCase())) {
        const catDef = CATEGORY_DEFINITIONS.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
        return {
          primary: categoryName,
          icon: catDef ? catDef.icon : '🏷️',
          confidence: 0.99,
          matchedKeywords: [phrase],
        };
      }
    }

    // Default rule-based categorization
    return CategoryRules.evaluate(text);
  }

  public static categorizeSync(text: string): CategoryResult {
    const lower = text.toLowerCase().trim();

    // Check memory-cached corrections
    for (const [phrase, categoryName] of Object.entries(this.userCorrections)) {
      if (lower.includes(phrase.toLowerCase())) {
        const catDef = CATEGORY_DEFINITIONS.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
        return {
          primary: categoryName,
          icon: catDef ? catDef.icon : '🏷️',
          confidence: 0.99,
          matchedKeywords: [phrase],
        };
      }
    }

    return CategoryRules.evaluate(text);
  }

  public static async learnCorrection(phrase: string, preferredCategory: string): Promise<void> {
    await this.loadCorrections();
    const cleanPhrase = phrase.toLowerCase().trim();
    if (!cleanPhrase || cleanPhrase.length < 2) return;

    this.userCorrections[cleanPhrase] = preferredCategory;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CORRECTIONS, JSON.stringify(this.userCorrections));
    } catch (e) {
      console.warn('Failed to save category correction', e);
    }
  }

  public static async resetLearnedCorrections(): Promise<void> {
    this.userCorrections = {};
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_CORRECTIONS);
    } catch (e) {
      console.warn('Failed to reset category corrections', e);
    }
  }

  public static getCategoryIcon(categoryName?: string): string {
    if (!categoryName) return '📝';
    const cat = CATEGORY_DEFINITIONS.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    return cat ? cat.icon : '🏷️';
  }
}
