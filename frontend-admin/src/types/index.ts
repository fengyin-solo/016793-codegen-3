// 语言类型
export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// 字幕条目
export interface SubtitleEntry {
  id: string;
  originalText: string;
  translatedText: string;
  timestamp: Date;
  isActive: boolean;
  // 识别置信度（0~1），识别结果未带出时为 undefined
  confidence?: number;
  // 本段语音时长（毫秒），识别结果未带出时为 undefined
  durationMs?: number;
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

// 语音识别的附加信息
export interface SpeechMetadata {
  // 识别置信度（0~1），结果未带出时为 undefined
  confidence?: number;
  // 本段语音时长（毫秒），结果未带出时为 undefined
  durationMs?: number;
}

// 会话记录条目
export interface SessionRecord {
  id: string;
  type: SessionRecordType;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: Date;
  metadata?: SpeechMetadata;
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
    metadata?: SpeechMetadata
  ) => string;
  setCurrentSubtitle: (text: string) => void;
  setInputText: (text: string) => void;
  translate: () => Promise<void>;
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
  addSessionRecord: (record: Omit<SessionRecord, 'id' | 'timestamp'>) => void;
  deleteSessionRecord: (id: string) => void;
  clearSessionRecords: () => void;
}
