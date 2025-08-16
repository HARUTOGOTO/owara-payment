import { liffIds, backendEndpoint } from './config.js';

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
  for (const id of LIFF_IDS) {
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
    $('loader').style.display   = 'none';
    $('hero').style.display     = 'block';
    $('card').style.display     = 'block';
    $('price').style.display    = 'block';
    $('applyBtn').style.display = 'block';
    $('applyBtn').disabled      = false;
    status.style.display        = 'block';
    status.textContent          = `LIFF ID: ${usedId} で初期化完了`;

    // ユーザーID（LIFF内のみ取得）
    if (liff.isInClient()) {
      try {
        lineUserId = (await liff.getProfile())?.userId || null;
        if (lineUserId) status.textContent += ` | User: ${lineUserId}`;
      } catch {}
      liff.ui?.setActionButton?.({ type: 'close' });
    }

    // -------- ここが「復帰時ハンドラ」本体（この位置に置く）--------
    // return.html → LIFF に戻ると、?ok=1&liffId=...&lu=...&state=... が付きます
    (async () => {
      const params = new URLSearchParams(location.search);
      const ok    = params.get('ok');        // 1=成功, 0=失敗, 2=保留
      const state = params.get('state') || '';
      const lu    = params.get('lu') || '';  // Hosted に渡しておいた userId（保険）

      if (ok === '1') {
        const userForBackend = lu || lineUserId;
        if (userForBackend && backendEndpoint) {
          try {
            await fetch(backendEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lineUserId: userForBackend,
                state,
                source: 'liff-return'
              }),
            });
            console.log('paySuccess notified');
          } catch (e) {
            console.error('paySuccess call failed', e);
          }
        } else {
          console.warn('No backendEndpoint or user id to notify.');
        }

        // クエリを消して二重実行防止
        history.replaceState(null, '', location.pathname);

        // LINE クライアントならトークへ戻す
        if (liff.isInClient()) {
          liff.closeWindow();
          return; // 以降の処理は不要
        }
      }
    })();
    // -----------------------------------------------------------

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
    $('loader').style.display = 'none';
    status.style.display = 'block';
    status.textContent = 'LIFF 初期化失敗: ' + err.message;
    $('applyBtn').style.display = 'block';
    $('applyBtn').disabled = false;
  }
});
