/**
 * デッキ候補マスタ定義ファイル (src/config/decks.ts)
 *
 * 頻繁にメンテナンス（追加・並び替え・削除）を行う前提で、
 * 自軍デッキ・相手デッキの定義をこのファイルに集約しています。
 * また、アプリ画面上の「✏️ 候補メンテ」ボタンからもリアルタイムに追加・削除が可能です。
 */

import { RegisteredDeck } from '../types';
import { SAMPLE_ORCUST_CARDS, buildDeckRecipeData } from '../utils/deckRecipe';

/**
 * 自分の使用デッキ（ワンタップ入力候補）
 * メンテ時はこの配列を編集するか、アプリ内の「デッキ」タブ / 「✏️ 候補メンテ」から追加・削除してください。
 */
export const DEFAULT_MY_DECKS: string[] = [
  '幻影騎士団',
  'オルフェゴール',
  'シャドール',
  '召喚獣',
  '磁石の戦士',
];

/**
 * 初期登録マイデッキ一覧（遊戯王ニューロン出力JPGからの採用カードレシピ構造化＆DB連携用）
 * 添付いただいた「オルフェゴール（メイン40枚 / EX15枚）」の読み取り結果を初期搭載しています。
 */
export const DEFAULT_REGISTERED_DECKS: RegisteredDeck[] = [
  {
    id: 'deck-pk-1',
    name: '幻影騎士団',
    versionNote: 'メイン構築',
    neuronUrl: '',
    isActive: true,
    updatedAt: '2026-11-05',
  },
  {
    id: 'deck-orcust-1',
    name: 'オルフェゴール',
    versionNote: '40枚構築（フワロス3・ヴェーラー3・ドロバ2型）',
    recipe: buildDeckRecipeData(SAMPLE_ORCUST_CARDS),
    neuronUrl: '',
    isActive: true,
    updatedAt: '2026-11-05',
  },
  {
    id: 'deck-shaddoll-1',
    name: 'シャドール',
    versionNote: 'メイン構築',
    neuronUrl: '',
    isActive: true,
    updatedAt: '2026-11-05',
  },
  {
    id: 'deck-invoked-1',
    name: '召喚獣',
    versionNote: 'メイン構築',
    neuronUrl: '',
    isActive: true,
    updatedAt: '2026-11-05',
  },
  {
    id: 'deck-magnet-1',
    name: '磁石の戦士',
    versionNote: 'メイン構築',
    neuronUrl: '',
    isActive: true,
    updatedAt: '2026-11-05',
  },
];

/**
 * 相手デッキ候補：Tier上位・高シェア流行デッキ（Master Duel Meta 準拠・常時表示）
 */
export const TIER_OPPONENT_DECKS: string[] = [
  'エルフェンノーツ', // ELFNOTE (Tier 1)
  'エルフェンノーツ・キラーチューン', // ELFNOTE KEWL TUNE (Tier 1)
  'ドラゴンテイル', // DRACOTAIL / 星辰 (Tier 2)
  '召喚獣', // INVOKED (Tier 2)
  'アルトメギア', // ARTMAGE / 神芸学徒 (Tier 2)
  '閃刀姫', // SKY STRIKER
  '烙印', // BRANDED (Tier 3)
  '道化の一座', // CLOWN CREW / クラウン・クラン
  'ドゥームズ', // DOOMZ / 終刻 (Tier 2)
  'M∀LICE', // MALISS (Tier 3)
  '青眼', // BLUE-EYES
  'マギストス妖精伝姫', // MAGISTUS FAIRY TAIL
  'オルフェゴール', // ORCUST
  'ライゼオル巳剣', // RYZEAL MITSURUGI
  '獄神', // POWER PATRON
  'VS K9', // VANQUISH SOUL K9
  '月光', // LUNALIGHT
  'ティアラメンツ', // TEARLAMENTS
  '幻影騎士団', // PHANTOM KNIGHTS (Tier 3)
  'レッド・デーモン', // RESONATORS
  'ヤミー', // YUMMY
  'エクソシスター', // EXOSISTER
  '堕天使', // DARKLORD
  '糾罪巧', // ENNEACRAFT / エネアクラフト
  'HERO', // HEROS
  'キラーチューン', // KEWL TUNE
  'ラビュリンス', // LABRYNTH
  'リシド', // ODION / 王家の神殿
  '天盃龍', // TENPAI DRAGON
  'K9', // K9
  '巳剣', // MITSURUGI
  '絢嵐十二獣', // RADIANT TYPHOON ZOODIAC
  '不明',
];

/**
 * 相手デッキ候補：準流行・その他掲載デッキ（Master Duel Meta 下段掲載分・「＋他候補」で展開）
 */
export const EXTENDED_OPPONENT_DECKS: string[] = [
  '列車', // RAILWAY
  'パンプキング', // PUMPKING ZOMBIES
  'R.B.', // R.B.
  'シンクロン', // SYNCHRONS
  'ブラック・マジシャン', // DARK MAGICIAN
  'ドラゴンメイド', // DRAGONMAID
  '空牙団', // FUR HIRE
  '磁石の戦士', // MAGNET WARRIOR
  '海皇水精鱗', // MERMAIL ATLANTEAN
  '巳剣ヤミー', // MITSURUGI YUMMY
  '幻影オルフェゴール', // PHANTOM KNIGHTS ORCUST
  'シャドール', // SHADDOLL
  'SPYRAL', // SPYRAL
  '古代の機械', // ANCIENT GEAR
  'バンケットFTK', // BANQUET FTK
  'キマイラ', // CHIMERA
  'サイバー・ドラゴン', // CYBER DRAGON
  '炎王', // FIRE KING
  'ジェムナイト', // GEM-KNIGHTS
  'クシャトリラ', // KASHTIRA
  'マギストス霊使い', // MAGISTUS CHARMER
  '斬機', // MATHMECH
  'メガリス', // MEGALITH
  'メメント', // MEMENTO
  'オノマト', // ONOMAT
  '原石', // PRIMITE
  'ピュアリィ', // PURRELY
  '絢嵐', // RADIANT TYPHOON
];

/**
 * デフォルト相手デッキ全リスト（統合版）
 */
export const DEFAULT_OPPONENT_DECKS: string[] = [
  ...TIER_OPPONENT_DECKS.filter((d) => d !== '不明'),
  ...EXTENDED_OPPONENT_DECKS,
  '不明',
];
