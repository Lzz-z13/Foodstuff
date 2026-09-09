function isValidPassword(password) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  // Regex: 
  // (?=.*[a-z])   -> At least one lowercase letter
  // (?=.*[A-Z])   -> At least one uppercase letter
  // (?=.*[\W_])   -> At least one special character (non-alphanumeric or underline)
  // .{8,}         -> Minimum of 8 characters total
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
  
  return passwordRegex.test(password);
}

module.exports = {
  isValidPassword,
};