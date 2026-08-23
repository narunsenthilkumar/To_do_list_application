import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Calendar,
  Clock,
  Folder,
  Flag,
  Sparkles,
  Mic,
  MicOff,
  X,
  Check,
  Tag as TagIcon,
  Bell,
  CornerDownLeft,
  Inbox,
} from 'lucide-react-native';
import { useTaskora, useTheme } from '../../store/useTaskora';
import {
  NaturalLanguageParser,
  VoiceService,
  VoiceResult,
  ParsedTask,
} from '../../smart';
import { PriorityLevel, ReminderOption, RecurrenceFrequency } from '../../models/task';
import { getTodayDateString, getTomorrowDateString } from '../../services/storage/repository';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { formatTaskTime } from '../../utils/timeFormatter';

interface WindowsQuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  initialProjectId?: string;
}

export const WindowsQuickAddModal: React.FC<WindowsQuickAddModalProps> = ({
  visible,
  onClose,
  initialProjectId,
}) => {
  const { colors, isDark, timeFormat } = useTheme();
  const { addTask, projects, tags, smartSettings } = useTaskora();

  const [rawText, setRawText] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);

  const [dueDate, setDueDate] = useState<string | undefined>(getTodayDateString());
  const [dueTime, setDueTime] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<PriorityLevel>('none');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    initialProjectId ? [initialProjectId] : []
  );
  const [inboxSelected, setInboxSelected] = useState<boolean>(!initialProjectId);
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState<ReminderOption>('none');

  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (visible) {
      setRawText('');
      setParsedTask(null);
      setDueDate(getTodayDateString());
      setDueTime(undefined);
      setPriority('none');
      setSelectedProjectIds(initialProjectId ? [initialProjectId] : []);
      setInboxSelected(!initialProjectId);
      setNotes('');
      setReminder('none');
      setIsListening(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [visible, initialProjectId]);

  // Real-time NLP parsing
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedTask(null);
      return;
    }
    const result = NaturalLanguageParser.parse(rawText.trim());
    setParsedTask(result);

    if (result.hasMatchedDate && result.dueDate) {
      setDueDate(result.dueDate);
    }
    if (result.hasMatchedTime && result.dueTime) {
      setDueTime(result.dueTime);
    }
    if (result.priority && result.priority !== 'none') {
      setPriority(result.priority);
    }
    if (result.category) {
      const match = projects.find(
        (p) => p.name.toLowerCase() === result.category?.toLowerCase()
      );
      if (match && !selectedProjectIds.includes(match.id)) {
        setSelectedProjectIds([...selectedProjectIds, match.id]);
      }
    }
  }, [rawText, projects]);

  const handleVoiceToggle = async () => {
    if (isListening) {
      VoiceService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      await VoiceService.startListening(
        (res: VoiceResult) => {
          if (res.text) {
            setRawText(res.text);
          }
          if (res.isFinal) {
            setIsListening(false);
          }
        },
        (err: string) => {
          console.warn('Voice recognition error:', err);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );
    }
  };

  const handleCreate = async () => {
    const finalTitle = (parsedTask?.title || rawText).trim();
    if (!finalTitle) return;

    await addTask({
      title: finalTitle,
      notes: notes.trim(),
      dueDate,
      dueTime,
      priority,
      projectId: selectedProjectIds[0],
      projectIds: selectedProjectIds,
      inbox: inboxSelected,
      reminder,
      category: parsedTask?.category || 'General',
      estimatedDuration: parsedTask?.estimatedDuration || 30,
    });

    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? 'rgba(26, 26, 34, 0.96)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
            },
            Shadows.floating,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.sparkleIcon, { backgroundColor: colors.accent + '20' }]}>
                <Sparkles size={16} color={colors.accent} />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Quick Add Task</Text>
            </View>
            <Pressable
              style={({ hovered }: any) => [
                styles.closeButton,
                hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
              ]}
              onPress={onClose}
            >
              <X size={16} color={colors.textTertiary} />
            </Pressable>
          </View>

          {/* Main Input Bar */}
          <View style={[styles.inputBox, { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)' }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="e.g. Finish quarterly presentation tomorrow at 4pm #Work !urgent"
              placeholderTextColor={colors.textTertiary}
              value={rawText}
              onChangeText={setRawText}
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            {/* Voice toggle button */}
            <Pressable
              style={[
                styles.voiceBtn,
                isListening && { backgroundColor: colors.error + '25', borderColor: colors.error },
              ]}
              onPress={handleVoiceToggle}
            >
              {isListening ? <MicOff size={16} color={colors.error} /> : <Mic size={16} color={colors.textTertiary} />}
            </Pressable>
          </View>

          {/* Real-time NLP parsed metadata tags preview */}
          {parsedTask && (
            <View style={styles.parsedTagsContainer}>
              {dueDate && (
                <View style={[styles.nlpChip, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '35' }]}>
                  <Calendar size={12} color={colors.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.nlpChipText, { color: colors.accent }]}>
                    {dueDate === getTodayDateString() ? 'Today' : dueDate === getTomorrowDateString() ? 'Tomorrow' : dueDate}
                  </Text>
                </View>
              )}
              {dueTime && (
                <View style={[styles.nlpChip, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '35' }]}>
                  <Clock size={12} color={colors.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.nlpChipText, { color: colors.accent }]}>
                    {formatTaskTime(dueTime, timeFormat)}
                  </Text>
                </View>
              )}
              {priority !== 'none' && (
                <View
                  style={[
                    styles.nlpChip,
                    {
                      backgroundColor:
                        (priority === 'urgent'
                          ? colors.priorityUrgent
                          : priority === 'high'
                          ? colors.priorityHigh
                          : priority === 'medium'
                          ? colors.priorityMedium
                          : colors.priorityLow) + '15',
                      borderColor:
                        priority === 'urgent'
                          ? colors.priorityUrgent
                          : priority === 'high'
                          ? colors.priorityHigh
                          : priority === 'medium'
                          ? colors.priorityMedium
                          : colors.priorityLow,
                    },
                  ]}
                >
                  <Flag size={12} color={priority === 'urgent' ? colors.priorityUrgent : priority === 'high' ? colors.priorityHigh : colors.accent} style={{ marginRight: 4 }} />
                  <Text
                    style={[
                      styles.nlpChipText,
                      {
                        color:
                          priority === 'urgent'
                            ? colors.priorityUrgent
                            : priority === 'high'
                            ? colors.priorityHigh
                            : colors.accent,
                      },
                    ]}
                  >
                    {priority.toUpperCase()}
                  </Text>
                </View>
              )}
              {inboxSelected && (
                <View style={[styles.nlpChip, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '35' }]}>
                  <Inbox size={12} color={colors.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.nlpChipText, { color: colors.accent }]}>Inbox</Text>
                </View>
              )}
              {selectedProjectIds.map((pId) => {
                const proj = projects.find((p) => p.id === pId);
                if (!proj) return null;
                const pColor = proj.color || colors.accent;
                return (
                  <View key={pId} style={[styles.nlpChip, { backgroundColor: pColor + '15', borderColor: pColor + '35' }]}>
                    <Folder size={12} color={pColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.nlpChipText, { color: pColor }]}>{proj.name}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Quick attribute selector pills */}
          <View style={styles.quickSelectorsRow}>
            {/* Priority Selector */}
            <View style={styles.selectorGroup}>
              {(['none', 'low', 'medium', 'high', 'urgent'] as PriorityLevel[]).map((p) => {
                const isSelected = priority === p;
                const pColor =
                  p === 'urgent'
                    ? colors.priorityUrgent
                    : p === 'high'
                    ? colors.priorityHigh
                    : p === 'medium'
                    ? colors.priorityMedium
                    : p === 'low'
                    ? colors.priorityLow
                    : colors.textTertiary;
                return (
                  <Pressable
                    key={p}
                    style={[
                      styles.selectorPill,
                      isSelected && { backgroundColor: pColor + '20', borderColor: pColor },
                      { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.selectorPillText, { color: isSelected ? pColor : colors.textTertiary }]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Destination / Project Picker pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectPillsScroll}>
              <Pressable
                style={[
                  styles.selectorPill,
                  inboxSelected && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                  { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                ]}
                onPress={() => setInboxSelected(!inboxSelected)}
              >
                <Text style={[styles.selectorPillText, { color: inboxSelected ? colors.accent : colors.textTertiary }]}>
                  {inboxSelected ? '✓ Inbox' : '+ Inbox'}
                </Text>
              </Pressable>

              {projects.map((proj) => {
                const isSelected = selectedProjectIds.includes(proj.id);
                return (
                  <Pressable
                    key={proj.id}
                    style={[
                      styles.selectorPill,
                      isSelected && { backgroundColor: (proj.color || colors.accent) + '20', borderColor: proj.color || colors.accent },
                      { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedProjectIds(selectedProjectIds.filter((id) => id !== proj.id));
                      } else {
                        setSelectedProjectIds([...selectedProjectIds, proj.id]);
                      }
                    }}
                  >
                    <View style={[styles.colorDot, { backgroundColor: proj.color || colors.accent }]} />
                    <Text style={[styles.selectorPillText, { color: isSelected ? proj.color || colors.accent : colors.textSecondary }]}>
                      {isSelected ? `✓ ${proj.name}` : proj.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.shortcutHint}>
              <CornerDownLeft size={13} color={colors.textTertiary} style={{ marginRight: 4 }} />
              <Text style={[styles.shortcutHintText, { color: colors.textTertiary }]}>Press Enter to save</Text>
            </View>

            <View style={styles.footerButtons}>
              <Pressable
                style={({ hovered }: any) => [
                  styles.cancelBtn,
                  hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.createBtn,
                  { backgroundColor: rawText.trim() ? colors.accent : colors.textQuaternary },
                ]}
                disabled={!rawText.trim()}
                onPress={handleCreate}
              >
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                <Text style={styles.createBtnText}>Add Task</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(8px)',
  } as any,
  modalContainer: {
    width: '90%',
    maxWidth: 620,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    zIndex: 10000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  title: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    ...TypographyScale.body,
    paddingVertical: 4,
    outlineStyle: 'none',
  } as any,
  voiceBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    cursor: 'pointer' as any,
  },
  parsedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  nlpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  nlpChipText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  quickSelectorsRow: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  selectorGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    cursor: 'pointer' as any,
  },
  selectorPillText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  projectPillsScroll: {
    flexDirection: 'row',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  shortcutHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shortcutHintText: {
    ...TypographyScale.caption2,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  cancelBtnText: {
    ...TypographyScale.subhead,
    fontWeight: '500',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  createBtnText: {
    ...TypographyScale.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
