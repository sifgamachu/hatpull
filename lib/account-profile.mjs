export const PROFILE_ICONS = ['🎁', '🎄', '⭐', '❄️', '❤️', '🎅'];
export function profileSymbol(user) {
  const icon = user?.user_metadata?.hatpull_avatar;
  return PROFILE_ICONS.includes(icon) ? icon : (user?.user_metadata?.full_name || user?.email || 'A').slice(0, 1).toUpperCase();
}
export async function updateProfileIcon(client, icon) {
  if (icon !== '' && !PROFILE_ICONS.includes(icon)) throw new Error('Choose a profile picture.');
  const { data, error } = await client.auth.updateUser({ data: { hatpull_avatar: icon } });
  if (error) throw error;
  return data.user;
}
export async function updateAccountEmail(client, email, currentEmail, redirectTo) {
  const next = email.trim();
  if (!/^\S+@\S+\.\S+$/.test(next)) throw new Error('Enter a valid email address.');
  if (next.toLowerCase() === currentEmail.toLowerCase()) throw new Error('Enter a different email address.');
  const { data, error } = await client.auth.updateUser({ email: next }, { emailRedirectTo: redirectTo });
  if (error) throw error;
  return data.user;
}
