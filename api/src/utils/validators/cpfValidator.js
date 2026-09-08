function normalizeCPF(cpf) {
  return String(cpf).replace(/\D/g, "");
}

function isValidCPF(cpf) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (cpf.length !== 11) {
    return false;
  }

  if (/^(\d)\1+$/.test(cpf)) {
    return false;
  }

  
  // ===== First digit =====
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }

  let firstDigit = (sum * 10) % 11;

  if (firstDigit === 10) {
    firstDigit = 0;
  }

  if (firstDigit !== Number(cpf[9])) {
    return false;
  }

  // ===== Second digit =====
  sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }

  let secondDigit = (sum * 10) % 11;

  if (secondDigit === 10) {
    secondDigit = 0;
  }

  if (secondDigit !== Number(cpf[10])) {
    return false;
  }

  return true;
}

module.exports = {
  normalizeCPF,
  isValidCPF,
};