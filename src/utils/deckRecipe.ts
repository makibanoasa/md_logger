/**
 * 遊戯王ニューロン デッキレシピ画像（JPG）構造化・AI分析テキスト変換・自軍妨害ピックアップユーティリティ
 * (src/utils/deckRecipe.ts)
 */

import { DeckCardCategory, DeckCardEntry, DeckRecipeData, RegisteredDeck } from '../types';

/**
 * ユーザー添付の遊戯王ニューロン出力JPG（オルフェゴール 40枚＋EX15枚）の完全読み取りデータ
 */
export const SAMPLE_ORCUST_CARDS: DeckCardEntry[] = [
  // モンスターカード (29枚)
  { name: 'エフェクト・ヴェーラー', count: 3, category: 'monster' },
  { name: 'ドロール＆ロックバード', count: 2, category: 'monster' },
  { name: 'オルフェゴール・カノーネ', count: 1, category: 'monster' },
  { name: '増殖するG', count: 1, category: 'monster' },
  { name: '灰流うらら', count: 3, category: 'monster' },
  { name: '屋敷わらし', count: 1, category: 'monster' },
  { name: 'オルフェゴール・スケルツォン', count: 3, category: 'monster' },
  { name: 'オルフェゴール・ディヴェル', count: 3, category: 'monster' },
  { name: '宵星の騎士ギルス', count: 3, category: 'monster' },
  { name: 'マルチャミー・フワロス', count: 3, category: 'monster' },
  { name: '星遺物－『星冠』', count: 1, category: 'monster' },
  { name: 'オルフェゴール・トロイメア', count: 3, category: 'monster' },
  { name: '星遺物－『星杖』', count: 1, category: 'monster' },
  { name: 'NT8000－SIRIUS', count: 1, category: 'monster' },

  // 魔法カード (7枚)
  { name: 'おろかな埋葬', count: 1, category: 'spell' },
  { name: 'おろかな副葬', count: 1, category: 'spell' },
  { name: 'オルフェゴール・プライム', count: 3, category: 'spell' },
  { name: 'オルフェゴール・バベル', count: 1, category: 'spell' },
  { name: '抹殺の指名者', count: 1, category: 'spell' },

  // 罠カード (4枚)
  { name: '無限泡影', count: 3, category: 'trap' },
  { name: 'オルフェゴール・クリマクス', count: 1, category: 'trap' },

  // エクストラデッキ (15枚)
  { name: '宵星の機神ディンギルス', count: 2, category: 'extra' },
  { name: 'トロイメア・マーメイド', count: 1, category: 'extra' },
  { name: 'オルフェゴール・ガラテアi', count: 1, category: 'extra' },
  { name: 'トロイメア・フェニックス', count: 1, category: 'extra' },
  { name: 'オルフェゴール・ガラテア', count: 2, category: 'extra' },
  { name: 'I：Pマスカレーナ', count: 1, category: 'extra' },
  { name: '警衛バリケイドベルグ', count: 1, category: 'extra' },
  { name: 'S：Pリトルナイト', count: 1, category: 'extra' },
  { name: 'オルフェゴール・ロンギルス', count: 1, category: 'extra' },
  { name: 'W：Pファンシーボール', count: 1, category: 'extra' },
  { name: 'ヴァレルソード・ドラゴン', count: 1, category: 'extra' },
  { name: 'アクセスコード・トーカー', count: 1, category: 'extra' },
  { name: '宵星の騎士エンリルギルス', count: 1, category: 'extra' },
];

/**
 * カード配列からスプレッドシート（DB）＆Gemini分析用の1行コンパクトテキストを生成する
 * 例: "[Main40(M29/S7/T4)] エフェクト・ヴェーラー×3, ドロール＆ロックバード×2, ... | [EX15] 宵星の機神ディンギルス×2, ..."
 */
export function buildDeckRecipeData(cards: DeckCardEntry[]): DeckRecipeData {
  const validCards = cards.filter((c) => c.name.trim() && c.count > 0);
  const monsters = validCards.filter((c) => c.category === 'monster');
  const spells = validCards.filter((c) => c.category === 'spell');
  const traps = validCards.filter((c) => c.category === 'trap');
  const extras = validCards.filter((c) => c.category === 'extra');

  const sumCount = (list: DeckCardEntry[]) => list.reduce((acc, c) => acc + c.count, 0);
  const mCount = sumCount(monsters);
  const sCount = sumCount(spells);
  const tCount = sumCount(traps);
  const mainCount = mCount + sCount + tCount;
  const extraCount = sumCount(extras);

  const fmtList = (list: DeckCardEntry[]) => list.map((c) => `${c.name}×${c.count}`).join(', ');

  const mainParts: string[] = [];
  if (monsters.length > 0) mainParts.push(`【モンスター${mCount}】${fmtList(monsters)}`);
  if (spells.length > 0) mainParts.push(`【魔法${sCount}】${fmtList(spells)}`);
  if (traps.length > 0) mainParts.push(`【罠${tCount}】${fmtList(traps)}`);

  const exPart = extras.length > 0 ? `【EX${extraCount}】${fmtList(extras)}` : '';

  const compactText = `[Main${mainCount}] ${mainParts.join(' / ')}${exPart ? ` | ${exPart}` : ''}`;

  return {
    mainCount,
    extraCount,
    cards: validCards,
    compactText,
  };
}

/**
 * テキストエリアでの一括編集用に、カード配列を人間が読み書きしやすい複数行テキストへ変換
 */
export function formatMultiLineRecipeText(cards: DeckCardEntry[]): string {
  const sections: { key: DeckCardCategory; label: string }[] = [
    { key: 'monster', label: '# モンスター' },
    { key: 'spell', label: '# 魔法' },
    { key: 'trap', label: '# 罠' },
    { key: 'extra', label: '# エクストラ' },
  ];

  const lines: string[] = [];
  for (const sec of sections) {
    const items = cards.filter((c) => c.category === sec.key);
    lines.push(sec.label);
    for (const item of items) {
      lines.push(`${item.name} ×${item.count}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

/**
 * 複数行テキスト（「カード名 ×3」「カード名 3」など）から DeckCardEntry[] へパースする
 */
export function parseMultiLineRecipeText(rawText: string): DeckCardEntry[] {
  const lines = rawText.split(/\r?\n/);
  let currentCategory: DeckCardCategory = 'monster';
  const result: DeckCardEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // セクション見出し判定
    if (/^(#|【|\[)?\s*(モンスター|Monster)/i.test(line)) {
      currentCategory = 'monster';
      continue;
    }
    if (/^(#|【|\[)?\s*(魔法|Spell)/i.test(line)) {
      currentCategory = 'spell';
      continue;
    }
    if (/^(#|【|\[)?\s*(罠|トラップ|Trap)/i.test(line)) {
      currentCategory = 'trap';
      continue;
    }
    if (/^(#|【|\[)?\s*(エクストラ|EX|Extra)/i.test(line)) {
      currentCategory = 'extra';
      continue;
    }
    if (line.startsWith('#') || line.includes('合計>>>')) {
      continue;
    }

    // 「1 エフェクト・ヴェーラー 3」や「エフェクト・ヴェーラー×3」「エフェクト・ヴェーラー x3」などを解析
    const cleaned = line.replace(/^\d+[\s.、:：]+/, '').trim();
    const match = cleaned.match(/^(.+?)\s*[×xX＊*枚\s]\s*(\d+)\s*枚?$/);
    if (match) {
      const name = match[1].trim();
      const count = Math.max(1, Math.min(3, parseInt(match[2], 10) || 1));
      if (name) {
        result.push({ name, count, category: currentCategory });
      }
    } else {
      result.push({ name: cleaned, count: 1, category: currentCategory });
    }
  }

  return result;
}

/**
 * ニューロン上の正式カード名 ➔ 対戦記録用の略称タグへの変換マップ
 * 統計の一貫性を保つため、定番誘発・汎用妨害は既存の略称タグ（増G、うらら等）に統一する
 */
const OFFICIAL_TO_SHORT_INTERACTION_MAP: { pattern: RegExp; shortName: string }[] = [
  { pattern: /増殖する[GＧ]/, shortName: '増G' },
  { pattern: /灰流うらら/, shortName: 'うらら' },
  { pattern: /ドロール[＆&]ロックバード/, shortName: 'ドロバ' },
  { pattern: /マルチャミー・フワロス/, shortName: 'フワロス' },
  { pattern: /マルチャミー・プルリア/, shortName: 'プルリア' },
  { pattern: /墓穴の指名者/, shortName: '墓穴の指名者' },
  { pattern: /抹殺の指名者/, shortName: '抹殺の指名者' },
  { pattern: /無限泡影/, shortName: '無限泡影' },
  { pattern: /エフェクト・ヴェーラー/, shortName: 'ヴェーラー' },
  { pattern: /屋敷わらし/, shortName: 'わらし' },
  { pattern: /幽鬼うさぎ/, shortName: 'うさぎ' },
  { pattern: /原始生命態ニビル/, shortName: 'ニビル' },
  { pattern: /ディメンション・アトラクター/, shortName: 'アトラクター' },
  { pattern: /霊王の波動/, shortName: '霊王の波動' },
  { pattern: /聖王の粉砕/, shortName: '聖王の粉砕' },
  { pattern: /列王詩篇/, shortName: '列王詩篇' },
  { pattern: /調和ノ天救竜/, shortName: 'ハルモニア' },
  { pattern: /深淵の獣マグナムート/, shortName: 'マグナムート' },
  { pattern: /深淵の獣ドルイドヴルム/, shortName: 'ビーステッド' },
  { pattern: /深淵の獣バルドレイク/, shortName: 'ビーステッド' },
  { pattern: /S[：:]Pリトルナイト/, shortName: 'リトルナイト' },
  { pattern: /I[：:]Pマスカレーナ/, shortName: 'マスカレーナ' },
  { pattern: /フルール・ド・バロネス/, shortName: 'バロネス' },
  { pattern: /厄災の星ティ・フォン/, shortName: 'ティ・フォン' },
  { pattern: /三戦の才/, shortName: '三戦の才' },
  { pattern: /三戦の号/, shortName: '三戦の号' },
  { pattern: /禁じられた一滴/, shortName: '禁じられた一滴' },
  { pattern: /超融合/, shortName: '超融合' },
  { pattern: /冥王結界波/, shortName: '冥王結界波' },
  { pattern: /ライトニング・ストーム/, shortName: 'ライスト' },
  { pattern: /ハーピィの羽根帚/, shortName: '羽根帚' },
  { pattern: /拮抗勝負/, shortName: '拮抗勝負' },
  { pattern: /レッド・リブート/, shortName: 'リブート' },
  { pattern: /サイフレームギア・[γガンマ]|PSYフレームギア・γ/, shortName: 'γ(ガンマ)' },
  { pattern: /PSYフレームロード・Ω/, shortName: 'Ω(オメガ)' },
  { pattern: /カオス・アンヘ[ル]/, shortName: 'カオス・アンヘル' },
  { pattern: /氷剣竜ミラジェイド/, shortName: 'ミラジェイド' },
  { pattern: /共命の翼ガルーラ/, shortName: 'ガルーラ' },
  { pattern: /沼地のドロゴン/, shortName: 'ドロゴン' },
  { pattern: /ウインドペガサス＠イグニスター/, shortName: 'ウインドペガサス' },
  { pattern: /虹光の宣告者/, shortName: 'アーデク' },
  { pattern: /黄金雲獣－マリョク|黄金雲獣/, shortName: '黄金雲獣' },
  { pattern: /エニグマスター・パックビット/, shortName: 'パックビット' },
  { pattern: /鎖縛竜ザレン/, shortName: 'ザレン' },
  { pattern: /幻影霧剣/, shortName: '幻影霧剣' },
];

export interface DeckExtractedInteraction {
  /** ペアビルダーで記録されるカード名（定番札は略称、テーマ札はカード名） */
  tag: string;
  /** ニューロンレシピ上の正式カード名 */
  officialName: string;
  /** デッキ内の採用枚数 */
  count: number;
  /** 定番誘発・汎用妨害か、テーマ固有カードか */
  isStaple: boolean;
  /** カテゴリ */
  category: DeckCardCategory;
}

/**
 * 登録デッキのレシピから「自軍妨害」の候補を自動ピックアップする
 * - 1. 定番の手札誘発・汎用妨害・EX汎用妨害（増G、うらら、ヴェーラー、泡影、リトルナイト等）を最優先抽出
 * - 2. テーマ内の罠・EXモンスター・妨害になり得るカード（クリマクス、ディンギルス、エンリルギルス等）も抽出
 */
export function extractDeckInteractionsForBuilder(deck?: RegisteredDeck): {
  stapleDeckCards: DeckExtractedInteraction[];
  themeDeckCards: DeckExtractedInteraction[];
} {
  if (!deck?.recipe?.cards || deck.recipe.cards.length === 0) {
    return { stapleDeckCards: [], themeDeckCards: [] };
  }

  const stapleDeckCards: DeckExtractedInteraction[] = [];
  const themeDeckCards: DeckExtractedInteraction[] = [];
  const seenTags = new Set<string>();

  for (const card of deck.recipe.cards) {
    const matchedRule = OFFICIAL_TO_SHORT_INTERACTION_MAP.find((r) =>
      r.pattern.test(card.name)
    );

    if (matchedRule) {
      if (!seenTags.has(matchedRule.shortName)) {
        seenTags.add(matchedRule.shortName);
        stapleDeckCards.push({
          tag: matchedRule.shortName,
          officialName: card.name,
          count: card.count,
          isStaple: true,
          category: card.category,
        });
      }
    } else {
      // テーマ内の罠カード・EXモンスター・フィールド/速攻魔法・メインモンスターをピックアップ
      if (!seenTags.has(card.name)) {
        seenTags.add(card.name);
        themeDeckCards.push({
          tag: card.name,
          officialName: card.name,
          count: card.count,
          isStaple: false,
          category: card.category,
        });
      }
    }
  }

  // テーマカードは「罠 ➔ EX ➔ 魔法 ➔ モンスター」の順で妨害に使われやすい順に並べる
  const categoryOrder: Record<DeckCardCategory, number> = {
    trap: 1,
    extra: 2,
    spell: 3,
    monster: 4,
  };
  themeDeckCards.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

  return { stapleDeckCards, themeDeckCards };
}

export interface ProcessedDeckFileResult {
  ocrBase64: string;
  mimeType: string;
  previewDataUrl?: string;
  fileName: string;
  isPdf: boolean;
}

/**
 * アップロードされたデッキリスト（JPG画像またはPDF）を処理する
 * - JPG画像: Canvasで適度な解像度（長辺1400px）とサムネイル（長辺360px）にリサイズ
 * - PDF: バイナリを直接Base64化（Gemini 2.5 Flash VisionがネイティブでPDFをマルチモーダル処理可能）
 */
export async function processUploadedDeckFile(file: File): Promise<ProcessedDeckFileResult> {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  // PDFファイルの場合：Canvasでのリサイズをスキップし、そのままBase64化
  if (isPdf) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const resultStr = reader.result as string;
          const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
          resolve({
            ocrBase64: base64,
            mimeType: 'application/pdf',
            previewDataUrl: undefined,
            fileName: file.name,
            isPdf: true,
          });
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('PDFファイルの読み込みに失敗しました'));
      reader.readAsDataURL(file);
    });
  }

  // 画像ファイル（JPG/PNG等）の場合：Canvasで軽量化＆サムネイル生成
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // 1. OCR送信用（長辺1400px・JPEG品質0.85で文字の鮮明さを維持しつつ軽量化）
        const makeResizedDataUrl = (maxDim: number, quality: number) => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context error');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', quality);
        };

        try {
          const ocrDataUrl = makeResizedDataUrl(1400, 0.85);
          const previewDataUrl = makeResizedDataUrl(360, 0.7);
          const ocrBase64 = ocrDataUrl.split(',')[1] || '';
          resolve({
            ocrBase64,
            mimeType: 'image/jpeg',
            previewDataUrl,
            fileName: file.name,
            isPdf: false,
          });
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('ファイルの読み取りに失敗しました'));
    reader.readAsDataURL(file);
  });
}

/** 既存コードとの後方互換用エイリアス */
export const processUploadedDeckImage = processUploadedDeckFile;
