import React from 'react';
import { CurrentStatus } from '../types';

interface StatusHeaderProps {
  status: CurrentStatus;
  myRank: string;
  myDeck: string;
  isMockMode: boolean;
  isLoading: boolean;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onRefresh: () => void;
}

/**
 * 画面最上部固定のヘッダー＆ミニステータスバー
 * SPEC.md 4.1節および4.4節の警告デザイン要件に対応
 */
export const StatusHeader: React.FC<StatusHeaderProps> = ({
  status,
  myRank,
  myDeck,
  isMockMode,
  isLoading,
  onOpenSettings,
  onOpenHistory,
  onRefresh,
}) => {
  const isDanger = status.isStopperTriggered;
  const isWarning =
    !isDanger &&
    (status.dashboardAlert.includes('🟡') ||
      status.dashboardAlert.includes('警戒') ||
      status.currentLoseStreak >= 2);

  // ダッシュボードアラートバーの配色（赤/黄/緑）
  const alertBarClass = isDanger
    ? 'bg-gradient-to-r from-rose-950 via-red-900/90 to-amber-950 border-rose-500 text-rose-100 animate-pulse'
    : isWarning
    ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
    : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200';

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/92 border-b border-slate-800 shadow-lg">
      <div className="max-w-md mx-auto px-3 pt-2.5 pb-2">
        {/* 最上段: アプリタイトル ＆ アクションボタン群 */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-sm shrink-0">
              M1
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-white truncate">
                  MD マスター1到達管理
                </h1>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                    isMockMode
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {isMockMode ? 'プレビュー(内蔵DB)' : 'GAS連携中'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 履歴ボタン */}
            <button
              type="button"
              onClick={onOpenHistory}
              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 font-medium flex items-center gap-1 active:scale-95 transition"
              title="記録履歴を表示"
            >
              <span>📋</span>
              <span className="hidden xs:inline">履歴</span>
            </button>

            {/* 再読込ボタン */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 active:scale-95 transition disabled:opacity-50"
              title="マスタ＆戦績を再取得"
            >
              <span className={isLoading ? 'inline-block animate-spin' : ''}>🔄</span>
            </button>

            {/* ⚙️ API URL設定ボタン (SPEC.md 4.1 必須要件) */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-amber-300 flex items-center gap-1 active:scale-95 transition shadow-sm"
              aria-label="API URL設定を開く"
            >
              <span>⚙️</span>
              <span>API設定</span>
            </button>
          </div>
        </div>

        {/* ミニステータスバー（本日の戦績 / M1まで残り勝ち越し数 / 現在ランク・使用デッキ） */}
        <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
          {/* 本日の戦績 */}
          <div className="rounded-xl bg-slate-900/95 border border-slate-800 px-2 py-1.5">
            <div className="text-[10px] text-slate-400 font-medium">
              本日 {status.todayMatches}戦 ({status.todayWins}勝{status.todayLosses}敗)
            </div>
            <div className="text-xs font-extrabold text-white mt-0.5 flex items-center justify-center gap-1">
              <span>勝率</span>
              <span
                className={
                  status.todayWinRate >= 55
                    ? 'text-emerald-400'
                    : status.todayWinRate < 45
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }
              >
                {status.todayWinRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* M1まで残り勝ち越し数 */}
          <div className="rounded-xl bg-slate-900/95 border border-slate-800 px-2 py-1.5">
            <div className="text-[10px] text-slate-400 font-medium">M1まで勝ち越し</div>
            <div className="text-xs font-extrabold text-amber-400 mt-0.5">
              残り <span className="text-sm">{status.remainingNetWins}</span>
            </div>
          </div>

          {/* 現在ランク・使用デッキ */}
          <div className="rounded-xl bg-slate-900/95 border border-slate-800 px-2 py-1.5 truncate">
            <div className="text-[10px] text-cyan-400 font-bold truncate">{myRank}</div>
            <div className="text-[11px] font-bold text-slate-200 truncate mt-0.5">{myDeck}</div>
          </div>
        </div>

        {/* ダッシュボードアラート ＆ ストッパー警告バナー */}
        <div className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-bold ${alertBarClass}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{status.dashboardAlert}</span>
            {status.currentLoseStreak > 0 && (
              <span className="shrink-0 px-1.5 py-0.2 rounded bg-rose-950/90 border border-rose-500/50 text-rose-300 text-[10px]">
                {status.currentLoseStreak}連敗中
              </span>
            )}
          </div>
          {status.isStopperTriggered && status.stopperAlerts.length > 0 && (
            <div className="mt-1 pt-1 border-t border-rose-400/40 text-xs text-amber-200 space-y-0.5">
              {status.stopperAlerts.map((alert, i) => (
                <div key={i}>{alert}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
