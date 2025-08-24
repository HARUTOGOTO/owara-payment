// LIFF → /checkout ブリッジ固定（/checkout→UnivaPay は location.href で履歴を残す）
// config は ./config.js を ?cb= 付きで import（キャッシュ対策）

(() => {
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const cb = qs.get('cb') || Date.now().toString();
  const DEBUG = qs.get('debug') === '1';

  const setStatus = (msg, ttl = 3500) => {
    if (!DEBUG) return;
    const el = $('status'); if (!el) return;
    el.textContent = msg; el.style.display = 'block';
    clearTimeout(setStatus._t); setStatus._t = setTimeout(() => (el.style.display = 'none'), ttl);
  };

  const uuid = () =>
    (crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10))).toUpperCase();

  addEventListener('error', (e) => setStatus('ERR: ' + (e?.message || e)));
  addEventListener('unhandledrejection', (e) => setStatus('REJ: ' + (e?.reason?.message || e?.reason || 'unhandled')));

  (async () => {
    // 1) 設定を読み込む（./config.js は docs/src/ にあるので相対は ./ ）
    let cfg;
    try {
      cfg = await import(`./config.js?cb=${encodeURIComponent(cb)}`);
    } catch (e) {
      setStatus('config.js の読込に失敗: ' + (e?.message || e));
      alert('初期化に失敗しました。少し待って開き直してください。');
      return;
    }

    // 2) 複数 LIFF ID フォールバック初期化
    const override = qs.get('liffId');
    const LIFF_IDS = override ? [override] : JSON.parse(cfg.liffIds || '[]');
    if (!Array.isArray(LIFF_IDS) || LIFF_IDS.length === 0) {
      alert('設定エラー：LIFF ID が未設定です（config.js）');
      return;
    }
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

      // 3) UI 表示
      $('loader').style.display   = 'none';
      $('hero').style.display     = 'block';
      $('card').style.display     = 'block';
      $('price').style.display    = 'block';
      $('applyBtn').style.display = 'block';
      $('applyBtn').disabled      = false;

      // 4) 決済成功で戻ってきた時の保険（return.html → LIFF DeepLink で戻ってきたケース）
      (async () => {
        const ok    = qs.get('ok');                  // 1=成功, 0=失敗, 2=保留
        const state = qs.get('state') || '';
        const lu    = qs.get('lu') || '';

        if (ok === '1') {
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

      // 5) 申込 → create-checkout → /checkout?co=... を外部ブラウザで開く
      $('applyBtn').addEventListener('click', async () => {
        try {
          if (!liff.isInClient()) {
            alert('LINEアプリ内からお申込みください。トーク画面のメニューから開けます。');
            return;
          }

          let uid = null;
          try { uid = (await liff.getProfile())?.userId || null; } catch {}
          if (!uid) { alert('ユーザー情報の取得に失敗しました。LINEから開き直してください。'); return; }

          const language = (liff.getLanguage?.() || navigator.language || 'ja')
            .toLowerCase().startsWith('en') ? 'en' : 'ja';

          if (!cfg.createCheckoutEndpoint) {
            alert('設定エラー：createCheckoutEndpoint が未設定です（config.js）');
            return;
          }

          const r = await fetch(cfg.createCheckoutEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineUserId: uid, amount: 100, language, planId: 'basic' })
          });

          const text = await r.text();
          let data = {}; try { data = JSON.parse(text); } catch {}
          if (!r.ok || !data.checkoutUrl) {
            console.error('create-checkout error', r.status, text);
            alert('決済ページを開けませんでした。（URL発行エラー）');
            return;
          }

          const st = uuid();
          const params = new URLSearchParams({
            co: data.checkoutUrl,   // サーバ発行URLを /checkout に渡す（co=）
            liffId: usedId,
            lu: uid,
            state: st,
            debug: DEBUG ? '1' : '0'
          });

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
