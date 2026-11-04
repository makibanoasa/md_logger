import React, { useState, useMemo } from 'react';
import { FullMatchRecord, RegisteredDeck } from '../types';

interface DashboardViewProps {
  records: FullMatchRecord[];
  registeredDecks: RegisteredDeck[];
  onGoToRecord: () => void;
  onDeleteRecord: (matchId: number, index: number) => void;
}

type PeriodMode = 'daily' | 'monthly' | 'all';

/**
 * 戦績ダッシュボード画面
 * - 添付スクリーンショット（DUEL LOG）の2列6カードグリッドUIを再現
 * - 「日次（日付指定）」「月次（ランクマシーズン YYYY-MM）」「全期間」およびデッキ別フィルタに対応
 */
export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  registeredDecks,
  onGoToRecord,
  onDeleteRecord,
}) => {
  // 現在の日付と月（ランクマシーズン）を取得
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const currentSeasonStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 期間モード（日次 / 月次＝シーズン / 全期間）
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSeason, setSelectedSeason] = useState<string>(currentSeasonStr);
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string>('ALL');
  // サブビュー（成績カード or 履歴一覧）
  const [subTab, setSubTab] = useState<'summary' | 'history'>('summary');

  // 履歴内に存在する日付リスト・シーズンリストを抽出
  const availableDates = useMemo(() => {
    const set = new Set<string>([todayStr, ...records.map((r) => r.date).filter(Boolean)]);
    return Array.from(set).sort().reverse();
  }, [records, todayStr]);

  const availableSeasons = useMemo(() => {
    const set = new Set<string>([
      currentSeasonStr,
      ...records.map((r) => r.season || r.date?.slice(0, 7)).filter(Boolean),
    ]);
    return Array.from(set).sort().reverse();
  }, [records, currentSeasonStr]);

  const availableDecks = useMemo(() => {
    const set = new Set<string>([
      ...registeredDecks.map((d) => d.name),
      ...records.map((r) => r.my_deck).filter(Boolean),
    ]);
    return Array.from(set);
  }, [records, registeredDecks]);

  // 期間＆デッキで絞り込んだ戦績リスト
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (periodMode === 'daily' && rec.date !== selectedDate) return false;
      if (periodMode === 'monthly') {
        const recSeason = rec.season || rec.date?.slice(0, 7);
        if (recSeason !== selectedSeason) return false;
      }
      if (selectedDeckFilter !== 'ALL' && rec.my_deck !== selectedDeckFilter) {
        return false;
      }
      return true;
    });
  }, [records, periodMode, selectedDate, selectedSeason, selectedDeckFilter]);

  // 6大主要指標の計算
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    const wins = filteredRecords.filter((r) => r.result === 'Win').length;
    const losses = filteredRecords.filter((r) => r.result === 'Lose').length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // 先攻戦績
    const firstTurnMatches = filteredRecords.filter((r) => r.turn === '先攻');
    const firstTurnTotal = firstTurnMatches.length;
    const firstTurnWins = firstTurnMatches.filter((r) => r.result === 'Win').length;
    const firstTurnWinRate =
      firstTurnTotal > 0 ? Math.round((firstTurnWins / firstTurnTotal) * 100) : 0;

    // 後攻戦績
    const secondTurnMatches = filteredRecords.filter((r) => r.turn === '後攻');
    const secondTurnTotal = secondTurnMatches.length;
    const secondTurnWins = secondTurnMatches.filter((r) => r.result === 'Win').length;
    const secondTurnWinRate =
      secondTurnTotal > 0 ? Math.round((secondTurnWins / secondTurnTotal) * 100) : 0;

    // コイントス戦績
    const coinRecorded = filteredRecords.filter((r) => r.coin === '表' || r.coin === '裏');
    const coinTotal = coinRecorded.length;
    const coinWins = coinRecorded.filter((r) => r.coin === '表').length;
    const coinWinRate = coinTotal > 0 ? Math.round((coinWins / coinTotal) * 100) : 0;

    // 先攻率（先攻渡し含む）
    const firstTurnRate = total > 0 ? Math.round((firstTurnTotal / total) * 100) : 0;
    const givenFirstCount = filteredRecords.filter(
      (r) => r.coin === '裏' && r.turn === '先攻'
    ).length;

    return {
      total,
      wins,
      losses,
      netWins: wins - losses,
      winRate,
      firstTurnTotal,
      firstTurnWins,
      firstTurnWinRate,
      secondTurnTotal,
      secondTurnWins,
      secondTurnWinRate,
      coinTotal,
      coinWins,
      coinWinRate,
      firstTurnRate,
      givenFirstCount,
    };
  }, [filteredRecords]);

  // 紐付くデッキレシピテキストを探すヘルパー
  const findDeckRecipeText = (rec: FullMatchRecord): string => {
    if (rec.my_deck_recipe) return rec.my_deck_recipe;
    if (rec.my_deck_id) {
      const byId = registeredDecks.find((d) => d.id === rec.my_deck_id);
      if (byId?.recipe?.compactText) return byId.recipe.compactText;
    }
    const byName = registeredDecks.find((d) => d.name === rec.my_deck && d.recipe?.compactText);
    return byName?.recipe?.compactText || '';
  };

  return (
    <div className="max-w-md mx-auto px-3 pt-3 pb-24 space-y-3.5 animate-fadeIn">
      {/* 上部モード切替バー（記録 / 成績 / 履歴） - スクショ準拠 */}
      <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-1.5 grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={onGoToRecord}
          className="py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
        >
          ＋ 記録
        </button>
        <button
          type="button"
          onClick={() => setSubTab('summary')}
          className={`py-2 rounded-xl text-xs font-extrabold transition ${
            subTab === 'summary'
              ? 'bg-slate-800/90 text-white shadow-sm border border-slate-700/70'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          成績
        </button>
        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`py-2 rounded-xl text-xs font-extrabold transition ${
            subTab === 'history'
              ? 'bg-slate-800/90 text-white shadow-sm border border-slate-700/70'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          履歴 ({filteredRecords.length})
        </button>
      </div>

      {/* 期間フィルタ（日次 / 月次＝ランクマシーズン / 全期間）＋ デッキ絞り込み */}
      <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3 space-y-2.5">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setPeriodMode('daily')}
            className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
              periodMode === 'daily'
                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 日次戦績
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('monthly')}
            className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
              periodMode === 'monthly'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🏆 月次(シーズン)
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('all')}
            className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
              periodMode === 'all'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🌐 全期間
          </button>
        </div>

        {/* 日付 / シーズン選択 ＆ デッキフィルタ */}
        <div className="flex items-center gap-2">
          {periodMode === 'daily' && (
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs font-bold text-sky-300 focus:outline-none focus:border-sky-400"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  📅 {d} {d === todayStr ? '(今日)' : ''}
                </option>
              ))}
            </select>
          )}

          {periodMode === 'monthly' && (
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400"
            >
              {availableSeasons.map((s) => (
                <option key={s} value={s}>
                  🏆 {s} シーズン {s === currentSeasonStr ? '(今月)' : ''}
                </option>
              ))}
            </select>
          )}

          {periodMode === 'all' && (
            <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-bold text-emerald-300">
              🌐 全期間通算 ({records.length}戦)
            </div>
          )}

          {/* 使用デッキ絞り込み */}
          <select
            value={selectedDeckFilter}
            onChange={(e) => setSelectedDeckFilter(e.target.value)}
            className="w-36 rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">🃏 全デッキ</option>
            {availableDecks.map((deck) => (
              <option key={deck} value={deck}>
                {deck}
              </option>
            ))}
          </select>
        </div>
      </div>

      {subTab === 'summary' ? (
        <>
          {/* スクショ完全再現：2列×3段の大型メトリクスカード */}
          <div className="grid grid-cols-2 gap-3">
            {/* 1. 総対戦数 */}
            <div className="rounded-2xl bg-gradient-to-b from-[#151c32] to-[#0f1526] border border-slate-800/90 p-4 shadow-lg">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-2">
                <span className="text-sky-400">🗡️</span>
                <span>総対戦数</span>
              </div>
              <div className="text-3xl font-black text-sky-400 tracking-tight">
                {metrics.total}戦
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-medium">
                勝ち越し:{' '}
                <span
                  className={
                    metrics.netWins >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }
                >
                  {metrics.netWins > 0 ? `+${metrics.netWins}` : metrics.netWins}
                </span>
              </div>
            </div>

            {/* 2. 勝率 */}
            <div className="rounded-2xl bg-gradient-to-b from-[#151c32] to-[#0f1526] border border-slate-800/90 p-4 shadow-lg">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-2">
                <span className="text-emerald-400">🏆</span>
                <span>勝率</span>
              </div>
              <div className="text-3xl font-black text-emerald-400 tracking-tight">
                {metrics.winRate}%
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-medium">
                {metrics.wins}勝ち / {metrics.losses}負け
              </div>
            </div>

            {/* 3. 先攻勝率 */}
            <div className="rounded-2xl bg-gradient-to-b from-[#151c32] to-[#0f1526] border border-slate-800/90 p-4 shadow-lg">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-2">
                <span className="text-amber-400">⚡</span>
                <span>先攻勝率</span>
              </div>
              <div className="text-3xl font-black text-amber-400 tracking-tight">
                {metrics.firstTurnWinRate}%
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-medium">
                {metrics.firstTurnWins}/{metrics.firstTurnTotal}
              </div>
            </div>

            {/* 4. 後攻勝率 */}
            <div className="rounded-2xl bg-gradient-to-b from-[#151c32] to-[#0f1526] border border-slate-800/90 p-4 shadow-lg">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-2">
                <span className="text-purple-400">🛡️</span>
                <span>後攻勝率</span>
              </div>
              <div className="text-3xl font-black text-purple-400 tracking-tight">
                {metrics.secondTurnWinRate}%
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-medium">
                {metrics.secondTurnWins}/{metrics.secondTurnTotal}
              </div>
            </div>

            {/* 5. コイン勝率 */}
            <div className="rounded-2xl bg-gradient-to-b from-[#151c32] to-[#0f1526] border border-slate-800/90 p-4 shadow-lg">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-2">
                <span className="text-yellow-400">◎</span>
                <span>コイン勝率</span>
              </div>
              <div className="text-3xl font-black text-yellow-400 tracking-tight">
                {metrics.coinWinRate}%
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-medium">
                {metrics.coinWins}/{metrics.coinTotal}
              </div>
            </div>

            {/* 6. 先攻率 */}
            <div className="rounded-2xl bg-gradient-to-b from-[#151c32] to-[#0f1526] border border-slate-800/90 p-4 shadow-lg">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-2">
                <span className="text-teal-400">↑</span>
                <span>先攻率</span>
              </div>
              <div className="text-3xl font-black text-teal-400 tracking-tight">
                {metrics.firstTurnRate}%
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-medium">
                {metrics.firstTurnTotal}/{metrics.total}
                {metrics.givenFirstCount > 0 && (
                  <span className="ml-1 text-[10px] text-amber-300">
                    (先攻渡し{metrics.givenFirstCount})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 直近の対戦ログプレビュー（最新5件） */}
          <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200">
                ⏱️ この期間の直近ログ ({filteredRecords.length}件)
              </h3>
              {filteredRecords.length > 5 && (
                <button
                  type="button"
                  onClick={() => setSubTab('history')}
                  className="text-[11px] text-sky-400 hover:underline font-bold"
                >
                  すべて見る ➔
                </button>
              )}
            </div>

            {filteredRecords.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                選択された期間の対戦記録はまだありません。
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecords.slice(0, 5).map((rec, idx) => {
                  const isWin = rec.result === 'Win';
                  const recipeText = findDeckRecipeText(rec);
                  return (
                    <div
                      key={`${rec.match_id}-${idx}`}
                      className="rounded-xl bg-slate-950/90 border border-slate-800/90 px-3 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              isWin
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {rec.result}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            vs {rec.opp_deck}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({rec.coin ? `🪙${rec.coin}・` : ''}
                            {rec.turn})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap">
                          <span className="text-amber-300 font-semibold">{rec.my_deck}</span>
                          <span>•</span>
                          <span>{rec.game_factor}</span>
                          <span>•</span>
                          <span>
                            {rec.date} {rec.time?.slice(0, 5)}
                          </span>
                        </div>
                      </div>

                      {recipeText && (
                        <span
                          className="shrink-0 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-bold text-emerald-300"
                          title={recipeText}
                        >
                          🃏レシピ付
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* 履歴一覧サブタブ */
        <div className="space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="rounded-2xl bg-[#11172a] border border-slate-800 p-8 text-center text-xs text-slate-400">
              該当する対戦履歴がありません。
            </div>
          ) : (
            filteredRecords.map((rec, idx) => {
              const isWin = rec.result === 'Win';
              const recipeText = findDeckRecipeText(rec);
              return (
                <div
                  key={`${rec.match_id}-${idx}`}
                  className="rounded-2xl bg-[#11172a] border border-slate-800 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-black ${
                          isWin
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {rec.result}
                      </span>
                      <span className="text-xs font-extrabold text-white">
                        #{rec.match_id} vs {rec.opp_deck}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        {rec.date} {rec.time}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(rec.match_id, idx)}
                        className="text-[11px] text-slate-500 hover:text-rose-400 px-1"
                        title="この記録を削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 font-semibold">
                      {rec.my_rank} / {rec.my_deck}
                    </span>
                    {rec.coin && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-bold">
                        🪙 コイン{rec.coin}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-200 font-bold">
                      {rec.turn}
                      {rec.coin === '裏' && rec.turn === '先攻' && ' (先攻渡し)'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                      {rec.play_decision}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                      初動:{rec.has_starter} / {rec.counter_action}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-purple-300">
                      主因:{rec.game_factor}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-950/80 rounded-xl p-2 border border-slate-800/80">
                    <div>
                      <span className="text-rose-400 font-bold">被弾: </span>
                      <span className="text-slate-300">{rec.opp_interactions.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-bold">自軍: </span>
                      <span className="text-slate-300">{rec.my_interactions.join(', ')}</span>
                    </div>
                  </div>

                  {recipeText && (
                    <details className="rounded-lg bg-slate-950/70 border border-slate-800/80 px-2.5 py-1.5 text-[10px] text-slate-300">
                      <summary className="cursor-pointer font-bold text-emerald-300">
                        🃏 紐付け採用カードレシピ（タップで展開）
                      </summary>
                      <div className="mt-1 font-mono text-slate-400 break-all leading-relaxed">
                        {recipeText}
                      </div>
                    </details>
                  )}

                  {rec.memo && (
                    <div className="text-[11px] text-slate-300 bg-slate-950/60 px-2.5 py-1.5 rounded-lg">
                      📝 {rec.memo}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
