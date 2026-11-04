import React, { useState } from 'react';
import { UserProfileConfig, CurrentStatus, FullMatchRecord } from '../types';
import { INITIAL_MOCK_STATUS } from '../mockData';

interface ProfileViewProps {
  profile: UserProfileConfig;
  status: CurrentStatus;
  records: FullMatchRecord[];
  gasUrl: string;
  isMockMode: boolean;
  onSaveProfile: (next: UserProfileConfig) => void;
  onOpenApiModal: () => void;
  onClearAllData: () => void;
}

/**
 * プロフィール＆M1ペースメーカー・ストッパー設定・データ管理画面 (src/components/ProfileView.tsx)
 */
export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  status,
  records,
  gasUrl,
  isMockMode,
  onSaveProfile,
  onOpenApiModal,
  onClearAllData,
}) => {
  const [form, setForm] = useState<UserProfileConfig>(profile);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  // 月末（シーズン終了）までの残り日数と1日あたりの必要勝ち越しペース計算
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, lastDayOfMonth - now.getDate() + 1);
  const currentNetWins =
    records.filter((r) => r.result === 'Win').length -
    records.filter((r) => r.result === 'Lose').length;
  const remainingToGoal = Math.max(0, form.targetNetWins - currentNetWins);
  const dailyPace = (remainingToGoal / remainingDays).toFixed(1);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(form);
    setSavedNotice('✅ プロフィールとストッパー設定を保存しました！');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // JSONエクスポート機能
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `md_match_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-md mx-auto px-3 pt-3 pb-24 space-y-3.5 animate-fadeIn">
      {/* 1. マスター1到達ペースメーカーカード */}
      <div className="rounded-2xl bg-gradient-to-br from-[#16203a] via-[#11172a] to-[#1a1635] border border-amber-500/40 p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-base flex items-center justify-center shadow-md">
              M1
            </div>
            <div>
              <div className="text-sm font-black text-white">{form.duelistName}</div>
              <div className="text-[11px] text-cyan-300 font-bold">
                現在ランク: {status.lastRank} / メイン: {status.lastDeck}
              </div>
            </div>
          </div>
          {form.mdPlayerId && (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(form.mdPlayerId)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-white"
              title="タップしてIDをコピー"
            >
              ID: {form.mdPlayerId} 📋
            </button>
          )}
        </div>

        {/* シーズンペースメーカー計算結果 */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
            <div className="text-[10px] text-slate-400">シーズン残り</div>
            <div className="text-base font-black text-white mt-0.5">あと {remainingDays}日</div>
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
            <div className="text-[10px] text-slate-400">目標まで勝ち越し</div>
            <div className="text-base font-black text-amber-400 mt-0.5">
              残り {remainingToGoal}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
            <div className="text-[10px] text-slate-400">1日あたりノルマ</div>
            <div className="text-base font-black text-emerald-400 mt-0.5">+{dailyPace}勝/日</div>
          </div>
        </div>

        {form.seasonGoalMemo && (
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 px-3 py-2 text-xs text-amber-200/90 font-medium">
            🎯 {form.seasonGoalMemo}
          </div>
        )}
      </div>

      {/* 2. プロフィール＆ストッパー閾値設定フォーム */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-4 space-y-3"
      >
        <h3 className="text-xs font-extrabold text-white">
          ⚙️ プレイヤー情報 ＆ メンタルストッパー設定
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              プレイヤー名
            </label>
            <input
              type="text"
              value={form.duelistName}
              onChange={(e) => setForm({ ...form, duelistName: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              MD プレイヤーID (9桁)
            </label>
            <input
              type="text"
              value={form.mdPlayerId}
              onChange={(e) => setForm({ ...form, mdPlayerId: e.target.value })}
              placeholder="123-456-789"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 mb-1">
              M1目標勝ち越し数
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={form.targetNetWins}
              onChange={(e) =>
                setForm({ ...form, targetNetWins: Number(e.target.value) || 40 })
              }
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs font-bold text-amber-300 text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 mb-1">
              連敗ストッパー発動
            </label>
            <select
              value={form.loseStreakStopperThreshold}
              onChange={(e) =>
                setForm({ ...form, loseStreakStopperThreshold: Number(e.target.value) })
              }
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-2 py-2 text-xs font-bold text-rose-300 text-center"
            >
              <option value={2}>2連敗で警告</option>
              <option value={3}>3連敗で警告</option>
              <option value={4}>4連敗で警告</option>
              <option value={5}>5連敗で警告</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 mb-1">
              高ストレス警告閾値
            </label>
            <select
              value={form.highStressThreshold}
              onChange={(e) =>
                setForm({ ...form, highStressThreshold: Number(e.target.value) })
              }
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-2 py-2 text-xs font-bold text-orange-300 text-center"
            >
              <option value={3}>Lv.3以上</option>
              <option value={4}>Lv.4以上</option>
              <option value={5}>Lv.5のみ</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">
            今シーズンのルール・抱負メモ
          </label>
          <input
            type="text"
            value={form.seasonGoalMemo}
            onChange={(e) => setForm({ ...form, seasonGoalMemo: e.target.value })}
            placeholder="例: 3連敗したら必ず15分休憩する"
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
          />
        </div>

        {savedNotice && (
          <div className="rounded-xl bg-emerald-950/80 border border-emerald-500/50 px-3 py-2 text-xs font-bold text-emerald-200">
            {savedNotice}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md"
        >
          設定を保存する
        </button>
      </form>

      {/* 3. GASバックエンド連携 ＆ データ管理（本番リセット・エクスポート） */}
      <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-4 space-y-3">
        <h3 className="text-xs font-extrabold text-white">🗄️ データベース連携 ＆ データ管理</h3>

        <div className="flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 p-3">
          <div>
            <div className="text-xs font-bold text-slate-200">
              Google Apps Script (GAS) 連携状態
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isMockMode || !gasUrl
                ? '現在：ローカル保存モード（GAS URL未設定）'
                : '現在：GASスプレッドシート連携中'}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenApiModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-amber-300"
          >
            ⚙️ URL設定
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-sky-300"
          >
            📥 戦績JSONバックアップ出力
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="flex-1 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-xs font-bold text-rose-300"
            >
              🗑️ 戦績を全消去(0戦へ)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClearAllData();
                setConfirmClear(false);
                setSavedNotice('🗑️ テスト戦績データをすべて消去し、0戦状態にリセットしました！');
              }}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-black text-white animate-pulse"
            >
              ⚠️ 本当に0戦にリセットする
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400">
          ※「戦績を全消去(0戦へ)」を押すと、現在入っているテストデータを空にして0戦0勝0敗から本番記録をスタートできます（登録したマイデッキやニューロンURLは消えません）。
        </p>
      </div>
    </div>
  );
};
