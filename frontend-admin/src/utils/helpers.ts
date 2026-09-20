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

// 识别置信度缺失时的统一提示
export const CONFIDENCE_UNAVAILABLE_TEXT = '置信度未提供';
// 语音时长缺失时的统一提示
export const DURATION_UNAVAILABLE_TEXT = '时长未提供';
// 手动翻译等不涉及语音识别的场景
export const METADATA_NOT_APPLICABLE_TEXT = '不适用';

// 格式化识别置信度：未带出时返回明确提示而非空白
export const formatConfidence = (confidence?: number): string => {
  if (confidence === undefined || confidence === null || Number.isNaN(confidence)) {
    return CONFIDENCE_UNAVAILABLE_TEXT;
  }
  return `${Math.round(confidence * 100)}%`;
};

// 格式化语音时长（毫秒）：未带出时返回明确提示而非空白
export const formatDuration = (durationMs?: number): string => {
  if (durationMs === undefined || durationMs === null || Number.isNaN(durationMs)) {
    return DURATION_UNAVAILABLE_TEXT;
  }
  const totalSeconds = durationMs / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)} 秒`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes} 分 ${seconds.toString().padStart(2, '0')} 秒`;
};

// 判断置信度是否有效
export const hasConfidence = (confidence?: number): boolean =>
  confidence !== undefined && confidence !== null && !Number.isNaN(confidence);

// 判断时长是否有效
export const hasDuration = (durationMs?: number): boolean =>
  durationMs !== undefined && durationMs !== null && !Number.isNaN(durationMs);

// 净化播报文本：去掉本地演示翻译添加的前缀标记，让重听更自然
export const stripTranslationPrefix = (text: string): string => {
  return text
    .replace(/^\[待翻译\]\s*/, '')
    .replace(/^\[Translated\]\s*/, '')
    .trim();
};
