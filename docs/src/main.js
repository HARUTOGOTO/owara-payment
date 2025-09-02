// docs/src/main.js  ← 全置換OK（あなたのI18N定義はそのまま残しています）
(() => {
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const cb = qs.get('cb') || Date.now().toString();
  const DEBUG = qs.get('debug') === '1';
  const autoClose = qs.get('ac') === '1';

  const setStatus = (msg, ttl = 3500) => {
    if (!DEBUG) return;
    const el = $('status'); if (!el) return;
    el.textContent = msg; el.style.display = 'block';
    clearTimeout(setStatus._t); setStatus._t = setTimeout(() => (el.style.display = 'none'), ttl);
  };

  const uuid = () =>
    (crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2,10))).toUpperCase();

  addEventListener('error', (e) => setStatus('ERR: ' + (e?.message || e)));
  addEventListener('unhandledrejection', (e) => setStatus('REJ: ' + (e?.reason?.message || e?.reason || 'unhandled')));

  // ---- 追加：SDK到着待ち & importリトライ ----
  function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

  async function ensureLiffSdk(timeoutMs = 10000) {
    if (window.liff) return;

    // 既存タグを探す or 追加
    let tag = document.querySelector('script[src*="liff/edge/2/sdk.js"]');
    if (!tag) {
      tag = document.createElement('script');
      tag.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      tag.defer = true;
      tag.crossOrigin = 'anonymous';
      document.head.appendChild(tag);
    }

    // 到着を待つ（load or 既にwindow.liff出現）
    await Promise.race([
      new Promise((resolve, reject) => {
        const done = () => { if (window.liff) resolve(); };
        tag.addEventListener('load', done, { once:true });
        const iv = setInterval(() => { if (window.liff) { clearInterval(iv); resolve(); } }, 50);
        tag.addEventListener('error', () => { clearInterval(iv); reject(new Error('LIFF SDK load error')); }, { once:true });
      }),
      (async () => { await wait(timeoutMs); throw new Error('LIFF SDK timeout'); })()
    ]);
  }

  async function importWithRetry(specifier, tries = 2) {
    let lastErr;
    for (let i=0; i<tries; i++) {
      try { return await import(specifier); } catch (e) {
        lastErr = e; await wait(200 + i*300);
      }
    }
    throw lastErr || new Error('import failed: ' + specifier);
  }

  // ====== I18N（あなたの定義そのまま） ======
  const I18N = {
    ja: { /* 省略：あなたの定義そのまま */ 
      title:'おわら風の盆｜有料メニュー決済 (LIFF)',
      hero:'有料提供サービス',
      services:[
        { title:'便利情報', desc:'トイレ・おやすみ処・交通機関など' },
        { title:'踊っている場所が分かる（一部）', desc:'GPSを用いて現在の演者の位置を表示' },
        { title:'見どころ / ルートマップ', desc:'お勧めの楽しみ方のルート' },
        { title:'おわらの真髄に迫る記事・動画', desc:'300年の歴史と伝統を深掘り' },
        { title:'限定グッズ', desc:'ここでしか買えないおわらの香り' },
        { title:'綺麗な写真スポット', desc:'綺麗な写真を撮影できる場所' },
      ],
      priceLines:['価格：100円（買い切り）','利用可能期間：8/25〜9/15','決済方法：クレジットカード / PayPay','※決済は外部ブラウザが開きます'],
      tokushoText:'特定商取引法に基づく表記', privacyText:'プライバシーポリシー', applyText:'100円の支払いはこちらから！',
    },
    en: { /* 省略：あなたの定義そのまま */ 
      title:'Owara Kaze-no-Bon | Premium Purchase (LIFF)',
      hero:'Premium features',
      services:[
        { title:'Useful information', desc:'Toilets, rest spots, transport' },
        { title:'Where people are dancing', desc:'See performer locations via GPS (partial)' },
        { title:'Highlights & route map', desc:'Suggested routes to enjoy' },
        { title:'Articles & videos', desc:'Dive into 300 years of history' },
        { title:'Limited goods', desc:'Exclusive Owara fragrance' },
        { title:'Photo spots', desc:'Great places for beautiful shots' },
      ],
      priceLines:['Price: ¥100 (one-time)','Available: Aug 25 – Sep 15','Payment: Credit card / PayPay','* Checkout opens an external browser'],
      tokushoText:'Legal notice', privacyText:'Privacy policy', applyText:'Proceed to purchase',
    },
  };

  function renderUI(dict) {
    document.title = dict.title;
    document.documentElement.lang = (dict === I18N.en) ? 'en' : 'ja';
    $('hero').textContent = dict.hero;

    const ul = $('card').querySelector('ul.services');
    ul.innerHTML = dict.services.map(item => `<li><span class="title">${item.title}</span><span class="desc">${item.desc}</span></li>`).join('');

    const priceEl = $('price');
    const anchors = priceEl.querySelectorAll('a');
    priceEl.querySelectorAll('span').forEach(s => s.remove());
    dict.priceLines.forEach(line => {
      const sp = document.createElement('span');
      sp.textContent = line;
      priceEl.insertBefore(sp, anchors[0] || null);
    });
    if (anchors[0]) anchors[0].textContent = dict.tokushoText;
    if (anchors[1]) anchors[1].textContent = dict.privacyText;
    $('applyBtn').textContent = dict.applyText;
  }

  function showRetryUI(message){
    $('loader').style.display = 'none';
    // 申込ボタンは出さない（誤タップ防止）
    $('applyBtn').style.display = 'none';

    const box = document.createElement('div');
    box.style.cssText = 'margin-top:18vh;max-width:92%;background:#00000044;padding:14px;border-radius:10px;text-align:center';
    box.innerHTML = `
      <div style="font-weight:700;margin-bottom:.4rem">初期化エラー</div>
      <div style="font-size:.9rem;opacity:.9">${message || '通信が不安定です。'}</div>
      <div style="margin-top:.8rem;display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap">
        <button id="btnReload" style="padding:.5rem .8rem;border-radius:.6rem;border:none;cursor:pointer">再読み込み</button>
        <a id="openLine" href="https://line.me/R/ti/p/@225hkxvw" style="padding:.5rem .8rem;border-radius:.6rem;background:#d7e4ff;color:#0d2847;font-weight:700;text-decoration:none">LINEで開く</a>
      </div>`;
    document.body.appendChild(box);
    document.getElementById('btnReload').onclick = () => location.reload();
  }

  (async () => {
    try {
      // 0) SDK到着を必ず待つ
      await ensureLiffSdk();

      // 1) 設定読込（リトライ付き）
      let cfg = await importWithRetry(`./config.js?cb=${encodeURIComponent(cb)}`, 2);

      // 2) LIFF初期化（複数IDフォールバック）
      const override = qs.get('liffId');
      const LIFF_IDS = override ? [override] : JSON.parse(cfg.liffIds || '[]');
      if (!Array.isArray(LIFF_IDS) || LIFF_IDS.length === 0) throw new Error('LIFF ID 未設定（config.js）');

      const initLIFF = async () => {
        for (const id of LIFF_IDS) {
          try { await liff.init({ liffId: id }); return id; } catch {}
        }
        throw new Error('すべての LIFF_ID で初期化に失敗');
      };

      const usedId = await initLIFF();
      await liff.ready;
      setStatus(`LIFF ready: ${usedId}`);

      if (autoClose && liff.isInClient && liff.isInClient()) { try { liff.closeWindow(); return; } catch {} }

      // 3) 言語決定
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

      // 5) 決済成功で戻ってきた保険
      (async () => {
        const ok = qs.get('ok'), state = qs.get('state') || '', lu = qs.get('lu') || '';
        if (ok === '1') {
          const userForBackend = lu || (liff.isInClient() ? (await liff.getProfile().catch(()=>null))?.userId : null);
          if (cfg.backendEndpoint && userForBackend) {
            try { await fetch(cfg.backendEndpoint, { method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ lineUserId: userForBackend, state, source: 'liff-return' }) }); setStatus('paySuccess notified'); } catch {}
          }
          history.replaceState(null, '', location.pathname);
          if (liff.isInClient()) { liff.closeWindow(); return; }
        }
      })();

      // 6) 申込 → ブリッジへ
      $('applyBtn').addEventListener('click', async () => {
        try {
          if (!liff.isInClient()) {
            alert(lang === 'en' ? 'Please open this from the LINE app. You can access it from the chat menu.'
                                : 'LINEアプリ内からお申込みください。トーク画面のメニューから開けます。');
            return;
          }
          let uid=null; try { uid = (await liff.getProfile())?.userId || null; } catch {}
          if (!uid) { alert(lang==='en'?'Failed to get your user info. Please reopen from LINE.':'ユーザー情報の取得に失敗しました。LINEから開き直してください。'); return; }

          if (!cfg.createCheckoutEndpoint) { alert(lang==='en'?'Configuration error: createCheckoutEndpoint not set.':'設定エラー：createCheckoutEndpoint が未設定です（config.js）'); return; }

          const r = await fetch(cfg.createCheckoutEndpoint, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ lineUserId: uid, amount: 100, language: lang, planId: 'basic' })
          });
          const text = await r.text(); let data={}; try{ data = JSON.parse(text); }catch{}
          if (!r.ok || !data.checkoutUrl) { console.error('create-checkout error', r.status, text);
            alert(lang==='en'?'Could not open the checkout page.':'決済ページを開けませんでした。（URL発行エラー）'); return; }

          const st = uuid();
          const params = new URLSearchParams({ co: data.checkoutUrl, liffId: usedId, lu: uid, state: st, debug: DEBUG ? '1' : '0' });
          const bridge = `${cfg.siteBaseUrl}/checkout/index.html?${params.toString()}`;
          setStatus('open bridge: ' + bridge);

          const closeSoon = () => { try { if (liff.isInClient()) liff.closeWindow(); } catch(e) {} };
          const onHide = () => { closeSoon(); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onHide); };
          document.addEventListener('visibilitychange', onHide);
          window.addEventListener('pagehide', onHide);

          if (liff.openWindow) { liff.openWindow({ url: bridge, external: true }); setTimeout(closeSoon, 200); }
          else { location.href = bridge; setTimeout(closeSoon, 300); }

        } catch (e) {
          console.error('apply click failed', e);
          alert(lang==='en'?'Could not open the checkout page. Please try again later.':'決済ページを開けませんでした。時間をおいてお試しください。');
        }
      });

    } catch (err) {
      console.error('BOOT FAIL', err);
      if (DEBUG) setStatus('BOOT FAIL: ' + (err?.message || err));
      showRetryUI(err?.message || '初期化に失敗しました。通信状況を確認して、再度お試しください。');
    }
  })();
})();
