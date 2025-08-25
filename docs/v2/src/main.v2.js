// C:\Users\gotou\owara-payment\docs\v2\src\main.v2.js
// LIFF → /checkout ブリッジ固定（/checkout→UnivaPay は location.href で履歴を残す）
// 言語は ?lang → LIFF.getLanguage → navigator.language → 'ja' の優先度で自動切替

(() => {
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const cb = qs.get('cb') || Date.now().toString();
  const DEBUG = qs.get('debug') === '1';
  const autoClose = qs.get('ac') === '1'; // ← 追加：ac=1 で開いたら即クローズ用フラグ

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

  // ====== I18N 定義 ======
  const I18N = {
    ja: {
      title: 'おわら風の盆｜有料メニュー決済 (LIFF)',
      hero: '有料提供サービス',
      services: [
        { title: '便利情報',                desc: 'トイレ・おやすみ処・交通機関など' },
        { title: '踊っている場所が分かる（一部）', desc: 'GPSを用いて現在の演者の位置を表示' },
        { title: '見どころ / ルートマップ',    desc: 'お勧めの楽しみ方のルート' },
        { title: 'おわらの真髄に迫る記事・動画', desc: '300年の歴史と伝統を深掘り' },
        { title: '限定グッズ',                desc: 'ここでしか買えないおわらの香り' },
        { title: '綺麗な写真スポット',         desc: '綺麗な写真を撮影できる場所' },
      ],
      priceLines: [
        '価格：100円（買い切り）',
        '利用可能期間：8/25〜9/15',
        '決済方法：クレジットカード / PayPay',
        '※決済は外部ブラウザが開きます',
      ],
      tokushoText: '特定商取引法に基づく表記',
      privacyText: 'プライバシーポリシー',
      applyText: 'お申込みはこちらから！',
    },
    en: {
      title: 'Owara Kaze-no-Bon | Premium Purchase (LIFF)',
      hero: 'Premium features',
      services: [
        { title: 'Useful information',          desc: 'Toilets, rest spots, transport' },
        { title: 'Where people are dancing',    desc: 'See performer locations via GPS (partial)' },
        { title: 'Highlights & route map',      desc: 'Suggested routes to enjoy' },
        { title: 'Articles & videos',           desc: 'Dive into 300 years of history' },
        { title: 'Limited goods',               desc: 'Exclusive Owara fragrance' },
        { title: 'Photo spots',                 desc: 'Great places for beautiful shots' },
      ],
      priceLines: [
        'Price: ¥100 (one-time)',
        'Available: Aug 25 – Sep 15',
        'Payment: Credit card / PayPay',
        '* Checkout opens an external browser',
      ],
      tokushoText: 'Legal notice',
      privacyText: 'Privacy policy',
      applyText: 'Proceed to purchase',
    },
  };

  // UI描画
  function renderUI(dict) {
    // タイトルと <html lang>
    document.title = dict.title;
    document.documentElement.lang = (dict === I18N.en) ? 'en' : 'ja';

    // 見出し
    $('hero').textContent = dict.hero;

    // サービス（ulを再生成）
    const ul = $('card').querySelector('ul.services');
    ul.innerHTML = dict.services
      .map(item =>
        `<li><span class="title">${item.title}</span><span class="desc">${item.desc}</span></li>`
      ).join('');

    // 価格など
    const priceEl = $('price');
    const anchors = priceEl.querySelectorAll('a');
    priceEl.querySelectorAll('span').forEach(s => s.remove()); // 一旦クリア（aは残す）
    dict.priceLines.forEach(line => {
      const sp = document.createElement('span'); sp.textContent = line; priceEl.insertBefore(sp, anchors[0] || null);
    });
    if (anchors[0]) anchors[0].textContent = dict.tokushoText;
    if (anchors[1]) anchors[1].textContent = dict.privacyText;

    // ボタン
    $('applyBtn').textContent = dict.applyText;
  }

  (async () => {
    // 1) 設定読み込み（v2用）
    let cfg;
    try {
      cfg = await import(`./config.v2.js?cb=${encodeURIComponent(cb)}`);
    } catch (e) {
      setStatus('config.js の読込に失敗: ' + (e?.message || e));
      alert('初期化に失敗しました。少し待って開き直してください。');
      return;
    }

    // 2) LIFF初期化（フォールバック）
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

      // ac=1 で開かれた時は即クローズ（LINE内のみ）
      if (autoClose && liff.isInClient && liff.isInClient()) {
        try { liff.closeWindow(); return; } catch {}
      }

      // 3) 言語決定（?lang → LIFF → Browser → ja）
      const paramLang = (qs.get('lang') || '').toLowerCase();
      const rawLang = paramLang || (liff.getLanguage?.() || navigator.language || 'ja');
      const lang = rawLang.toLowerCase().startsWith('en') ? 'en' : 'ja';
      renderUI(I18N[lang]);

      // 4) UI 表示
      $('loader').style.display   = 'none';
      $('hero').style.display     = 'block';
      $('card').style.display     = 'block';
      $('price').style.display    = 'block';
      $('applyBtn').style.display = 'block';
      $('applyBtn').disabled      = false;

      // 5) 決済成功で戻ってきた時の保険
      (async () => {
        const ok    = qs.get('ok');
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

      // 6) 申込 → create-checkout → /checkout?co=... を外部ブラウザで開く（外部起動直後にLIFFを閉じる）
      $('applyBtn').addEventListener('click', async () => {
        try {
          if (!liff.isInClient()) {
            alert(lang === 'en'
              ? 'Please open this from the LINE app. You can access it from the chat menu.'
              : 'LINEアプリ内からお申込みください。トーク画面のメニューから開けます。');
            return;
          }

          let uid = null;
          try { uid = (await liff.getProfile())?.userId || null; } catch {}
          if (!uid) {
            alert(lang === 'en'
              ? 'Failed to get your user info. Please reopen from LINE.'
              : 'ユーザー情報の取得に失敗しました。LINEから開き直してください。');
            return;
          }

          if (!cfg.createCheckoutEndpoint) {
            alert(lang === 'en'
              ? 'Configuration error: createCheckoutEndpoint not set.'
              : '設定エラー：createCheckoutEndpoint が未設定です（config.js）');
            return;
          }

          const r = await fetch(cfg.createCheckoutEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineUserId: uid, amount: 100, language: lang, planId: 'basic' })
          });

          const text = await r.text();
          let data = {}; try { data = JSON.parse(text); } catch {}
          if (!r.ok || !data.checkoutUrl) {
            console.error('create-checkout error', r.status, text);
            alert(lang === 'en'
              ? 'Could not open the checkout page.'
              : '決済ページを開けませんでした。（URL発行エラー）');
            return;
          }

          const st = uuid();
          const params = new URLSearchParams({
            co: data.checkoutUrl, liffId: usedId, lu: uid, state: st, debug: DEBUG ? '1' : '0'
          });

          const bridge = `${cfg.siteBaseUrl}/checkout/index.html?${params.toString()}`;
          setStatus('open bridge: ' + bridge);

          // ===== 外部を開いたら即 LIFF を閉じる（端末差に配慮して少し遅延）=====
          const closeSoon = () => { try { if (liff.isInClient()) liff.closeWindow(); } catch(e) {} };
          const onHide = () => { closeSoon(); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onHide); };
          document.addEventListener('visibilitychange', onHide);
          window.addEventListener('pagehide', onHide);

          if (liff.openWindow) {
            liff.openWindow({ url: bridge, external: true });
            setTimeout(closeSoon, 200);
          } else {
            location.href = bridge;
            setTimeout(closeSoon, 300);
          }
          // ===== ここまで =====

        } catch (e) {
          console.error('apply click failed', e);
          alert(lang === 'en'
            ? 'Could not open the checkout page. Please try again later.'
            : '決済ページを開けませんでした。時間をおいてお試しください。');
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
