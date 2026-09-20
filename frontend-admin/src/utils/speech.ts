import { useAppStore } from '@/store/useAppStore';

// 播报开始的超时时间（部分浏览器在音频被占用时 onstart 可能迟迟不触发）
const START_TIMEOUT_MS = 3000;
// 播报整体超时上限（按文本长度自适应，防止 onend 丢失导致状态一直挂起）
const MIN_END_TIMEOUT_MS = 8000;
const MAX_END_TIMEOUT_MS = 30000;
const MS_PER_CHAR = 180;

export interface SpeakCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

interface SpeakOptions {
  // 手动重听时应忽略“自动播放字幕翻译”开关
  force?: boolean;
}

interface ActiveSession {
  token: number;
  startTimer: ReturnType<typeof setTimeout> | null;
  endTimer: ReturnType<typeof setTimeout> | null;
  pumper: ReturnType<typeof setInterval> | null;
}

let activeSession: ActiveSession | null = null;
let tokenSeed = 0;

export const isSpeechSynthesisSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

const clearSessionTimers = (session: ActiveSession) => {
  if (session.startTimer) clearTimeout(session.startTimer);
  if (session.endTimer) clearTimeout(session.endTimer);
  if (session.pumper) clearInterval(session.pumper);
};

// 停止当前播报。若存在正在进行的播报，会通过旧会话的 token 失效来“打断”它，
// 被打断属于用户主动触发，不弹超时说明。
export const stopSpeaking = (): void => {
  if (!isSpeechSynthesisSupported()) return;
  if (activeSession) {
    const session = activeSession;
    activeSession = null;
    clearSessionTimers(session);
    try {
      window.speechSynthesis.cancel();
    } catch {
      // 忽略 cancel 异常
    }
  }
};

// 播报一段文本。再次调用会先打断上一条播报。
export const speak = (
  text: string,
  lang: string,
  callbacks: SpeakCallbacks = {},
  options: SpeakOptions = {}
): void => {
  // 再次触发：先打断上一条播报（不触发上一条的任何回调/提示）
  stopSpeaking();

  if (!isSpeechSynthesisSupported()) {
    callbacks.onError?.('当前浏览器不支持语音播报，无法重听');
    return;
  }

  const settings = useAppStore.getState().audioSettings;
  if (!options.force && !settings.ttsEnabled) {
    // 自动播报被设置关闭时静默返回，不属于异常
    callbacks.onEnd?.();
    return;
  }

  if (!text.trim()) {
    callbacks.onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;
  const token = ++tokenSeed;
  const session: ActiveSession = {
    token,
    startTimer: null,
    endTimer: null,
    pumper: null,
  };
  activeSession = session;

  const utterance = new SpeechSynthesisUtterance(text);

  // 选择匹配目标语言的语音
  const voices = synth.getVoices();
  const langPrefix = lang.split('-')[0];
  const voice =
    voices.find(v => v.lang === lang) ||
    voices.find(v => v.lang.startsWith(langPrefix)) ||
    voices[0];
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = lang;
  }

  utterance.volume = Math.min(1, Math.max(0, settings.volume / 100));
  utterance.rate = settings.speed;

  let started = false;

  const finish = (reason: 'end' | 'error' | 'start-timeout' | 'end-timeout', message?: string) => {
    // 已被新播报打断或被停止：直接忽略
    if (activeSession !== session) return;
    activeSession = null;
    clearSessionTimers(session);
    try {
      synth.cancel();
    } catch {
      // 忽略
    }

    if (reason === 'end') {
      callbacks.onEnd?.();
    } else if (reason === 'error') {
      callbacks.onError?.(message || '播报失败，请稍后重试');
    } else if (reason === 'start-timeout') {
      callbacks.onError?.('播报启动超时：浏览器语音引擎未响应，请重试或检查系统音频状态');
    } else {
      callbacks.onError?.('播报超时：该段语音未能在限定时间内播放完成，已自动停止，可再次点击重听');
    }
  };

  utterance.onstart = () => {
    if (activeSession !== session) return;
    started = true;
    if (session.startTimer) {
      clearTimeout(session.startTimer);
      session.startTimer = null;
    }

    // Chrome 长文本暂停 bug 的兜底：定期 resume
    session.pumper = setInterval(() => {
      if (activeSession !== session) return;
      try {
        if (synth.paused) synth.resume();
      } catch {
        // 忽略
      }
    }, 5000);

    // 整体播报超时（onend 在某些环境下可能不触发）
    const endTimeout = Math.min(
      MAX_END_TIMEOUT_MS,
      Math.max(MIN_END_TIMEOUT_MS, text.length * MS_PER_CHAR / Math.max(settings.speed, 0.5))
    );
    session.endTimer = setTimeout(() => {
      finish('end-timeout');
    }, endTimeout);

    callbacks.onStart?.();
  };

  utterance.onend = () => {
    if (activeSession !== session) return;
    if (session.pumper) {
      clearInterval(session.pumper);
      session.pumper = null;
    }
    finish('end');
  };

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    if (activeSession !== session) return;
    // 用户打断（cancel）会产生 canceled/interrupted 错误，不提示
    if (event.error === 'canceled' || event.error === 'interrupted') {
      activeSession = null;
      clearSessionTimers(session);
      return;
    }
    const messageMap: Record<string, string> = {
      'not-allowed': '播报被浏览器阻止，请检查麦克风/音频播放权限后重试',
      'audio-busy': '音频设备正被占用，暂时无法播报',
      network: '语音服务网络异常，播报失败',
      'synthesis-unavailable': '语音合成服务当前不可用',
      'language-unavailable': '缺少目标语言的语音包，无法播报',
    };
    finish('error', messageMap[event.error] || `播报失败（${event.error || '未知错误'}），请重试`);
  };

  // 启动超时：onstart 未在限定时间内触发
  session.startTimer = setTimeout(() => {
    if (!started) {
      finish('start-timeout');
    }
  }, START_TIMEOUT_MS);

  try {
    synth.speak(utterance);
  } catch {
    finish('error', '无法启动语音播报，请重试');
  }
};
