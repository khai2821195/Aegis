/**
 * NicePay 결제 연동 모듈 (구버전 MID + MerchantKey 방식)
 *
 * 결제 흐름:
 * 1. 서버: prepare → MID, orderId, ediDate, signData 생성
 * 2. 클라이언트: NicePay JS SDK로 결제 팝업 호출
 * 3. NicePay → POST ReturnURL (서버) → 서버에서 승인 처리
 * 4. 팝업 닫힘 → 클라이언트가 /api/payment/status 폴링
 */

import { createHash } from 'crypto';

const APPROVAL_URL = 'https://webapi.nicepay.co.kr/webapi/pay_process.jsp';
const CANCEL_URL   = 'https://webapi.nicepay.co.kr/webapi/cancel_process.jsp';

/**
 * EdiDate 생성 (yyyyMMddHHmmss)
 */
export function getEdiDate() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * 결제창 호출용 SignData
 * SHA256(MID + Amt + EdiDate + MerchantKey)
 */
export function getRequestSignData(amount, ediDate) {
  const { NICEPAY_MID: mid, NICEPAY_MERCHANT_KEY: key } = process.env;
  return createHash('sha256').update(`${mid}${amount}${ediDate}${key}`).digest('hex');
}

/**
 * 승인 요청용 SignData
 * SHA256(TID + MID + Amt + EdiDate + MerchantKey)
 */
function getApprovalSignData(tid, amount, ediDate) {
  const { NICEPAY_MID: mid, NICEPAY_MERCHANT_KEY: key } = process.env;
  return createHash('sha256').update(`${tid}${mid}${amount}${ediDate}${key}`).digest('hex');
}

/**
 * NicePay 결제 승인 (ReturnURL 콜백에서 호출)
 * @param {string} tid - NicePay 거래 ID
 * @param {string} authToken - 인증 토큰
 * @param {number} amount - 결제 금액
 */
export async function confirmPayment(tid, authToken, amount) {
  const ediDate = getEdiDate();
  const signData = getApprovalSignData(tid, amount, ediDate);

  const params = new URLSearchParams({
    TID:       tid,
    MID:       process.env.NICEPAY_MID,
    Amt:       String(amount),
    AuthToken: authToken,
    SignData:  signData,
    EdiDate:   ediDate,
    CharSet:   'utf-8',
    EdiType:   'JSON',
  });

  const res = await fetch(APPROVAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();

  // 3001: 정상 승인
  if (data.ResultCode !== '3001') {
    throw new Error(data.ResultMsg || 'NicePay 승인 실패');
  }

  return data;
}

/**
 * NicePay 결제 취소
 * @param {string} tid - NicePay 거래 ID
 * @param {number} amount - 취소 금액
 * @param {string} reason - 취소 사유
 */
export async function cancelPayment(tid, amount, reason = '사용자 요청') {
  const ediDate = getEdiDate();
  const { NICEPAY_MID: mid, NICEPAY_MERCHANT_KEY: key } = process.env;
  const signData = createHash('sha256').update(`${mid}${amount}${ediDate}${key}`).digest('hex');

  const params = new URLSearchParams({
    TID:       tid,
    MID:       mid,
    Amt:       String(amount),
    CancelMsg: reason,
    SignData:  signData,
    EdiDate:   ediDate,
    CharSet:   'utf-8',
    EdiType:   'JSON',
  });

  const res = await fetch(CANCEL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();

  // 3001: 정상 취소, 3002: 이미 취소됨
  if (!['3001', '3002'].includes(data.ResultCode)) {
    throw new Error(data.ResultMsg || 'NicePay 취소 실패');
  }

  return data;
}

/**
 * 플랜별 구독 만료일 계산
 */
export const PLAN_DURATION_MONTHS = { pro: 1, enterprise: 1 };

export function calcExpiresAt(plan, from = new Date()) {
  const months = PLAN_DURATION_MONTHS[plan] ?? 1;
  const expires = new Date(from);
  expires.setMonth(expires.getMonth() + months);
  return expires;
}
