import {
    liffIds,
    univapayAppId,
    backendEndpoint
} from './config.js';

const LIFF_IDS          = JSON.parse(liffIds);
const UNIVAPAY_APP_ID   = univapayAppId;
const BACKEND_ENDPOINT  = backendEndpoint;

/* ---------- 変数 ---------- */
let lineUserId = null;
let checkout   = null;

/* ---------- DOM Utility ---------- */
const $ = id => document.getElementById(id);

/* ---------- LIFF 初期化（複数 ID フォールバック） ---------- */
async function initLIFF(){
  for (const id of LIFF_IDS){
    try{
      await liff.init({ liffId:id });
      console.log('LIFF init success with', id);
      return id;            // 成功した ID を返す
    }catch(e){
      console.warn('LIFF init failed for', id, e.message);
    }
  }
  throw new Error('すべての LIFF_ID で初期化に失敗しました');
}

/* ---------- メイン ---------- */
window.addEventListener('DOMContentLoaded', async ()=>{
  try{
    const usedId = await initLIFF();

    /* UI 切り替え */
    $('loader').style.display='none';
    $('hero').style.display='block';
    $('card').style.display='block';
    $('price').style.display='block';
    $('applyBtn').style.display='block';
    $('status').style.display='block';
    $('status').textContent = `LIFF ID: ${usedId} で初期化完了`;

    if (liff.isInClient()){
      const profile = await liff.getProfile();
      lineUserId = profile.userId;
      $('status').textContent += ` | User: ${lineUserId}`;
    }

    /* Close ボタン */
    await liff.ready;
    liff.ui?.setActionButton({ type:'close' });

    /* Checkout 準備 */
    checkout = UnivapayCheckout.create({
      appId: UNIVAPAY_APP_ID,
      checkout:'payment',
      amount:100,
      currency:'jpy',
      cvvAuthorize: true,
      title:'おわら風の盆｜決済',
      header:'おわら風の盆｜決済',
      description:'有料メニュー表示のための課金',
      //paymentMethods:['card','pay_pay_online'],
      //three_ds     : { mode: 'skip' },   // ← 追加行
      metadata:{ line_user_id: lineUserId },
      onSuccess: handlePaid,
      onError  : e=>alert('決済失敗: '+e.message)
    });

    $('applyBtn').disabled = false;
    $('applyBtn').addEventListener('click', () => {
      checkout.open().catch(e=>{
        console.error('checkout.open error', e);
        alert('決済画面を開けませんでした');
      });
    });

  }catch(err){
    console.error('LIFF init error', err);
    $('status').style.display='block';
    $('status').textContent = 'LIFF 初期化失敗: '+err.message;
  }
});

/* ---------- 決済成功後 ---------- */
async function handlePaid(result){
  try{
    await fetch(BACKEND_ENDPOINT, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({
        transactionToken: result.id,
        lineUserId
      })
    });
  }catch(e){
    console.error('backend error', e);
  }finally{
    liff.isInClient() ? liff.closeWindow() :
      alert('決済成功！ブラウザを閉じてください。');
  }
}
