import React from 'react';

export type NavTab = 'dashboard' | 'stats' | 'record' | 'decks' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

/**
 * スクリーンショット（DUEL LOG）スタイルの下部固定ナビゲーションバー
 * 中央に大型の「＋（対戦記録）」フローティング風ボタンを配置
 */
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b1021]/95 backdrop-blur-md border-t border-slate-800/90 pb-safe">
      <div className="max-w-md mx-auto px-2 h-16 grid grid-cols-5 items-center text-center relative">
        {/* 1. ダッシュボード */}
        <button
          type="button"
          onClick={() => onChangeTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full gap-1 transition relative ${
            activeTab === 'dashboard' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'dashboard' && (
            <span className="absolute top-0 w-8 h-0.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span className="text-[10px] font-bold tracking-tight">ダッシュボード</span>
        </button>

        {/* 2. 統計 */}
        <button
          type="button"
          onClick={() => onChangeTab('stats')}
          className={`flex flex-col items-center justify-center h-full gap-1 transition relative ${
            activeTab === 'stats' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'stats' && (
            <span className="absolute top-0 w-8 h-0.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 20V14M12 20V8M18 20V11" />
          </svg>
          <span className="text-[10px] font-bold tracking-tight">統計</span>
        </button>

        {/* 3. 中央「＋」ボタン（対戦記録フォームへ） */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => onChangeTab('record')}
            aria-label="対戦を記録する"
            className={`-mt-4 w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition active:scale-95 ${
              activeTab === 'record'
                ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 ring-4 ring-amber-400/25 shadow-amber-950/70'
                : 'bg-gradient-to-br from-sky-400 to-cyan-500 text-slate-950 shadow-sky-950/70 hover:brightness-110'
            }`}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* 4. デッキ */}
        <button
          type="button"
          onClick={() => onChangeTab('decks')}
          className={`flex flex-col items-center justify-center h-full gap-1 transition relative ${
            activeTab === 'decks' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'decks' && (
            <span className="absolute top-0 w-8 h-0.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12v4M15 12v4" />
          </svg>
          <span className="text-[10px] font-bold tracking-tight">デッキ</span>
        </button>

        {/* 5. プロフィール */}
        <button
          type="button"
          onClick={() => onChangeTab('profile')}
          className={`flex flex-col items-center justify-center h-full gap-1 transition relative ${
            activeTab === 'profile' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'profile' && (
            <span className="absolute top-0 w-8 h-0.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" />
          </svg>
          <span className="text-[10px] font-bold tracking-tight">プロフィール</span>
        </button>
      </div>
    </nav>
  );
};
