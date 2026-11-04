import React, { useState } from 'react';
import { RegisteredDeck } from '../types';
import { STAPLE_HAND_TRAPS } from '../config/interactions';
import { extractDeckInteractionsForBuilder } from '../utils/deckRecipe';

interface InteractionPairBuilderProps {
  /** セクションタイトル（例: 被弾妨害 / 自軍妨害） */
  title: string;
  /** サブタイトル・説明 */
  subtitle: string;
  /** テーマカラー（被弾: rose, 自軍: cyan） */
  accentColor: 'rose' | 'cyan';
  /** マスタの「誘発・汎用札」リスト */
  cards: string[];
  /** マスタの「対象プリセット」リスト */
  targets: string[];
  /** 現在選択されているペア配列（例: ["増G➔初動"] または ["なし"]） */
  value: string[];
  /** 値変更ハンドラ */
  onChange: (newValue: string[]) => void;
  /** 自軍妨害用：現在選択中のマイデッキ（ニューロンJPGレシピから採用カードを自動ピックアップ） */
  activeDeck?: RegisteredDeck;
}

/**
 * 「誘発➔対象」2ステップ・ペアビルダーUIコンポーネント
 * SPEC.md 4.2節 ＋ 登録デッキ採用カードからの自動ピックアップ機能対応
 */
export const InteractionPairBuilder: React.FC<InteractionPairBuilderProps> = ({
  title,
  subtitle,
  accentColor,
  cards,
  targets,
  value,
  onChange,
  activeDeck,
}) => {
  // ステップ1で選択中の誘発・汎用札（nullのときはサブチップ非表示）
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  // 「自由入力...」を選んだ際のカスタム対象テキスト入力モード
  const [isCustomTargetMode, setIsCustomTargetMode] = useState<boolean>(false);
  const [customTargetText, setCustomTargetText] = useState<string>('');
  // カード名自体を自由追加したい場合のモード
  const [isCustomCardMode, setIsCustomCardMode] = useState<boolean>(false);
  const [customCardText, setCustomCardText] = useState<string>('');
  // 盤面妨害・その他カードの展開フラグ
  const [showExtendedCards, setShowExtendedCards] = useState<boolean>(false);
  // デッキ内のテーマ固有カード（クリマクス・ディンギルス等）の展開フラグ
  const [showThemeDeckCards, setShowThemeDeckCards] = useState<boolean>(false);
  // デッキレシピ連動時に「デッキ外の全汎用候補」も見るかどうかのフラグ
  const [showAllMasterCardsWhenDeckLoaded, setShowAllMasterCardsWhenDeckLoaded] =
    useState<boolean>(false);

  const isNoneSelected = value.length === 0 || (value.length === 1 && value[0] === 'なし');

  // 登録デッキの採用カードから自軍妨害候補を自動抽出
  const { stapleDeckCards, themeDeckCards } = extractDeckInteractionsForBuilder(activeDeck);
  const hasDeckRecipePickup = stapleDeckCards.length > 0 || themeDeckCards.length > 0;

  // カラーパレット設定
  const theme =
    accentColor === 'rose'
      ? {
          badgeBg: 'bg-rose-500/20 border-rose-500/50 text-rose-200',
          activeChip: 'bg-rose-600 border-rose-400 text-white shadow-md shadow-rose-950/60',
          subBox: 'bg-rose-950/40 border-rose-500/40',
          subChip:
            'bg-slate-800/90 hover:bg-rose-600/80 active:bg-rose-500 border-rose-500/40 text-rose-100',
          headerDot: 'bg-rose-500',
        }
      : {
          badgeBg: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200',
          activeChip: 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-950/60',
          subBox: 'bg-cyan-950/40 border-cyan-500/40',
          subChip:
            'bg-slate-800/90 hover:bg-cyan-600/80 active:bg-cyan-500 border-cyan-500/40 text-cyan-100',
          headerDot: 'bg-cyan-500',
        };

  /**
   * ステップ1: 誘発・汎用札チップをタップしたときの処理
   */
  const handleCardTap = (card: string) => {
    if (card === 'なし') {
      // 「なし」をタップした場合は選択リストを ["なし"] にリセット
      onChange(['なし']);
      setSelectedCard(null);
      setIsCustomTargetMode(false);
      return;
    }

    // 同じカードを再タップしたら閉じる、別のカードなら展開
    if (selectedCard === card) {
      setSelectedCard(null);
      setIsCustomTargetMode(false);
    } else {
      setSelectedCard(card);
      setIsCustomTargetMode(false);
      setCustomTargetText('');
    }
  };

  /**
   * ステップ2: 対象サブチップを選択してペアを追加する処理
   */
  const handleAddPair = (card: string, target?: string) => {
    const cleanTarget = target?.trim();
    const pairString =
      !cleanTarget || cleanTarget === '省略(対象指定なし)'
        ? card
        : `${card}➔${cleanTarget}`;

    const currentWithoutNone = value.filter((v) => v !== 'なし');
    onChange([...currentWithoutNone, pairString]);

    // 登録完了後、サブパネルを閉じて次のカードを選べる状態にする
    setSelectedCard(null);
    setIsCustomTargetMode(false);
    setCustomTargetText('');
  };

  /**
   * 登録済みペアの個別削除
   */
  const handleRemovePair = (indexToRemove: number) => {
    const next = value.filter((_, idx) => idx !== indexToRemove);
    onChange(next.length === 0 ? ['なし'] : next);
  };

  // 「省略(対象指定なし)」以外のプリセット対象一覧
  const presetTargets = targets.filter((t) => t !== '省略(対象指定なし)');

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-sm">
      {/* ヘッダーと現在の選択済みタグ表示 */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${theme.headerDot}`} />
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          <span className="text-[11px] text-slate-400">{subtitle}</span>
        </div>
        {!isNoneSelected && (
          <button
            type="button"
            onClick={() => {
              onChange(['なし']);
              setSelectedCard(null);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 underline px-1.5 py-0.5"
          >
            クリア
          </button>
        )}
      </div>

      {/* 選択済みペアリスト表示エリア */}
      <div className="min-h-[38px] rounded-xl bg-slate-950/80 border border-slate-800/80 px-2.5 py-2 mb-3 flex flex-wrap items-center gap-1.5">
        {isNoneSelected ? (
          <span className="text-xs text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50">
            なし（デフォルト）
          </span>
        ) : (
          value.map((pair, idx) => (
            <span
              key={`${pair}-${idx}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${theme.badgeBg}`}
            >
              <span>{pair}</span>
              <button
                type="button"
                onClick={() => handleRemovePair(idx)}
                className="ml-0.5 w-4 h-4 rounded-full bg-slate-900/60 hover:bg-slate-900 inline-flex items-center justify-center text-[11px] leading-none"
                aria-label={`${pair}を削除`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      {/* ステップ1: 誘発・汎用札チップ一覧 */}
      <div className="mb-1 space-y-2.5">
        <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
          <span>① カードをタップして選択（複数追加可）</span>
          <button
            type="button"
            onClick={() => setIsCustomCardMode(!isCustomCardMode)}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
          >
            {isCustomCardMode ? '閉じる' : '＋その他カード名'}
          </button>
        </div>

        {/* その他カード名の自由入力欄（任意） */}
        {isCustomCardMode && (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={customCardText}
              onChange={(e) => setCustomCardText(e.target.value)}
              placeholder="カード名を入力（例: 超融合）"
              className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                if (customCardText.trim()) {
                  setSelectedCard(customCardText.trim());
                  setCustomCardText('');
                  setIsCustomCardMode(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold shrink-0"
            >
              対象選択へ
            </button>
          </div>
        )}

        {/* ★ 自軍妨害専用：登録デッキのニューロンJPGレシピから採用カードを自動ピックアップ表示 */}
        {hasDeckRecipePickup && activeDeck && (
          <div className="rounded-xl bg-cyan-950/25 border border-cyan-500/40 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-extrabold text-cyan-300 flex items-center gap-1.5">
                <span>🃏</span>
                <span>{activeDeck.name} の採用カードから選択</span>
                <span className="text-[10px] font-normal text-cyan-200/80">
                  (レシピ自動抽出)
                </span>
              </div>
              {themeDeckCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowThemeDeckCards(!showThemeDeckCards)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 transition shrink-0"
                >
                  {showThemeDeckCards
                    ? '▲ テーマ札を閉じる'
                    : `⚔️ テーマ/EX札 (+${themeDeckCards.length})`}
                </button>
              )}
            </div>

            {/* 採用中の汎用誘発・汎用妨害チップ（枚数バッジ付き） */}
            <div className="flex flex-wrap gap-1.5">
              {stapleDeckCards.map((item) => {
                const isCardActive = selectedCard === item.tag;
                return (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleCardTap(item.tag)}
                    title={item.officialName}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 inline-flex items-center gap-1 ${
                      isCardActive
                        ? theme.activeChip
                        : 'bg-cyan-950/70 border-cyan-500/50 text-cyan-100 hover:bg-cyan-900/70'
                    }`}
                  >
                    <span>{item.tag}</span>
                    <span className="text-[10px] px-1 rounded bg-slate-950/60 text-cyan-300 font-semibold">
                      ×{item.count}
                    </span>
                  </button>
                );
              })}

              {/* なしチップもすぐ押せるように配置 */}
              <button
                type="button"
                onClick={() => handleCardTap('なし')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                  isNoneSelected && !selectedCard
                    ? 'bg-slate-700 border-slate-500 text-white font-semibold'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                }`}
              >
                なし
              </button>
            </div>

            {/* 展開時：テーマ固有の罠・EXモンスター・魔法・モンスター（クリマクス、ディンギルス等） */}
            {showThemeDeckCards && themeDeckCards.length > 0 && (
              <div className="pt-2 border-t border-cyan-500/30 space-y-1">
                <div className="text-[10px] text-cyan-200/80 font-medium">
                  ⚔️ デッキ内のテーマ妨害・EXモンスター（罠➔EX➔魔法➔モンスター順）
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {themeDeckCards.map((item) => {
                    const isCardActive = selectedCard === item.tag;
                    const catBadge =
                      item.category === 'trap'
                        ? '罠'
                        : item.category === 'extra'
                        ? 'EX'
                        : item.category === 'spell'
                        ? '魔'
                        : 'モ';
                    return (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleCardTap(item.tag)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 inline-flex items-center gap-1 ${
                          isCardActive
                            ? theme.activeChip
                            : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-[9px] px-1 rounded bg-slate-800 text-amber-300 font-bold">
                          {catBadge}
                        </span>
                        <span>{item.tag}</span>
                        <span className="text-[10px] text-slate-400">×{item.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 全体の誘発・妨害札チップ一覧（デッキレシピ連動時は折りたたみ可能にしてスッキリ表示） */}
        {(() => {
          if (hasDeckRecipePickup && !showAllMasterCardsWhenDeckLoaded) {
            return (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAllMasterCardsWhenDeckLoaded(true)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                >
                  ▼ デッキ外の全汎用カード一覧も表示する
                </button>
              </div>
            );
          }

          // 「なし」は特別扱いとして常時表示末尾に保持
          const otherCards = cards.filter((c) => c !== 'なし');
          const stapleCutoff = STAPLE_HAND_TRAPS.length;
          const stapleCards = otherCards.slice(0, stapleCutoff);
          const extendedCards = otherCards.slice(stapleCutoff);

          const renderCardButton = (card: string, isExtended: boolean = false) => {
            const isCardActive = selectedCard === card;
            const isNoneChip = card === 'なし';
            const isNoneActive = isNoneChip && isNoneSelected && !selectedCard;

            return (
              <button
                key={card}
                type="button"
                onClick={() => handleCardTap(card)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                  isCardActive
                    ? theme.activeChip
                    : isNoneActive
                    ? 'bg-slate-700 border-slate-500 text-white font-semibold'
                    : isExtended
                    ? 'bg-slate-950/90 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {card}
              </button>
            );
          };

          return (
            <div className="space-y-1.5">
              {hasDeckRecipePickup && (
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>全汎用誘発・妨害マスタ</span>
                  <button
                    type="button"
                    onClick={() => setShowAllMasterCardsWhenDeckLoaded(false)}
                    className="underline hover:text-white"
                  >
                    ▲ 採用カードのみに戻す
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {stapleCards.map((c) => renderCardButton(c, false))}
                {!hasDeckRecipePickup && renderCardButton('なし', false)}
                {extendedCards.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowExtendedCards(!showExtendedCards)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-700 bg-slate-950/80 text-slate-300 hover:bg-slate-800 transition"
                  >
                    {showExtendedCards
                      ? '▲ その他を閉じる'
                      : `▼ 盤面/他 (+${extendedCards.length})`}
                  </button>
                )}
              </div>

              {/* 盤面妨害・その他札の展開エリア */}
              {showExtendedCards && extendedCards.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  {extendedCards.map((c) => renderCardButton(c, true))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ステップ2: 対象を選択（任意）サブチップ群（カード選択時にすぐ下に展開） */}
      {selectedCard && (
        <div
          className={`mt-2.5 p-3 rounded-xl border ${theme.subBox} transition-all animate-fadeIn`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">
              ② 「<span className="text-amber-300">{selectedCard}</span>」の対象を選択（任意）
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCard(null);
                setIsCustomTargetMode(false);
              }}
              className="text-xs text-slate-400 hover:text-white px-1"
            >
              キャンセル
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {presetTargets.map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => handleAddPair(selectedCard, target)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${theme.subChip}`}
              >
                ➔{target}
              </button>
            ))}

            {/* 自由入力... ボタン */}
            <button
              type="button"
              onClick={() => setIsCustomTargetMode(!isCustomTargetMode)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isCustomTargetMode
                  ? 'bg-amber-600 border-amber-400 text-white'
                  : 'bg-slate-800 border-amber-500/50 text-amber-300 hover:bg-slate-700'
              }`}
            >
              自由入力...
            </button>

            {/* 対象指定なしで追加 ボタン */}
            <button
              type="button"
              onClick={() => handleAddPair(selectedCard)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/90 hover:bg-slate-600 border border-slate-500 text-slate-100 transition-all active:scale-95"
            >
              対象指定なしで追加
            </button>
          </div>

          {/* 自由入力フィールド展開時 */}
          {isCustomTargetMode && (
            <div className="mt-2.5 flex gap-1.5">
              <input
                type="text"
                value={customTargetText}
                onChange={(e) => setCustomTargetText(e.target.value)}
                placeholder={`${selectedCard}の対象を入力（例: アポロウーサ）`}
                className="flex-1 rounded-lg bg-slate-950 border border-slate-600 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (customTargetText.trim()) {
                      handleAddPair(selectedCard, customTargetText.trim());
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (customTargetText.trim()) {
                    handleAddPair(selectedCard, customTargetText.trim());
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shrink-0"
              >
                追加
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
