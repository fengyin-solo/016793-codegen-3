import React from 'react';
import { Volume2, Square, Loader } from 'lucide-react';
import type { SubtitleEntry } from '@/types';
import { formatTime } from '@/utils/helpers';
import { usePlayerStore } from '@/store/usePlayerStore';
import { ConfidenceDuration } from '@/components/ui';

interface SubtitleItemProps {
  subtitle: SubtitleEntry;
}

// 根据译文内容推断播报语言（重听时即使切换过语言设置也能选到合适的语音）
const inferLangFromText = (text: string): string =>
  /[一-龥]/.test(text) ? 'zh-CN' : 'en-US';

export const SubtitleItem: React.FC<SubtitleItemProps> = ({ subtitle }) => {
  const playingId = usePlayerStore(state => state.playingId);
  const isSpeaking = usePlayerStore(state => state.isSpeaking);
  const replaySubtitle = usePlayerStore(state => state.replaySubtitle);

  const isPlaying = playingId === subtitle.id;
  // 高亮与指示器使用同一个判定：最新一条 或 正在重听的一条，二者保持一致
  const isHighlighted = subtitle.isActive || isPlaying;

  const handleReplayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    replaySubtitle({
      id: subtitle.id,
      translatedText: subtitle.translatedText,
      targetLang: inferLangFromText(subtitle.translatedText),
    });
  };

  return (
    <div
      className={`
        glass-card p-4 transition-all duration-300 animate-slide-up
        ${isHighlighted ? 'subtitle-highlight' : ''}
      `}
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
            className={`
              text-lg leading-relaxed
              ${isHighlighted ? 'text-dark-50 font-medium' : 'text-dark-200'}
            `}
          >
            {subtitle.originalText}
          </p>

          {/* 译文 */}
          <p
            className={`
              text-base leading-relaxed
              ${isHighlighted ? 'text-primary-400' : 'text-dark-400'}
            `}
          >
            {subtitle.translatedText}
          </p>

          {/* 识别置信度与本段语音时长（逐条列出，缺失时以提示替代空白） */}
          <div className="pt-1">
            <ConfidenceDuration
              confidence={subtitle.confidence}
              durationMs={subtitle.durationMs}
            />
          </div>
        </div>

        {/* 右侧操作区：重听 + 活跃指示器 */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {/* 活跃指示器：与高亮共用同一判定，保证一致 */}
          {isHighlighted && (
            <span
              className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs
                ${isPlaying
                  ? 'bg-accent-green/20 text-accent-green'
                  : 'bg-primary-500/20 text-primary-400'}
              `}
            >
              {isPlaying ? (
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                  播报中
                </span>
              ) : (
                '当前'
              )}
            </span>
          )}

          {/* 逐条重听：再次触发会打断上一条播报 */}
          <button
            onClick={handleReplayClick}
            title={isPlaying ? '停止播报（重听其他条目可互相打断）' : '重听本条译文'}
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200 border
              ${isPlaying
                ? 'bg-accent-red/20 text-accent-red border-accent-red/40 hover:bg-accent-red/30'
                : 'bg-primary-500/10 text-primary-400 border-primary-500/30 hover:bg-primary-500/20'}
            `}
          >
            {isPlaying ? (
              isSpeaking ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  停止
                </>
              ) : (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  启动中
                </>
              )
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                重听
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
