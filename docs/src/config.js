// docs/src/config.js  ← 公開されます（注意）
export const liffIds            = '["2007034469-N7Zp3"]';                  // ← LIFF IDを配列のJSON文字列で
export const univapayAppId      = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'; // ← 本番アプリトークン（JWT）<>なし・改行なし
export const univapayFormId     = '11f075c9-b871-1414-a4b8-a1dde85b0c0e';   // ← リンクフォームID（/forms/と?appId=の間）
export const siteBaseUrl        = 'https://pay.owara-kaze-no-bon.com';
export const checkoutReturnPath = '/checkout/return.html';
export const backendEndpoint    = '';                                        // 今回未使用なら空でOK
export const appEnv             = 'production';
