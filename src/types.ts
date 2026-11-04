/**
 * SPEC.md ＋ 拡張仕様（コイントス・ニューロンJPGデッキレシピ構造化・ダッシュボード・統計）準拠の型定義ファイル
 */

/** マスタ設定データの型定義 */
export interface MasterData {
  自軍デッキ: string[];
  相手デッキ: string[];
  '誘発・汎用札': string[];
  対象プリセット: string[];
  判断区分: string[];
  カウンター結果: string[];
  勝敗主因タグ: string[];
}

/** デッキ内カードのカテゴリ区分 */
export type DeckCardCategory = 'monster' | 'spell' | 'trap' | 'extra';

/** デッキ内の1カード項目（カード名・採用枚数・カテゴリ） */
export interface DeckCardEntry {
  name: string;
  count: number;
  category: DeckCardCategory;
}

/** 構造化されたデッキレシピデータ（ニューロンJPG読み取り結果） */
export interface DeckRecipeData {
  /** メインデッキ合計枚数 */
  mainCount: number;
  /** エクストラデッキ合計枚数 */
  extraCount: number;
  /** モンスター・魔法・罠・EXの全採用カード配列 */
  cards: DeckCardEntry[];
  /** スプレッドシート（DB）＆Gemini分析用の1行コンパクトテキスト */
  compactText: string;
}

/**
 * アプリ内に登録するマイデッキ情報（ニューロン出力JPGからの採用カード構造化＆DB連携対応）
 */
export interface RegisteredDeck {
  /** デッキ固有ID（スプレッドシートの『デッキレシピ』シートと紐付くID） */
  id: string;
  /** デッキ名（例: オルフェゴール） */
  name: string;
  /** 構築バージョン・メモ（例: 2026.11 フワロス3・ドロバ2採用40枚型） */
  versionNote?: string;
  /** 構造化された採用カードレシピ（ニューロンJPGから抽出） */
  recipe?: DeckRecipeData;
  /** アップロードされたニューロンJPGの軽量サムネイルDataURL（端末内確認用） */
  imagePreviewDataUrl?: string;
  /** 遊戯王ニューロン / 公式カードDBのデッキURL（任意補助） */
  neuronUrl?: string;
  /** 記録画面のワンタップ候補に表示するか */
  isActive: boolean;
  /** 登録・更新日時 */
  updatedAt: string;
}

/**
 * プロフィール＆目標・ストッパー設定の型定義
 */
export interface UserProfileConfig {
  /** プレイヤー名 */
  duelistName: string;
  /** マスターデュエル プレイヤーID (9桁等) */
  mdPlayerId: string;
  /** 今シーズンの目標勝ち越し数（M1までの初期設定値） */
  targetNetWins: number;
  /** 連敗ストッパー発動閾値（デフォルト: 3連敗） */
  loseStreakStopperThreshold: number;
  /** メンタル警告を出すストレス閾値（デフォルト: Lv.4） */
  highStressThreshold: number;
  /** シーズンメモ・抱負 */
  seasonGoalMemo: string;
}

/** 現在のステータス集計情報の型定義 */
export interface CurrentStatus {
  lastRank: string;
  lastDeck: string;
  totalMatches: number;
  todayMatches: number;
  todayWins: number;
  todayLosses: number;
  todayWinRate: number;
  currentLoseStreak: number;
  consecutiveHighStress: number;
  remainingNetWins: number;
  dashboardAlert: string;
  stopperAlerts: string[];
  isStopperTriggered: boolean;
}

/** GET リクエストのレスポンス型定義 */
export interface GetApiResponse {
  status: 'success' | 'error';
  master: MasterData;
  currentStatus: CurrentStatus;
  /** スプレッドシート『対戦ログ』から読み出した過去対戦レコード全件（最新順） */
  records?: FullMatchRecord[];
  message?: string;
}

/** POST リクエストで送信する対戦記録ペイロード（案C：デッキID＋採用カード一覧テキストの両方を送信） */
export interface MatchLogPayload {
  /** Col E (5): 現在ランク */
  my_rank: string;
  /** Col F (6): 使用デッキ */
  my_deck: string;
  /** 使用デッキの登録ID（別シート『デッキレシピ』とのリレーション用） */
  my_deck_id?: string;
  /** 使用デッキの採用カード一覧テキスト（『対戦ログ』シートに直接持たせるGemini分析用テキスト） */
  my_deck_recipe?: string;
  /** 補助：使用デッキに紐付くニューロンURL */
  my_deck_url?: string;
  /** コイントス結果 ("表" | "裏") */
  coin?: '表' | '裏' | '';
  /** Col G (7): 先攻/後攻 ("先攻" | "後攻") */
  turn: '先攻' | '後攻' | '';
  /** Col H (8): 勝敗 ("Win" | "Lose") */
  result: 'Win' | 'Lose' | '';
  /** Col I (9): 判断区分 */
  play_decision: string;
  /** Col J (10): 相手デッキ */
  opp_deck: string;
  /** Col K (11): 自デッキ初動有無 ("○" | "×") */
  has_starter: '○' | '×';
  /** Col L (12): カウンター結果 */
  counter_action: string;
  /** Col M (13): 被弾妨害(誘発➔対象) */
  opp_interactions: string[];
  /** Col N (14): 自軍妨害(使用札➔対象) */
  my_interactions: string[];
  /** Col O (15): 勝敗主因タグ */
  game_factor: string;
  /** Col P (16): ストレス度 (1〜5) */
  stress_level: number;
  /** Col Q (17): 一言メモ */
  memo: string;
}

/** POST リクエストのレスポンス型定義 */
export interface PostApiResponse {
  status: 'success' | 'error';
  recordedMatchNo: number;
  aiComment: string;
  updatedStatus: CurrentStatus;
  message?: string;
}

/** ローカル履歴・統計集計用の拡張ログ型 */
export interface FullMatchRecord extends MatchLogPayload {
  match_id: number;
  date: string;
  time: string;
  season: string;
  ai_comment: string;
}
