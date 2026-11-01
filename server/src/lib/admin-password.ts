export function validateAdminPassword(password: string) {
  if (password === "Admin123!") {
    return {
      valid: false,
      reason: "Use a different password; Admin123! is not allowed.",
    };
  }

  if (password.length < 12) {
    return {
      valid: false,
      reason: "Password must be at least 12 characters long.",
    };
  }

  const classes = [
    /[a-z]/,
    /[A-Z]/,
    /\d/,
    /[^A-Za-z0-9]/,
  ].filter((pattern) => pattern.test(password)).length;

  if (classes < 3) {
    return {
      valid: false,
      reason: "Password must include at least three character classes.",
    };
  }

  return { valid: true };
}

export function validateAdminEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
