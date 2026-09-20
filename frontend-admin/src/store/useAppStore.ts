import { create } from 'zustand';
import type {
  AppState,
  AudioSettings,
  SessionRecord,
  SubtitleEntry,
} from '@/types';
import { generateId } from '@/utils/helpers';
import { DEFAULT_AUDIO_SETTINGS, TOAST_DURATION } from '@/utils/constants';
import { speechSynthesisService, isFiniteNumber } from '@/services/speechSynthesis';

const RECORDS_STORAGE_KEY = 'subtitle-translator-session-records';
const SUBTITLES_STORAGE_KEY = 'subtitle-translator-subtitles';

const normalizeConfidence = (value: unknown): number | null => {
  if (!isFiniteNumber(value)) return null;
  return Math.min(1, Math.max(0, value));
};

const normalizeDuration = (value: unknown, legacyValue?: unknown): number | null => {
  const duration = isFiniteNumber(value) ? value : legacyValue;
  if (!isFiniteNumber(duration) || duration < 0) return null;
  return duration;
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
};

const loadRecordsFromStorage = (): SessionRecord[] => {
  try {
    const stored = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const records: SessionRecord[] = [];
        for (const item of parsed as Partial<SessionRecord>[]) {
          const timestamp = toDate(item.timestamp);
          if (!timestamp || !item.sourceText || !item.targetText) continue;

          records.push({
            id: typeof item.id === 'string' ? item.id : generateId(),
            type: item.type === 'manual' ? 'manual' : 'voice',
            sourceText: item.sourceText,
            targetText: item.targetText,
            sourceLang: item.sourceLang || 'zh-CN',
            targetLang: item.targetLang || 'en-US',
            timestamp,
            metadata: {
              confidence: normalizeConfidence(item.metadata?.confidence),
              durationMs: normalizeDuration(
                item.metadata?.durationMs,
                (item.metadata as { duration?: unknown } | undefined)?.duration,
              ),
            },
          });
        }
        return records;
      }
    }
  } catch {
    console.error('Failed to load session records from storage');
  }
  return [];
};

const loadSubtitlesFromStorage = (): SubtitleEntry[] => {
  try {
    const stored = localStorage.getItem(SUBTITLES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const subtitles: SubtitleEntry[] = [];
        for (const item of parsed as (Partial<SubtitleEntry> & { duration?: unknown })[]) {
          const timestamp = toDate(item.timestamp);
          if (!timestamp || !item.originalText || !item.translatedText) continue;

          subtitles.push({
            id: typeof item.id === 'string' ? item.id : generateId(),
            originalText: item.originalText,
            translatedText: item.translatedText,
            timestamp,
            confidence: normalizeConfidence(item.confidence),
            durationMs: normalizeDuration(item.durationMs, item.duration),
            sourceLang: item.sourceLang || 'zh-CN',
            targetLang: item.targetLang || 'en-US',
          });
        }
        return subtitles;
      }
    }
  } catch {
    console.error('Failed to load subtitles from storage');
  }
  return [];
};

const saveRecordsToStorage = (records: SessionRecord[]) => {
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    console.error('Failed to save session records to storage');
  }
};

const saveSubtitlesToStorage = (subtitles: SubtitleEntry[]) => {
  try {
    localStorage.setItem(SUBTITLES_STORAGE_KEY, JSON.stringify(subtitles));
  } catch {
    console.error('Failed to save subtitles to storage');
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  // 控制面板状态
  sourceLang: 'zh-CN',
  targetLang: 'en-US',
  isMicOn: false,
  isRecording: false,
  audioSettings: DEFAULT_AUDIO_SETTINGS,

  // 字幕状态 - 从本地存储恢复已呈现的字幕与元数据
  subtitles: loadSubtitlesFromStorage(),
  currentSubtitle: '',
  activeSubtitleId: null,

  // 翻译状态
  inputText: '',
  translationHistory: [],
  isTranslating: false,

  // Toast状态
  toasts: [],

  // 会话记录
  sessionRecords: loadRecordsFromStorage(),

  // Actions
  setSourceLang: (lang: string) => {
    set({ sourceLang: lang });
    get().addToast('info', `源语言已切换`);
  },

  setTargetLang: (lang: string) => {
    set({ targetLang: lang });
    get().addToast('info', `目标语言已切换`);
  },

  toggleMic: () => {
    const { isMicOn } = get();
    const newState = !isMicOn;
    set({ isMicOn: newState, isRecording: newState });
    if (!newState) {
      speechSynthesisService.stop();
    }
  },

  setAudioSettings: (settings: Partial<AudioSettings>) => {
    set(state => ({
      audioSettings: { ...state.audioSettings, ...settings },
    }));
  },

  addSubtitle: (original, translated, metadata = {}) => {
    const { sourceLang, targetLang } = get();
    const id = generateId();
    const confidence = normalizeConfidence(metadata.confidence);
    const durationMs = normalizeDuration(metadata.durationMs);
    const newSubtitle: SubtitleEntry = {
      id,
      originalText: original,
      translatedText: translated,
      timestamp: new Date(),
      confidence,
      durationMs,
      sourceLang,
      targetLang,
    };

    set(state => {
      const subtitles = [...state.subtitles, newSubtitle];
      saveSubtitlesToStorage(subtitles);
      return { subtitles, currentSubtitle: '' };
    });

    get().addSessionRecord({
      id,
      type: 'voice',
      sourceText: original,
      targetText: translated,
      sourceLang,
      targetLang,
      metadata: { confidence, durationMs },
    });

    return id;
  },

  setCurrentSubtitle: (text: string) => {
    set({ currentSubtitle: text });
  },

  setActiveSubtitle: (id) => {
    set(state => (state.activeSubtitleId === id ? state : { activeSubtitleId: id }));
  },

  setInputText: (text: string) => {
    set({ inputText: text });
  },

  translate: async () => {
    const { inputText, sourceLang, targetLang, addToast, addSessionRecord } = get();

    if (!inputText.trim()) {
      addToast('warning', '请输入要翻译的文本');
      return;
    }

    set({ isTranslating: true });

    try {
      // 模拟翻译
      await new Promise(resolve => setTimeout(resolve, 800));
      const result = `[Translated] ${inputText}`;

      set(state => ({
        translationHistory: [
          {
            id: generateId(),
            sourceText: inputText,
            targetText: result,
            sourceLang,
            targetLang,
            timestamp: new Date(),
          },
          ...state.translationHistory,
        ],
        inputText: '',
        isTranslating: false,
      }));

      addSessionRecord({
        type: 'manual',
        sourceText: inputText,
        targetText: result,
        sourceLang,
        targetLang,
      });

      addToast('success', '翻译完成');
    } catch {
      set({ isTranslating: false });
      addToast('error', '翻译失败，请重试');
    }
  },

  addToast: (type, message) => {
    const id = generateId();
    set(state => ({
      toasts: [...state.toasts, { id, type, message, duration: TOAST_DURATION }],
    }));

    // 自动移除
    setTimeout(() => {
      get().removeToast(id);
    }, TOAST_DURATION);
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },

  addSessionRecord: (record) => {
    set(state => {
      const newRecord: SessionRecord = {
        id: record.id || generateId(),
        timestamp: new Date(),
        ...record,
        metadata: {
          confidence: normalizeConfidence(record.metadata?.confidence),
          durationMs: normalizeDuration(record.metadata?.durationMs),
        },
      };
      const newRecords = [newRecord, ...state.sessionRecords];
      saveRecordsToStorage(newRecords);
      return { sessionRecords: newRecords };
    });
  },

  deleteSessionRecord: (id) => {
    set(state => {
      const newRecords = state.sessionRecords.filter(r => r.id !== id);
      saveRecordsToStorage(newRecords);
      return { sessionRecords: newRecords };
    });
    get().addToast('success', '记录已删除');
  },

  clearSessionRecords: () => {
    set({ sessionRecords: [] });
    saveRecordsToStorage([]);
    get().addToast('success', '所有记录已清空');
  },
}));

speechSynthesisService.setStore(useAppStore);
