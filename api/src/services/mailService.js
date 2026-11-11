const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");
const crypto = require("crypto");

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground",
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});

async function sendEmail(to, subject, html) {
  try {
    const mail = new MailComposer({
      from: `"Foodstuff" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });

    const message = await mail.compile().build();
    const raw = message.toString("base64url");

    const { data } = await gmail.users.messages.send(
      {
        userId: "me",
        requestBody: {
          raw: raw,
        },
      },
      {
        timeout: 10000,
      },
    );

    console.log("Email enviado:", data.id);

    return data;
  } catch (error) {
    console.error(
      "Erro ao enviar email:",
      error.response?.data?.error?.message || error.message,
    );

    throw { status: 500, message: "Erro ao enviar email" };
  }
}

function passGenerator(length = 8) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+=?";

  let password = "";

  for (let i = 0; i < length; i++) {
    const index = crypto.randomInt(0, chars.length);
    password += chars[index];
  }

  return password;
}

function templateEmail(nome, email, senha) {
  return `
    <div style="
    background-color: #2957A4;
    padding: 40px 0;
    font-family: Arial, sans-serif;
  ">
    <div style="
      max-width: 500px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0px 4px 15px rgba(0,0,0,0.2);
      text-align: center;
    ">
      
      <h2 style="color: #2957A4; margin-bottom: 20px;">
        Bem-vindo, ${nome}!
      </h2>

      <p style="color: #333; font-size: 16px;">
        Seu acesso ao sistema foi criado com sucesso.
      </p>

      <div style="
        background-color: #f5f5f5;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
      ">
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Senha:</strong> ${senha}</p>
      </div>

      <p style="color: #555; font-size: 14px;">
        ⚠️ No seu primeiro acesso, será necessário alterar sua senha por segurança.
      </p>

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

      <p style="font-size: 12px; color: #999;">
        ESTE É UM EMAIL AUTOMÁTICO, NÃO RESPONDA.
      </p>

    </div>
  </div>
  `;
}

function templateOtpEmail(nome, otp) {
  return `
    <div style="
    background-color: #2957A4;
    padding: 40px 0;
    font-family: Arial, sans-serif;
  ">
    <div style="
      max-width: 500px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0px 4px 15px rgba(0,0,0,0.2);
      text-align: center;
    ">

      <h2 style="color: #2957A4; margin-bottom: 20px;">
        Olá, ${nome}!
      </h2>

      <p style="color: #333; font-size: 16px;">
        Você solicitou a recuperação da sua senha de acesso ao sistema.
      </p>

      <p style="color: #333; font-size: 14px;">
        Utilize o código abaixo para continuar. Ele é válido por 5 minutos:
      </p>

      <div style="
        background-color: #f5f5f5;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
      ">
        <p style="margin: 5px 0; font-size: 32px; letter-spacing: 8px;"><strong>${otp}</strong></p>
      </div>

      <p style="color: #555; font-size: 14px;">
        ⚠️ Se você não solicitou essa recuperação, apenas ignore este email. Nenhuma alteração será feita na sua conta.
      </p>

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

      <p style="font-size: 12px; color: #999;">
        ESTE É UM EMAIL AUTOMÁTICO, NÃO RESPONDA.
      </p>

    </div>
  </div>
  `;
}

function templateResendCredentials(nome, email, senha) {
  return `
    <div style="
    background-color: #2957A4;
    padding: 40px 0;
    font-family: Arial, sans-serif;
  ">
    <div style="
      max-width: 500px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0px 4px 15px rgba(0,0,0,0.2);
      text-align: center;
    ">

      <h2 style="color: #2957A4; margin-bottom: 20px;">
        Olá, ${nome}!
      </h2>

      <p style="color: #333; font-size: 16px;">
        Conforme solicitado, uma nova senha temporária foi gerada para o seu acesso.
      </p>

      <div style="
        background-color: #f5f5f5;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
      ">
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Senha temporária:</strong> ${senha}</p>
      </div>

      <p style="color: #555; font-size: 14px;">
        ⚠️ Efetue login com essa senha e altere-a em seguida: no seu primeiro acesso, a troca de senha é obrigatória por segurança.
      </p>

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

      <p style="font-size: 12px; color: #999;">
        ESTE É UM EMAIL AUTOMÁTICO, NÃO RESPONDA.
      </p>

    </div>
  </div>
  `;
}

module.exports = {
  sendEmail,
  passGenerator,
  templateEmail,
  templateOtpEmail,
  templateResendCredentials,
};
