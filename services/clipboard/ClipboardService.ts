import { Platform } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';

/**
 * Unified Cross-Platform Clipboard Service
 * Supports Windows Electron (via Native IPC), Android/iOS (via ExpoClipboard), and Web.
 */
export class ClipboardService {
  /**
   * Writes string content to the system clipboard
   * @returns true if clipboard write succeeded, false otherwise
   */
  public static async setString(text: string): Promise<boolean> {
    if (typeof text !== 'string') {
      return false;
    }

    console.log('[ClipboardService] Writing to clipboard...');

    // 1. Electron IPC Bridge (Windows / Desktop)
    if (
      typeof window !== 'undefined' &&
      Boolean((window as any).electronAPI?.clipboard?.writeText)
    ) {
      try {
        await (window as any).electronAPI.clipboard.writeText(text);
        console.log('[ClipboardService] Electron native clipboard write successful.');
        return true;
      } catch (err) {
        console.warn('[ClipboardService] Electron clipboard write error:', err);
      }
    }

    // 2. Native Mobile (Android / iOS)
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        await ExpoClipboard.setStringAsync(text);
        console.log('[ClipboardService] Expo native clipboard write successful.');
        return true;
      } catch (err) {
        console.warn('[ClipboardService] ExpoClipboard setStringAsync error:', err);
      }
    }

    // 3. Web Navigator Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        console.log('[ClipboardService] Navigator clipboard write successful.');
        return true;
      } catch (err) {
        console.warn('[ClipboardService] navigator.clipboard.writeText error:', err);
      }
    }

    // 4. Fallback for DOM / textarea execCommand('copy')
    if (typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          console.log('[ClipboardService] execCommand fallback copy successful.');
          return true;
        }
      } catch (err) {
        console.warn('[ClipboardService] execCommand fallback error:', err);
      }
    }

    return false;
  }

  /**
   * Reads string content from the system clipboard
   */
  public static async getString(): Promise<string> {
    console.log('[ClipboardService] Reading from clipboard...');

    // 1. Electron IPC Bridge
    if (
      typeof window !== 'undefined' &&
      Boolean((window as any).electronAPI?.clipboard?.readText)
    ) {
      try {
        const text = await (window as any).electronAPI.clipboard.readText();
        return text || '';
      } catch (err) {
        console.warn('[ClipboardService] Electron clipboard read error:', err);
      }
    }

    // 2. Native Mobile
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        const text = await ExpoClipboard.getStringAsync();
        return text || '';
      } catch (err) {
        console.warn('[ClipboardService] ExpoClipboard getStringAsync error:', err);
      }
    }

    // 3. Web Navigator Clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        return text || '';
      } catch (err) {
        console.warn('[ClipboardService] navigator.clipboard.readText error:', err);
      }
    }

    return '';
  }
}
