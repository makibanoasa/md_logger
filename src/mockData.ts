import { MasterData, CurrentStatus, MatchLogPayload, PostApiResponse } from './types';
import { DEFAULT_MY_DECKS, TIER_OPPONENT_DECKS } from './config/decks';
import { DEFAULT_INTERACTIONS } from './config/interactions';

/**
 * ランク一覧（プラチナ5〜マスター1）
 * ドロップダウンおよび前後のランクへのステッパー移動に使用
 */
export const RANK_LIST: string[] = [
  'プラチナ5',
  'プラチナ4',
  'プラチナ3',
  'プラチナ2',
  'プラチナ1',
  'ダイヤ5',
  'ダイヤ4',
  'ダイヤ3',
  'ダイヤ2',
  'ダイヤ1',
  'マスター5',
  'マスター4',
  'マスター3',
  'マスター2',
  'マスター1',
];

/**
 * 勝敗主因タグの分類（Win時・Lose時の優先強調表示用）
 */
export const WIN_FACTORS: string[] = [
  '制圧完封',
  '誘発刺さり',
  '妥協守り切り',
  '捲り成功',
  '時間切れ・運勝ち',
];

export const LOSE_FACTORS: string[] = [
  '初動事故',
  'Gフワロス停止',
  '誘発被弾停止',
  'まくり札直撃', // 超融合・禁じられた一滴・三戦の才など
  '手数捲られ',
  'プレミ',
];

/**
 * ストレス度（1〜5段階）の定義
 */
export const STRESS_LEVELS: {
  level: number;
  label: string;
  subLabel: string;
  emoji: string;
  activeClass: string;
}[] = [
  {
    level: 1,
    label: '1',
    subLabel: '快勝',
    emoji: '😆',
    activeClass: 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-950/60',
  },
  {
    level: 2,
    label: '2',
    subLabel: '平常',
    emoji: '🙂',
    activeClass: 'bg-sky-600 border-sky-400 text-white shadow-lg shadow-sky-950/60',
  },
  {
    level: 3,
    label: '3',
    subLabel: '軽度疲労',
    emoji: '😐',
    activeClass: 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-950/60',
  },
  {
    level: 4,
    label: '4',
    subLabel: '不満',
    emoji: '😣',
    activeClass: 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-950/60',
  },
  {
    level: 5,
    label: '5',
    subLabel: '限界',
    emoji: '🤬',
    activeClass: 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-950/60',
  },
];

/**
 * デフォルトのマスタデータ
 * 自軍デッキ・相手デッキは src/config/decks.ts で一元管理
 */
export const DEFAULT_MASTER_DATA: MasterData = {
  自軍デッキ: DEFAULT_MY_DECKS,
  相手デッキ: TIER_OPPONENT_DECKS,
  '誘発・汎用札': DEFAULT_INTERACTIONS,
  対象プリセット: [
    '初動',
    '増G',
    'フワロス',
    'EX中継',
    'サーチ効果',
    '墓地効果',
    'レクイエム',
    '制圧モンスター',
    'バック・罠',
    '省略(対象指定なし)',
  ],
  判断区分: ['通常決着', '早期見切り(即サレ)', '相手即サレ', '粘りプレイ(捲り挑戦)'],
  カウンター結果: [
    '無風',
    '無効化完封',
    '対抗札貫通',
    '手数貫通',
    'ケア展開で回避',
    '妥協盤面移行',
    '停止',
    '未展開(即サレ)',
  ],
  勝敗主因タグ: [
    '制圧完封',
    '誘発刺さり',
    '妥協守り切り',
    '捲り成功',
    '時間切れ・運勝ち',
    '初動事故',
    'Gフワロス停止',
    '誘発被弾停止',
    'まくり札直撃',
    '手数捲られ',
    'プレミ',
  ],
};

/**
 * カウンター結果の補足説明（ボタン下に小さく表示）
 */
export const COUNTER_ACTION_HINTS: Record<string, string> = {
  無風: '妨害なし',
  無効化完封: '妨害で完全停止させた/された',
  対抗札貫通: '墓穴・抹殺・うらら返し等の対抗札で突破',
  手数貫通: '展開量・初動の枚数で押し切り',
  ケア展開で回避: 'ニビルケア等で誘発の直撃を回避・軽減して展開',
  妥協盤面移行: 'G/フワロス等を受けて最小限の盤面で止まった',
  停止: '誘発・妨害が直撃して展開が止まった',
  '未展開(即サレ)': '初動を打つ前に相手盤面・状況を見てサレンダー',
};

/**
 * SPEC.md 3.1 に記載された初期ステータス（API未設定時のモック初期値）
 */
export const INITIAL_MOCK_STATUS: CurrentStatus = {
  lastRank: 'ダイヤ5',
  lastDeck: '幻影騎士団',
  totalMatches: 5,
  todayMatches: 5,
  todayWins: 2,
  todayLosses: 3,
  todayWinRate: 40.0,
  currentLoseStreak: 0,
  consecutiveHighStress: 0,
  remainingNetWins: 40,
  dashboardAlert: '🟡【メンタル警戒】ストレスやや高め。無理な連戦は避けましょう',
  stopperAlerts: [],
  isStopperTriggered: false,
};

/**
 * GAS API URL未設定時（プレビュー・モック動作時）に、
 * 送信された対戦ログからリアルなAI伴走コメントと更新後ステータスを生成するシミュレーター
 */
export function simulatePostMatch(
  payload: MatchLogPayload,
  prevStatus: CurrentStatus
): PostApiResponse {
  const isWin = payload.result === 'Win';
  const totalMatches = prevStatus.totalMatches + 1;
  const todayMatches = prevStatus.todayMatches + 1;
  const todayWins = prevStatus.todayWins + (isWin ? 1 : 0);
  const todayLosses = prevStatus.todayLosses + (isWin ? 0 : 1);
  const todayWinRate = Number(((todayWins / todayMatches) * 100).toFixed(1));

  const currentLoseStreak = isWin ? 0 : prevStatus.currentLoseStreak + 1;
  const isHighStress = payload.stress_level >= 4;
  const consecutiveHighStress = isHighStress ? prevStatus.consecutiveHighStress + 1 : 0;

  // 勝ち越し数の計算（マスター1到達の場合は0、それ以外は勝敗で±1）
  let remainingNetWins = prevStatus.remainingNetWins + (isWin ? -1 : 1);
  if (payload.my_rank === 'マスター1') {
    remainingNetWins = 0;
  } else if (remainingNetWins < 1) {
    remainingNetWins = 1;
  }

  // ストッパー警告判定（3連敗以上 または 高ストレス4〜5が2連続以上 または ストレス5限界）
  const stopperAlerts: string[] = [];
  if (currentLoseStreak >= 3) {
    stopperAlerts.push(
      `🚨【連敗ストッパー発動】現在 ${currentLoseStreak}連敗中です！ティルト（熱くなりすぎ）によるプレミを防ぐため、最低15分間は画面を閉じて休憩しましょう。`
    );
  }
  if (consecutiveHighStress >= 2 || payload.stress_level === 5) {
    stopperAlerts.push(
      `⚠️【高負荷メンタル警告】高ストレス状態（Lv.${payload.stress_level}）が続いています。深呼吸して水分を摂り、リフレッシュすることを強く推奨します。`
    );
  }

  const isStopperTriggered = stopperAlerts.length > 0;

  let dashboardAlert = '🟢【順調】メンタル良好・勝率安定。M1を目指して続行可能';
  if (isStopperTriggered) {
    dashboardAlert = '🔴【休憩推奨】ストッパー警告発動中！一度クールダウンしましょう';
  } else if (payload.stress_level >= 3 || currentLoseStreak === 2 || todayWinRate < 45) {
    dashboardAlert = '🟡【メンタル警戒】ストレスやや高め。無理な連戦は避けましょう';
  }

  // 100文字以内のリアルなAI伴走コメント生成
  const myIntText =
    payload.my_interactions[0] && payload.my_interactions[0] !== 'なし'
      ? `${payload.my_interactions[0]}の判断が光りましたね。`
      : '';
  const oppIntText =
    payload.opp_interactions[0] && payload.opp_interactions[0] !== 'なし'
      ? `相手の${payload.opp_interactions[0]}を受けながらも、`
      : '';

  let aiComment = '';
  const coinContext =
    payload.coin === '裏' && payload.turn === '先攻'
      ? 'コイントス裏で先攻を渡された展開でしたが、'
      : payload.coin === '表' && payload.turn === '後攻'
      ? 'コイントス勝ちから自ら後攻を選択し、'
      : '';

  if (isWin) {
    if (payload.play_decision === '相手即サレ') {
      aiComment = `対${payload.opp_deck}戦、相手のサレンダーで勝利です。${coinContext}盤面の圧が伝わった証拠ですね。この流れのまま次戦へ！`;
    } else if (payload.play_decision === '粘りプレイ(捲り挑戦)') {
      aiComment = `${coinContext}${oppIntText}${myIntText}${payload.turn}からの粘りプレイが勝ち星に直結しました！素晴らしい集中力です。水分補給を挟んでこの調子でいきましょう。`;
    } else {
      aiComment = `対${payload.opp_deck}戦、${coinContext}${payload.game_factor}でのナイス勝利です！${myIntText}自分のペースで着実に勝ち越しを積み上げられていますよ。`;
    }
  } else {
    if (payload.play_decision === '早期見切り(即サレ)') {
      aiComment = `対${payload.opp_deck}戦、早期見切り(即サレ)で時間とメンタルを温存できたのは賢明な判断です！気持ちを切り替えて次戦に臨みましょう。`;
    } else if (isStopperTriggered) {
      aiComment = `${coinContext}${oppIntText}${payload.game_factor}での惜敗、本当にお疲れ様です。今は無理に取り戻そうとせず、一度休憩を入れて流れをリセットしましょう！`;
    } else {
      aiComment = `対${payload.opp_deck}戦は${coinContext}${payload.game_factor}で惜しかったですね。${oppIntText}切り替えが大事です。深呼吸して次の1戦に集中しましょう！`;
    }
  }

  return {
    status: 'success',
    recordedMatchNo: totalMatches,
    aiComment,
    updatedStatus: {
      lastRank: payload.my_rank,
      lastDeck: payload.my_deck,
      totalMatches,
      todayMatches,
      todayWins,
      todayLosses,
      todayWinRate,
      currentLoseStreak,
      consecutiveHighStress,
      remainingNetWins,
      dashboardAlert,
      stopperAlerts,
      isStopperTriggered,
    },
  };
}
