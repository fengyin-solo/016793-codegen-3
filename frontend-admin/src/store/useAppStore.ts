import { create } from 'zustand';
import type { AppState, AudioSettings, SessionRecord, SubtitleEntry } from '@/types';
import { generateId } from '@/utils/helpers';
import { DEFAULT_AUDIO_SETTINGS, TOAST_DURATION } from '@/utils/constants';

const STORAGE_KEY = 'subtitle-translator-session-records';
const SUBTITLES_STORAGE_KEY = 'subtitle-translator-subtitles';

// 恢复 Date 类型（localStorage 序列化后时间戳变为字符串）
const reviveTimestamp = <T extends { timestamp: Date }>(item: T): T => ({
  ...item,
  timestamp: new Date(item.timestamp),
});

const loadRecordsFromStorage = (): SessionRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((r: SessionRecord) => reviveTimestamp(r));
    }
  } catch {
    console.error('Failed to load session records from storage');
  }
  return [];
};

const saveRecordsToStorage = (records: SessionRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    console.error('Failed to save session records to storage');
  }
};

const loadSubtitlesFromStorage = (): SubtitleEntry[] => {
  try {
    const stored = localStorage.getItem(SUBTITLES_STORAGE_KEY);
    if (stored) {
      const parsed: SubtitleEntry[] = JSON.parse(stored);
      const subtitles = parsed.map(s => reviveTimestamp(s));
      // 重新进入后：仅最新一条保持“当前”高亮，指示器与高亮保持一致
      if (subtitles.length > 0) {
        subtitles.forEach((s, i) => {
          s.isActive = i === subtitles.length - 1;
        });
      }
      return subtitles;
    }
  } catch {
    console.error('Failed to load subtitles from storage');
  }
  return [];
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

  // 字幕状态 - 从本地存储恢复，重新进入后已呈现的信息不丢失
  subtitles: loadSubtitlesFromStorage(),
  currentSubtitle: '',

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
  },

  setAudioSettings: (settings: Partial<AudioSettings>) => {
    set(state => ({
      audioSettings: { ...state.audioSettings, ...settings },
    }));
  },

  addSubtitle: (original, translated, metadata) => {
    const { sourceLang, targetLang } = get();
    const newEntry: SubtitleEntry = {
      id: generateId(),
      originalText: original,
      translatedText: translated,
      timestamp: new Date(),
      isActive: true,
      confidence: metadata?.confidence,
      durationMs: metadata?.durationMs,
    };

    let newSubtitles: SubtitleEntry[] = [];
    set(state => {
      newSubtitles = [
        ...state.subtitles.map(s => ({ ...s, isActive: false })),
        newEntry,
      ];
      // 逐条持久化，刷新/重新进入后不丢失
      saveSubtitlesToStorage(newSubtitles);
      return {
        subtitles: newSubtitles,
        currentSubtitle: '',
      };
    });

    get().addSessionRecord({
      type: 'voice',
      sourceText: original,
      targetText: translated,
      sourceLang,
      targetLang,
      // 置信度与时长同步进入会话记录
      metadata: metadata
        ? {
            confidence: metadata.confidence,
            durationMs: metadata.durationMs,
          }
        : undefined,
    });

    return newEntry.id;
  },

  setCurrentSubtitle: (text: string) => {
    set({ currentSubtitle: text });
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

  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },

  addSessionRecord: (record) => {
    set(state => {
      const newRecord: SessionRecord = {
        id: generateId(),
        timestamp: new Date(),
        ...record,
      };
      const newRecords = [newRecord, ...state.sessionRecords];
      saveRecordsToStorage(newRecords);
      return { sessionRecords: newRecords };
    });
  },

  deleteSessionRecord: (id: string) => {
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
