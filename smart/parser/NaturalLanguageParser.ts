import { DateParser } from './DateParser';
import { TimeParser } from './TimeParser';
import { RecurrenceParser } from './RecurrenceParser';
import { PriorityParser } from './PriorityParser';
import { CategoryEngine } from '../categorization/CategoryEngine';
import { ParsedTask, ParserConfidence } from '../types';

export class NaturalLanguageParser {
  public static parse(input: string, baseDate: Date = new Date()): ParsedTask {
    const rawInput = input.trim();
    if (!rawInput) {
      return {
        rawInput: '',
        title: '',
        priority: 'none',
        confidence: {
          title: 0,
          date: 0,
          time: 0,
          priority: 0,
          recurrence: 0,
          category: 0,
          overall: 0,
        },
        hasMatchedDate: false,
        hasMatchedTime: false,
      };
    }

    // 1. Parse Sub-Components
    const dateRes = DateParser.parse(rawInput, baseDate);
    const timeRes = TimeParser.parse(rawInput);
    const recurrenceRes = RecurrenceParser.parse(rawInput);
    const priorityRes = PriorityParser.parse(rawInput);

    // 2. Clean Extracted Segments from Title
    let cleanTitle = rawInput;

    const removeMatchedText = (matched: string) => {
      if (!matched) return;
      const escaped = matched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      cleanTitle = cleanTitle.replace(regex, ' ');
    };

    removeMatchedText(dateRes.matchedText);
    removeMatchedText(timeRes.matchedText);
    removeMatchedText(recurrenceRes.matchedText);
    removeMatchedText(priorityRes.matchedText);

    // Clean dangling prepositions around removed tokens & multiple spaces
    cleanTitle = cleanTitle
      .replace(/\s+/g, ' ')
      .replace(/\b(at|on|by|for|in|every|due|to)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Fallback if title became empty
    if (!cleanTitle) {
      cleanTitle = rawInput;
    }

    // Capitalize first letter of title
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

    // 3. Category Detection
    const categoryRes = CategoryEngine.categorizeSync(cleanTitle);

    // 4. Default Estimated Duration (minutes)
    let estimatedDuration = 30;
    const lowerTitle = cleanTitle.toLowerCase();
    if (/\b(email|reply|slack|message|quick call|water plants|take pill)\b/i.test(lowerTitle)) {
      estimatedDuration = 15;
    } else if (/\b(study|coding|code|assignment|homework|workout|gym|exercise|cook)\b/i.test(lowerTitle)) {
      estimatedDuration = 45;
    } else if (/\b(presentation|report|exam|project|deep work|clean room|shopping)\b/i.test(lowerTitle)) {
      estimatedDuration = 60;
    }

    // 5. Confidence Calculation
    const titleConfidence = cleanTitle.length >= 3 ? 0.95 : 0.6;
    const dateConfidence = dateRes.confidence || 0;
    const timeConfidence = timeRes.confidence || 0;
    const priorityConfidence = priorityRes.confidence || 0;
    const recurrenceConfidence = recurrenceRes.confidence || 0;
    const categoryConfidence = categoryRes.confidence || 0.5;

    const confidenceFactors = [titleConfidence];
    if (dateRes.dateStr) confidenceFactors.push(dateConfidence);
    if (timeRes.timeStr) confidenceFactors.push(timeConfidence);
    if (priorityRes.priority !== 'none') confidenceFactors.push(priorityConfidence);
    if (recurrenceRes.rule) confidenceFactors.push(recurrenceConfidence);
    confidenceFactors.push(categoryConfidence);

    const overallConfidence =
      confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length;

    const confidence: ParserConfidence = {
      title: titleConfidence,
      date: dateConfidence,
      time: timeConfidence,
      priority: priorityConfidence,
      recurrence: recurrenceConfidence,
      category: categoryConfidence,
      overall: Number(overallConfidence.toFixed(2)),
    };

    return {
      rawInput,
      title: cleanTitle,
      dueDate: dateRes.dateStr,
      dueTime: timeRes.timeStr,
      priority: priorityRes.priority,
      recurrence: recurrenceRes.rule,
      category: categoryRes.primary,
      categoryIcon: categoryRes.icon,
      estimatedDuration,
      confidence,
      hasMatchedDate: !!dateRes.dateStr,
      hasMatchedTime: !!timeRes.timeStr,
    };
  }
}
