import React from 'react';
import { Activity, Clock3 } from 'lucide-react';
import type { SessionRecord } from '@/types';
import { formatConfidence, formatDuration } from '@/utils/helpers';

interface SpeechMetadataProps {
  record: SessionRecord;
  compact?: boolean;
}

export const SpeechMetadata: React.FC<SpeechMetadataProps> = ({ record, compact = false }) => {
  const confidenceText = formatConfidence(record.metadata?.confidence);
  const durationText = formatDuration(record.metadata?.durationMs);
  const missingText = record.type === 'voice' ? '未带出' : '不适用';

  const badgeClass = compact
    ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/5 text-dark-500'
    : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-white/5 text-dark-300';

  const iconClass = compact ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-wrap gap-2'}>
      <span className={badgeClass} title="识别置信度">
        <Activity className={iconClass} />
        <span>置信度：{confidenceText || missingText}</span>
      </span>
      <span className={badgeClass} title="本段语音时长">
        <Clock3 className={iconClass} />
        <span>时长：{durationText || missingText}</span>
      </span>
    </div>
  );
};
