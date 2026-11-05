/**
 * 遊戯王マスターデュエル マスター1到達管理DB バックエンド GAS スクリプト (gas/Code.gs)
 *
 * 【案C 完全対応版】
 * 1. 遊戯王ニューロン出力のデッキリストファイル（JPG画像またはPDF）を Gemini 3.8 Flash Vision でOCR解析し、
 *    モンスター・魔法・罠・EXの採用カード名＆枚数を100%構造化データとして返却 (action: 'parse_deck_image')
 * 2. スプレッドシート内に別シート『デッキレシピ』を自動生成・更新し、
 *    デッキIDごとの採用カード一覧をデータベース化 (action: 'sync_decks')
 * 3. 『対戦ログ』シートへの記録時、A〜R列（基本18列）に加えて
 *    S列: コイントス / T列: デッキID / U列: 採用カード一覧テキスト を自動保存！
 *    これにより、スプレッドシートをGeminiアプリに読み込ませた際、1戦ごとの採用カード・枚数をAIが確実に把握できます。
 */

const SHEET_LOG = '対戦ログ';
const SHEET_MASTER = 'マスタ設定';
const SHEET_DECK_RECIPES = 'デッキレシピ';
const GEMINI_MODEL = 'gemini-3.8-flash';

/**
 * Gemini API キーを取得（スクリプトプロパティ `GEMINI_API_KEY` に設定してください）
 */
function getGeminiApiKey_() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
}

/**
 * JSON レスポンス生成ヘルパー
 */
function createJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * 3.1 GET リクエスト（起動時のマスタ＆現在ステータス取得）
 */
function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName(SHEET_MASTER);
    const logSheet = ss.getSheetByName(SHEET_LOG);

    // マスタ取得（存在しない場合は空オブジェクトでフロント側最新定義にフォールバック）
    const master = {};
    if (masterSheet) {
      const data = masterSheet.getDataRange().getValues();
      if (data.length > 0) {
        const headers = data[0];
        for (let col = 0; col < headers.length; col++) {
          const key = String(headers[col]).trim();
          if (!key) continue;
          const values = [];
          for (let row = 1; row < data.length; row++) {
            const val = String(data[row][col] || '').trim();
            if (val) values.push(val);
          }
          master[key] = values;
        }
      }
    }

    const currentStatus = calculateCurrentStatus_(logSheet);
    const records = readAllRecords_(logSheet);

    return createJsonResponse_({
      status: 'success',
      master: master,
      currentStatus: currentStatus,
      records: records,
    });
  } catch (err) {
    return createJsonResponse_({
      status: 'error',
      message: String(err),
    });
  }
}

/**
 * 3.2 POST リクエスト（対戦記録 / ニューロンJPG画像OCR / デッキレシピシート同期）
 */
function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(rawBody);

    // ① ニューロン出力JPG/PDF画像のAI読み取りリクエスト
    if (payload.action === 'parse_deck_image') {
      const cards = parseNeuronDeckImageWithGemini_(payload.imageBase64, payload.mimeType);
      return createJsonResponse_({
        status: 'success',
        cards: cards,
      });
    }

    // ② 別シート『デッキレシピ』への同期リクエスト（案C）
    if (payload.action === 'sync_decks') {
      syncDeckRecipesSheet_(payload.decks || []);
      return createJsonResponse_({
        status: 'success',
        message: '『デッキレシピ』シートを更新しました',
      });
    }

    // ③ 通常の対戦結果記録リクエスト（案C：『対戦ログ』シートにデッキIDと採用カードテキストも保存）
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(SHEET_LOG);
    if (!logSheet) {
      logSheet = ss.insertSheet(SHEET_LOG);
      logSheet.appendRow([
        '試合No',
        '日付',
        '時刻',
        'シーズン',
        '現在ランク',
        '使用デッキ',
        '先攻/後攻',
        '勝敗',
        '判断区分',
        '相手デッキ',
        '自デッキ初動有無',
        'カウンター結果',
        '被弾妨害(誘発➔対象)',
        '自軍妨害(使用札➔対象)',
        '勝敗主因タグ',
        'ストレス度',
        '一言メモ',
        'AI伴走コメント',
        'コイントス',
        'デッキID',
        '採用カード一覧(AI分析用)',
      ]);
    } else {
      // 既存シートの1行目ヘッダーに S〜U列 が未設定なら自動補完
      ensureExtendedLogHeaders_(logSheet);
    }

    const lastRow = logSheet.getLastRow();
    const matchId = Math.max(1, lastRow);
    const now = new Date();
    const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
    const dateStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, tz, 'HH:mm:ss');
    const seasonStr = Utilities.formatDate(now, tz, 'yyyy-MM');

    const aiComment = generateMatchAiComment_(payload);

    const oppInteractionsStr = Array.isArray(payload.opp_interactions)
      ? payload.opp_interactions.join(', ')
      : String(payload.opp_interactions || 'なし');
    const myInteractionsStr = Array.isArray(payload.my_interactions)
      ? payload.my_interactions.join(', ')
      : String(payload.my_interactions || 'なし');

    // A(1)〜R(18) + S(19):コイントス + T(20):デッキID + U(21):採用カード一覧テキスト
    logSheet.appendRow([
      matchId,
      dateStr,
      timeStr,
      seasonStr,
      payload.my_rank || 'ダイヤ5',
      payload.my_deck || '',
      payload.turn || '',
      payload.result || '',
      payload.play_decision || '通常決着',
      payload.opp_deck || '不明',
      payload.has_starter || '○',
      payload.counter_action || '無風',
      oppInteractionsStr,
      myInteractionsStr,
      payload.game_factor || '',
      Number(payload.stress_level || 2),
      payload.memo || '',
      aiComment,
      payload.coin || '',
      payload.my_deck_id || '',
      payload.my_deck_recipe || '',
    ]);

    const updatedStatus = calculateCurrentStatus_(logSheet);

    return createJsonResponse_({
      status: 'success',
      recordedMatchNo: matchId,
      aiComment: aiComment,
      updatedStatus: updatedStatus,
    });
  } catch (err) {
    return createJsonResponse_({
      status: 'error',
      message: String(err),
    });
  }
}

/**
 * 既存の『対戦ログ』シート1行目に S〜U列（コイントス・デッキID・採用カード一覧）のヘッダーを補完する
 */
function ensureExtendedLogHeaders_(logSheet) {
  if (logSheet.getLastRow() === 0) return;
  const headers = logSheet.getRange(1, 1, 1, 21).getValues()[0];
  if (!headers[18]) logSheet.getRange(1, 19).setValue('コイントス');
  if (!headers[19]) logSheet.getRange(1, 20).setValue('デッキID');
  if (!headers[20]) logSheet.getRange(1, 21).setValue('採用カード一覧(AI分析用)');
}

/**
 * 遊戯王ニューロン出力のデッキリスト（画像またはPDF）を Gemini 2.5 Flash Vision で解析し、
 * [{ name: "エフェクト・ヴェーラー", count: 3, category: "monster" }, ...] を返す
 * 
 * セキュリティ方針:
 * - APIキーはGASのスクリプトプロパティ `GEMINI_API_KEY` のみで安全に保持
 */
function parseNeuronDeckImageWithGemini_(imageBase64, mimeType) {
  const apiKey = getGeminiApiKey_();
  if (!apiKey) {
    throw new Error('GASのスクリプトプロパティに GEMINI_API_KEY が設定されていません。Apps Scriptの設定からAPIキーを登録してください');
  }

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' +
    encodeURIComponent(apiKey);

  const prompt = [
    '添付された遊戯王ニューロン（公式カードデータベース）のデッキレシピシート（画像またはPDF）から、',
    '「モンスターカード」「魔法カード」「罠カード」「エクストラデッキ」に記載されている全てのカード名と枚数を正確に読み取ってください。',
    '以下のJSON配列フォーマットのみを出力してください：',
    '[{"name": "カード名", "count": 枚数(数値), "category": "monster" | "spell" | "trap" | "extra"}]',
  ].join('\n');

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true,
  });

  const statusCode = res.getResponseCode();
  const resText = res.getContentText();

  let json;
  try {
    json = JSON.parse(resText);
  } catch (e) {
    throw new Error('Gemini APIレスポンス解析エラー (HTTP ' + statusCode + ')');
  }

  if (statusCode !== 200 || json.error) {
    const errMsg = json.error && json.error.message ? json.error.message : resText;
    throw new Error('Gemini APIエラー (HTTP ' + statusCode + '): ' + errMsg);
  }

  // candidates の parts から最終テキストを抽出（Thinkingパートが存在する場合を考慮）
  let rawText = '';
  if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
    const parts = json.candidates[0].content.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].text && !parts[i].thought) {
        rawText = parts[i].text;
        break;
      }
    }
    if (!rawText && parts[0] && parts[0].text) {
      rawText = parts[0].text;
    }
  }

  if (!rawText) {
    throw new Error('Gemini APIからテキストが返却されませんでした');
  }

  // マークダウンコードブロック（```json ... ```）の除去
  rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let cards = [];
  try {
    cards = JSON.parse(rawText);
  } catch (e) {
    throw new Error('AI出力のJSONパースに失敗しました: ' + rawText.slice(0, 100));
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error('画像/PDFからカード名と枚数を検出できませんでした。より鮮明なファイルをお試しください。');
  }

  return cards;
}

/**
 * 案C：別シート『デッキレシピ』へ登録デッキと採用カード一覧を同期保存する
 */
function syncDeckRecipesSheet_(decks) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_DECK_RECIPES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DECK_RECIPES);
  }
  sheet.clearContents();

  const headers = [
    'デッキID',
    'デッキ名',
    'バージョンメモ',
    '更新日',
    'メイン枚数',
    'EX枚数',
    'モンスター一覧',
    '魔法一覧',
    '罠一覧',
    'EX一覧',
    'AI分析用全採用カードテキスト',
  ];
  const rows = [headers];

  for (let i = 0; i < decks.length; i++) {
    const d = decks[i];
    const cards = Array.isArray(d.cards) ? d.cards : [];
    const fmt = function (cat) {
      return cards
        .filter(function (c) {
          return c.category === cat;
        })
        .map(function (c) {
          return c.name + '×' + c.count;
        })
        .join(', ');
    };

    rows.push([
      d.id || '',
      d.name || '',
      d.versionNote || '',
      d.updatedAt || '',
      Number(d.mainCount || 0),
      Number(d.extraCount || 0),
      fmt('monster'),
      fmt('spell'),
      fmt('trap'),
      fmt('extra'),
      d.compactText || '',
    ]);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
}

/**
 * 1戦ごとのAI伴走コメント生成（採用カードレシピもプロンプトに渡して的確化）
 */
function generateMatchAiComment_(payload) {
  const apiKey = getGeminiApiKey_();
  if (!apiKey) {
    return payload.result === 'Win'
      ? 'ナイス勝利です！この調子でマスター1へ突き進みましょう！'
      : '惜しい一戦でした。深呼吸して次戦へ切り替えましょう！';
  }

  try {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' +
      encodeURIComponent(apiKey);

    const prompt = [
      'あなたは遊戯王マスターデュエルのランクマッチ伴走AIコーチです。100文字以内で簡潔・温かいフィードバックを返してください。',
      '使用デッキ: ' + payload.my_deck + (payload.my_deck_recipe ? ' (' + payload.my_deck_recipe + ')' : ''),
      '相手デッキ: ' + payload.opp_deck,
      'コイン/先後/勝敗: コイン' + (payload.coin || '不明') + ' / ' + payload.turn + ' / ' + payload.result,
      '判断区分: ' + payload.play_decision + ' / 初動: ' + payload.has_starter + ' / カウンター結果: ' + payload.counter_action,
      '被弾妨害: ' + JSON.stringify(payload.opp_interactions) + ' / 自軍妨害: ' + JSON.stringify(payload.my_interactions),
      '勝敗主因: ' + payload.game_factor + ' / ストレスLv: ' + payload.stress_level + ' / メモ: ' + (payload.memo || 'なし'),
    ].join('\n');

    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      muteHttpExceptions: true,
    });

    const json = JSON.parse(res.getContentText());
    return (
      (json.candidates &&
        json.candidates[0] &&
        json.candidates[0].content &&
        json.candidates[0].content.parts &&
        json.candidates[0].content.parts[0].text) ||
      '記録完了！次戦も冷静にいきましょう。'
    ).trim();
  } catch (e) {
    return '記録完了！水分補給を挟んで次戦へ臨みましょう。';
  }
}

/**
 * 『対戦ログ』シートから現在ステータスを集計
 */
function calculateCurrentStatus_(logSheet) {
  const defaultStatus = {
    lastRank: 'ダイヤ5',
    lastDeck: '幻影騎士団',
    totalMatches: 0,
    todayMatches: 0,
    todayWins: 0,
    todayLosses: 0,
    todayWinRate: 0,
    currentLoseStreak: 0,
    consecutiveHighStress: 0,
    remainingNetWins: 40,
    dashboardAlert: '🟢【順調】メンタル良好・勝率安定。M1を目指して続行可能',
    stopperAlerts: [],
    isStopperTriggered: false,
  };

  if (!logSheet || logSheet.getLastRow() <= 1) {
    return defaultStatus;
  }

  const rows = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 18).getValues();
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  const todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  let todayMatches = 0;
  let todayWins = 0;
  let todayLosses = 0;
  let netWins = 0;

  for (let i = 0; i < rows.length; i++) {
    const rDate = rows[i][1] instanceof Date
      ? Utilities.formatDate(rows[i][1], tz, 'yyyy-MM-dd')
      : String(rows[i][1]);
    const res = String(rows[i][7]);
    if (res === 'Win') netWins++;
    if (res === 'Lose') {
      // マスターデュエル仕様: 各ランク帯の底（ダイヤ5等）では降格・借金がないため、netWinsは0未満にならない
      netWins = Math.max(0, netWins - 1);
    }

    if (rDate === todayStr) {
      todayMatches++;
      if (res === 'Win') todayWins++;
      if (res === 'Lose') todayLosses++;
    }
  }

  let currentLoseStreak = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][7]) === 'Lose') currentLoseStreak++;
    else break;
  }

  let consecutiveHighStress = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (Number(rows[i][15]) >= 4) consecutiveHighStress++;
    else break;
  }

  const lastRow = rows[rows.length - 1];
  const stopperAlerts = [];
  if (currentLoseStreak >= 3) {
    stopperAlerts.push('🛑【3連敗ストッパー発動】現在' + currentLoseStreak + '連敗中です。15分以上の休憩を強く推奨します！');
  }
  if (consecutiveHighStress >= 2) {
    stopperAlerts.push('🔥【高負荷メンタル警告】ストレス度4〜5が' + consecutiveHighStress + '戦連続しています。');
  }

  return {
    lastRank: String(lastRow[4] || 'ダイヤ5'),
    lastDeck: String(lastRow[5] || '幻影騎士団'),
    totalMatches: rows.length,
    todayMatches: todayMatches,
    todayWins: todayWins,
    todayLosses: todayLosses,
    todayWinRate: todayMatches > 0 ? Math.round((todayWins / todayMatches) * 1000) / 10 : 0,
    currentLoseStreak: currentLoseStreak,
    consecutiveHighStress: consecutiveHighStress,
    remainingNetWins: Math.max(0, 40 - netWins),
    dashboardAlert:
      stopperAlerts.length > 0
        ? '🔴【撤退推奨】連敗または高ストレスを検知しました。休憩を取りましょう！'
        : '🟢【順調】メンタル良好・勝率安定。M1を目指して続行可能',
    stopperAlerts: stopperAlerts,
    isStopperTriggered: stopperAlerts.length > 0,
  };
}

/**
 * 『対戦ログ』シートから全対戦レコード（最大500件）を最新順で取得して返却する
 * スプレッドシート側の既存データがスマホのダッシュボード・統計に即時反映されます。
 */
function readAllRecords_(logSheet) {
  if (!logSheet || logSheet.getLastRow() <= 1) {
    return [];
  }

  const lastRow = logSheet.getLastRow();
  const maxCols = Math.max(18, logSheet.getLastColumn());
  // 最大最新500件まで取得
  const startRow = Math.max(2, lastRow - 499);
  const numRows = lastRow - startRow + 1;
  const rawData = logSheet.getRange(startRow, 1, numRows, maxCols).getValues();
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';

  const records = [];
  // 最新（下の行）から逆順に配列へ追加
  for (let i = rawData.length - 1; i >= 0; i--) {
    const row = rawData[i];
    const matchId = Number(row[0]) || (startRow + i - 1);
    const dateVal = row[1] instanceof Date
      ? Utilities.formatDate(row[1], tz, 'yyyy-MM-dd')
      : String(row[1] || '');
    const timeVal = row[2] instanceof Date
      ? Utilities.formatDate(row[2], tz, 'HH:mm:ss')
      : String(row[2] || '');

    let seasonVal = '';
    if (row[3] instanceof Date) {
      seasonVal = Utilities.formatDate(row[3], tz, 'yyyy-MM');
    } else if (row[3]) {
      const sRaw = String(row[3]).trim();
      const match = sRaw.match(/^(\d{4})[-/](\d{1,2})/);
      if (match) {
        seasonVal = match[1] + '-' + (match[2].length === 1 ? '0' + match[2] : match[2]);
      } else {
        const parsed = new Date(sRaw);
        if (!isNaN(parsed.getTime())) {
          seasonVal = Utilities.formatDate(parsed, tz, 'yyyy-MM');
        } else {
          seasonVal = sRaw;
        }
      }
    }
    if (!seasonVal && dateVal) {
      seasonVal = dateVal.slice(0, 7);
    }

    const parseInteractions = function (raw) {
      if (!raw) return ['なし'];
      const str = String(raw).trim();
      if (!str || str === 'なし') return ['なし'];
      return str.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    };

    records.push({
      match_id: matchId,
      date: dateVal,
      time: timeVal,
      season: seasonVal,
      my_rank: String(row[4] || 'ダイヤ5'),
      my_deck: String(row[5] || ''),
      turn: String(row[6] || ''),
      result: String(row[7] || ''),
      play_decision: String(row[8] || '通常決着'),
      opp_deck: String(row[9] || '不明'),
      has_starter: String(row[10] || '○'),
      counter_action: String(row[11] || '無風'),
      opp_interactions: parseInteractions(row[12]),
      my_interactions: parseInteractions(row[13]),
      game_factor: String(row[14] || ''),
      stress_level: Number(row[15]) || 2,
      memo: String(row[16] || ''),
      ai_comment: String(row[17] || ''),
      coin: String(row[18] || ''),
      my_deck_id: String(row[19] || ''),
      my_deck_recipe: String(row[20] || ''),
    });
  }

  return records;
}

/**
 * スプレッドシートを開いた時に自動実行：カスタムメニューを追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏆 MDロガー')
    .addItem('✨ 初期シート自動生成・セットアップ', 'setupMasterDuelLogger')
    .addToUi();
}

/**
 * ワンクリック初期セットアップ関数
 * 新規の白紙スプレッドシートでも、この関数を実行するだけで
 * 『対戦ログ』『マスタ設定』『デッキレシピ』の3シートと全設定が自動生成されます。
 */
function setupMasterDuelLogger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 『対戦ログ』シートのセットアップ
  let logSheet = ss.getSheetByName(SHEET_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOG, 0);
  }
  const logHeaders = [
    '試合No',
    '日付',
    '時刻',
    'シーズン',
    '現在ランク',
    '使用デッキ',
    '先攻/後攻',
    '勝敗',
    '判断区分',
    '相手デッキ',
    '自デッキ初動有無',
    'カウンター結果',
    '被弾妨害(誘発➔対象)',
    '自軍妨害(使用札➔対象)',
    '勝敗主因タグ',
    'ストレス度',
    '一言メモ',
    'AI伴走コメント',
    'コイントス',
    'デッキID',
    '採用カード一覧(AI分析用)',
  ];
  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow(logHeaders);
    const headerRange = logSheet.getRange(1, 1, 1, logHeaders.length);
    headerRange.setBackground('#1e293b').setFontColor('#f8fafc').setFontWeight('bold');
    logSheet.setFrozenRows(1);
  } else {
    ensureExtendedLogHeaders_(logSheet);
  }

  // 2. 『マスタ設定』シートのセットアップ
  let masterSheet = ss.getSheetByName(SHEET_MASTER);
  if (!masterSheet) {
    masterSheet = ss.insertSheet(SHEET_MASTER, 1);
  }
  if (masterSheet.getLastRow() === 0) {
    const masterData = [
      ['自軍デッキ', '相手デッキ', '誘発・汎用札', '対象プリセット', '判断区分', 'カウンター結果', '勝敗主因タグ'],
      ['幻影騎士団', 'エルフェンノーツ', '増G', '初動', '通常決着', '無風', '制圧完封'],
      ['オルフェゴール', 'エルフェンノーツ・キラーチューン', 'フワロス', '増G', '早期見切り(即サレ)', '対抗札貫通', '誘発刺さり'],
      ['シャドール', 'ドラゴンテイル', 'うらら', 'フワロス', '相手即サレ', 'ケア展開で回避', '妥協守り切り'],
      ['召喚獣', 'アルトメギア', 'ドロバ', 'EX中継', '粘りプレイ(捲り挑戦)', '手数貫通', '捲り成功'],
      ['磁石の戦士', '閃刀姫', '抹殺の指名者', 'サーチ効果', '', '妥協盤面移行', '時間切れ・運勝ち'],
      ['', '烙印', '墓穴の指名者', '墓地効果', '', '停止', '初動事故'],
      ['', 'M∀LICE', '無限泡影', '制圧モンスター', '', '未展開(即サレ)', 'Gフワロス停止'],
      ['', 'オルフェゴール', 'ヴェーラー', 'バック・罠', '', '', '誘発被弾停止'],
      ['', 'ライゼオル巳剣', '霊王の波動', '省略(対象指定なし)', '', '', 'まくり札直撃'],
      ['', '天盃龍', '聖王の粉砕', '', '', '', '手数捲られ'],
      ['', 'ラビュリンス', 'ニビル', '', '', '', 'プレミ'],
      ['', 'ティアラメンツ', 'アトラクター', '', '', '', '相手理想展開(誘発なし)'],
      ['', '青眼', '超融合', '', '', '', '相手標準展開(誘発ありだが貫通)'],
      ['', '不明', 'なし', '', '', '', '相手妥協展開(誘発あり)'],
    ];

    masterSheet.getRange(1, 1, masterData.length, masterData[0].length).setValues(masterData);
    masterSheet.getRange(1, 1, 1, masterData[0].length).setBackground('#0f172a').setFontColor('#38bdf8').setFontWeight('bold');
    masterSheet.setFrozenRows(1);
  }

  // 3. 『デッキレシピ』シートのセットアップ
  let deckSheet = ss.getSheetByName(SHEET_DECK_RECIPES);
  if (!deckSheet) {
    deckSheet = ss.insertSheet(SHEET_DECK_RECIPES, 2);
  }
  if (deckSheet.getLastRow() === 0) {
    const deckHeaders = [
      'デッキID',
      'デッキ名',
      'バージョンメモ',
      '更新日',
      'メイン枚数',
      'EX枚数',
      'モンスター一覧',
      '魔法一覧',
      '罠一覧',
      'EX一覧',
      'AI分析用全採用カードテキスト',
    ];
    deckSheet.appendRow(deckHeaders);
    deckSheet.getRange(1, 1, 1, deckHeaders.length).setBackground('#1e293b').setFontColor('#34d399').setFontWeight('bold');
    deckSheet.setFrozenRows(1);
  }

  // デフォルトの余計な「シート1」があれば削除
  const defaultSheet = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {
      // 無視
    }
  }

  try {
    SpreadsheetApp.getUi().alert('✅ セットアップ完了！\n『対戦ログ』『マスタ設定』『デッキレシピ』シートが正常に作成されました。\n「デプロイ」➔「新しいデプロイ」からWebアプリとして公開してください。');
  } catch (e) {
    // UI非対応環境でのフォールバック
  }
}
