/**
 * 誘発・妨害・汎用札マスタ定義ファイル (src/config/interactions.ts)
 *
 * Master Duel Meta の usage-rate（使用率ランキング）拡大スクリーンショット全37枚に完全準拠し、
 * 現代マスターデュエル環境で実際に使われる手札誘発・速攻魔法・EX妨害札を網羅しています。
 */

/**
 * 主要手札誘発・汎用妨害札（使用率順・常時表示 21種）
 */
export const STAPLE_HAND_TRAPS: string[] = [
  '増G', // #1: 97.2% (Maxx "C")
  'うらら', // #2: 90.9% (Ash Blossom & Joyous Spring)
  'ドロバ', // #3: 80.3% (Droll & Lock Bird)
  'フワロス', // #4: 64.6% (Mulcharmy Fuwalos)
  '抹殺の指名者', // #5: 44.4% (Crossout Designator)
  '無限泡影', // #6: 41.3% (Infinite Impermanence)
  'ヴェーラー', // #8: 33.2% (Effect Veiler)
  'ハルモニア', // #10: 32.8% (Fydraulis Harmonia / 調和ノ天救竜)
  'The Fallen & The Virtuous', // #12: 32.1% (烙印・ドラグマ速攻魔法)
  '屋敷わらし', // #14: 28.9% (Ghost Belle & Haunted Mansion)
  '三戦の才', // #16: 23.6% (Triple Tactics Talent)
  'プルリア', // #17: 21.7% (Mulcharmy Purulia)
  'ビーステッド', // #18: 20.7% (Bystial Magnamhut / 深淵の獣マグナムート等)
  '禁じられた一滴', // #21: 19.2% (Forbidden Droplet)
  '霊王の波動', // #22: 18.1% (Dominus Impulse)
  '超融合', // #25: 16.6% (Super Polymerization)
  'アトラクター', // #27: 16.3% (Dimension Shifter)
  '幽鬼うさぎ', // #28: 15.6% (Ghost Ogre & Snow Rabbit)
  'ニビル', // #29: 14.8% (Nibiru, the Primal Being)
  '墓穴の指名者', // 定番誘発カウンター (Called by the Grave)
  '霆王の閃光', // 定番ドミナス罠 (Dominus Purge)
];

/**
 * 盤面・EXモンスター妨害＆ハルモニア/落胤関連EX札（「▼ 盤面/EX/他」で展開）
 */
export const EXTENDED_INTERACTIONS: string[] = [
  'S:Pリトルナイト', // #7: 36.5% (S:P Little Knight)
  '馬龍', // #9: 33.2% (Golden Cloud Beast - Malong / 金雲獣－馬龍)
  '黒き竜のエクレシア', // #13: 32.1% (Ecclesia and the Dark Dragon)
  'バロネス', // #15: 23.7% (Baronne de Fleur / フルール・ド・バロネス)
  'ティ・フォン', // #19: 20.6% (Super Starslayer TY-PHON / 厄災の星ティ・フォン)
  'パックビット', // #20: 19.7% (Enigmaster Packbit / エニグマスター・パックビット)
  '白き竜の落胤', // #23: 17.1% (Fallen of the White Dragon)
  '白の聖女エクレシア', // #24: 16.9% (Incredible Ecclesia, the Virtuous)
  '聖痕喰らいし竜', // #26: 16.4% (The Dragon that Devours the Dogma)
  '鎖縛竜ザレン', // #30: 14.5% (Zalen the Shackled Dragon)
  'ウィンドペガサス', // #31: 14.5% (Wind Pegasus @Ignister)
  'アルバスの落胤', // #32: 13.9% (Fallen of Albaz)
  'ミラジェイド', // #33: 13.9% (Mirrorjade the Iceblade Dragon / 氷剣竜ミラジェイド)
  'ガルーラ', // #34: 13.4% (Garura, Wings of Resonant Life / 共命の翼ガルーラ)
  'PSYフレームロード・Ω', // #35: 13.4% (PSY-Framelord Omega)
  '虹光の宣告者', // #37: 13.1% (Herald of the Arc Light)
  '幻影霧剣', // 自軍テーマ妨害
  'アンブレイジベイル', // 自軍テーマ妨害
];

/**
 * 統合版「誘発・汎用札」リスト（マスタ用）
 */
export const DEFAULT_INTERACTIONS: string[] = [
  ...STAPLE_HAND_TRAPS,
  ...EXTENDED_INTERACTIONS,
  'なし',
];
