import React, { useState, useMemo } from 'react';
import { FullMatchRecord, RegisteredDeck } from '../types';

interface StatsViewProps {
  records: FullMatchRecord[];
  registeredDecks: RegisteredDeck[];
}

type StatCategory = 'matchup' | 'mydeck' | 'counter' | 'handtrap' | 'factor';

/**
 * 統計画面コンポーネント (src/components/StatsView.tsx)
 * 現在の18カラム＋コイントス＋デッキURL設計だからこそ算出できる5大実践統計を提供
 */
export const StatsView: React.FC<StatsViewProps> = ({ records, registeredDecks }) => {
  const [activeCat, setActiveCat] = useState<StatCategory>('matchup');
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');

  const availableSeasons = useMemo(() => {
    const s = new Set<string>(
      records.map((r) => r.season || r.date?.slice(0, 7)).filter(Boolean)
    );
    return Array.from(s).sort().reverse();
  }, [records]);

  const targetRecords = useMemo(() => {
    if (seasonFilter === 'ALL') return records;
    return records.filter((r) => (r.season || r.date?.slice(0, 7)) === seasonFilter);
  }, [records, seasonFilter]);

  // ① 対面デッキ別相性・勝率ランキング
  const matchupStats = useMemo(() => {
    const map = new Map<
      string,
      { oppDeck: string; total: number; wins: number; firstTotal: number; firstWins: number; secondTotal: number; secondWins: number }
    >();
    for (const r of targetRecords) {
      const key = r.opp_deck || '不明';
      const cur = map.get(key) || {
        oppDeck: key,
        total: 0,
        wins: 0,
        firstTotal: 0,
        firstWins: 0,
        secondTotal: 0,
        secondWins: 0,
      };
      cur.total += 1;
      if (r.result === 'Win') cur.wins += 1;
      if (r.turn === '先攻') {
        cur.firstTotal += 1;
        if (r.result === 'Win') cur.firstWins += 1;
      } else if (r.turn === '後攻') {
        cur.secondTotal += 1;
        if (r.result === 'Win') cur.secondWins += 1;
      }
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [targetRecords]);

  // ② 自軍デッキ別パフォーマンス（勝率・初動○率・先後勝率・紐付けURL）
  const myDeckStats = useMemo(() => {
    const map = new Map<
      string,
      {
        deckName: string;
        total: number;
        wins: number;
        starterOk: number;
        firstTotal: number;
        firstWins: number;
        secondTotal: number;
        secondWins: number;
        neuronUrl: string;
        recipeText: string;
      }
    >();
    for (const r of targetRecords) {
      const key = r.my_deck || '不明';
      const reg = registeredDecks.find((d) => d.id === r.my_deck_id || d.name === key);
      const cur = map.get(key) || {
        deckName: key,
        total: 0,
        wins: 0,
        starterOk: 0,
        firstTotal: 0,
        firstWins: 0,
        secondTotal: 0,
        secondWins: 0,
        neuronUrl: r.my_deck_url || reg?.neuronUrl || '',
        recipeText: r.my_deck_recipe || reg?.recipe?.compactText || '',
      };
      cur.total += 1;
      if (r.result === 'Win') cur.wins += 1;
      if (r.has_starter === '○') cur.starterOk += 1;
      if (r.turn === '先攻') {
        cur.firstTotal += 1;
        if (r.result === 'Win') cur.firstWins += 1;
      } else if (r.turn === '後攻') {
        cur.secondTotal += 1;
        if (r.result === 'Win') cur.secondWins += 1;
      }
      if (!cur.neuronUrl && (r.my_deck_url || reg?.neuronUrl)) {
        cur.neuronUrl = r.my_deck_url || reg?.neuronUrl || '';
      }
      if (!cur.recipeText && (r.my_deck_recipe || reg?.recipe?.compactText)) {
        cur.recipeText = r.my_deck_recipe || reg?.recipe?.compactText || '';
      }
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [targetRecords, registeredDecks]);

  // ③ カウンター結果（誘発貫通・ケア展開・妥協盤面）別の発生率と勝率
  const counterStats = useMemo(() => {
    const map = new Map<string, { action: string; total: number; wins: number }>();
    for (const r of targetRecords) {
      const key = r.counter_action || '無風';
      const cur = map.get(key) || { action: key, total: 0, wins: 0 };
      cur.total += 1;
      if (r.result === 'Win') cur.wins += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [targetRecords]);

  // ④ 誘発・妨害カード別の被弾時勝率 ＆ 自軍発動時勝率
  const interactionStats = useMemo(() => {
    const oppMap = new Map<string, { card: string; count: number; winsWhenHit: number }>();
    const myMap = new Map<string, { card: string; count: number; winsWhenUsed: number }>();

    for (const r of targetRecords) {
      const isWin = r.result === 'Win';
      // 被弾妨害（カード名部分を抽出）
      const seenOpp = new Set<string>();
      for (const pair of r.opp_interactions || []) {
        if (!pair || pair === 'なし') continue;
        const cardName = pair.split('➔')[0].trim();
        if (seenOpp.has(cardName)) continue;
        seenOpp.add(cardName);
        const cur = oppMap.get(cardName) || { card: cardName, count: 0, winsWhenHit: 0 };
        cur.count += 1;
        if (isWin) cur.winsWhenHit += 1;
        oppMap.set(cardName, cur);
      }

      // 自軍妨害
      const seenMy = new Set<string>();
      for (const pair of r.my_interactions || []) {
        if (!pair || pair === 'なし') continue;
        const cardName = pair.split('➔')[0].trim();
        if (seenMy.has(cardName)) continue;
        seenMy.add(cardName);
        const cur = myMap.get(cardName) || { card: cardName, count: 0, winsWhenUsed: 0 };
        cur.count += 1;
        if (isWin) cur.winsWhenUsed += 1;
        myMap.set(cardName, cur);
      }
    }

    return {
      oppList: Array.from(oppMap.values()).sort((a, b) => b.count - a.count),
      myList: Array.from(myMap.values()).sort((a, b) => b.count - a.count),
    };
  }, [targetRecords]);

  // ⑤ 判断区分（粘り捲り vs 即サレ）＆ 勝敗主因・ストレス分析
  const decisionAndFactorStats = useMemo(() => {
    const decMap = new Map<string, { dec: string; total: number; wins: number }>();
    const winFactorMap = new Map<string, number>();
    const loseFactorMap = new Map<string, number>();
    const stressMap = new Map<number, { level: number; total: number; wins: number }>();

    for (const r of targetRecords) {
      const dKey = r.play_decision || '通常決着';
      const dCur = decMap.get(dKey) || { dec: dKey, total: 0, wins: 0 };
      dCur.total += 1;
      if (r.result === 'Win') dCur.wins += 1;
      decMap.set(dKey, dCur);

      if (r.game_factor) {
        if (r.result === 'Win') {
          winFactorMap.set(r.game_factor, (winFactorMap.get(r.game_factor) || 0) + 1);
        } else if (r.result === 'Lose') {
          loseFactorMap.set(r.game_factor, (loseFactorMap.get(r.game_factor) || 0) + 1);
        }
      }

      const sLv = r.stress_level || 2;
      const sCur = stressMap.get(sLv) || { level: sLv, total: 0, wins: 0 };
      sCur.total += 1;
      if (r.result === 'Win') sCur.wins += 1;
      stressMap.set(sLv, sCur);
    }

    return {
      decisions: Array.from(decMap.values()).sort((a, b) => b.total - a.total),
      winFactors: Array.from(winFactorMap.entries()).sort((a, b) => b[1] - a[1]),
      loseFactors: Array.from(loseFactorMap.entries()).sort((a, b) => b[1] - a[1]),
      stressList: [1, 2, 3, 4, 5].map(
        (lv) => stressMap.get(lv) || { level: lv, total: 0, wins: 0 }
      ),
    };
  }, [targetRecords]);

  return (
    <div className="max-w-md mx-auto px-3 pt-3 pb-24 space-y-3.5 animate-fadeIn">
      {/* ヘッダー＆シーズン選択 */}
      <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-white">📊 多角戦績アナリティクス</h2>
          <p className="text-[11px] text-slate-400">
            全18カラム＋コイン＋デッキURLから自動算出 ({targetRecords.length}戦対象)
          </p>
        </div>
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-amber-300"
        >
          <option value="ALL">🌐 全期間</option>
          {availableSeasons.map((s) => (
            <option key={s} value={s}>
              🏆 {s}
            </option>
          ))}
        </select>
      </div>

      {/* 5大統計カテゴリ切り替えチップ */}
      <div className="grid grid-cols-5 gap-1 rounded-2xl bg-[#11172a] border border-slate-800/90 p-1.5 text-center">
        {[
          { id: 'matchup', label: '対面相性', icon: '🎯' },
          { id: 'mydeck', label: '自デッキ', icon: '🃏' },
          { id: 'counter', label: '貫通/ケア', icon: '🛡️' },
          { id: 'handtrap', label: '誘発分析', icon: '⚡' },
          { id: 'factor', label: '主因/判断', icon: '🧠' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCat(tab.id as StatCategory)}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-0.5 ${
              activeCat === tab.id
                ? 'bg-sky-500/20 border border-sky-400 text-sky-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ① 対面相性・勝率ランキング */}
      {activeCat === 'matchup' && (
        <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-white">🎯 対面デッキ別 勝率・先後内訳</h3>
            <span className="text-[10px] text-slate-400">遭遇数順</span>
          </div>
          {matchupStats.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">データがありません</div>
          ) : (
            <div className="space-y-2.5">
              {matchupStats.map((item) => {
                const winRate = Math.round((item.wins / item.total) * 100);
                const firstRate =
                  item.firstTotal > 0 ? Math.round((item.firstWins / item.firstTotal) * 100) : null;
                const secondRate =
                  item.secondTotal > 0
                    ? Math.round((item.secondWins / item.secondTotal) * 100)
                    : null;
                return (
                  <div
                    key={item.oppDeck}
                    className="rounded-xl bg-slate-950/90 border border-slate-800/80 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white">{item.oppDeck}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.total}戦 ({item.wins}勝{item.total - item.wins}敗)
                        </span>
                      </div>
                      <span
                        className={`text-sm font-black ${
                          winRate >= 55
                            ? 'text-emerald-400'
                            : winRate < 45
                            ? 'text-rose-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {winRate}%
                      </span>
                    </div>

                    {/* 勝率バー */}
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          winRate >= 55
                            ? 'bg-emerald-500'
                            : winRate < 45
                            ? 'bg-rose-500'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${winRate}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>
                        ⚡先攻:{' '}
                        <strong className="text-slate-200">
                          {firstRate !== null
                            ? `${firstRate}% (${item.firstWins}/${item.firstTotal})`
                            : '-'}
                        </strong>
                      </span>
                      <span>
                        🛡️後攻:{' '}
                        <strong className="text-slate-200">
                          {secondRate !== null
                            ? `${secondRate}% (${item.secondWins}/${item.secondTotal})`
                            : '-'}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ② 自軍デッキ別パフォーマンス（初動率・事故率・ニューロンURL） */}
      {activeCat === 'mydeck' && (
        <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-white">
              🃏 使用デッキ別 勝率・初動率(安定度)
            </h3>
          </div>
          {myDeckStats.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">データがありません</div>
          ) : (
            <div className="space-y-2.5">
              {myDeckStats.map((d) => {
                const winRate = Math.round((d.wins / d.total) * 100);
                const starterRate = Math.round((d.starterOk / d.total) * 100);
                return (
                  <div
                    key={d.deckName}
                    className="rounded-xl bg-slate-950/90 border border-slate-800/80 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-amber-300">{d.deckName}</span>
                        <span className="text-xs text-slate-400">
                          {d.total}戦 ({d.wins}勝{d.total - d.wins}敗)
                        </span>
                      </div>
                      {d.recipeText && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                          🃏レシピ登録済
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-400">総合勝率</div>
                        <div className="text-sm font-black text-emerald-400">{winRate}%</div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-400">初動○率</div>
                        <div className="text-sm font-black text-cyan-300">{starterRate}%</div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-400">先攻勝率</div>
                        <div className="text-sm font-black text-amber-300">
                          {d.firstTotal > 0 ? `${Math.round((d.firstWins / d.firstTotal) * 100)}%` : '-'}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-400">後攻勝率</div>
                        <div className="text-sm font-black text-purple-300">
                          {d.secondTotal > 0
                            ? `${Math.round((d.secondWins / d.secondTotal) * 100)}%`
                            : '-'}
                        </div>
                      </div>
                    </div>

                    {d.recipeText && (
                      <details className="rounded-lg bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 text-[10px] text-slate-300">
                        <summary className="cursor-pointer font-bold text-emerald-300">
                          🃏 登録採用カードリストを見る
                        </summary>
                        <div className="mt-1 font-mono text-slate-400 break-all leading-relaxed">
                          {d.recipeText}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ③ カウンター結果（対抗札貫通・手数貫通・ケア展開で回避・妥協盤面）分析 */}
      {activeCat === 'counter' && (
        <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 space-y-3">
          <div>
            <h3 className="text-xs font-extrabold text-white">
              🛡️ カウンター結果別の発生率と勝率
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              「ケア展開で回避」や「妥協盤面移行」を選んだ試合で実際に何%勝てているかを可視化
            </p>
          </div>
          <div className="space-y-2">
            {counterStats.map((item) => {
              const winRate = Math.round((item.wins / item.total) * 100);
              const shareRate =
                targetRecords.length > 0
                  ? Math.round((item.total / targetRecords.length) * 100)
                  : 0;
              return (
                <div
                  key={item.action}
                  className="rounded-xl bg-slate-950/90 border border-slate-800/80 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-extrabold text-white">{item.action}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      発生: {item.total}回 (全体の{shareRate}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-black ${
                        winRate >= 55
                          ? 'text-emerald-400'
                          : winRate < 45
                          ? 'text-rose-400'
                          : 'text-amber-300'
                      }`}
                    >
                      勝率 {winRate}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.wins}勝 / {item.total - item.wins}敗
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ④ 誘発・妨害カード分析 */}
      {activeCat === 'handtrap' && (
        <div className="space-y-3">
          {/* 自軍妨害の貢献度 */}
          <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 space-y-2.5">
            <h3 className="text-xs font-extrabold text-cyan-300">
              ⚡ 自軍妨害カード 発動時の勝率ランキング
            </h3>
            {interactionStats.myList.length === 0 ? (
              <div className="text-xs text-slate-400 py-3">まだ自軍妨害の記録がありません</div>
            ) : (
              <div className="space-y-1.5">
                {interactionStats.myList.map((item) => {
                  const wr = Math.round((item.winsWhenUsed / item.count) * 100);
                  return (
                    <div
                      key={item.card}
                      className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-100">
                        {item.card}{' '}
                        <span className="text-[10px] text-slate-400">({item.count}試合で使用)</span>
                      </span>
                      <span className="font-black text-emerald-400">
                        勝率 {wr}% ({item.winsWhenUsed}/{item.count})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 被弾妨害の脅威度 */}
          <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 space-y-2.5">
            <h3 className="text-xs font-extrabold text-rose-300">
              💥 被弾カード別 被弾時の勝率（低いほど天敵）
            </h3>
            {interactionStats.oppList.length === 0 ? (
              <div className="text-xs text-slate-400 py-3">まだ被弾妨害の記録がありません</div>
            ) : (
              <div className="space-y-1.5">
                {interactionStats.oppList.map((item) => {
                  const wr = Math.round((item.winsWhenHit / item.count) * 100);
                  return (
                    <div
                      key={item.card}
                      className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-100">
                        {item.card}{' '}
                        <span className="text-[10px] text-slate-400">({item.count}試合で被弾)</span>
                      </span>
                      <span
                        className={`font-black ${
                          wr < 45 ? 'text-rose-400' : 'text-amber-300'
                        }`}
                      >
                        被弾時勝率 {wr}% ({item.winsWhenHit}/{item.count})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⑤ 判断区分＆勝敗主因・メンタル分析 */}
      {activeCat === 'factor' && (
        <div className="space-y-3">
          {/* 判断区分別成績 */}
          <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 space-y-2">
            <h3 className="text-xs font-extrabold text-amber-300">
              🔥 判断区分別の戦績（粘り捲り成功率など）
            </h3>
            <div className="space-y-1.5">
              {decisionAndFactorStats.decisions.map((d) => {
                const wr = Math.round((d.wins / d.total) * 100);
                return (
                  <div
                    key={d.dec}
                    className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-200">
                      {d.dec} ({d.total}戦)
                    </span>
                    <span className="font-black text-sky-300">
                      {d.wins}勝{d.total - d.wins}敗 ({wr}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 勝ち主因・負け主因内訳 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3 space-y-2">
              <h4 className="text-xs font-extrabold text-emerald-400">🌟 勝ち主因 TOP</h4>
              {decisionAndFactorStats.winFactors.map(([fac, cnt]) => (
                <div key={fac} className="flex justify-between text-[11px] text-slate-200">
                  <span className="truncate">{fac}</span>
                  <span className="font-bold text-emerald-300">{cnt}回</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3 space-y-2">
              <h4 className="text-xs font-extrabold text-rose-400">🔻 負け主因 TOP</h4>
              {decisionAndFactorStats.loseFactors.map(([fac, cnt]) => (
                <div key={fac} className="flex justify-between text-[11px] text-slate-200">
                  <span className="truncate">{fac}</span>
                  <span className="font-bold text-rose-300">{cnt}回</span>
                </div>
              ))}
            </div>
          </div>

          {/* ストレスLv別勝率 */}
          <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 space-y-2">
            <h3 className="text-xs font-extrabold text-slate-200">
              🧘 ストレス度(Lv.1〜5)別の勝率相関
            </h3>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {decisionAndFactorStats.stressList.map((s) => {
                const wr = s.total > 0 ? Math.round((s.wins / s.total) * 100) : null;
                return (
                  <div
                    key={s.level}
                    className="rounded-xl bg-slate-950/80 border border-slate-800 p-2"
                  >
                    <div className="text-[10px] text-slate-400">Lv.{s.level}</div>
                    <div className="text-xs font-black text-white mt-0.5">
                      {wr !== null ? `${wr}%` : '-'}
                    </div>
                    <div className="text-[9px] text-slate-500">{s.total}戦</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
