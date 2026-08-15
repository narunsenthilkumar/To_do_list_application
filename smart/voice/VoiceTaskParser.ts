import { NaturalLanguageParser } from '../parser/NaturalLanguageParser';
import { ParsedTask } from '../types';

export class VoiceTaskParser {
  public static parseSpeechText(spokenText: string): ParsedTask {
    return NaturalLanguageParser.parse(spokenText);
  }
}
