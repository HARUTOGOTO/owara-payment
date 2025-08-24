// docs/v2/src/main.v2.js
// v2：LIFF → /checkout ブリッジ固定。configは ?cb= 付きで確実に最新を読む。

(() => {
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const cb = qs.get('cb') || Date.now().toString();
  const DEBUG = qs.get('debug') === '1';

  const setStatus = (msg, ttl = 4000) => {
    if (!DEBUG) return;
    const el = $('status'); if (!el) return;
    el.textContent = msg; el.style.display = 'block';
    clearTimeout(setStatus._t); setStatus._t = setTimeout(() => (el.style.display = 'none'), ttl);
  };

  const uuid = () =>
    (crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10))).toUpperCase();

  // グローバルエラーも可視化（?debug=1 のとき）
  addEventListener('error', (e) => setStatus('ERR: ' + (e?.message || e)));
  addEventListener('unhandledrejection', (e) => setStatus('REJ: ' + (e?.reason?.message || e?.reason || 'unhandled')));

  (async () => {
    // --- 1) config.v2.js を ?cb= 付きで動的 import ---
    let cfg;
    try {
      cfg = await import(`./config.v2.js?cb=${encodeURIComponent(cb)}`);
    } catch (e) {
      setStatus('config.v2.js の読込に失敗: ' + (e?.message || e));
      alert('初期化に失敗しました。少し待って開き直してください。');
      return;
    }

    const LIFF_IDS = JSON.parse(cfg.liffIds || '[]');
    if (!Array.isArray(LIFF_IDS) || LIFF_IDS.length === 0) {
      alert('設定エラー：LIFF ID が未設定です（config.v2.js）');
      return;
    }

    // --- 2) 複数 LIFF ID で初期化（フォールバック） ---
    const initLIFF = async () => {
      for (const id of LIFF_IDS) {
        try { await liff.init({ liffId: id }); return id; } catch {}
      }
      throw new Error('すべての LIFF_ID で初期化に失敗しました');
    };

    try {
      const usedId = await initLIFF();
      await liff.ready;
      setStatus(`LIFF ready: ${usedId}`);

      // --- 3) UI 表示 ---
      $('loader').style.display   = 'none';
      $('hero').style.display     = 'block';
      $('card').style.display     = 'block';
      $('price').style.display    = 'block';
      $('applyBtn').style.display = 'block';
      $('applyBtn').disabled      = false;

      // --- 4) 決済成功で戻ってきた時の保険（B経路）---
      (async () => {
        const p = new URLSearchParams(location.search);
        const ok    = p.get('ok');                  // 1=成功, 0=失敗, 2=保留
        const state = p.get('state') || '';
        const lu    = p.get('lu') || '';

        if (ok === '1') {
          // 追加通知したいときだけ backendEndpoint を使う（無ければスキップ）
          const userForBackend = lu || (liff.isInClient() ? (await liff.getProfile().catch(()=>null))?.userId : null);
          if (cfg.backendEndpoint && userForBackend) {
            try {
              await fetch(cfg.backendEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineUserId: userForBackend, state, source: 'liff-return' }),
              });
              setStatus('paySuccess notified');
            } catch {}
          }
          history.replaceState(null, '', location.pathname);
          if (liff.isInClient()) { liff.closeWindow(); return; }
        }
      })();

      // --- 5) 申込 → /checkout ブリッジへ（常時 this flow） ---
      $('applyBtn').addEventListener('click', async () => {
        try {
          if (!liff.isInClient()) {
            alert('LINEアプリ内からお申込みください。トーク画面のメニューから開けます。');
            return;
          }
          let uid = null;
          try { uid = (await liff.getProfile())?.userId || null; } catch {}
          if (!uid) { alert('ユーザー情報の取得に失敗しました。LINEから開き直してください。'); return; }

          const amount = 100;              // 必要ならUIから取得して置換
          const state  = uuid();
          const params = new URLSearchParams({
            amount: String(amount),
            liffId: usedId,
            lu: uid,
            state,
            debug: DEBUG ? '1' : '0',
          });

          // /checkout を“外部ブラウザ”で開く（/checkout→UnivaPay は location.href で履歴を残す）
          const bridge = `${cfg.siteBaseUrl}/checkout/index.html?${params.toString()}`;
          setStatus('open bridge: ' + bridge);
          if (liff.openWindow) liff.openWindow({ url: bridge, external: true });
          else location.href = bridge;
        } catch (e) {
          console.error('apply click failed', e);
          alert('決済ページを開けませんでした。時間をおいてお試しください。');
        }
      });

    } catch (err) {
      console.error('LIFF init error', err);
      $('loader').style.display = 'none';
      if (DEBUG) setStatus('LIFF 初期化失敗: ' + (err?.message || err));
      else alert('LIFFの初期化に失敗しました。LINEアプリから開き直してください。');
      $('applyBtn').style.display = 'block';
      $('applyBtn').disabled = false;
    }
  })();
})();
