import React, { useState, useEffect } from 'react';
import { INITIAL_MOCK_STATUS } from '../mockData';
import { saveLocalMockStatus, STORAGE_KEYS } from '../api';

interface ApiSettingsModalProps {
  isOpen: boolean;
  currentUrl: string;
  onClose: () => void;
  onSaveUrl: (newUrl: string) => Promise<void>;
  onResetMockData: () => void;
}

/**
 * ⚙️ API URL設定モーダルコンポーネント
 * - GASのWebアプリURLをブラウザの localStorage に保存・変更
 * - セキュリティ方針: Gemini APIキー等の秘匿情報はクライアントに保持せず、GAS側のスクリプトプロパティで安全に一元管理
 */
export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  currentUrl,
  onClose,
  onSaveUrl,
  onResetMockData,
}) => {
  const [inputUrl, setInputUrl] = useState<string>(currentUrl);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputUrl(currentUrl);
      setStatusMessage(null);
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setStatusMessage({ type: 'info', text: '設定を保存してデータを同期しています...' });
    try {
      await onSaveUrl(inputUrl.trim());
      setStatusMessage({
        type: 'success',
        text: inputUrl.trim()
          ? '✅ GAS WebアプリURLを保存し、マスタ＆ステータスを取得しました！'
          : '✅ プレビューモード（内蔵モックデータ）に切り替えました。',
      });
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信エラーが発生しました';
      setStatusMessage({
        type: 'error',
        text: `⚠️ URLは保存されましたがGET通信で警告がありました: ${msg}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <h2 className="text-sm font-bold text-white">GAS API URL設定</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* モーダル本文 */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <span>📊</span>
              <span>Google Apps Script WebアプリURL (`exec`)</span>
            </label>
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
              ※ 空欄のまま保存すると、内蔵のモックデータ＆AI伴走シミュレーターでプレビュー動作します。
            </p>
          </div>

          {/* セキュリティ・通信仕様インフォメーション */}
          <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 text-[11px] text-slate-400 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center gap-1">
              <span>🔒</span>
              <span>セキュアなサーバーレス管理</span>
            </div>
            <p className="leading-relaxed">
              Gemini APIキー等の機密情報はブラウザ（localStorage）には一切保持せず、ご自身のGoogle Apps Script（スクリプトプロパティ）側で安全に保護されます。
            </p>
            <p className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-1">
              POST送信時は <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">Content-Type: text/plain;charset=utf-8</code> でCORSプリフライトを自動回避します。
            </p>
          </div>

          {statusMessage && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                  : 'bg-sky-950/80 border-sky-500/50 text-sky-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* プレビューデータの初期化オプション */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">プレビュー用の戦績・履歴を初期化</span>
            <button
              type="button"
              onClick={() => {
                saveLocalMockStatus(INITIAL_MOCK_STATUS);
                localStorage.removeItem(STORAGE_KEYS.LOCAL_HISTORY);
                onResetMockData();
                setStatusMessage({
                  type: 'info',
                  text: '🔄 プレビュー戦績とローカル履歴を初期状態（5戦2勝3敗）にリセットしました。',
                });
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700"
            >
              モック初期化
            </button>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isTesting}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-950/50 disabled:opacity-50"
            >
              {isTesting ? '通信中...' : '保存して反映'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
