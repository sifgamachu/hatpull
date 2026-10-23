// The server trusts only the Auth service's verified user, never an ID from a request body.
export async function requireOrganizer(authorization, getUser) {
  if (!authorization) throw new Error("not_signed_in");
  if (!authorization.startsWith("Bearer ") || authorization.length > 8192 || !authorization.slice(7).trim()) throw new Error("invalid_session");
  const { data, error } = await getUser(authorization.slice(7));
  const user = data?.user;
  if (error || !user?.id || user.is_anonymous || !(user.email_confirmed_at || user.phone_confirmed_at)) throw new Error("invalid_session");
  return user.id;
}
