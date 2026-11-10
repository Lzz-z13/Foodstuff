const { createHmac, timingSafeEqual } = require('crypto');

module.exports = function verifyMercadoPagoSignature(req, res, next) {
  try {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret?.trim()) throw { status: 503, message: 'Webhook do Mercado Pago não configurado.' };
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    const orderId = req.query['data.id'];
    const invalid = { status: 401, message: 'Assinatura do Mercado Pago inválida.' };
    if (typeof signature !== 'string' || typeof requestId !== 'string' ||
        typeof orderId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(orderId) ||
        !requestId || requestId.length > 200) throw invalid;
    const parts = signature.split(',').map(part => part.trim().split('='));
    const timestamps = parts.filter(([key]) => key === 'ts');
    const hashes = parts.filter(([key]) => key === 'v1');
    if (timestamps.length !== 1 || hashes.length !== 1) throw invalid;
    const ts = timestamps[0][1];
    const hash = hashes[0][1];
    if (!/^\d{10}(\d{3})?$/.test(ts) || !/^[a-fA-F0-9]{64}$/.test(hash)) throw invalid;
    const timestampMs = Number(ts) * (ts.length === 10 ? 1000 : 1);
    if (Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) throw invalid;
    // Mesmo manifest da implementação oficial sdk-nodejs/src/utils/webhook.
    const manifest = `id:${orderId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest();
    if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) throw invalid;
    req.mercadoPagoOrderId = orderId;
    next();
  } catch (error) { next(error); }
};
