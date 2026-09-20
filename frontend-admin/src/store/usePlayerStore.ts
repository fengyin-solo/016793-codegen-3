import { create } from 'zustand';
import { useAppStore } from './useAppStore';
import { speak, stopSpeaking, isSpeechSynthesisSupported } from '@/utils/speech';
import { stripTranslationPrefix } from '@/utils/helpers';

// 测试播报的固定 ID（不属于任何字幕条目）
export const TEST_SPEAK_ID = '__test_speak__';

interface PlayerState {
  // 正在播报的字幕 id；测试播报时为 TEST_SPEAK_ID；空闲为 null
  playingId: string | null;
  // 播报是否已经实际开始（用于区分“排队中/启动中”与“播放中”）
  isSpeaking: boolean;

  // 重听某条字幕（忽略自动播报开关，再次调用会打断上一条）
  replaySubtitle: (entry: {
    id: string;
    translatedText: string;
    targetLang: string;
  }) => void;
  // 识别完成后的自动播报（受“自动播放字幕翻译”开关控制）
  autoPlaySubtitle: (entry: {
    id: string;
    translatedText: string;
    targetLang: string;
  }) => void;
  // 控制面板的测试播报
  testSpeak: (text: string, lang: string) => void;
  // 停止当前播报
  stop: () => void;
  isSupported: () => boolean;
}

const runSpeak = (
  playingId: string,
  text: string,
  lang: string,
  force: boolean,
  set: (partial: Partial<PlayerState>) => void
) => {
  // 标记为启动中（playingId 立即切换，保证指示器与高亮第一时间跟随新条目）
  set({ playingId, isSpeaking: false });

  speak(
    text,
    lang,
    {
      onStart: () => set({ isSpeaking: true }),
      onEnd: () => set({ playingId: null, isSpeaking: false }),
      onError: message => {
        set({ playingId: null, isSpeaking: false });
        useAppStore.getState().addToast('warning', message);
      },
    },
    { force }
  );
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  playingId: null,
  isSpeaking: false,

  replaySubtitle: entry => {
    // 再次点击正在播报的同一条：停止（与点击其他条目形成的“打断”语义一致）
    if (get().playingId === entry.id) {
      get().stop();
      return;
    }
    runSpeak(entry.id, stripTranslationPrefix(entry.translatedText), entry.targetLang, true, set);
  },

  autoPlaySubtitle: entry => {
    runSpeak(entry.id, stripTranslationPrefix(entry.translatedText), entry.targetLang, false, set);
  },

  testSpeak: (text, lang) => {
    if (get().playingId === TEST_SPEAK_ID) {
      get().stop();
      return;
    }
    runSpeak(TEST_SPEAK_ID, text, lang, true, set);
  },

  stop: () => {
    stopSpeaking();
    set({ playingId: null, isSpeaking: false });
  },

  isSupported: () => isSpeechSynthesisSupported(),
}));
