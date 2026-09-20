// 语言类型
export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// 语音识别元数据。识别结果未返回时使用 null，界面必须显示明确提示。
export interface SpeechMetadata {
  confidence: number | null;
  durationMs: number | null;
}

// 字幕条目
export interface SubtitleEntry {
  id: string;
  originalText: string;
  translatedText: string;
  timestamp: Date;
  confidence: number | null;
  durationMs: number | null;
  sourceLang?: string;
  targetLang?: string;
}

// 翻译结果
export interface TranslationResult {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: Date;
}

// 音频设置
export interface AudioSettings {
  volume: number;
  speed: number;
  ttsEnabled: boolean;
}

// 控制面板状态
export interface ControlPanelState {
  sourceLang: string;
  targetLang: string;
  isMicOn: boolean;
  isRecording: boolean;
  audioSettings: AudioSettings;
}

// Toast 类型
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// 会话记录类型
export type SessionRecordType = 'voice' | 'manual';

// 会话记录条目
export interface SessionRecord {
  id: string;
  type: SessionRecordType;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: Date;
  metadata?: {
    confidence?: number | null;
    durationMs?: number | null;
  };
}

// 应用状态
export interface AppState {
  // 控制面板
  sourceLang: string;
  targetLang: string;
  isMicOn: boolean;
  isRecording: boolean;
  audioSettings: AudioSettings;

  // 字幕
  subtitles: SubtitleEntry[];
  currentSubtitle: string;
  activeSubtitleId: string | null;

  // 翻译
  inputText: string;
  translationHistory: TranslationResult[];
  isTranslating: boolean;

  // Toast
  toasts: Toast[];

  // 会话记录
  sessionRecords: SessionRecord[];

  // Actions
  setSourceLang: (lang: string) => void;
  setTargetLang: (lang: string) => void;
  toggleMic: () => void;
  setAudioSettings: (settings: Partial<AudioSettings>) => void;
  addSubtitle: (
    original: string,
    translated: string,
    metadata?: Partial<SpeechMetadata>,
  ) => string;
  setCurrentSubtitle: (text: string) => void;
  setActiveSubtitle: (id: string | null) => void;
  setInputText: (text: string) => void;
  translate: () => Promise<void>;
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
  addSessionRecord: (
    record: Omit<SessionRecord, 'id' | 'timestamp'> & { id?: string },
  ) => void;
  deleteSessionRecord: (id: string) => void;
  clearSessionRecords: () => void;
}
