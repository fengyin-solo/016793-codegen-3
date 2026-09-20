import React from 'react';
import { Activity, Clock3, RotateCw, Volume2 } from 'lucide-react';
import type { SubtitleEntry } from '@/types';
import { formatDuration, formatTime, formatConfidence } from '@/utils/helpers';
import { speechSynthesisService } from '@/services/speechSynthesis';
import { useAppStore } from '@/store/useAppStore';

interface SubtitleItemProps {
  subtitle: SubtitleEntry;
}

const notAvailableText = '未带出';

export const SubtitleItem: React.FC<SubtitleItemProps> = ({ subtitle }) => {
  const activeSubtitleId = useAppStore(state => state.activeSubtitleId);
  const isPlaying = activeSubtitleId === subtitle.id;
  const confidenceText = formatConfidence(subtitle.confidence);
  const durationText = formatDuration(subtitle.durationMs);

  const handleReplay = () => {
    speechSynthesisService.speak(subtitle.translatedText, {
      id: subtitle.id,
      lang: subtitle.targetLang,
      force: true,
      showInterruptedToast: true,
    });
  };

  return (
    <article
      className={`glass-card p-4 transition-all duration-300 animate-slide-up ${
        isPlaying ? 'subtitle-highlight' : ''
      }`}
      aria-current={isPlaying ? 'true' : undefined}
    >
      <div className="flex items-start gap-3">
        {/* 时间戳 */}
        <div className="flex-shrink-0 text-xs text-dark-500 font-mono pt-1">
          {formatTime(subtitle.timestamp)}
        </div>

        {/* 字幕内容 */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* 原文 */}
          <p
            className={`text-lg leading-relaxed break-words ${
              isPlaying ? 'text-dark-50 font-medium' : 'text-dark-200'
            }`}
          >
            {subtitle.originalText}
          </p>

          {/* 译文 */}
          <p
            className={`text-base leading-relaxed break-words ${
              isPlaying ? 'text-primary-400' : 'text-dark-400'
            }`}
          >
            {subtitle.translatedText}
          </p>

          {/* 识别信息：逐条展示；未返回时显示明确占位提示 */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-dark-400"
              title="识别置信度"
            >
              <Activity className="w-3 h-3" />
              置信度：{confidenceText || notAvailableText}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-dark-400"
              title="本段语音时长"
            >
              <Clock3 className="w-3 h-3" />
              时长：{durationText || notAvailableText}
            </span>
          </div>
        </div>

        {/* 播报控制与活跃指示器 */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {isPlaying && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-400"
              data-testid="subtitle-active-indicator"
            >
              <Volume2 className="w-3 h-3" />
              正在播报
            </span>
          )}
          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-primary-500/15 text-primary-300 hover:bg-primary-500/25 transition-colors"
            aria-label={isPlaying ? `重新播报第 ${formatTime(subtitle.timestamp)} 条字幕并中断当前播报` : `播报第 ${formatTime(subtitle.timestamp)} 条字幕`}
            title={isPlaying ? '重新播报（将中断当前播报）' : '重听本条译文'}
          >
            <RotateCw className="w-3.5 h-3.5" />
            {isPlaying ? '重新播报' : '重听'}
          </button>
        </div>
      </div>
    </article>
  );
};
