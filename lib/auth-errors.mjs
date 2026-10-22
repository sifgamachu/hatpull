export function authFailure(error, action = "email") {
  const limited = error?.status === 429 || /rate.?limit|too many|over_.*limit/i.test(`${error?.code || ""} ${error?.message || ""}`);
  if (limited) return { seconds: 60, message: "Too many sign-in attempts on this connection. Wait a minute, then try again. You can keep using your personal celebration link without signing in." };
  if (action === "verify") return { seconds: 0, message: "That code didn't work. Check it, or request a new email." };
  if (action === "google") return { seconds: 0, message: "Google sign-in didn't work. You can try email sign-in instead." };
  return { seconds: 0, message: "Couldn't send the email. Check your connection and try again." };
}
