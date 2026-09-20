import React from 'react';
import { BadgeCheck, Timer } from 'lucide-react';
import {
  formatConfidence,
  formatDuration,
  hasConfidence,
  hasDuration,
  METADATA_NOT_APPLICABLE_TEXT,
} from '@/utils/helpers';

interface ConfidenceDurationProps {
  confidence?: number;
  durationMs?: number;
  // 手动翻译等不涉及语音识别的场景，统一显示“不适用”
  notApplicable?: boolean;
  size?: 'sm' | 'md';
}

// 置信度配色：高置信绿色、中等黄色、偏低红色
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.85) return 'text-accent-green';
  if (confidence >= 0.6) return 'text-accent-yellow';
  return 'text-accent-red';
};

// 逐条展示识别置信度与本段语音时长；结果未带出时以明确提示替代空白
export const ConfidenceDuration: React.FC<ConfidenceDurationProps> = ({
  confidence,
  durationMs,
  notApplicable = false,
  size = 'sm',
}) => {
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const mutedColor = 'text-dark-500';
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (notApplicable) {
    return (
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${textSize} ${mutedColor}`}>
        <span className="inline-flex items-center gap-1.5">
          <BadgeCheck className={iconClass} />
          置信度：{METADATA_NOT_APPLICABLE_TEXT}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Timer className={iconClass} />
          时长：{METADATA_NOT_APPLICABLE_TEXT}
        </span>
      </div>
    );
  }

  const confidenceOk = hasConfidence(confidence);
  const durationOk = hasDuration(durationMs);

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${textSize}`}>
      <span
        className={`inline-flex items-center gap-1.5 ${
          confidenceOk ? getConfidenceColor(confidence as number) : 'text-dark-500 italic'
        }`}
        title={confidenceOk ? '语音识别置信度' : '识别结果未提供置信度'}
      >
        <BadgeCheck className={iconClass} />
        置信度：{formatConfidence(confidence)}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 ${
          durationOk ? 'text-dark-300' : 'text-dark-500 italic'
        }`}
        title={durationOk ? '本段语音时长' : '识别结果未提供语音时长'}
      >
        <Timer className={iconClass} />
        时长：{formatDuration(durationMs)}
      </span>
    </div>
  );
};
