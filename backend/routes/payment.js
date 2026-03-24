/**
 * 결제 & 라이선스 라우터 (NicePay 구버전 MID 방식)
 *
 * GET  /api/license              - 라이선스 검증
 * POST /api/payment/prepare      - 결제 준비 (NicePay 팝업용 데이터 반환)
 * POST /api/payment/return       - NicePay ReturnURL 콜백 (NicePay → 서버)
 * GET  /api/payment/status/:id   - 결제 완료 여부 폴링 (클라이언트)
 * POST /api/payment/cancel       - 결제 취소
 * GET  /api/payment/history      - 결제 내역 조회
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  confirmPayment, cancelPayment, calcExpiresAt,
  getEdiDate, getRequestSignData,
} from '../providers/nicepay.js';

const router = Router();

function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getUserClient(authHeader) {
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function requireAuth(req, res, next) {
  const supabase = getUserClient(req.headers.authorization);
  if (!supabase) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  req.supabase = supabase;
  next();
}

// ─────────────────────────────────────────────
// GET /api/license
// ─────────────────────────────────────────────
router.get('/license', requireAuth, async (req, res) => {
  const admin = getAdminClient();
  try {
    const { data: profile, error } = await admin
      .from('profiles')
      .select('tier, plan_expires_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    let { tier, plan_expires_at } = profile;
    const now = new Date();

    if (tier !== 'free' && plan_expires_at && new Date(plan_expires_at) < now) {
      tier = 'free';
      await admin
        .from('profiles')
        .update({ tier: 'free', license_checked_at: now.toISOString() })
        .eq('id', req.user.id);
    } else {
      await admin
        .from('profiles')
        .update({ license_checked_at: now.toISOString() })
        .eq('id', req.user.id);
    }

    res.json({ tier, plan_expires_at, features: getTierFeatures(tier), checked_at: now.toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/prepare
// NicePay 팝업 호출에 필요한 데이터 반환
// Body: { plan, amount }
// ─────────────────────────────────────────────
router.post('/payment/prepare', requireAuth, async (req, res) => {
  const { plan, amount } = req.body;

  if (!plan || !amount) return res.status(400).json({ error: 'plan, amount required' });
  if (!['pro', 'enterprise'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

  const admin = getAdminClient();
  const orderId = `AEGIS-${req.user.id.slice(0, 8)}-${Date.now()}`;
  const ediDate = getEdiDate();
  const signData = getRequestSignData(amount, ediDate);

  try {
    const { error } = await admin.from('payments').insert({
      user_id: req.user.id,
      order_id: orderId,
      amount,
      plan,
      status: 'pending',
    });
    if (error) throw error;

    res.json({
      mid: process.env.NICEPAY_MID,
      orderId,
      ediDate,
      signData,
      amount,
      plan,
      returnUrl: process.env.NICEPAY_RETURN_URL,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/return
// NicePay가 결제 완료 후 직접 호출하는 콜백 (인증 없음)
// ─────────────────────────────────────────────
router.post('/payment/return', async (req, res) => {
  const {
    AuthResultCode, AuthToken, TID,
    Amt, Moid: orderId,
  } = req.body;

  const admin = getAdminClient();

  // 실패 케이스 — DB 상태만 업데이트하고 팝업 닫기
  if (AuthResultCode !== '0000') {
    await admin
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('order_id', orderId);

    return res.send(closePopupHtml('결제가 취소되었습니다.'));
  }

  try {
    const { data: payment, error: fetchErr } = await admin
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .single();

    if (fetchErr || !payment) {
      return res.send(closePopupHtml('유효하지 않은 주문입니다.'));
    }

    if (Number(payment.amount) !== Number(Amt)) {
      return res.send(closePopupHtml('결제 금액이 일치하지 않습니다.'));
    }

    // NicePay 최종 승인
    await confirmPayment(TID, AuthToken, Number(Amt));

    const now = new Date();
    const expiresAt = calcExpiresAt(payment.plan, now);

    // 결제 내역 업데이트
    await admin
      .from('payments')
      .update({
        nicepay_tid: TID,
        status: 'paid',
        paid_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('order_id', orderId);

    // 프로필 플랜 업데이트
    await admin
      .from('profiles')
      .update({
        tier: payment.plan,
        plan_expires_at: expiresAt.toISOString(),
        license_checked_at: now.toISOString(),
      })
      .eq('id', payment.user_id);

    res.send(closePopupHtml(null)); // 성공 → 팝업 닫기
  } catch (err) {
    console.error('[payment/return error]', err.message);
    res.send(closePopupHtml(err.message));
  }
});

// ─────────────────────────────────────────────
// GET /api/payment/status/:orderId
// 클라이언트 폴링 — 결제 완료 여부 확인
// ─────────────────────────────────────────────
router.get('/payment/status/:orderId', requireAuth, async (req, res) => {
  const admin = getAdminClient();
  try {
    const { data, error } = await admin
      .from('payments')
      .select('status, plan, expires_at')
      .eq('order_id', req.params.orderId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Not found' });

    if (data.status === 'paid') {
      return res.json({
        status: 'paid',
        tier: data.plan,
        plan_expires_at: data.expires_at,
        features: getTierFeatures(data.plan),
      });
    }

    if (data.status === 'cancelled') {
      return res.json({ status: 'cancelled' });
    }

    res.json({ status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/cancel
// ─────────────────────────────────────────────
router.post('/payment/cancel', requireAuth, async (req, res) => {
  const { orderId, reason } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const admin = getAdminClient();
  try {
    const { data: payment, error } = await admin
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', req.user.id)
      .eq('status', 'paid')
      .single();

    if (error || !payment) return res.status(404).json({ error: '취소 가능한 결제가 없습니다.' });

    await cancelPayment(payment.nicepay_tid, payment.amount, reason || '사용자 요청');

    await admin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('order_id', orderId);

    await admin
      .from('profiles')
      .update({ tier: 'free', plan_expires_at: null })
      .eq('id', req.user.id);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/payment/history
// ─────────────────────────────────────────────
router.get('/payment/history', requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('payments')
      .select('id, order_id, amount, plan, status, paid_at, expires_at, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ payments: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// 팝업 닫기 HTML (NicePay ReturnURL 응답)
// ─────────────────────────────────────────────
function closePopupHtml(errorMsg) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>
  ${errorMsg
    ? `window.opener && window.opener.postMessage({ type: 'NICEPAY_FAIL', message: ${JSON.stringify(errorMsg)} }, '*');`
    : `window.opener && window.opener.postMessage({ type: 'NICEPAY_SUCCESS' }, '*');`
  }
  window.close();
</script>
</body></html>`;
}

// ─────────────────────────────────────────────
// 플랜별 기능 정의
// ─────────────────────────────────────────────
function getTierFeatures(tier) {
  const features = {
    free:       { maxPersonas: 3,  maxMeetingHistory: 10,  canExportMeeting: false, canUseAllModels: false },
    pro:        { maxPersonas: 20, maxMeetingHistory: 200, canExportMeeting: true,  canUseAllModels: true  },
    enterprise: { maxPersonas: -1, maxMeetingHistory: -1,  canExportMeeting: true,  canUseAllModels: true  },
  };
  return features[tier] ?? features.free;
}

export default router;
