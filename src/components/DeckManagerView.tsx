import React, { useState } from 'react';
import {
  RegisteredDeck,
  FullMatchRecord,
  DeckCardEntry,
  DeckCardCategory,
} from '../types';
import { DEFAULT_REGISTERED_DECKS } from '../config/decks';
import {
  buildDeckRecipeData,
  formatMultiLineRecipeText,
  parseMultiLineRecipeText,
  processUploadedDeckFile,
  extractDeckInteractionsForBuilder,
  SAMPLE_ORCUST_CARDS,
} from '../utils/deckRecipe';
import { parseDeckImageWithAI, syncDecksToSpreadsheet } from '../api';

interface DeckManagerViewProps {
  decks: RegisteredDeck[];
  records: FullMatchRecord[];
  selectedDeckId: string;
  gasUrl: string;
  onUpdateDecks: (nextDecks: RegisteredDeck[]) => void;
  onSelectActiveDeck: (deck: RegisteredDeck) => void;
}

const CATEGORY_LABELS: { key: DeckCardCategory; label: string; badgeClass: string }[] = [
  {
    key: 'monster',
    label: 'モンスター',
    badgeClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  },
  {
    key: 'spell',
    label: '魔法',
    badgeClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  },
  {
    key: 'trap',
    label: '罠',
    badgeClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
  },
  {
    key: 'extra',
    label: 'EXデッキ',
    badgeClass: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  },
];

/**
 * デッキ登録＆遊戯王ニューロンJPG画像からの採用カード構造化管理画面 (src/components/DeckManagerView.tsx)
 * - 案C準拠：
 *   1. ニューロンから出力したデッキリストJPGをAIで読み取り、全採用カード（モンスター/魔法/罠/EX）をテキスト化
 *   2. 別シート『デッキレシピ』への同期と、『対戦ログ』各行への採用カードテキスト自動付与の両方に対応
 *   3. 登録された採用カードから「自軍妨害」の候補チップを自動ピックアップ
 */
export const DeckManagerView: React.FC<DeckManagerViewProps> = ({
  decks,
  records,
  selectedDeckId,
  gasUrl,
  onUpdateDecks,
  onSelectActiveDeck,
}) => {
  // 編集中のデッキID（新規作成時は 'NEW'）
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editVersionNote, setEditVersionNote] = useState<string>('');
  const [editCards, setEditCards] = useState<DeckCardEntry[]>([]);
  const [editPreviewImage, setEditPreviewImage] = useState<string>('');
  const [editPreviewFileName, setEditPreviewFileName] = useState<string>('');
  const [isBulkTextMode, setIsBulkTextMode] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>('');

  // 新規カード1行追加用
  const [newCardName, setNewCardName] = useState<string>('');
  const [newCardCount, setNewCardCount] = useState<number>(3);
  const [newCardCat, setNewCardCat] = useState<DeckCardCategory>('monster');

  // JPG/PDFファイルAI解析中のローディング・ステータスメッセージ
  const [isParsingImage, setIsParsingImage] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>('deck-orcust-1');

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 6000);
  };

  /**
   * 既存デッキの編集開始
   */
  const startEdit = (deck: RegisteredDeck) => {
    setEditingId(deck.id);
    setEditName(deck.name);
    setEditVersionNote(deck.versionNote || '');
    const initialCards = deck.recipe?.cards ? [...deck.recipe.cards] : [];
    setEditCards(initialCards);
    setEditPreviewImage(deck.imagePreviewDataUrl || '');
    setEditPreviewFileName('');
    setBulkText(formatMultiLineRecipeText(initialCards));
    setIsBulkTextMode(false);
  };

  /**
   * 新規デッキの登録開始
   */
  const startCreateNew = () => {
    setEditingId('NEW');
    setEditName('');
    setEditVersionNote('');
    setEditCards([]);
    setEditPreviewImage('');
    setEditPreviewFileName('');
    setBulkText(formatMultiLineRecipeText([]));
    setIsBulkTextMode(false);
  };

  /**
   * ニューロンのデッキリストファイル（JPG/PNG/PDF）が選択されたときのAI読み取り処理
   */
  const handleDeckFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingImage(true);
    try {
      const { ocrBase64, mimeType, previewDataUrl, isPdf, fileName } =
        await processUploadedDeckFile(file);
      setEditPreviewImage(previewDataUrl || '');
      setEditPreviewFileName(isPdf ? fileName : '');

      const { recipe } = await parseDeckImageWithAI(gasUrl, ocrBase64, mimeType);
      setEditCards(recipe.cards);
      setBulkText(formatMultiLineRecipeText(recipe.cards));

      const fileTypeLabel = isPdf ? 'PDF' : 'JPG';
      showToast(
        `✨ Gemini Visionで${fileTypeLabel}を解析完了！メイン${recipe.mainCount}枚 / EX${recipe.extraCount}枚を構造化しました`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ファイル解析エラー';
      showToast(`⚠️ ${msg}`);
    } finally {
      setIsParsingImage(false);
      e.target.value = '';
    }
  };

  /**
   * 個別カードの枚数変更（0になったら削除）
   */
  const handleChangeCardCount = (index: number, delta: number) => {
    const next = editCards
      .map((c, idx) => (idx === index ? { ...c, count: Math.min(3, c.count + delta) } : c))
      .filter((c) => c.count > 0);
    setEditCards(next);
    setBulkText(formatMultiLineRecipeText(next));
  };

  /**
   * 個別カードの1件追加
   */
  const handleAddSingleCard = () => {
    const trimmed = newCardName.trim();
    if (!trimmed) return;
    const next = [
      ...editCards,
      { name: trimmed, count: newCardCount, category: newCardCat },
    ];
    setEditCards(next);
    setBulkText(formatMultiLineRecipeText(next));
    setNewCardName('');
  };

  /**
   * 編集内容の保存（ローカル保存 ＆ スプレッドシート『デッキレシピ』シートへの同期）
   */
  const handleSaveDeck = async () => {
    const finalName = editName.trim() || 'マイデッキ';
    const finalCards = isBulkTextMode ? parseMultiLineRecipeText(bulkText) : editCards;
    const builtRecipe = finalCards.length > 0 ? buildDeckRecipeData(finalCards) : undefined;
    const today = new Date().toISOString().slice(0, 10);

    let nextDecks: RegisteredDeck[];
    if (editingId === 'NEW') {
      const created: RegisteredDeck = {
        id: `deck-${Date.now()}`,
        name: finalName,
        versionNote: editVersionNote.trim() || 'メイン構築',
        recipe: builtRecipe,
        imagePreviewDataUrl: editPreviewImage || undefined,
        isActive: true,
        updatedAt: today,
      };
      nextDecks = [...decks, created];
      onSelectActiveDeck(created);
      setExpandedDeckId(created.id);
    } else {
      nextDecks = decks.map((d) =>
        d.id === editingId
          ? {
              ...d,
              name: finalName,
              versionNote: editVersionNote.trim(),
              recipe: builtRecipe,
              imagePreviewDataUrl: editPreviewImage || d.imagePreviewDataUrl,
              updatedAt: today,
            }
          : d
      );
      setExpandedDeckId(editingId);
    }

    onUpdateDecks(nextDecks);
    setEditingId(null);

    // 案C：スプレッドシート側の『デッキレシピ』シートへも非同期で同期
    const syncRes = await syncDecksToSpreadsheet(gasUrl, nextDecks);
    showToast(`✅ ${syncRes.message}`);
  };

  const handleToggleActive = (id: string) => {
    const activeCount = decks.filter((d) => d.isActive).length;
    const target = decks.find((d) => d.id === id);
    if (target?.isActive && activeCount <= 1) {
      alert('最低1つのデッキはワンタップ候補として有効にしておく必要があります。');
      return;
    }
    const next = decks.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d));
    onUpdateDecks(next);
  };

  const handleDeleteDeck = (id: string) => {
    if (decks.length <= 1) return;
    const next = decks.filter((d) => d.id !== id);
    onUpdateDecks(next);
  };

  // デッキごとの戦績集計ヘルパー
  const getDeckStats = (deck: RegisteredDeck) => {
    const matched = records.filter(
      (r) => r.my_deck_id === deck.id || (!r.my_deck_id && r.my_deck === deck.name)
    );
    const total = matched.length;
    const wins = matched.filter((r) => r.result === 'Win').length;
    const starterOk = matched.filter((r) => r.has_starter === '○').length;
    return {
      total,
      wins,
      losses: total - wins,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      starterRate: total > 0 ? Math.round((starterOk / total) * 100) : 0,
    };
  };

  return (
    <div className="max-w-md mx-auto px-3 pt-3 pb-24 space-y-3.5 animate-fadeIn">
      {/* ヘッダー説明＆新規登録・シート同期ボタン */}
      <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-white">
              💼 デッキレシピ管理（ニューロンJPG / PDF ➔ DB構造化）
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              遊戯王ニューロンのデッキリスト（JPG画像またはPDF）から採用カードを自動抽出し、スプレッドシート（『デッキレシピ』シート＋『対戦ログ』列）と自軍妨害候補へ連動します
            </p>
          </div>
          <button
            type="button"
            onClick={() => (editingId ? setEditingId(null) : startCreateNew())}
            className="shrink-0 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md"
          >
            {editingId ? '閉じる' : '＋ 新規デッキ'}
          </button>
        </div>

        {/* スプレッドシート『デッキレシピ』シートへの手動同期ボタン */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
          <span className="text-slate-400">
            📊 案C：『デッキレシピ』シート＆『対戦ログ』両対応
          </span>
          <button
            type="button"
            onClick={async () => {
              const res = await syncDecksToSpreadsheet(gasUrl, decks);
              showToast(`☁️ ${res.message}`);
            }}
            className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-bold"
          >
            ☁️ シートへ今すぐ同期
          </button>
        </div>
      </div>

      {/* トースト通知 */}
      {statusToast && (
        <div className="rounded-xl bg-emerald-950/90 border border-emerald-500/60 px-3.5 py-2.5 text-xs font-bold text-emerald-200 shadow-lg">
          {statusToast}
        </div>
      )}

      {/* デッキ新規作成・編集モーダルパネル */}
      {editingId && (
        <div className="rounded-2xl bg-slate-900 border-2 border-amber-500/70 p-4 space-y-3.5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-extrabold text-amber-300">
              {editingId === 'NEW'
                ? '✨ 新規デッキ＆ニューロン（JPG/PDF）レシピ登録'
                : '✏️ デッキレシピ（採用カード）の編集'}
            </div>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ 閉じる
            </button>
          </div>

          {/* デッキ名＆バージョンメモ */}
          <div className="grid grid-cols-1 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                デッキ名 *必須
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="例: オルフェゴール / 幻影騎士団"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                構築バージョン・メモ（任意）
              </label>
              <input
                type="text"
                value={editVersionNote}
                onChange={(e) => setEditVersionNote(e.target.value)}
                placeholder="例: 40枚構築（フワロス3・ヴェーラー3・ドロバ2型）"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* ★ 遊戯王ニューロン デッキリストJPG/PDFアップロード枠 */}
          <div className="rounded-xl bg-slate-950/90 border border-dashed border-sky-500/60 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold text-sky-300 flex items-center gap-1.5">
                  <span>📸</span>
                  <span>遊戯王ニューロンのデッキリストJPG / PDFを読み込む</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ニューロン出力の表形式ファイル（JPG画像またはPDF）を選ぶと、モンスター/魔法/罠/EXのカード名と枚数を自動抽出します
                </p>
              </div>
              {editPreviewImage ? (
                <img
                  src={editPreviewImage}
                  alt="デッキリストプレビュー"
                  className="w-12 h-16 object-cover rounded border border-slate-700 shrink-0"
                />
              ) : editPreviewFileName ? (
                <div className="w-14 h-16 rounded-lg bg-rose-950/80 border border-rose-500/50 flex flex-col items-center justify-center p-1 shrink-0 text-center">
                  <span className="text-lg">📄</span>
                  <span className="text-[9px] font-black text-rose-300">PDF読込</span>
                  <span className="text-[8px] text-slate-300 truncate w-12" title={editPreviewFileName}>
                    {editPreviewFileName}
                  </span>
                </div>
              ) : null}
            </div>

            <label className="block">
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                onChange={handleDeckFileSelect}
                disabled={isParsingImage}
                className="hidden"
              />
              <span className="w-full py-2.5 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition">
                {isParsingImage ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>ニューロンファイルからカード名と枚数をAI抽出中...</span>
                  </>
                ) : (
                  <>
                    <span>📁</span>
                    <span>デッキリストファイル（JPGまたはPDF）を選択して自動読み取り</span>
                  </>
                )}
              </span>
            </label>

            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
              <span>※「⚙️ API設定」に無料のGemini APIキーを登録すると解析が有効化されます</span>
              <button
                type="button"
                onClick={() => {
                  setEditCards(SAMPLE_ORCUST_CARDS);
                  setBulkText(formatMultiLineRecipeText(SAMPLE_ORCUST_CARDS));
                  showToast('💡 サンプルデッキ（オルフェゴール40枚）をセットしました');
                }}
                className="text-amber-400 hover:underline shrink-0 font-bold"
              >
                サンプル40枚を試す
              </button>
            </div>
          </div>

          {/* 採用カード編集エリア（ボタン微調整モード vs テキスト一括編集モード） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-200">
                🃏 採用カードリスト（
                {(() => {
                  const previewBuilt = buildDeckRecipeData(
                    isBulkTextMode ? parseMultiLineRecipeText(bulkText) : editCards
                  );
                  return `メイン${previewBuilt.mainCount}枚 / EX${previewBuilt.extraCount}枚`;
                })()}
                ）
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isBulkTextMode) {
                    setEditCards(parseMultiLineRecipeText(bulkText));
                    setIsBulkTextMode(false);
                  } else {
                    setBulkText(formatMultiLineRecipeText(editCards));
                    setIsBulkTextMode(true);
                  }
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-bold"
              >
                {isBulkTextMode ? '🔢 ボタン枚数調整へ切替' : '📝 テキスト一括編集へ切替'}
              </button>
            </div>

            {isBulkTextMode ? (
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-400">
                  「カード名 ×3」の形式で一括編集・コピペできます（# モンスター / # 魔法 / # 罠 / # エクストラ で区分）
                </p>
                <textarea
                  rows={12}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* 1枚手動追加バー */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <select
                    value={newCardCat}
                    onChange={(e) => setNewCardCat(e.target.value as DeckCardCategory)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-[11px] font-bold text-slate-200"
                  >
                    <option value="monster">モンスター</option>
                    <option value="spell">魔法</option>
                    <option value="trap">罠</option>
                    <option value="extra">EX</option>
                  </select>
                  <input
                    type="text"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    placeholder="カード名を追加"
                    className="flex-1 min-w-0 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                  />
                  <select
                    value={newCardCount}
                    onChange={(e) => setNewCardCount(Number(e.target.value))}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-1.5 py-1.5 text-xs font-bold text-amber-300"
                  >
                    <option value={1}>×1</option>
                    <option value={2}>×2</option>
                    <option value={3}>×3</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSingleCard}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-extrabold shrink-0"
                  >
                    追加
                  </button>
                </div>

                {/* カテゴリ別カード一覧＆＋/－枚数調整 */}
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {CATEGORY_LABELS.map((cat) => {
                    const catItems = editCards
                      .map((c, idx) => ({ ...c, originalIndex: idx }))
                      .filter((c) => c.category === cat.key);
                    if (catItems.length === 0) return null;
                    const catTotal = catItems.reduce((acc, c) => acc + c.count, 0);

                    return (
                      <div
                        key={cat.key}
                        className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 space-y-1.5"
                      >
                        <div className="text-[11px] font-extrabold text-slate-300 flex items-center justify-between">
                          <span>{cat.label}</span>
                          <span className="text-slate-400">計 {catTotal}枚</span>
                        </div>
                        <div className="space-y-1">
                          {catItems.map((item) => (
                            <div
                              key={`${item.name}-${item.originalIndex}`}
                              className="flex items-center justify-between gap-2 text-xs bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80"
                            >
                              <span className="text-slate-100 font-medium truncate">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleChangeCardCount(item.originalIndex, -1)}
                                  className="w-6 h-6 rounded bg-slate-800 hover:bg-rose-900 text-slate-300 font-bold"
                                >
                                  －
                                </button>
                                <span className="w-6 text-center font-black text-amber-300">
                                  {item.count}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleChangeCardCount(item.originalIndex, 1)}
                                  className="w-6 h-6 rounded bg-slate-800 hover:bg-emerald-900 text-slate-300 font-bold"
                                >
                                  ＋
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSaveDeck}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-lg"
            >
              💾 レシピを保存＆DB反映
            </button>
          </div>
        </div>
      )}

      {/* 登録済みデッキカード一覧 */}
      <div className="space-y-3">
        {decks.map((deck) => {
          const stats = getDeckStats(deck);
          const isCurrentlySelected = selectedDeckId === deck.id;
          const isExpanded = expandedDeckId === deck.id;
          const hasRecipe = Boolean(deck.recipe && deck.recipe.cards.length > 0);
          const { stapleDeckCards } = extractDeckInteractionsForBuilder(deck);

          return (
            <div
              key={deck.id}
              className={`rounded-2xl border p-3.5 transition-all space-y-2.5 ${
                isCurrentlySelected
                  ? 'bg-[#151e36] border-amber-400/80 shadow-lg shadow-amber-950/30'
                  : deck.isActive
                  ? 'bg-[#11172a] border-slate-800'
                  : 'bg-slate-950/60 border-slate-900 opacity-65'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-black text-white">{deck.name}</h3>
                    {deck.versionNote && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-amber-300">
                        {deck.versionNote}
                      </span>
                    )}
                    {isCurrentlySelected && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black">
                        現在使用中
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    戦績: <strong className="text-white">{stats.total}戦</strong> ({stats.wins}勝
                    {stats.losses}敗 / 勝率{' '}
                    <strong className="text-emerald-400">{stats.winRate}%</strong> / 初動○率{' '}
                    <strong className="text-cyan-300">{stats.starterRate}%</strong>)
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(deck)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300 border border-slate-700"
                  >
                    📸 JPG/PDF読込・編集
                  </button>
                  {decks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDeck(deck.id)}
                      className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-[11px] text-slate-400 hover:text-rose-300"
                      title="削除"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* 採用カード構造化ステータス＆自動ピックアップされた自軍妨害プレビュー */}
              {hasRecipe && deck.recipe ? (
                <div className="rounded-xl bg-slate-950/80 border border-slate-800/90 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
                      <span>✅ 採用カード登録済</span>
                      <span className="text-[11px] text-slate-300 font-bold">
                        (メイン{deck.recipe.mainCount}枚 / EX{deck.recipe.extraCount}枚)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(deck.recipe?.compactText || '');
                          showToast('📋 AI分析用の採用カードテキストをコピーしました！');
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                      >
                        📋 DBテキストをコピー
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDeckId(isExpanded ? null : deck.id)
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold"
                      >
                        {isExpanded ? '▲ レシピを閉じる' : '▼ 全カードを見る'}
                      </button>
                    </div>
                  </div>

                  {/* 自軍妨害として自動ピックアップされるカード一覧 */}
                  {stapleDeckCards.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/80">
                      <span className="text-[10px] text-cyan-300 font-bold mr-1">
                        🎯 自軍妨害に自動連動中:
                      </span>
                      {stapleDeckCards.map((sc) => (
                        <span
                          key={sc.tag}
                          className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-bold text-cyan-200"
                        >
                          {sc.tag}×{sc.count}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 全採用カード展開表示 */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="grid grid-cols-1 gap-1.5">
                        {CATEGORY_LABELS.map((cat) => {
                          const list = deck.recipe!.cards.filter((c) => c.category === cat.key);
                          if (list.length === 0) return null;
                          const sum = list.reduce((a, b) => a + b.count, 0);
                          return (
                            <div
                              key={cat.key}
                              className="rounded-lg bg-slate-900/90 p-2 border border-slate-800/80"
                            >
                              <div className="text-[10px] font-extrabold text-slate-400 mb-1">
                                {cat.label} ({sum}枚)
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {list.map((c, i) => (
                                  <span
                                    key={`${c.name}-${i}`}
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${cat.badgeClass}`}
                                  >
                                    {c.name} ×{c.count}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* スプレッドシートの『対戦ログ』列に入る1行テキストプレビュー */}
                      <div className="rounded-lg bg-slate-900 p-2 border border-slate-800 text-[10px] text-slate-400">
                        <div className="font-bold text-slate-300 mb-0.5">
                          📊 スプレッドシートDB ＆ Gemini分析用テキスト:
                        </div>
                        <div className="font-mono break-all text-[10px] text-slate-400 leading-relaxed">
                          {deck.recipe.compactText}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-950/60 border border-dashed border-slate-800 p-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    まだデッキレシピ（JPG/PDF）が登録されていません
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(deck)}
                    className="text-[11px] font-bold text-sky-300 hover:text-sky-200 underline"
                  >
                    ＋ ニューロンJPG/PDFを読み込む
                  </button>
                </div>
              )}

              {/* 下部アクションバー */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-500">
                  ID: <code>{deck.id}</code> (更新: {deck.updatedAt})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(deck.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      deck.isActive
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {deck.isActive ? '候補表示: ON' : '候補表示: OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectActiveDeck(deck)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold"
                  >
                    このデッキで記録する
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 初期5デッキへのリセット */}
      <div className="text-right">
        <button
          type="button"
          onClick={() => onUpdateDecks(DEFAULT_REGISTERED_DECKS)}
          className="text-[11px] text-slate-400 hover:text-amber-300 underline"
        >
          初期5デッキ構成（オルフェゴール40枚サンプル付き）に戻す
        </button>
      </div>
    </div>
  );
};
