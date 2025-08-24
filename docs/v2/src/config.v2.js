export const liffIds            = '["2007034469-N7Zp3pB9"]';                  // ← LIFF IDを配列のJSON文字列で
export const univapayAppId      = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhcHBfdG9rZW4iLCJpYXQiOjE3NTQ4MTY5NjksIm1lcmNoYW50X2lkIjoiMTFmMDRlYjgtZjJmOC0zMzI0LWJmZTMtNTc1MDQ4MTM2ZjJkIiwic3RvcmVfaWQiOiIxMWYwNGViOC1mNDZhLTc4NDgtOGNiYy01MzUzYjRiMjAzZGMiLCJkb21haW5zIjpbInBheS5vd2FyYS1rYXplLW5vLWJvbi5jb20iXSwibW9kZSI6ImxpdmUiLCJjcmVhdG9yX2lkIjoiMTFmMDRlYjgtZjJmOC0zMzI0LWJmZTMtNTc1MDQ4MTM2ZjJkIiwidmVyc2lvbiI6MSwianRpIjoiMTFmMDc1YzktYjg3MS0xNDE0LWE0OGItYTFkZGU4NWJjMGNlIn0.943371Hs7wXltrudEhhhkYcYUecz44gs_zcmsPSE1sE'; // ← 本番アプリトークン（JWT）<>なし・改行なし
export const univapayFormId     = '11f07a87-7ef5-c2fc-a45c-db5e7d0ec9f5';   // ← リンクフォームID（/forms/と?appId=の間）
export const siteBaseUrl        = 'https://pay.owara-kaze-no-bon.com';
export const checkoutReturnPath = '/checkout/return.html';
export const backendEndpoint = '';                                     // 今回未使用なら空でOK
export const appEnv             = 'production';
export const createCheckoutEndpoint = 'https://4l9edywnoc.execute-api.ap-northeast-1.amazonaws.com/prod/owara-kaze-no-bon-Univapay-create-checkout-api-lambda'; //OMOWARA API GATEWAYのURL
