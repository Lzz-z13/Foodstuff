const router = require("express").Router();

const { criarPagamentoPix, readPayment, cancelPayment } = require("../controllers/paymentController");
const verifyRole = require('../middlewares/verifyRole');

router.post('/pix', verifyRole('MANAGER', 'CASHIER'), criarPagamentoPix);
router.get('/:payment_id', verifyRole('MANAGER', 'CASHIER'), readPayment);
router.post('/:payment_id/cancel', verifyRole('MANAGER', 'CASHIER'), cancelPayment);

module.exports = router;
