// 生成唯一ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 格式化时间
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 延迟函数
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 模拟翻译API
export const mockTranslate = async (
  text: string,
  _sourceLang: string,
  _targetLang: string
): Promise<string> => {
  await delay(800 + Math.random() * 500);
  
  // 简单的模拟翻译逻辑
  const translations: Record<string, string> = {
    '你好': 'Hello',
    '世界': 'World',
    '翻译': 'Translation',
    '测试': 'Test',
    '系统': 'System',
  };
  
  let result = text;
  Object.entries(translations).forEach(([cn, en]) => {
    result = result.replace(new RegExp(cn, 'g'), en);
  });
  
  // 如果没有匹配，返回带标记的文本
  if (result === text) {
    result = `[Translated] ${text}`;
  }
  
  return result;
};

// 截断文本
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// 获取语言显示名称
export const getLanguageDisplayName = (
  code: string,
  languages: { code: string; nativeName: string }[]
): string => {
  const lang = languages.find(l => l.code === code);
  return lang?.nativeName || code;
};

// 格式化识别置信度。未带出时保留 null，由界面显示明确提示。
export const formatConfidence = (confidence: number | null | undefined): string | null => {
  if (confidence === null || confidence === undefined || !Number.isFinite(confidence)) {
    return null;
  }
  return `${Math.round(Math.min(1, Math.max(0, confidence)) * 100)}%`;
};

// 格式化语音段时长。未带出时保留 null，由界面显示明确提示。
export const formatDuration = (durationMs: number | null | undefined): string | null => {
  if (durationMs === null || durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)} 毫秒`;
  }

  return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 1 : 0)} 秒`;
};
