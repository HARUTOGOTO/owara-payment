import { liffIds } from './config.js';

// 設定
const LIFF_IDS = JSON.parse(liffIds);

// 変数
let lineUserId = null;

// ユーティリティ
const $ = (id) => document.getElementById(id);
const uuid = () =>
  (crypto.randomUUID?.() ||
    (Date.now().toString(36) + Math.random().toString(36).slice(2, 10))
  ).toUpperCase();

// 複数 LIFF ID フォールバック初期化
async function initLIFF() {
  for (const id of LIFF_IDS) {            // ← タイポ修正
    try {
      await liff.init({ liffId: id });
      return id;
    } catch (e) {
      console.warn('LIFF init failed:', id, e?.message);
    }
  }
  throw new Error('すべての LIFF_ID で初期化に失敗しました');
}

window.addEventListener('DOMContentLoaded', async () => {
  const status = $('status');

  try {
    const usedId = await initLIFF();
    await liff.ready;

    // --- UI 切替（ローダー非表示、各パネル表示） ---
    $('loader').style.display = 'none';
    $('hero').style.display   = 'block';
    $('card').style.display   = 'block';
    $('price').style.display  = 'block';
    $('applyBtn').style.display = 'block';
    $('applyBtn').disabled      = false;
    status.style.display        = 'block';
    status.textContent = `LIFF ID: ${usedId} で初期化完了`;

    // ユーザーID（LIFF内のみ取得）
    if (liff.isInClient()) {
      try {
        lineUserId = (await liff.getProfile())?.userId || null;
        if (lineUserId) status.textContent += ` | User: ${lineUserId}`;
      } catch {}
      // Close ボタン（LIFF内）
      liff.ui?.setActionButton?.({ type: 'close' });
    }

    // 申込 → 外部 Hosted へ
    $('applyBtn').addEventListener('click', () => {
      const orderState = uuid();
      const url = new URL('https://pay.owara-kaze-no-bon.com/checkout/index.html');
      url.searchParams.set('amount', '100');
      if (lineUserId) url.searchParams.set('lu', lineUserId);
      url.searchParams.set('liffId', usedId);
      url.searchParams.set('state', orderState);

      if (liff.openWindow) {
        liff.openWindow({ url: url.toString(), external: true });
      } else {
        location.href = url.toString();
      }
    });

  } catch (err) {
    console.error('LIFF init error', err);
    // 失敗時もローダーを消してメッセージ表示
    $('loader').style.display = 'none';
    status.style.display = 'block';
    status.textContent = 'LIFF 初期化失敗: ' + err.message;
    // LIFF外で直アクセスされた場合でも購入はできるよう、ボタンだけ出しておく（任意）
    $('applyBtn').style.display = 'block';
    $('applyBtn').disabled = false;
  }
});
