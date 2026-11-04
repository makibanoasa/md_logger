# 遊戯王マスターデュエル マスター1到達管理Webアプリ

[SPEC.md](file:///c:/Users/user/Documents/md_logger/SPEC.md) の仕様に完全準拠した、スマートフォン片手操作特化型の1画面完結型対戦記録SPA（React + TypeScript + Tailwind CSS）です。

## 主な実装機能

1. **ヘッダー＆ミニステータスバー ([`StatusHeader.tsx`](file:///c:/Users/user/Documents/md_logger/src/components/StatusHeader.tsx))**
   - 本日の戦績（試合数・勝敗・勝率）、M1までの残り勝ち越し数、現在ランク・使用デッキを画面最上部に常時コンパクト表示。
   - 右上の「⚙️ API設定」ボタンから Google Apps Script (GAS) のWebアプリURL (`exec`) を `localStorage` に保存・変更可能。
   - API URL未設定時は、内蔵のモックデータベース＆AI伴走シミュレーターでそのままプレビュー動作します。

2. **「誘発➔対象」2ステップ・ペアビルダーUI ([`InteractionPairBuilder.tsx`](file:///c:/Users/user/Documents/md_logger/src/components/InteractionPairBuilder.tsx))**
   - **被弾妨害 (`opp_interactions`)** と **自軍妨害 (`my_interactions`)** の双方に搭載。
   - 誘発・汎用札チップをタップすると、直下に「対象を選択（任意）」サブチップ群（`➔初動`, `➔増G`, `➔フワロス`, `➔EX中継`, `➔レクイエム`, `自由入力...`, `対象指定なしで追加` 等）が展開され、2タップでペアタグを追加可能。未選択時はデフォルトで `["なし"]` を送信します。

3. **勝敗・判断区分・コイントス連動スマートデフォルト ([`App.tsx`](file:///c:/Users/user/Documents/md_logger/src/App.tsx))**
   - **コイントス欄の新設**: 「🪙 表（勝ち）」/「💀 裏（負け）」をタップ可能。
     - 表タップ時は「先攻」、裏タップ時は「後攻」を初期アシスト。
     - 面を取られた（コイントス裏）のに相手が後攻を選んで先攻を渡してきたケースでは、コイントス「裏」の状態で「先攻」を選ぶだけで **「🎯 相手が後攻選択（先攻渡し）」** として正確に記録できます。
   - 判断区分で `早期見切り(即サレ)` をタップすると、自動的に勝敗 (`result`) が `Lose` にセットされます。
   - 勝敗主因タグ (`game_factor`) は、`Win` 選択時は勝ち主因（`制圧完封`, `誘発刺さり` 等）を、`Lose` 選択時は負け主因（`初動事故`, `Gフワロス停止` 等）を優先強調表示します。

4. **CORS配慮のGAS API通信 ([`api.ts`](file:///c:/Users/user/Documents/md_logger/src/api.ts))**
   - POST送信時はプリフライトリクエスト（`OPTIONS`）によるCORSエラーを回避するため、`Content-Type: "text/plain;charset=utf-8"` を指定してJSON文字列を送信します。

5. **AI伴走フィードバック＆ストッパー警告モーダル ([`FeedbackModal.tsx`](file:///c:/Users/user/Documents/md_logger/src/components/FeedbackModal.tsx))**
   - 記録完了時に `aiComment` を大型カードで表示。
   - `isStopperTriggered === true`（3連敗または高ストレス連続時）の場合は、モーダルおよび上部ステータスバーが赤/黄色の警告デザインに切り替わり、`stopperAlerts` を強調表示して休憩を促します。
   - 記録完了後、`my_rank`（現在ランク）と `my_deck`（使用デッキ）を維持したままフォームを自動リセットします。

## 開発・起動コマンド

```bash
# 開発サーバ起動 (ポート 5173)
npm run dev

# キャッシュクリア付きクリーン起動 (ワークフローA)
npm run dev:clean

# 型チェック＆本番ビルド (Cloudflare Pages デプロイ用 dist 生成)
npm run build
```
