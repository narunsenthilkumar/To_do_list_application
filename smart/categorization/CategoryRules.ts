import { CATEGORY_DEFINITIONS, CategoryDefinition } from './KeywordMap';
import { CategoryResult } from '../types';

export class CategoryRules {
  public static evaluate(text: string): CategoryResult {
    const clean = text.toLowerCase().trim();
    if (!clean) {
      return {
        primary: 'General',
        icon: '📝',
        confidence: 0,
        matchedKeywords: [],
      };
    }

    const scoredCategories: {
      category: CategoryDefinition;
      score: number;
      matched: string[];
    }[] = [];

    for (const cat of CATEGORY_DEFINITIONS) {
      if (cat.name === 'General') continue;

      let score = 0;
      const matched: string[] = [];

      for (const kw of cat.keywords) {
        const kwLower = kw.toLowerCase();

        // Exact phrase match
        if (clean.includes(kwLower)) {
          if (kwLower.includes(' ')) {
            score += 4.0;
            matched.push(kw);
          } else {
            // Whole word match vs substring
            const regex = new RegExp(`\\b${kwLower}\\b`, 'i');
            if (regex.test(clean)) {
              score += 2.5;
              matched.push(kw);
            } else if (clean.includes(kwLower) && kwLower.length >= 4) {
              score += 1.0;
              matched.push(kw);
            }
          }
        }
      }

      if (score > 0) {
        scoredCategories.push({ category: cat, score, matched });
      }
    }

    scoredCategories.sort((a, b) => b.score - a.score);

    if (scoredCategories.length === 0) {
      return {
        primary: 'General',
        icon: '📝',
        confidence: 0.3,
        matchedKeywords: [],
      };
    }

    const top = scoredCategories[0];
    const second = scoredCategories.length > 1 ? scoredCategories[1] : undefined;

    const confidence = Math.min(0.98, Math.max(0.5, top.score / 5.0));

    return {
      primary: top.category.name,
      icon: top.category.icon,
      secondary: second ? second.category.name : undefined,
      confidence,
      matchedKeywords: top.matched,
    };
  }
}
