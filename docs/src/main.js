import { liffIds, backendEndpoint, createCheckoutEndpoint } from './config.js';

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

    // -------- 復帰時ハンドラ（B経路の保険）--------
    (async () => {
      const params = new URLSearchParams(location.search);
      const ok    = params.get('ok');        // 1=成功, 0=失敗, 2=保留
      const state = params.get('state') || '';
      const lu    = params.get('lu') || '';

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
        }
        history.replaceState(null, '', location.pathname);
        if (liff.isInClient()) { liff.closeWindow(); return; }
      }
    })();
    // ----------------------------------------------

    // 申込 → /create-checkout を叩いて返ってきた Hosted URL を外部で開く（A-1）
    $('applyBtn').addEventListener('click', async () => {
      const language =
        (liff.getLanguage?.() || navigator.language || 'ja').toLowerCase().startsWith('en')
          ? 'en' : 'ja';
      try {
        const r = await fetch(createCheckoutEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineUserId: lineUserId,      // 取れない端末でもWebhook側で metadata から確定
            amount: 100,
            language,
            planId: 'basic'
          })
        });
        const data = await r.json();
        const checkoutUrl = data.checkoutUrl || data.url;
        if (!checkoutUrl) throw new Error('No checkoutUrl');
        if (liff.openWindow) liff.openWindow({ url: checkoutUrl, external: true });
        else location.href = checkoutUrl;
      } catch (e) {
        console.error(e);
        alert('決済ページを開けませんでした。時間をおいてお試しください。');
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
