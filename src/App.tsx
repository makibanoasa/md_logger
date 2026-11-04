import React, { useState, useEffect, useCallback } from 'react';
import {
  MasterData,
  CurrentStatus,
  MatchLogPayload,
  PostApiResponse,
  FullMatchRecord,
  RegisteredDeck,
  UserProfileConfig,
} from './types';
import {
  DEFAULT_MASTER_DATA,
  INITIAL_MOCK_STATUS,
  RANK_LIST,
  WIN_FACTORS,
  LOSE_FACTORS,
  STRESS_LEVELS,
  COUNTER_ACTION_HINTS,
} from './mockData';
import {
  DEFAULT_MY_DECKS,
  EXTENDED_OPPONENT_DECKS,
} from './config/decks';
import {
  STORAGE_KEYS,
  getSavedGasUrl,
  saveGasUrl,
  getSavedMyDecks,
  saveMyDecks,
  getRegisteredDecks,
  saveRegisteredDecks,
  getUserProfile,
  saveUserProfile,
  fetchMasterAndStatus,
  postMatchLog,
  getLocalHistory,
  saveLocalHistory,
  saveLocalMockStatus,
} from './api';
import { StatusHeader } from './components/StatusHeader';
import { InteractionPairBuilder } from './components/InteractionPairBuilder';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { FeedbackModal } from './components/FeedbackModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { BottomNav, NavTab } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { StatsView } from './components/StatsView';
import { DeckManagerView } from './components/DeckManagerView';
import { ProfileView } from './components/ProfileView';

// Web Speech API 用の簡易型宣言
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const App: React.FC = () => {
  // --- ナビゲーションタブ状態 ('dashboard' | 'stats' | 'record' | 'decks' | 'profile') ---
  const [activeTab, setActiveTab] = useState<NavTab>('record');

  // --- マスタ＆現在のステータス状態 ---
  const [gasUrl, setGasUrl] = useState<string>(() => getSavedGasUrl());
  const [master, setMaster] = useState<MasterData>(DEFAULT_MASTER_DATA);
  const [status, setStatus] = useState<CurrentStatus>(INITIAL_MOCK_STATUS);
  const [isMockMode, setIsMockMode] = useState<boolean>(() => !getSavedGasUrl());
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- 登録デッキ（ニューロン公式DB URL紐付け）＆プロフィール設定 ---
  const [registeredDecks, setRegisteredDecks] = useState<RegisteredDeck[]>(() =>
    getRegisteredDecks()
  );
  const [userProfile, setUserProfile] = useState<UserProfileConfig>(() => getUserProfile());

  // --- モーダル＆ドロワー開閉状態 ---
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyRecords, setHistoryRecords] = useState<FullMatchRecord[]>(() => getLocalHistory());
  const [latestPostResponse, setLatestPostResponse] = useState<PostApiResponse | null>(null);
  const [lastAiBanner, setLastAiBanner] = useState<{
    matchNo: number;
    comment: string;
    isStopper: boolean;
  } | null>(null);

  // --- フォーム入力状態（No.5〜17の13項目＋拡張項目） ---
  // Col E (5): 現在ランク (localStorage で前回値を自動保持)
  const [myRank, setMyRank] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.MY_RANK) || INITIAL_MOCK_STATUS.lastRank
  );
  // Col F (6): 使用デッキ (localStorage で前回値を自動保持)
  const [myDeck, setMyDeck] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.MY_DECK) || INITIAL_MOCK_STATUS.lastDeck
  );
  const [myDeckId, setMyDeckId] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.MY_DECK_ID) || 'deck-pk-1'
  );
  // 自軍デッキ候補リスト（頻繁なメンテに対応する state + localStorage 永続化）
  const [myDeckList, setMyDeckList] = useState<string[]>(() => getSavedMyDecks());
  const [isEditingMyDecks, setIsEditingMyDecks] = useState<boolean>(false);
  const [newMyDeckInput, setNewMyDeckInput] = useState<string>('');
  // 相手デッキの「その他流行デッキ」展開フラグ
  const [showExtendedOppDecks, setShowExtendedOppDecks] = useState<boolean>(false);

  // コイントス結果 ("表" | "裏")
  const [coin, setCoin] = useState<'表' | '裏' | ''>('');
  // Col G (7): 先攻/後攻（1タップ必須）
  const [turn, setTurn] = useState<'先攻' | '後攻' | ''>('');
  // Col H (8): 勝敗（1タップ必須）
  const [result, setResult] = useState<'Win' | 'Lose' | ''>('');
  // Col I (9): 判断区分（デフォルト: 通常決着）
  const [playDecision, setPlayDecision] = useState<string>('通常決着');
  // Col J (10): 相手デッキ（チップ選択＋自由入力）
  const [oppDeck, setOppDeck] = useState<string>('');
  // Col K (11): 自デッキ初動有無（デフォルト: ○）
  const [hasStarter, setHasStarter] = useState<'○' | '×'>('○');
  // Col L (12): カウンター結果（デフォルト: 無風）
  const [counterAction, setCounterAction] = useState<string>('無風');
  // Col M (13): 被弾妨害(誘発➔対象)（デフォルト: ["なし"]）
  const [oppInteractions, setOppInteractions] = useState<string[]>(['なし']);
  // Col N (14): 自軍妨害(使用札➔対象)（デフォルト: ["なし"]）
  const [myInteractions, setMyInteractions] = useState<string[]>(['なし']);
  // Col O (15): 勝敗主因タグ
  const [gameFactor, setGameFactor] = useState<string>('');
  // Col P (16): ストレス度（デフォルト: 2 平常）
  const [stressLevel, setStressLevel] = useState<number>(2);
  // Col Q (17): 一言メモ
  const [memo, setMemo] = useState<string>('');

  // バリデーションエラー表示用
  const [validationError, setValidationError] = useState<string | null>(null);
  // 音声入力中フラグ
  const [isListening, setIsListening] = useState<boolean>(false);

  // myRank, myDeck が変更されたら localStorage に自動保存
  useEffect(() => {
    if (myRank) {
      localStorage.setItem(STORAGE_KEYS.MY_RANK, myRank);
    }
  }, [myRank]);

  useEffect(() => {
    if (myDeck) {
      localStorage.setItem(STORAGE_KEYS.MY_DECK, myDeck);
      const matched = registeredDecks.find((d) => d.name === myDeck);
      if (matched) {
        setMyDeckId(matched.id);
        localStorage.setItem(STORAGE_KEYS.MY_DECK_ID, matched.id);
      }
    }
  }, [myDeck, registeredDecks]);

  // 現在選択中のデッキに紐付くニューロン公式DBのURLを取得
  const currentActiveDeckObj =
    registeredDecks.find((d) => d.id === myDeckId && d.name === myDeck) ||
    registeredDecks.find((d) => d.name === myDeck);
  const currentNeuronUrl = currentActiveDeckObj?.neuronUrl || '';

  /**
   * 起動時および手動更新時のマスタ＆ステータス取得
   */
  const loadMasterAndStatus = useCallback(async (targetUrl: string) => {
    setIsLoadingInitial(true);
    try {
      const { data, isMock } = await fetchMasterAndStatus(targetUrl);
      setMaster(data.master);
      setStatus(data.currentStatus);
      setIsMockMode(isMock);

      // localStorage にまだ保存がない場合のみ、サーバー側の前回値を反映
      if (!localStorage.getItem(STORAGE_KEYS.MY_RANK) && data.currentStatus.lastRank) {
        setMyRank(data.currentStatus.lastRank);
      }
      if (!localStorage.getItem(STORAGE_KEYS.MY_DECK) && data.currentStatus.lastDeck) {
        setMyDeck(data.currentStatus.lastDeck);
      }
    } catch (err) {
      console.error('マスタ取得失敗（内蔵モックへフォールバック）:', err);
    } finally {
      setIsLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    loadMasterAndStatus(gasUrl);
  }, [gasUrl, loadMasterAndStatus]);

  /**
   * ランクのステッパー操作（1段階下げる / 1段階上げる）
   */
  const handleStepRank = (direction: -1 | 1) => {
    const currentIndex = RANK_LIST.indexOf(myRank);
    if (currentIndex === -1) {
      setMyRank('ダイヤ5');
      return;
    }
    const nextIndex = Math.max(0, Math.min(RANK_LIST.length - 1, currentIndex + direction));
    setMyRank(RANK_LIST[nextIndex]);
  };

  /**
   * コイントス選択時のスマート連動
   */
  const handleSelectCoin = (selectedCoin: '表' | '裏') => {
    setCoin(selectedCoin);
    // 先攻/後攻が未選択の場合は自然な初期値をアシスト
    if (!turn) {
      setTurn(selectedCoin === '表' ? '先攻' : '後攻');
      setValidationError(null);
    }
  };

  /**
   * 判断区分タップ時の処理
   * SPEC.md 4.3節: 「[早期見切り(即サレ)] をタップした場合、自動的に勝敗を Lose にセットする」
   * 追加仕様: 「相手即サレ」をタップした場合は自動的に Win にセットする
   */
  const handleSelectPlayDecision = (decision: string) => {
    setPlayDecision(decision);
    if (decision === '早期見切り(即サレ)') {
      setResult('Lose');
      // もし現在勝ち主因タグが選ばれていたらクリア
      if (WIN_FACTORS.includes(gameFactor)) {
        setGameFactor('');
      }
    } else if (decision === '相手即サレ') {
      setResult('Win');
      // もし現在負け主因タグが選ばれていたらクリア
      if (LOSE_FACTORS.includes(gameFactor)) {
        setGameFactor('');
      }
    }
  };

  /**
   * 勝敗タップ時のスマート連動処理
   */
  const handleSelectResult = (newResult: 'Win' | 'Lose') => {
    setResult(newResult);
    setValidationError(null);
    if (newResult === 'Win' && LOSE_FACTORS.includes(gameFactor)) {
      setGameFactor('');
    } else if (newResult === 'Lose' && WIN_FACTORS.includes(gameFactor)) {
      setGameFactor('');
    }
  };

  /**
   * 記録完了後のフォーム自動リセット（my_rank と my_deck は維持）
   * SPEC.md 4.4節準拠
   */
  const resetMatchForm = () => {
    setCoin('');
    setTurn('');
    setResult('');
    setPlayDecision('通常決着');
    setOppDeck('');
    setHasStarter('○');
    setCounterAction('無風');
    setOppInteractions(['なし']);
    setMyInteractions(['なし']);
    setGameFactor('');
    setStressLevel(2);
    setMemo('');
    setValidationError(null);
  };

  /**
   * 音声入力（Web Speech API）起動ハンドラ
   */
  const handleVoiceInput = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      alert('お使いのブラウザはWeb音声認識APIに対応していません。キーボードのマイクボタンをご利用ください。');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.continuous = false;

    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      if (transcript) {
        setMemo((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  /**
   * 対戦結果の記録（POST送信）
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 必須チェック
    if (!turn) {
      setValidationError('「先攻 / 後攻」を選択してください（1タップ必須）');
      return;
    }
    if (!result) {
      setValidationError('「勝敗 (Win / Lose)」を選択してください（1タップ必須）');
      return;
    }

    const finalOppDeck = oppDeck.trim() || '不明';
    const finalGameFactor =
      gameFactor || (result === 'Win' ? '制圧完封' : '手数捲られ');

    const payload: MatchLogPayload = {
      my_rank: myRank.trim() || 'ダイヤ5',
      my_deck: myDeck.trim() || '幻影騎士団',
      my_deck_id: currentActiveDeckObj?.id || '',
      my_deck_recipe: currentActiveDeckObj?.recipe?.compactText || '',
      my_deck_url: currentNeuronUrl,
      coin,
      turn,
      result,
      play_decision: playDecision,
      opp_deck: finalOppDeck,
      has_starter: hasStarter,
      counter_action: counterAction,
      opp_interactions: oppInteractions.length > 0 ? oppInteractions : ['なし'],
      my_interactions: myInteractions.length > 0 ? myInteractions : ['なし'],
      game_factor: finalGameFactor,
      stress_level: stressLevel,
      memo: memo.trim(),
    };

    setIsSubmitting(true);
    try {
      const { response, isMock } = await postMatchLog(gasUrl, payload, status);
      setStatus(response.updatedStatus);
      setIsMockMode(isMock);
      setLatestPostResponse(response);
      setLastAiBanner({
        matchNo: response.recordedMatchNo,
        comment: response.aiComment,
        isStopper: response.updatedStatus.isStopperTriggered,
      });
      setHistoryRecords(getLocalHistory());

      // フォームを自動リセット（my_rank と my_deck は維持）
      resetMatchForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '送信中にエラーが発生しました';
      setValidationError(`送信エラー: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 勝敗主因タグの並び替えと優先強調判定 (SPEC.md 4.3節)
  const allFactors = master.勝敗主因タグ;
  const winFactorList = allFactors.filter((f) => WIN_FACTORS.includes(f));
  const loseFactorList = allFactors.filter((f) => LOSE_FACTORS.includes(f));
  const otherFactorList = allFactors.filter(
    (f) => !WIN_FACTORS.includes(f) && !LOSE_FACTORS.includes(f)
  );

  // Win選択時は勝ち要因を先頭に、Lose選択時は負け要因を先頭に配置
  const orderedFactorGroups =
    result === 'Lose'
      ? [
          { label: '🔻 負け主因（優先）', items: loseFactorList, isPriority: true, tone: 'rose' },
          { label: '🔹 勝ち主因', items: winFactorList, isPriority: false, tone: 'emerald' },
        ]
      : result === 'Win'
      ? [
          { label: '🌟 勝ち主因（優先）', items: winFactorList, isPriority: true, tone: 'emerald' },
          { label: '🔻 負け主因', items: loseFactorList, isPriority: false, tone: 'rose' },
        ]
      : [
          { label: '🌟 勝ち主因', items: winFactorList, isPriority: true, tone: 'emerald' },
          { label: '🔻 負け主因', items: loseFactorList, isPriority: true, tone: 'rose' },
        ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-36">
      {/* 1. 画面最上部ヘッダー＆ミニステータスバー */}
      <StatusHeader
        status={status}
        myRank={myRank}
        myDeck={myDeck}
        isMockMode={isMockMode}
        isLoading={isLoadingInitial}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => {
          setHistoryRecords(getLocalHistory());
          setIsHistoryOpen(true);
        }}
        onRefresh={() => loadMasterAndStatus(gasUrl)}
      />

      {/* タブ1: 戦績ダッシュボード（日次・月次＝ランクマシーズン・全期間） */}
      {activeTab === 'dashboard' && (
        <DashboardView
          records={historyRecords}
          registeredDecks={registeredDecks}
          onGoToRecord={() => setActiveTab('record')}
          onDeleteRecord={(_matchId, index) => {
            const next = historyRecords.filter((_, i) => i !== index);
            saveLocalHistory(next);
            setHistoryRecords(next);
          }}
        />
      )}

      {/* タブ2: 統計アナリティクス（5大統計） */}
      {activeTab === 'stats' && (
        <StatsView records={historyRecords} registeredDecks={registeredDecks} />
      )}

      {/* タブ4: デッキ登録（遊戯王ニューロンJPGレシピ構造化＆DB連携） */}
      {activeTab === 'decks' && (
        <DeckManagerView
          decks={registeredDecks}
          records={historyRecords}
          selectedDeckId={currentActiveDeckObj?.id || myDeckId}
          gasUrl={gasUrl}
          onUpdateDecks={(nextDecks) => {
            setRegisteredDecks(nextDecks);
            saveRegisteredDecks(nextDecks);
            const activeNames = Array.from(
              new Set(nextDecks.filter((d) => d.isActive).map((d) => d.name))
            );
            if (activeNames.length > 0) {
              setMyDeckList(activeNames);
            }
          }}
          onSelectActiveDeck={(deck) => {
            setMyDeck(deck.name);
            setMyDeckId(deck.id);
            localStorage.setItem(STORAGE_KEYS.MY_DECK, deck.name);
            localStorage.setItem(STORAGE_KEYS.MY_DECK_ID, deck.id);
            setActiveTab('record');
          }}
        />
      )}

      {/* タブ5: プロフィール＆目標・データ管理 */}
      {activeTab === 'profile' && (
        <ProfileView
          profile={userProfile}
          status={status}
          records={historyRecords}
          gasUrl={gasUrl}
          isMockMode={isMockMode}
          onSaveProfile={(nextProf) => {
            setUserProfile(nextProf);
            saveUserProfile(nextProf);
          }}
          onOpenApiModal={() => setIsSettingsOpen(true)}
          onClearAllData={() => {
            saveLocalHistory([]);
            setHistoryRecords([]);
            const zeroStatus: CurrentStatus = {
              ...INITIAL_MOCK_STATUS,
              lastRank: myRank,
              lastDeck: myDeck,
              totalMatches: 0,
              todayMatches: 0,
              todayWins: 0,
              todayLosses: 0,
              todayWinRate: 0,
              currentLoseStreak: 0,
              consecutiveHighStress: 0,
              remainingNetWins: userProfile.targetNetWins || 40,
              dashboardAlert: '🟢【準備完了】0戦から本番記録をスタートできます！',
              stopperAlerts: [],
              isStopperTriggered: false,
            };
            saveLocalMockStatus(zeroStatus);
            setStatus(zeroStatus);
            setLastAiBanner(null);
          }}
        />
      )}

      {/* タブ3 (＋): メイン対戦記録フォームコンテナ */}
      {activeTab === 'record' && (
      <main className="max-w-md mx-auto px-3 pt-3 space-y-3">
        {/* 直近のAI伴走コメントバナー（記録後にいつでも見返せるカード） */}
        {lastAiBanner && (
          <div
            className={`rounded-2xl p-3 border shadow-md flex items-start justify-between gap-2 ${
              lastAiBanner.isStopper
                ? 'bg-rose-950/70 border-rose-500/70 text-rose-100'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-100'
            }`}
          >
            <div className="space-y-0.5 text-xs">
              <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <span>🤖 Match #{lastAiBanner.matchNo} AI伴走コメント</span>
              </div>
              <p className="text-slate-100 leading-relaxed font-medium">{lastAiBanner.comment}</p>
            </div>
            <button
              type="button"
              onClick={() => setLastAiBanner(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* セクションA: 現在ランク (No.5) ＆ 使用デッキ (No.6) */}
          <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-sm space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {/* Col E (5): 現在ランク (ドロップダウン + ステッパー) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="text-cyan-400">●</span> 現在ランク
                    <span className="text-[10px] text-slate-400 font-normal">(自動保持)</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStepRank(-1)}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 font-bold text-sm shrink-0"
                    title="ランクを1つ下げる"
                  >
                    －
                  </button>
                  <select
                    value={myRank}
                    onChange={(e) => setMyRank(e.target.value)}
                    className="flex-1 h-10 rounded-xl bg-slate-950 border border-slate-700 px-3 text-sm font-extrabold text-cyan-300 text-center focus:outline-none focus:border-cyan-400"
                  >
                    {RANK_LIST.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleStepRank(1)}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-amber-300 font-bold text-sm shrink-0"
                    title="ランクを1つ上げる"
                  >
                    ＋
                  </button>
                </div>
              </div>

              {/* Col F (6): 使用デッキ (ワンタップ候補 + ニューロンJPGレシピ連動ステータス + インライン候補メンテ) */}
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0">
                      <span className="text-amber-400">●</span> 使用デッキ
                    </label>
                    {currentActiveDeckObj?.recipe ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('decks')}
                        className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30 truncate"
                        title="ニューロンJPGレシピ登録済（タップで採用カード確認・編集）"
                      >
                        🃏レシピ連動中({currentActiveDeckObj.recipe.mainCount}/{currentActiveDeckObj.recipe.extraCount})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('decks')}
                        className="text-[10px] text-slate-400 hover:text-sky-300 underline truncate"
                      >
                        ＋JPGレシピ登録
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingMyDecks(!isEditingMyDecks)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border font-bold transition shrink-0 ${
                      isEditingMyDecks
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {isEditingMyDecks ? '✓ メンテ完了' : '✏️ 候補メンテ'}
                  </button>
                </div>

                {/* ワンタップ選択ボタン群（幻影騎士団 / オルフェゴール / シャドール / 召喚獣 / 磁石の戦士 等） */}
                <div className="flex flex-wrap gap-1.5">
                  {myDeckList.map((deck, idx) => {
                    const active = myDeck === deck;
                    return (
                      <div key={deck} className="inline-flex items-center">
                        <button
                          type="button"
                          onClick={() => setMyDeck(deck)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                            active
                              ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md shadow-amber-950/50'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                          } ${isEditingMyDecks ? 'rounded-r-none border-r-0' : ''}`}
                        >
                          {deck}
                        </button>
                        {isEditingMyDecks && (
                          <div className="inline-flex items-center bg-slate-950 border border-slate-700 rounded-r-xl overflow-hidden">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...myDeckList];
                                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                  setMyDeckList(next);
                                  saveMyDecks(next);
                                }}
                                className="px-1.5 py-2 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800"
                                title="左へ移動"
                              >
                                ◀
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (myDeckList.length <= 1) return;
                                const next = myDeckList.filter((d) => d !== deck);
                                setMyDeckList(next);
                                saveMyDecks(next);
                                if (myDeck === deck) {
                                  setMyDeck(next[0]);
                                }
                              }}
                              className="px-2 py-2 text-[11px] text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 font-bold"
                              title={`${deck}を候補から削除`}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 候補メンテナンスパネル（展開時のみ表示） */}
                {isEditingMyDecks && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-2">
                    <div className="text-[11px] text-amber-300 font-bold flex items-center justify-between">
                      <span>🔧 マイデッキ候補の追加・入れ替え</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMyDeckList(DEFAULT_MY_DECKS);
                          saveMyDecks(DEFAULT_MY_DECKS);
                          if (!DEFAULT_MY_DECKS.includes(myDeck)) {
                            setMyDeck(DEFAULT_MY_DECKS[0]);
                          }
                        }}
                        className="text-[10px] text-slate-400 hover:text-amber-300 underline"
                      >
                        初期5デッキに戻す
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newMyDeckInput}
                        onChange={(e) => setNewMyDeckInput(e.target.value)}
                        placeholder="新しいデッキ名を追加（例: ティアラメンツ）"
                        className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = newMyDeckInput.trim();
                            if (trimmed && !myDeckList.includes(trimmed)) {
                              const next = [...myDeckList, trimmed];
                              setMyDeckList(next);
                              saveMyDecks(next);
                              setMyDeck(trimmed);
                              setNewMyDeckInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newMyDeckInput.trim();
                          if (trimmed && !myDeckList.includes(trimmed)) {
                            const next = [...myDeckList, trimmed];
                            setMyDeckList(next);
                            saveMyDecks(next);
                            setMyDeck(trimmed);
                            setNewMyDeckInput('');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shrink-0"
                      >
                        ＋追加
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      ※コード側で恒久変更する場合は <code>src/config/decks.ts</code> の <code>DEFAULT_MY_DECKS</code> を編集してください。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* セクションB: コイントス ＆ 先攻/後攻 (No.7) ＆ 勝敗 (No.8) ＆ 判断区分 (No.9) */}
          <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-sm space-y-3.5">
            {/* コイントス結果 (表 / 裏) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="text-amber-400">🪙</span> コイントス
                </label>
                <span className="text-[10px] text-slate-400">
                  ※表＝選択権獲得 / 裏＝相手選択
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectCoin('表')}
                  className={`py-2.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-97 flex items-center justify-center gap-1.5 ${
                    coin === '表'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-950/40'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <span>👑 表（勝ち）</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCoin('裏')}
                  className={`py-2.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-97 flex items-center justify-center gap-1.5 ${
                    coin === '裏'
                      ? 'bg-slate-800 border-slate-500 text-slate-200 shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <span>💀 裏（負け）</span>
                </button>
              </div>
            </div>

            {/* Col G (7): 実際のターン（先攻 / 後攻） 大型セグメントボタン */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  実際のターン <span className="text-rose-400 text-[11px]">*必須</span>
                </label>
                {/* コイントス裏なのに先攻（先攻渡し）の検出バッジ */}
                {coin === '裏' && turn === '先攻' && (
                  <span className="text-[11px] font-extrabold text-amber-300 bg-amber-950/80 border border-amber-500/60 px-2 py-0.5 rounded-lg">
                    🎯 相手が後攻選択（先攻渡し）
                  </span>
                )}
                {coin === '表' && turn === '後攻' && (
                  <span className="text-[11px] font-bold text-purple-300 bg-purple-950/80 border border-purple-500/50 px-2 py-0.5 rounded-lg">
                    🛡️ 自ら後攻を選択
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['先攻', '後攻'] as const).map((t) => {
                  const active = turn === t;
                  const isFirst = t === '先攻';
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTurn(t);
                        setValidationError(null);
                      }}
                      className={`py-3.5 rounded-xl font-extrabold text-base border-2 transition-all active:scale-97 flex items-center justify-center gap-2 ${
                        active
                          ? isFirst
                            ? 'bg-indigo-600 border-indigo-300 text-white shadow-lg shadow-indigo-950/80'
                            : 'bg-purple-600 border-purple-300 text-white shadow-lg shadow-purple-950/80'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{isFirst ? '⚡' : '🛡️'}</span>
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Col H (8): 勝敗 (Win / Lose) 大型セグメントボタン */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                勝敗結果 <span className="text-rose-400 text-[11px]">*必須</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectResult('Win')}
                  className={`py-4 rounded-xl font-black text-lg border-2 transition-all active:scale-97 flex items-center justify-center gap-2 ${
                    result === 'Win'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-300 text-white shadow-lg shadow-emerald-950/80'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <span>🏆</span>
                  <span>Win</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectResult('Lose')}
                  className={`py-4 rounded-xl font-black text-lg border-2 transition-all active:scale-97 flex items-center justify-center gap-2 ${
                    result === 'Lose'
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 border-rose-300 text-white shadow-lg shadow-rose-950/80'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <span>💥</span>
                  <span>Lose</span>
                </button>
              </div>
            </div>

            {/* Col I (9): 判断区分 3択セグメントボタン (即サレ選択時は自動でLoseにセット) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">判断区分</label>
                <span className="text-[10px] text-slate-400">
                  ※自分即サレ→Lose / 相手即サレ→Win を自動選択
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {master.判断区分.map((dec) => {
                  const active = playDecision === dec;
                  const shortLabel =
                    dec === '早期見切り(即サレ)'
                      ? '🏳️ 自分即サレ'
                      : dec === '相手即サレ'
                      ? '🏆 相手即サレ'
                      : dec === '粘りプレイ(捲り挑戦)'
                      ? '🔥 粘り捲り'
                      : dec === '通常決着'
                      ? '⚔️ 通常決着'
                      : dec;
                  return (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => handleSelectPlayDecision(dec)}
                      className={`py-2.5 px-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 text-center ${
                        active
                          ? dec === '早期見切り(即サレ)'
                            ? 'bg-rose-600/90 border-rose-300 text-white shadow-md'
                            : dec === '相手即サレ'
                            ? 'bg-emerald-600 border-emerald-300 text-white shadow-md'
                            : dec === '粘りプレイ(捲り挑戦)'
                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md'
                            : 'bg-sky-600 border-sky-300 text-white shadow-md'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>{shortLabel}</div>
                      <div className="text-[9px] opacity-80 truncate mt-0.5">{dec}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* セクションC: 相手デッキ (No.10) - Master Duel Meta 最新流行対応 */}
          <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="text-purple-400">●</span> 相手デッキ
                <span className="text-[10px] text-slate-400 font-normal">(MDM最新流行順)</span>
              </label>
              {oppDeck && (
                <span className="text-xs font-extrabold text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded-lg">
                  選択中: {oppDeck}
                </span>
              )}
            </div>

            {/* Tier上位・高シェア相手デッキチップ一覧 */}
            <div className="flex flex-wrap gap-1.5">
              {master.相手デッキ.map((deck) => {
                const active = oppDeck === deck;
                return (
                  <button
                    key={deck}
                    type="button"
                    onClick={() => setOppDeck(deck)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                      active
                        ? 'bg-purple-600 border-purple-300 text-white shadow-md shadow-purple-950/60'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {deck}
                  </button>
                );
              })}

              {/* 準流行・その他掲載デッキ展開トグルボタン */}
              <button
                type="button"
                onClick={() => setShowExtendedOppDecks(!showExtendedOppDecks)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 transition"
              >
                {showExtendedOppDecks
                  ? '▲ その他を閉じる'
                  : `▼ その他流行デッキ (+${EXTENDED_OPPONENT_DECKS.length})`}
              </button>
            </div>

            {/* 展開時：Master Duel Meta 下段掲載デッキ群 */}
            {showExtendedOppDecks && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                {EXTENDED_OPPONENT_DECKS.map((deck) => {
                  const active = oppDeck === deck;
                  return (
                    <button
                      key={deck}
                      type="button"
                      onClick={() => setOppDeck(deck)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                        active
                          ? 'bg-purple-600 border-purple-300 text-white shadow-md'
                          : 'bg-slate-950/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {deck}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 自由入力テキストボックス */}
            <div>
              <input
                type="text"
                value={oppDeck}
                onChange={(e) => setOppDeck(e.target.value)}
                placeholder="チップから1タップ選択、または自由入力（未入力時は「不明」）"
                className="w-full rounded-xl bg-slate-950 border border-slate-700/90 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>
          </section>

          {/* セクションD: 自デッキ初動有無 (No.11) ＆ カウンター結果 (No.12) */}
          <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-sm space-y-3">
            {/* Col K (11): 自デッキ初動有無 */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-200">自デッキ初動有無</div>
                <div className="text-[10px] text-slate-400">初手5〜6枚で初動があったか</div>
              </div>
              <div className="grid grid-cols-2 gap-2 w-40 shrink-0">
                {(['○', '×'] as const).map((val) => {
                  const active = hasStarter === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setHasStarter(val)}
                      className={`py-2 rounded-xl font-extrabold text-sm border transition-all active:scale-95 ${
                        active
                          ? val === '○'
                            ? 'bg-emerald-600 border-emerald-300 text-white shadow-md'
                            : 'bg-rose-600 border-rose-300 text-white shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Col L (12): カウンター結果 */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-bold text-slate-200 mb-2">
                カウンター結果（誘発・妨害の乗り越え状況）
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {master.カウンター結果.map((act) => {
                  const active = counterAction === act;
                  return (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setCounterAction(act)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all active:scale-95 truncate ${
                        active
                          ? 'bg-sky-600 border-sky-300 text-white shadow-md shadow-sky-950/60'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {act}
                    </button>
                  );
                })}
              </div>
              {/* 選択中のカウンター結果の意味を補足表示 */}
              {COUNTER_ACTION_HINTS[counterAction] && (
                <p className="mt-1.5 text-[10px] text-slate-400">
                  {counterAction}：{COUNTER_ACTION_HINTS[counterAction]}
                </p>
              )}
            </div>
          </section>

          {/* セクションE: 13番 被弾妨害 (誘発➔対象) ペアビルダーUI */}
          <InteractionPairBuilder
            title="被弾妨害 (相手➔自分)"
            subtitle="撃たれた誘発・妨害と対象"
            accentColor="rose"
            cards={master['誘発・汎用札']}
            targets={master.対象プリセット}
            value={oppInteractions}
            onChange={setOppInteractions}
          />

          {/* セクションF: 14番 自軍妨害 (使用札➔対象) ペアビルダーUI（採用カード自動ピックアップ連動） */}
          <InteractionPairBuilder
            title="自軍妨害 (自分➔相手)"
            subtitle="撃った誘発・妨害と対象"
            accentColor="cyan"
            cards={master['誘発・汎用札']}
            targets={master.対象プリセット}
            value={myInteractions}
            onChange={setMyInteractions}
            activeDeck={currentActiveDeckObj}
          />

          {/* セクションG: 15番 勝敗主因タグ（Win/Loseに応じたスマート強調表示） */}
          <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                勝敗主因タグ
              </label>
              <span className="text-[10px] text-slate-400">
                {result
                  ? `${result}要因を優先強調中`
                  : '勝敗を選ぶと候補がハイライトされます'}
              </span>
            </div>

            <div className="space-y-2.5">
              {orderedFactorGroups.map((group) => (
                <div
                  key={group.label}
                  className={`rounded-xl p-2.5 border transition-all ${
                    group.isPriority
                      ? group.tone === 'emerald'
                        ? 'bg-emerald-950/25 border-emerald-500/40'
                        : 'bg-rose-950/25 border-rose-500/40'
                      : 'bg-slate-950/40 border-slate-800/70 opacity-70'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-300 mb-1.5">{group.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((factor) => {
                      const active = gameFactor === factor;
                      return (
                        <button
                          key={factor}
                          type="button"
                          onClick={() => setGameFactor(factor)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                            active
                              ? group.tone === 'emerald'
                                ? 'bg-emerald-500 border-emerald-200 text-slate-950 shadow-md'
                                : 'bg-rose-500 border-rose-200 text-white shadow-md'
                              : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                          }`}
                        >
                          {factor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* マスタにカスタム主因タグが追加されていた場合の表示 */}
              {otherFactorList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {otherFactorList.map((factor) => (
                    <button
                      key={factor}
                      type="button"
                      onClick={() => setGameFactor(factor)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                        gameFactor === factor
                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {factor}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* セクションH: 16番 ストレス度（1〜5段階ボタンスケール） */}
          <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                ストレス度・メンタル負荷 (1〜5)
              </label>
              <span className="text-[11px] font-bold text-amber-300">
                現在: Lv.{stressLevel} ({STRESS_LEVELS.find((s) => s.level === stressLevel)?.subLabel})
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {STRESS_LEVELS.map((item) => {
                const active = stressLevel === item.level;
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setStressLevel(item.level)}
                    className={`py-2.5 px-1 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center ${
                      active
                        ? item.activeClass
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base leading-none">{item.emoji}</span>
                    <span className="text-xs font-black mt-1">{item.label}</span>
                    <span className="text-[10px] font-semibold opacity-90">{item.subLabel}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* セクションI: 17番 一言メモ（テキストエリア＋音声入力対応） */}
          <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                一言メモ <span className="text-[10px] text-slate-400 font-normal">(任意・音声入力対応)</span>
              </label>
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 transition active:scale-95 ${
                  isListening
                    ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-amber-300'
                }`}
              >
                <span>🎤</span>
                <span>{isListening ? '聞き取り中...' : '音声入力'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700/90 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-none"
            />
          </section>

          {/* バリデーションエラー表示 */}
          {validationError && (
            <div className="rounded-xl bg-rose-950/90 border border-rose-500 px-3.5 py-2.5 text-xs font-bold text-rose-200 shadow-lg">
              ⚠️ {validationError}
            </div>
          )}

          {/* 画面下部固定アクションバー（BottomNav のすぐ上に配置） */}
          <div className="fixed bottom-16 left-0 right-0 z-20 backdrop-blur-md bg-slate-950/92 border-t border-slate-800 px-3 py-2.5">
            <div className="max-w-md mx-auto flex items-center gap-2">
              <button
                type="button"
                onClick={resetMatchForm}
                className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 shrink-0 active:scale-95 transition"
              >
                リセット
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-950/60 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>記録＆AI伴走分析中...</span>
                  </>
                ) : (
                  <>
                    <span>📝</span>
                    <span>対戦結果を記録する</span>
                    {turn && result && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950/30 border border-slate-950/20 font-extrabold flex items-center gap-1">
                        {coin && <span>🪙{coin}</span>}
                        <span>{turn}</span>
                        {coin === '裏' && turn === '先攻' && <span className="text-[10px] text-amber-900 font-black">渡し</span>}
                        <span>/</span>
                        <span>{result}</span>
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
      )}

      {/* 下部固定ボトムナビゲーションバー（ダッシュボード / 統計 / ＋記録 / デッキ / プロフィール） */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setHistoryRecords(getLocalHistory());
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* ⚙️ API URL設定モーダル */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        currentUrl={gasUrl}
        onClose={() => setIsSettingsOpen(false)}
        onSaveUrl={async (newUrl) => {
          saveGasUrl(newUrl);
          setGasUrl(newUrl);
          await loadMasterAndStatus(newUrl);
        }}
        onResetMockData={() => {
          loadMasterAndStatus(gasUrl);
          setHistoryRecords([]);
          setLastAiBanner(null);
        }}
      />

      {/* 送信後のAI伴走フィードバック＆ストッパー警告モーダル */}
      <FeedbackModal
        response={latestPostResponse}
        isMock={isMockMode}
        onClose={() => setLatestPostResponse(null)}
      />

      {/* 最近の記録履歴ドロワー */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        records={historyRecords}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};
