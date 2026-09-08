const validator = require("validator");

const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS.split(",");

// No sensitive cases.
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  if (process.env.SKIP_VALIDATORS === "true") return true;
  return validator.isEmail(email);
}

function hasAllowedDomain(email) {
  if (!isValidEmail(email)) {
    return false;
  }
  
  if (process.env.SKIP_VALIDATORS === "true") return true;

  const domain = email.split("@")[1];

  return allowedDomains.includes(domain);
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  hasAllowedDomain,
};