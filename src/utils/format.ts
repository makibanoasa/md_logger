/**
 * 日付・シーズン等のフォーマット＆正規化ユーティリティ (src/utils/format.ts)
 */

/**
 * スプレッドシートやAPIから渡される様々なシーズン表記（Date文字列 "Sun Nov 01 2026..." や "2026-11" など）を
 * 統一された "YYYY-MM" 形式に安全に正規化する
 */
export function normalizeSeason(season?: unknown, date?: string): string {
  if (season) {
    const s = String(season).trim();
    // すでに "YYYY-MM" 形式ならそのまま返却
    if (/^\d{4}-\d{2}$/.test(s)) {
      return s;
    }
    // "YYYY/MM" 形式
    if (/^\d{4}\/\d{1,2}$/.test(s)) {
      const parts = s.split('/');
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
    // Date.parse で解釈可能な文字列 (例: "Sun Nov 01 2026 00:00:00 GMT+0900 (日本標準時)")
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
  }

  // season が不正な場合は date ("YYYY-MM-DD") から抽出
  if (date) {
    const d = String(date).trim();
    if (/^\d{4}-\d{2}/.test(d)) {
      return d.slice(0, 7);
    }
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
  }

  return '';
}
