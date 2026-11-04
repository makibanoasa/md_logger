import React from 'react';
import { PostApiResponse } from '../types';

interface FeedbackModalProps {
  response: PostApiResponse | null;
  isMock: boolean;
  onClose: () => void;
}

/**
 * 送信後のAI伴走フィードバック＆ストッパー警告モーダル
 * SPEC.md 4.4節の要件に厳密準拠:
 * - aiComment をカード形式で大きく表示
 * - updatedStatus.isStopperTriggered === true の場合は赤/黄色の警告デザインに切り替え、
 *   stopperAlerts のメッセージを強調表示して休憩を促す
 */
export const FeedbackModal: React.FC<FeedbackModalProps> = ({ response, isMock, onClose }) => {
  if (!response) return null;

  const { recordedMatchNo, aiComment, updatedStatus } = response;
  const isStopper = updatedStatus.isStopperTriggered;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl border-2 shadow-2xl overflow-hidden transition-all ${
          isStopper
            ? 'bg-gradient-to-b from-rose-950 via-slate-950 to-amber-950 border-rose-500 shadow-rose-950/80'
            : 'bg-slate-900 border-emerald-500/60 shadow-emerald-950/50'
        }`}
      >
        {/* ヘッダー */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between ${
            isStopper
              ? 'bg-rose-900/60 border-rose-500/60'
              : 'bg-emerald-950/60 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{isStopper ? '🚨' : '✨'}</span>
            <div>
              <h2 className="text-sm font-extrabold text-white">
                {isStopper
                  ? '【重要】ストッパー警告発動！'
                  : `Match #${recordedMatchNo} 記録完了`}
              </h2>
              <p className="text-[11px] text-slate-300">
                {isMock ? 'プレビュー記録 (ローカル保存済み)' : 'Googleスプレッドシート記録完了'}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-950/70 text-amber-300 border border-amber-500/40">
            本日 {updatedStatus.todayWins}勝{updatedStatus.todayLosses}敗 (
            {updatedStatus.todayWinRate.toFixed(1)}%)
          </span>
        </div>

        {/* 本文エリア */}
        <div className="p-4 space-y-4">
          {/* ストッパー警告発動時の赤/黄色強調ブロック */}
          {isStopper && (
            <div className="rounded-xl bg-gradient-to-r from-rose-900/80 to-amber-900/80 border-2 border-amber-400 p-3.5 shadow-lg space-y-2">
              <div className="flex items-center gap-1.5 text-amber-300 font-extrabold text-xs">
                <span>🛑</span>
                <span>連敗・高負荷ストッパー作動中（休憩推奨）</span>
              </div>
              {updatedStatus.stopperAlerts.length > 0 ? (
                <ul className="space-y-1.5 text-xs font-bold text-white leading-relaxed">
                  {updatedStatus.stopperAlerts.map((alert, idx) => (
                    <li key={idx} className="bg-black/35 rounded-lg p-2 border border-rose-400/40">
                      {alert}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs font-bold text-white leading-relaxed">
                  連敗または高ストレス状態が検知されました。マスター1到達のためには、ここで一度画面を閉じて15分ほど休憩するのが最も効果的です！
                </p>
              )}
            </div>
          )}

          {/* AI伴走コメントカード（大きく表示） */}
          <div className="rounded-2xl bg-slate-950/90 border border-slate-700/90 p-4 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                🤖 Gemini 2.5 Flash 伴走フィードバック
              </span>
            </div>
            <p className="text-base font-bold text-slate-100 leading-relaxed tracking-wide">
              「{aiComment}」
            </p>
          </div>

          {/* 更新後のミニスタッツ */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2">
              <div className="text-[10px] text-slate-400">通算試合No</div>
              <div className="text-sm font-black text-white">#{recordedMatchNo}</div>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2">
              <div className="text-[10px] text-slate-400">M1まで勝ち越し</div>
              <div className="text-sm font-black text-amber-400">
                残り {updatedStatus.remainingNetWins}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2">
              <div className="text-[10px] text-slate-400">現在ランク</div>
              <div className="text-xs font-black text-cyan-400 mt-0.5">
                {updatedStatus.lastRank}
              </div>
            </div>
          </div>

          {/* 閉じる（次戦へ）ボタン */}
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm shadow-lg transition active:scale-98 ${
              isStopper
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950'
            }`}
          >
            {isStopper ? '確認して小休止する ☕' : '次戦の入力へ進む ▶'}
          </button>
        </div>
      </div>
    </div>
  );
};
