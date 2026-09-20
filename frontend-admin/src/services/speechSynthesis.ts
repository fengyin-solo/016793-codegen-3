import type { AudioSettings, ToastType } from '@/types';

interface SpeakOptions {
  id?: string;
  lang?: string;
  force?: boolean;
  showInterruptedToast?: boolean;
}

interface SpeakResult {
  status: 'started' | 'empty' | 'unsupported' | 'disabled' | 'start-timeout';
  id?: string;
}

const START_TIMEOUT_MS = 4_000;
const PLAYBACK_TIMEOUT_BUFFER_MS = 3_000;
const PLAYBACK_INACTIVITY_TIMEOUT_MS = 20_000;
const MIN_PLAYBACK_TIMEOUT_MS = 6_000;
const MAX_PLAYBACK_TIMEOUT_MS = 120_000;

type StoreLike = {
  getState: () => {
    audioSettings: AudioSettings;
    targetLang: string;
    setActiveSubtitle: (id: string | null) => void;
    addToast: (type: ToastType, message: string) => void;
  };
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

class SpeechSynthesisService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private requestId = 0;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private playbackTimer: ReturnType<typeof setTimeout> | null = null;
  private store: StoreLike | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
    }
  }

  setStore(store: StoreLike) {
    this.store = store;
  }

  get isSupported() {
    return this.synth !== null;
  }

  private getVoice(lang: string): SpeechSynthesisVoice | null {
    if (!this.synth) return null;

    const voices = this.synth.getVoices();
    return (
      voices.find(voice => voice.lang === lang) ||
      voices.find(voice => voice.lang.startsWith(lang.split('-')[0])) ||
      voices.find(voice => voice.default) ||
      voices[0] ||
      null
    );
  }

  private clearTimers() {
    if (this.startTimer) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  private setActiveSubtitle(id: string | null) {
    this.store?.getState().setActiveSubtitle(id);
  }

  private addToast(type: ToastType, message: string) {
    this.store?.getState().addToast(type, message);
  }

  speak(text: string, options: SpeakOptions = {}): SpeakResult {
    const { id, lang, force = false, showInterruptedToast = false } = options;

    if (!this.synth) return { status: 'unsupported' };
    if (!text.trim()) return { status: 'empty' };

    const state = this.store?.getState();
    if (!state) return { status: 'disabled' };
    if (!force && !state.audioSettings.ttsEnabled) return { status: 'disabled' };

    const hadActivePlayback = this.currentUtterance !== null;
    const requestId = ++this.requestId;

    // 取消正在进行的播报，后触发的播放会立即接管。
    this.synth.cancel();
    this.clearTimers();

    if (hadActivePlayback && showInterruptedToast) {
      this.addToast('info', '已切换到新的语音播报，上一条被中断');
    }

    const targetLang = lang || state.targetLang;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getVoice(targetLang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = targetLang;
    }

    utterance.volume = Math.min(1, Math.max(0, state.audioSettings.volume / 100));
    utterance.rate = state.audioSettings.speed;
    utterance.pitch = 1;
    this.currentUtterance = utterance;
    this.setActiveSubtitle(id ?? null);

    const finish = (timedOut = false) => {
      if (requestId !== this.requestId) return;

      this.clearTimers();
      this.currentUtterance = null;
      this.setActiveSubtitle(null);

      if (timedOut) {
        this.synth?.cancel();
        this.addToast('warning', '语音播报超时，已停止本次播放');
      }
    };

    const resetPlaybackTimeout = () => {
      if (requestId !== this.requestId || this.currentUtterance !== utterance) return;

      if (this.playbackTimer) {
        clearTimeout(this.playbackTimer);
      }

      // 播放过程中按停顿重置，避免长文本被误判为超时。
      this.playbackTimer = setTimeout(() => finish(true), PLAYBACK_INACTIVITY_TIMEOUT_MS);
    };

    utterance.onstart = () => {
      if (requestId !== this.requestId || this.currentUtterance !== utterance) return;

      if (this.startTimer) {
        clearTimeout(this.startTimer);
        this.startTimer = null;
      }

      const durationByLength = Math.ceil((text.trim().length / 8) * 1_000);
      const configuredDuration = 6_000 / Math.max(0.5, state.audioSettings.speed);
      const estimatedDuration = Math.max(durationByLength, configuredDuration);
      const timeout = Math.min(
        MAX_PLAYBACK_TIMEOUT_MS,
        Math.max(
          MIN_PLAYBACK_TIMEOUT_MS,
          PLAYBACK_INACTIVITY_TIMEOUT_MS,
          estimatedDuration + PLAYBACK_TIMEOUT_BUFFER_MS,
        ),
      );

      this.playbackTimer = setTimeout(() => finish(true), timeout);
    };

    utterance.onboundary = resetPlaybackTimeout;

    utterance.onend = () => finish(false);

    utterance.onerror = event => {
      const requestChanged = requestId !== this.requestId;
      finish(false);

      // cancel 会在新播报抢占旧播报时触发，不应把正常中断误报为错误。
      if (!requestChanged && event.error !== 'canceled' && event.error !== 'interrupted') {
        this.addToast('error', `语音播报失败：${event.error || '未知错误'}`);
      }
    };

    this.startTimer = setTimeout(() => {
      if (requestId !== this.requestId || this.currentUtterance !== utterance) return;
      finish(true);
    }, START_TIMEOUT_MS);

    this.synth.speak(utterance);

    return { status: 'started', id };
  }

  stop() {
    this.requestId += 1;
    this.clearTimers();
    this.currentUtterance = null;
    this.setActiveSubtitle(null);
    this.synth?.cancel();
  }
}

export const speechSynthesisService = new SpeechSynthesisService();
export { isFiniteNumber };
