const router = require("express").Router();

const {
    criarPagamentoPix
} = require("../controllers/paymentController");

router.post("/pix", criarPagamentoPix);

module.exports = router;