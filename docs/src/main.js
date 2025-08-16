import {
    liffIds,
    univapayAppId,
    backendEndpoint
} from './config.js';

const liff_ID           = liffIds;
const UNIVAPAY_APP_ID   = univapayAppId;
const BACKEND_ENDPOINT  = backendEndpoint;

/* ---------- 変数 ---------- */
let lineUserId = null;
let checkout   = null;

// ユーティリティ
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const uuid = () => (crypto.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2,10))).toUpperCase();

// 複数 liff_IDS フォールバック初期化
async function initLIFF(){
  for (const id of liff_ID){
    try{
      await liff.init({ liffId:id });
      return id;
    }catch(e){ console.warn("LIFF init failed:", id, e?.message); }
  }
  throw new Error("すべての LIFF_ID で初期化に失敗しました");
}

window.addEventListener("DOMContentLoaded", async () => {
  const status = $("status");
  try{
    const usedId = await initLIFF();
    await liff.ready;

    // UI 表示
    $("applyBtn").style.display = "block";
    $("applyBtn").disabled = false;
    status.style.display = "block";
    status.textContent = `LIFF ID: ${usedId} で初期化完了`;

    // ユーザーID（LIFF内のみ取得可能）
    let lineUserId = null;
    if (liff.isInClient()){
      try{
        lineUserId = (await liff.getProfile())?.userId || null;
        status.textContent += lineUserId ? ` | User: ${lineUserId}` : "";
      }catch(_){}
    }

    // 申込クリック → 外部（Hosted）へ
    $("applyBtn").addEventListener("click", async () => {
      try{
        const orderState = uuid();   // 照合用トークン（Webhook等で使うなら保存してもOK）
        // Hosted に渡すパラメータを作る（詳細は下の /checkout/index.html と一致させる）
        const url = new URL("https://pay.owara-kaze-no-bon.com/checkout/index.html");
        url.searchParams.set("amount", "100");
        url.searchParams.set("lu", lineUserId || "");
        url.searchParams.set("liffId", usedId);
        url.searchParams.set("state", orderState);

        // 外部ブラウザで開く（iOS=Safari / Android=既定ブラウザ）
        if (liff.openWindow){
          liff.openWindow({ url: url.toString(), external: true });
        }else{
          // 念のためのフォールバック（LIFF外から開かれても動くように）
          location.href = url.toString();
        }
      }catch(e){
        console.error("open external error", e);
        alert("決済ページを開けませんでした。通信環境をご確認ください。");
      }
    });

  }catch(err){
    console.error("LIFF init error", err);
    status.style.display = "block";
    status.textContent = "LIFF 初期化失敗: " + err.message;
  }
});
