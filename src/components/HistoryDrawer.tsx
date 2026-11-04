import React from 'react';
import { FullMatchRecord } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  records: FullMatchRecord[];
  onClose: () => void;
}

/**
 * 記録済みの対戦ログ（全18カラム相当）をスマホ上で確認できる履歴モーダル
 */
export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, records, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-slate-900 border-t sm:border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h2 className="text-sm font-bold text-white">最近の記録履歴 ({records.length}件)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* リスト本体 */}
        <div className="p-3.5 overflow-y-auto space-y-2.5 flex-1">
          {records.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              まだこの端末で記録された履歴がありません。
            </div>
          ) : (
            records.map((rec, idx) => {
              const isWin = rec.result === 'Win';
              return (
                <div
                  key={`${rec.match_id}-${idx}`}
                  className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                          isWin
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {rec.result}
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        #{rec.match_id} vs {rec.opp_deck}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {rec.date} {rec.time}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                      {rec.my_rank} / {rec.my_deck}
                    </span>
                    {rec.my_deck_url && (
                      <a
                        href={rec.my_deck_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold hover:bg-sky-500/30"
                      >
                        🔗 ニューロンDB
                      </a>
                    )}
                    {rec.coin && (
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        rec.coin === '表'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        🪙 コイン{rec.coin}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                      {rec.turn}
                      {rec.coin === '裏' && rec.turn === '先攻' && ' (先攻渡し)'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                      {rec.play_decision}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      初動:{rec.has_starter} / {rec.counter_action}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">
                      主因:{rec.game_factor}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      ストレスLv.{rec.stress_level}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-900/70 rounded-lg p-2 border border-slate-800/80">
                    <div>
                      <span className="text-rose-400 font-semibold">被弾: </span>
                      <span className="text-slate-300">{rec.opp_interactions.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-semibold">自軍: </span>
                      <span className="text-slate-300">{rec.my_interactions.join(', ')}</span>
                    </div>
                  </div>

                  {rec.my_deck_recipe && (
                    <details className="rounded-lg bg-slate-900/70 border border-slate-800 px-2.5 py-1.5 text-[10px] text-slate-300">
                      <summary className="cursor-pointer font-bold text-emerald-300">
                        🃏 採用カードリスト（タップで展開）
                      </summary>
                      <div className="mt-1 font-mono text-slate-400 break-all leading-relaxed">
                        {rec.my_deck_recipe}
                      </div>
                    </details>
                  )}

                  {rec.memo && (
                    <div className="text-[11px] text-slate-300 bg-slate-900/50 px-2.5 py-1.5 rounded-lg">
                      📝 {rec.memo}
                    </div>
                  )}

                  {rec.ai_comment && (
                    <div className="text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                      🤖 {rec.ai_comment}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
