const router = require("express").Router();

const { criarPagamentoPix, readPayment } = require("../controllers/paymentController");
const verifyRole = require('../middlewares/verifyRole');

router.post('/pix', verifyRole('MANAGER', 'CASHIER'), criarPagamentoPix);
router.get('/:payment_id', verifyRole('MANAGER', 'CASHIER'), readPayment);

module.exports = router;
