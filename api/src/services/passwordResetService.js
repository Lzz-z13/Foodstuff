const bcrypt = require("bcrypt");
const crypto = require("crypto");

const connect = require("../database/connect");
const createLog = require("../utils/createLog");
const validatePassword = require("../validations/validatePassword");
const { isValidPassword } = require("../utils/validators/passwordValidator");

const {
  sendEmail,
  passGenerator,
  templateOtpEmail,
  templateResendCredentials,
} = require("./mailService");

const passwordResetStore = require("./passwordResetStore");

const SALT_ROUNDS = 10;
const TEMP_PASSWORD_LENGTH = 12;

// Resposta propositalmente genérica: não revela se o e-mail existe,
// se a conta está inativa ou se o pedido foi limitado por frequência.
const GENERIC_REQUEST_MESSAGE =
  "Se o e-mail informado estiver cadastrado e ativo, um código de verificação foi enviado. Verifique sua caixa de entrada.";

// O passGenerator() atual sorteia caracteres aleatórios e pode não contemplar
// todas as classes exigidas pelo validador. Gera candidatos até obter um válido
// e, como último recurso, monta uma senha que sempre satisfaz a regra.
function generateTemporaryPassword(length = TEMP_PASSWORD_LENGTH) {
  for (let i = 0; i < 10; i++) {
    const candidate = passGenerator(length);

    if (isValidPassword(candidate)) {
      return candidate;
    }
  }

  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*+=?";
  const pick = (alphabet) => alphabet[crypto.randomInt(0, alphabet.length)];

  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  const all = upper + lower + digits + special;

  while (chars.length < length) {
    chars.push(pick(all));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

async function findActiveUserByEmail(email) {
  const query = `
    SELECT
      user_id,
      name,
      email,
      password,
      first_login
    FROM users
    WHERE email = ?
      AND is_active = 1
    LIMIT 1
  `;

  const [rows] = await connect.execute(query, [email]);

  return rows.length > 0 ? rows[0] : null;
}

// Cenário A (first_login = 1): emite nova senha temporária, mantém
// first_login = 1 e envia por e-mail. Se o e-mail falhar após o commit,
// restaura o hash anterior para não deixar o usuário sem credencial funcional.
async function resendTemporaryPassword(user) {
  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
  const previousHash = user.password;

  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
        UPDATE users
        SET password = ?
        WHERE user_id = ?
          AND is_active = 1
      `,
      [hashedPassword, user.user_id],
    );

    await createLog(
      connection,
      user.user_id,
      "UPDATE",
      "users",
      user.user_id,
      "Senha temporária reemitida via recuperação por OTP.",
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error(error);

    if (error.status) {
      throw error;
    }

    throw { status: 500, message: "Erro interno do servidor." };
  } finally {
    connection.release();
  }

  try {
    await sendEmail(
      user.email,
      "Nova senha temporária",
      templateResendCredentials(user.name, user.email, temporaryPassword),
    );
  } catch (error) {
    try {
      await connect.execute(
        `
          UPDATE users
          SET password = ?
          WHERE user_id = ?
            AND is_active = 1
        `,
        [previousHash, user.user_id],
      );
    } catch (restoreError) {
      console.error(
        `[password-reset] FALHA CRÍTICA ao restaurar senha anterior de user_id=${user.user_id}:`,
        restoreError,
      );
    }

    console.error(
      `[password-reset] falha ao enviar senha temporária para user_id=${user.user_id}`,
    );

    throw {
      status: 500,
      message:
        "Falha ao enviar a nova senha temporária por e-mail. Solicite um novo código.",
    };
  }

  console.warn(
    `[password-reset] senha temporária reemitida para user_id=${user.user_id}`,
  );

  return { flow: "first_login" };
}

module.exports = class PasswordResetService {
  static async requestPasswordReset(email) {
    const throttled = passwordResetStore.isThrottled(email);

    if (!throttled) {
      passwordResetStore.markRequest(email);
    }

    let user = null;

    try {
      user = await findActiveUserByEmail(email);
    } catch (error) {
      console.error(error);
      throw { status: 500, message: "Erro interno do servidor." };
    }

    // Conta inexistente/inativa ou pedido em cooldown: mesma resposta
    // genérica, sem enviar e-mail e sem gerar código.
    if (!user || throttled) {
      return { message: GENERIC_REQUEST_MESSAGE };
    }

    const otp = passwordResetStore.generateOtp();
    passwordResetStore.saveOtp(user.user_id, otp);

    try {
      await sendEmail(
        user.email,
        "Código de recuperação de senha",
        templateOtpEmail(user.name, otp),
      );
    } catch (error) {
      // A senha não foi alterada neste passo; remove o código não entregue
      // para não manter válido algo que o usuário nunca recebeu.
      passwordResetStore.removeOtp(user.user_id);
      console.error(
        `[password-reset] falha ao enviar OTP para user_id=${user.user_id}`,
      );

      if (error.status) {
        throw error;
      }

      throw { status: 500, message: "Erro ao enviar email" };
    }

    console.warn(
      `[password-reset] código solicitado para user_id=${user.user_id}`,
    );

    return { message: GENERIC_REQUEST_MESSAGE };
  }

  static async verifyPasswordReset(email, otp) {
    let user = null;

    try {
      user = await findActiveUserByEmail(email);
    } catch (error) {
      console.error(error);
      throw { status: 500, message: "Erro interno do servidor." };
    }

    if (!user) {
      throw { status: 400, message: "Código inválido ou expirado." };
    }

    const result = passwordResetStore.verifyOtp(user.user_id, otp);

    if (!result.ok) {
      if (result.reason === "locked") {
        console.warn(
          `[password-reset] bloqueio por tentativas para user_id=${user.user_id}`,
        );
        throw {
          status: 429,
          message: "Limite de tentativas excedido. Solicite um novo código.",
        };
      }

      console.warn(
        `[password-reset] falha de OTP (${result.reason}) para user_id=${user.user_id}`,
      );
      throw { status: 400, message: "Código inválido ou expirado." };
    }

    const resetToken = passwordResetStore.issueResetToken(user.user_id);

    console.warn(
      `[password-reset] OTP confirmado para user_id=${user.user_id} (fluxo redefinição)`,
    );

    return { flow: "reset_password", resetToken };
  }

  static async confirmPasswordReset(resetToken, newPassword, confirmPassword) {
    if (!resetToken) {
      throw {
        status: 400,
        message: "Token de recuperação não fornecido.",
      };
    }

    if (!newPassword || !confirmPassword) {
      throw {
        status: 400,
        message: "Todos os campos devem ser preenchidos.",
      };
    }

    if (newPassword !== confirmPassword) {
      throw {
        status: 400,
        message: "A confirmação da senha não coincide com a nova senha.",
      };
    }

    validatePassword(newPassword);

    // Reserva atômica: enquanto reservado, requisições concorrentes com o
    // mesmo token são recusadas. Falhas de validação acima acontecem antes
    // da reserva, então não consomem o token.
    const claim = passwordResetStore.acquireResetToken(resetToken);

    if (!claim) {
      throw {
        status: 400,
        message: "Token de recuperação inválido ou expirado.",
      };
    }

    let finished = false;

    try {
      let rows = [];

      try {
        [rows] = await connect.execute(
          `
            SELECT user_id
            FROM users
            WHERE user_id = ?
              AND is_active = 1
            LIMIT 1
          `,
          [claim.userId],
        );
      } catch (error) {
        console.error(error);
        throw { status: 500, message: "Erro interno do servidor." };
      }

      if (rows.length === 0) {
        passwordResetStore.destroyResetToken(resetToken);
        finished = true;
        throw { status: 404, message: "Usuário não encontrado." };
      }

      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      const connection = await connect.getConnection();

      try {
        await connection.beginTransaction();

        await connection.execute(
          `
            UPDATE users
            SET password = ?, first_login = 0
            WHERE user_id = ?
              AND is_active = 1
          `,
          [hashedPassword, claim.userId],
        );

        await createLog(
          connection,
          claim.userId,
          "UPDATE",
          "users",
          claim.userId,
          "Usuário redefiniu a senha via recuperação por OTP.",
        );

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        console.error(error);

        if (error.status) {
          throw error;
        }

        throw { status: 500, message: "Erro interno do servidor." };
      } finally {
        connection.release();
      }

      // Uso único: invalida somente após a conclusão bem-sucedida.
      passwordResetStore.destroyResetToken(resetToken);
      finished = true;

      console.warn(
        `[password-reset] senha redefinida para user_id=${claim.userId}`,
      );

      return { message: "Senha redefinida com sucesso." };
    } catch (error) {
      // Falha antes da conclusão: libera a reserva para permitir nova
      // tentativa dentro da validade.
      if (!finished) {
        passwordResetStore.releaseResetToken(resetToken);
      }

      throw error;
    }
  }
};
