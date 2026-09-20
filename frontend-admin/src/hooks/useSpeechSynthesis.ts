import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { speechSynthesisService } from '@/services/speechSynthesis';

export const useSpeechSynthesis = () => {
  // 朗读指定文本；force=true 时不受“自动播放字幕翻译”开关限制。
  const speak = useCallback((text: string, lang?: string) => {
    return speechSynthesisService.speak(text, {
      lang,
      showInterruptedToast: true,
    });
  }, []);

  const stop = useCallback(() => {
    speechSynthesisService.stop();
  }, []);

  // 测试朗读：即使自动播放关闭，也允许用户手动试听。
  const testSpeak = useCallback(() => {
    const currentTargetLang = useAppStore.getState().targetLang;
    const testText = currentTargetLang.startsWith('zh')
      ? '语音播报测试成功'
      : 'Voice broadcast test successful';

    speechSynthesisService.speak(testText, {
      lang: currentTargetLang,
      force: true,
      showInterruptedToast: true,
    });
  }, []);

  return {
    speak,
    stop,
    testSpeak,
    isSupported: speechSynthesisService.isSupported,
  };
};
