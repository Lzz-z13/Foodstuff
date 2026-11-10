const axios = require("axios");
const { randomUUID } = require("crypto");

async function criarPix({
    total,
    pedidoId,
    email,
    idempotencyKey = randomUUID()
}) {
    const valor = Number(total);

    if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error("Valor de pagamento inválido.");
    }

    if (!pedidoId || !email) {
        throw new Error("Dados obrigatórios não informados.");
    }

    const amount = valor.toFixed(2);

    const { data } = await axios.post(
        "https://api.mercadopago.com/v1/orders",
        {
            type: "online",
            total_amount: amount,
            external_reference: String(pedidoId),
            processing_mode: "automatic",

            transactions: {
                payments: [
                    {
                        amount,
                        payment_method: {
                            id: "pix",
                            type: "bank_transfer"
                        }
                    }
                ]
            },

            payer: {
                email
            }
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": idempotencyKey
            }
        }
    );

    const payment = data.transactions?.payments?.[0];

    return {
        orderId: data.id,
        paymentId: payment?.id,
        status: payment?.status ?? data.status,
        statusDetail: payment?.status_detail ?? data.status_detail,
        qrCode: payment?.payment_method?.qr_code,
        qrCodeBase64: payment?.payment_method?.qr_code_base64,
        ticketUrl: payment?.payment_method?.ticket_url
    };
}

module.exports = { criarPix };