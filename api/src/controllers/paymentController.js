const { criarPix } = require("../services/mercadoPagoService");

async function criarPagamentoPix(req, res) {
    try {
        const { pedidoId, total, email } = req.body;

        const pagamento = await criarPix({
            pedidoId,
            total,
            email,
            ambienteTeste: true
        });

        return res.status(201).json(pagamento);

    } catch (error) {
        console.error(
            "Erro Mercado Pago:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            message: "Erro ao gerar Pix."
        });
    }
}

module.exports = { criarPagamentoPix };