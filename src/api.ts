import {
  GetApiResponse,
  MatchLogPayload,
  PostApiResponse,
  CurrentStatus,
  FullMatchRecord,
  RegisteredDeck,
  UserProfileConfig,
  DeckCardEntry,
  DeckRecipeData,
} from './types';
import { DEFAULT_MASTER_DATA, INITIAL_MOCK_STATUS, simulatePostMatch } from './mockData';
import { DEFAULT_MY_DECKS, DEFAULT_REGISTERED_DECKS, TIER_OPPONENT_DECKS } from './config/decks';
import { DEFAULT_INTERACTIONS } from './config/interactions';
import { SAMPLE_ORCUST_CARDS, buildDeckRecipeData } from './utils/deckRecipe';

/** localStorage キー定義 */
export const STORAGE_KEYS = {
  GAS_URL: 'md_logger_gas_url',
  GEMINI_API_KEY: 'md_logger_gemini_api_key',
  MY_RANK: 'md_logger_my_rank',
  MY_DECK: 'md_logger_my_deck',
  MY_DECK_ID: 'md_logger_my_deck_id',
  CUSTOM_MY_DECKS: 'md_logger_custom_my_decks_v1',
  REGISTERED_DECKS: 'md_logger_registered_decks_v1',
  USER_PROFILE: 'md_logger_user_profile_v1',
  MOCK_STATUS: 'md_logger_mock_status',
  LOCAL_HISTORY: 'md_logger_local_history',
  SEED_INITIALIZED: 'md_logger_seed_initialized_v1',
} as const;

/** デフォルトプロフィール設定 */
export const DEFAULT_USER_PROFILE: UserProfileConfig = {
  duelistName: 'Duelist',
  mdPlayerId: '',
  targetNetWins: 40,
  loseStreakStopperThreshold: 3,
  highStressThreshold: 4,
  seasonGoalMemo: '今シーズンこそ冷静な判断と誘発ケアでマスター1到達！',
};

/**
 * 登録デッキ一覧（ニューロン出力JPGレシピ構造化対応）を取得
 * 既存のオルフェゴールにまだレシピが入っていない場合は初期サンプルレシピを補完する
 */
export function getRegisteredDecks(): RegisteredDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_DECKS);
    if (raw) {
      const parsed = JSON.parse(raw) as RegisteredDeck[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d) => {
          if (d.name === 'オルフェゴール' && !d.recipe) {
            return {
              ...d,
              versionNote: d.versionNote === 'メイン構築' ? '40枚構築（フワロス3・ヴェーラー3・ドロバ2型）' : d.versionNote,
              recipe: buildDeckRecipeData(SAMPLE_ORCUST_CARDS),
            };
          }
          return d;
        });
      }
    }
  } catch {
    // エラー時はデフォルトへ
  }
  return DEFAULT_REGISTERED_DECKS;
}

/**
 * 登録デッキ一覧を保存し、アクティブなデッキ名リストも同期する
 */
export function saveRegisteredDecks(decks: RegisteredDeck[]): void {
  localStorage.setItem(STORAGE_KEYS.REGISTERED_DECKS, JSON.stringify(decks));
  const activeNames = Array.from(
    new Set(decks.filter((d) => d.isActive).map((d) => d.name))
  );
  if (activeNames.length > 0) {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_MY_DECKS, JSON.stringify(activeNames));
  }
}

/**
 * プロフィール設定を取得
 */
export function getUserProfile(): UserProfileConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) {
      return { ...DEFAULT_USER_PROFILE, ...(JSON.parse(raw) as Partial<UserProfileConfig>) };
    }
  } catch {
    // 無視
  }
  return DEFAULT_USER_PROFILE;
}

/**
 * プロフィール設定を保存
 */
export function saveUserProfile(profile: UserProfileConfig): void {
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

/**
 * ローカルでメンテナンスされた自軍デッキ候補リストを取得
 * 登録デッキのアクティブ一覧と連動
 */
export function getSavedMyDecks(): string[] {
  const registered = getRegisteredDecks();
  const activeFromRegistered = Array.from(
    new Set(registered.filter((d) => d.isActive).map((d) => d.name))
  );
  if (activeFromRegistered.length > 0) {
    return activeFromRegistered;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_MY_DECKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // パースエラー時はデフォルトへ
  }
  return DEFAULT_MY_DECKS;
}

/**
 * 自軍デッキ候補リストを localStorage に保存（登録デッキ側にも反映）
 */
export function saveMyDecks(decks: string[]): void {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_MY_DECKS, JSON.stringify(decks));
  const currentReg = getRegisteredDecks();
  const today = new Date().toISOString().slice(0, 10);

  // 既存の登録デッキを活かしつつ、追加された名前があれば新規登録デッキとして追加
  const updatedReg: RegisteredDeck[] = decks.map((name, idx) => {
    const existing = currentReg.find((r) => r.name === name);
    if (existing) {
      return { ...existing, isActive: true };
    }
    return {
      id: `deck-custom-${Date.now()}-${idx}`,
      name,
      versionNote: 'メイン構築',
      neuronUrl: '',
      isActive: true,
      updatedAt: today,
    };
  });

  // 非表示になった既存登録デッキも保持（URLが消えないようにする）
  for (const oldDeck of currentReg) {
    if (!decks.includes(oldDeck.name)) {
      updatedReg.push({ ...oldDeck, isActive: false });
    }
  }
  localStorage.setItem(STORAGE_KEYS.REGISTERED_DECKS, JSON.stringify(updatedReg));
}

/**
 * 保存されている GAS Webアプリ URL を取得
 */
export function getSavedGasUrl(): string {
  return localStorage.getItem(STORAGE_KEYS.GAS_URL)?.trim() || '';
}

/**
 * GAS Webアプリ URL を保存
 */
export function saveGasUrl(url: string): void {
  localStorage.setItem(STORAGE_KEYS.GAS_URL, url.trim());
}

/**
 * ローカルに保存されたモックステータスを取得（未保存時は初期モック値）
 */
export function getLocalMockStatus(): CurrentStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOCK_STATUS);
    if (raw) {
      return JSON.parse(raw) as CurrentStatus;
    }
  } catch {
    // パースエラー時は初期値へフォールバック
  }
  return INITIAL_MOCK_STATUS;
}

/**
 * ローカルのモックステータスを保存
 */
export function saveLocalMockStatus(status: CurrentStatus): void {
  localStorage.setItem(STORAGE_KEYS.MOCK_STATUS, JSON.stringify(status));
}

/**
 * 初回起動時用のサンプル履歴5件（ダッシュボードや統計をすぐ確認でき、設定から1タップで消去可能）
 */
function createInitialSampleHistory(): FullMatchRecord[] {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const seasonStr = `${yyyy}-${mm}`;

  return [
    {
      match_id: 5,
      date: todayStr,
      time: '02:40:12',
      season: seasonStr,
      my_rank: 'ダイヤ5',
      my_deck: '幻影騎士団',
      my_deck_id: 'deck-pk-1',
      my_deck_url: 'https://www.db.yugioh-card.com/yugiohdb/deck_search.action',
      coin: '表',
      turn: '先攻',
      result: 'Win',
      play_decision: '通常決着',
      opp_deck: 'エルフェンノーツ',
      has_starter: '○',
      counter_action: '対抗札貫通',
      opp_interactions: ['増G➔初動', '無限泡影➔EX中継'],
      my_interactions: ['うらら➔増G', '幻影霧剣➔制圧モンスター'],
      game_factor: '制圧完封',
      stress_level: 1,
      memo: 'Gにうらら当てて霧剣2伏せ完封',
      ai_comment: '対エルフェンノーツ戦、制圧完封でのナイス勝利です！うらら➔増Gの判断が光りましたね。',
    },
    {
      match_id: 4,
      date: todayStr,
      time: '02:25:40',
      season: seasonStr,
      my_rank: 'ダイヤ5',
      my_deck: 'オルフェゴール',
      my_deck_id: 'deck-orcust-1',
      my_deck_recipe: buildDeckRecipeData(SAMPLE_ORCUST_CARDS).compactText,
      my_deck_url: '',
      coin: '裏',
      turn: '後攻',
      result: 'Lose',
      play_decision: '早期見切り(即サレ)',
      opp_deck: 'エルフェンノーツ・キラーチューン',
      has_starter: '○',
      counter_action: '停止',
      opp_interactions: ['ドロバ➔サーチ効果', 'バロネス➔初動'],
      my_interactions: ['無限泡影➔初動'],
      game_factor: '誘発被弾停止',
      stress_level: 3,
      memo: '',
      ai_comment: '早期見切り(即サレ)で時間とメンタルを温存できたのは賢明な判断です！',
    },
    {
      match_id: 3,
      date: todayStr,
      time: '02:10:05',
      season: seasonStr,
      my_rank: 'ダイヤ5',
      my_deck: '幻影騎士団',
      my_deck_id: 'deck-pk-1',
      my_deck_url: 'https://www.db.yugioh-card.com/yugiohdb/deck_search.action',
      coin: '裏',
      turn: '先攻',
      result: 'Win',
      play_decision: '粘りプレイ(捲り挑戦)',
      opp_deck: '天盃龍',
      has_starter: '○',
      counter_action: 'ケア展開で回避',
      opp_interactions: ['フワロス➔初動', '禁じられた一滴➔制圧モンスター'],
      my_interactions: ['霊王の波動➔初動'],
      game_factor: '妥協守り切り',
      stress_level: 2,
      memo: '先攻渡しから妥協盤面と霊王で守り切り',
      ai_comment: 'コイントス裏で先攻を渡された展開でしたが、先攻からの粘りプレイが勝ち星に直結しました！',
    },
    {
      match_id: 2,
      date: todayStr,
      time: '01:55:19',
      season: seasonStr,
      my_rank: 'ダイヤ5',
      my_deck: '召喚獣',
      my_deck_id: 'deck-invoked-1',
      my_deck_url: '',
      coin: '表',
      turn: '先攻',
      result: 'Lose',
      play_decision: '通常決着',
      opp_deck: 'ドラゴンテイル',
      has_starter: '○',
      counter_action: '無風',
      opp_interactions: ['超融合➔制圧モンスター'],
      my_interactions: ['なし'],
      game_factor: 'まくり札直撃',
      stress_level: 4,
      memo: 'メルカバーを超融合で吸われて負け',
      ai_comment: 'まくり札直撃で惜しかったですね。切り替えが大事です。',
    },
    {
      match_id: 1,
      date: todayStr,
      time: '01:40:00',
      season: seasonStr,
      my_rank: 'ダイヤ5',
      my_deck: 'シャドール',
      my_deck_id: 'deck-shaddoll-1',
      my_deck_url: '',
      coin: '裏',
      turn: '後攻',
      result: 'Lose',
      play_decision: '通常決着',
      opp_deck: 'アルトメギア',
      has_starter: '×',
      counter_action: '停止',
      opp_interactions: ['うらら➔サーチ効果'],
      my_interactions: ['ヴェーラー➔初動'],
      game_factor: '初動事故',
      stress_level: 3,
      memo: '',
      ai_comment: '初動事故は割り切りましょう！深呼吸して次戦へ。',
    },
  ];
}

/**
 * ローカル対戦履歴を取得
 */
export function getLocalHistory(): FullMatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_HISTORY);
    if (raw) {
      return JSON.parse(raw) as FullMatchRecord[];
    }
    // まだ一度も初期化されていなければサンプル5戦を投入
    if (!localStorage.getItem(STORAGE_KEYS.SEED_INITIALIZED)) {
      const sample = createInitialSampleHistory();
      localStorage.setItem(STORAGE_KEYS.LOCAL_HISTORY, JSON.stringify(sample));
      localStorage.setItem(STORAGE_KEYS.SEED_INITIALIZED, 'true');
      return sample;
    }
  } catch {
    // 無視
  }
  return [];
}

/**
 * ローカル対戦履歴を上書き保存（全件削除やインポート用）
 */
export function saveLocalHistory(records: FullMatchRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.SEED_INITIALIZED, 'true');
  localStorage.setItem(STORAGE_KEYS.LOCAL_HISTORY, JSON.stringify(records));
}

/**
 * ローカル対戦履歴に1件追加（最新1000件まで保持）
 */
export function appendLocalHistory(
  payload: MatchLogPayload,
  matchNo: number,
  aiComment: string
): FullMatchRecord[] {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const newRecord: FullMatchRecord = {
    ...payload,
    match_id: matchNo,
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}:${ss}`,
    season: `${yyyy}-${mm}`,
    ai_comment: aiComment,
  };

  const current = getLocalHistory();
  const updated = [newRecord, ...current].slice(0, 1000);
  localStorage.setItem(STORAGE_KEYS.SEED_INITIALIZED, 'true');
  localStorage.setItem(STORAGE_KEYS.LOCAL_HISTORY, JSON.stringify(updated));
  return updated;
}

/**
 * 3.1 GET リクエスト（起動時のマスタ＆ステータス取得）
 * GAS URL が未設定の場合は内蔵のモックデータを返却する
 */
export async function fetchMasterAndStatus(gasUrl: string): Promise<{
  data: GetApiResponse;
  isMock: boolean;
}> {
  const trimmedUrl = gasUrl.trim();
  const savedMyDecks = getSavedMyDecks();

  if (!trimmedUrl) {
    const mockStatus = getLocalMockStatus();
    return {
      isMock: true,
      data: {
        status: 'success',
        master: {
          ...DEFAULT_MASTER_DATA,
          自軍デッキ: savedMyDecks,
        },
        currentStatus: mockStatus,
      },
    };
  }

  const response = await fetch(trimmedUrl, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`GET通信エラー (HTTP ${response.status})`);
  }

  const json = (await response.json()) as GetApiResponse;
  if (json.status !== 'success') {
    throw new Error(json.message || 'GAS側からエラーステータスが返却されました');
  }

  // 自軍デッキ・相手デッキはフロントエンドの最新定義＋GAS側定義を重複排除マージ
  const mergedMyDecks = Array.from(
    new Set([...savedMyDecks, ...(json.master?.自軍デッキ || [])])
  );
  const gasOppDecks = (json.master?.相手デッキ || []).filter((d) => d !== '不明');
  const tierWithoutUnknown = TIER_OPPONENT_DECKS.filter((d) => d !== '不明');
  const mergedOppDecks = Array.from(
    new Set([...tierWithoutUnknown, ...gasOppDecks, '不明'])
  );

  // 誘発・汎用札もフロントエンド最新＋GAS側定義を重複排除マージ
  const gasInteractions = (json.master?.['誘発・汎用札'] || []).filter((c) => c !== 'なし');
  const defaultInteractionsWithoutNone = DEFAULT_INTERACTIONS.filter((c) => c !== 'なし');
  const mergedInteractions = Array.from(
    new Set([...defaultInteractionsWithoutNone, ...gasInteractions, 'なし'])
  );

  // 判断区分・カウンター結果・勝敗主因タグもフロント定義を優先してマージ
  const LEGACY_NAMES = ['セルフ貫通'];
  const mergeList = (front: string[], gas?: string[]) =>
    Array.from(new Set([...front, ...(gas || [])])).filter((v) => !LEGACY_NAMES.includes(v));

  // スプレッドシートから対戦レコードが返却された場合はローカル履歴へ同期保存
  if (Array.isArray(json.records)) {
    saveLocalHistory(json.records);
  }

  return {
    isMock: false,
    data: {
      status: 'success',
      master: {
        ...DEFAULT_MASTER_DATA,
        ...(json.master || {}),
        自軍デッキ: mergedMyDecks,
        相手デッキ: mergedOppDecks,
        '誘発・汎用札': mergedInteractions,
        判断区分: mergeList(DEFAULT_MASTER_DATA.判断区分, json.master?.判断区分),
        カウンター結果: mergeList(DEFAULT_MASTER_DATA.カウンター結果, json.master?.カウンター結果),
        勝敗主因タグ: mergeList(DEFAULT_MASTER_DATA.勝敗主因タグ, json.master?.勝敗主因タグ),
      },
      currentStatus: {
        ...INITIAL_MOCK_STATUS,
        ...(json.currentStatus || {}),
      },
      records: Array.isArray(json.records) ? json.records : undefined,
    },
  };
}

/**
 * 3.2 POST リクエスト（対戦結果の記録）
 * SPEC.md の CORS ベストプラクティスに従い、
 * Content-Type: "text/plain;charset=utf-8" で JSON 文字列を送信する
 */
export async function postMatchLog(
  gasUrl: string,
  payload: MatchLogPayload,
  currentStatus: CurrentStatus
): Promise<{
  response: PostApiResponse;
  isMock: boolean;
}> {
  const trimmedUrl = gasUrl.trim();

  // GAS URL 未設定時は内蔵モックエンジンでシミュレーション実行
  if (!trimmedUrl) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const simulated = simulatePostMatch(payload, currentStatus);
    saveLocalMockStatus(simulated.updatedStatus);
    appendLocalHistory(payload, simulated.recordedMatchNo, simulated.aiComment);
    return {
      isMock: true,
      response: simulated,
    };
  }

  // SPEC.md 3章 厳守: Content-Type: "text/plain;charset=utf-8" を指定してプリフライト(OPTIONS)を回避
  const res = await fetch(trimmedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`POST通信エラー (HTTP ${res.status})`);
  }

  const json = (await res.json()) as PostApiResponse;
  if (json.status !== 'success') {
    throw new Error(json.message || 'GAS側での記録処理中にエラーが発生しました');
  }

  // ローカル履歴にもバックアップとして追加
  appendLocalHistory(payload, json.recordedMatchNo, json.aiComment);

  return {
    isMock: false,
    response: json,
  };
}

/**
 * 遊戯王ニューロンのデッキリストJPG画像をAI (GAS経由 Gemini 2.5 Flash Vision) で解析し、
 * 構造化された DeckRecipeData (モンスター/魔法/罠/EXのカード名と枚数) に変換する
 */
export async function parseDeckImageWithAI(
  gasUrl: string,
  imageBase64: string,
  mimeType: string
): Promise<{
  recipe: DeckRecipeData;
  isMock: boolean;
}> {
  const trimmedUrl = gasUrl.trim();

  // GAS URLが設定されている場合はバックエンドの Gemini Vision OCR (action: 'parse_deck_image') を呼び出す
  if (trimmedUrl) {
    try {
      const res = await fetch(trimmedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'parse_deck_image',
          imageBase64,
          mimeType,
        }),
        redirect: 'follow',
      });

      if (res.ok) {
        const json = (await res.json()) as {
          status: string;
          cards?: DeckCardEntry[];
          message?: string;
        };
        if (json.status === 'success' && Array.isArray(json.cards) && json.cards.length > 0) {
          return {
            recipe: buildDeckRecipeData(json.cards),
            isMock: false,
          };
        }
      }
    } catch (e) {
      console.warn('GAS経由の画像解析が未対応または失敗したためフォールバックします:', e);
    }
  }

  // モックモードまたはGAS側未更新時のシミュレーション（サンプルJPGのオルフェゴール構成を返却）
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    recipe: buildDeckRecipeData(SAMPLE_ORCUST_CARDS),
    isMock: true,
  };
}

/**
 * 案C：スプレッドシートの別シート『デッキレシピ』へ登録デッキ＆採用カード一覧を同期する
 */
export async function syncDecksToSpreadsheet(
  gasUrl: string,
  decks: RegisteredDeck[]
): Promise<{ synced: boolean; message: string }> {
  const trimmedUrl = gasUrl.trim();
  if (!trimmedUrl) {
    return {
      synced: false,
      message: 'ローカル保存完了（GAS URL設定後にスプレッドシート『デッキレシピ』シートへ同期されます）',
    };
  }

  try {
    // 画像サムネイル本体は重いので除外し、構造化レシピとテキストをGASへ送信
    const lightweightDecks = decks.map((d) => ({
      id: d.id,
      name: d.name,
      versionNote: d.versionNote || '',
      updatedAt: d.updatedAt,
      mainCount: d.recipe?.mainCount || 0,
      extraCount: d.recipe?.extraCount || 0,
      compactText: d.recipe?.compactText || '',
      cards: d.recipe?.cards || [],
    }));

    const res = await fetch(trimmedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'sync_decks',
        decks: lightweightDecks,
      }),
      redirect: 'follow',
    });

    if (res.ok) {
      const json = (await res.json()) as { status: string; message?: string };
      if (json.status === 'success') {
        return {
          synced: true,
          message: 'スプレッドシート『デッキレシピ』シートへ同期完了！',
        };
      }
    }
  } catch (e) {
    console.warn('デッキレシピシート同期エラー:', e);
  }

  return {
    synced: false,
    message: 'ローカルに保存しました（GASスクリプトを最新版に更新すると『デッキレシピ』シートにも自動保存されます）',
  };
}
