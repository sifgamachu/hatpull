// Private wish-list data is never put in the public catalog cache.
export function ownedGiftItems(state, target) {
  const member = state?.members?.find(m => m.id === target?.mid);
  if (!state?.me || !member || !(member.id === state.me.id || (member.kid && member.parent_id === state.me.id))) throw new Error('forbidden');
  return Array.isArray(member.profile?.items) ? member.profile.items : [];
}
export function mergeSavedWish(items, wish) {
  if (!Array.isArray(items)) return items;
  return items.some(w => w.id === wish.id) ? items.map(w => w.id === wish.id ? wish : w) : [...items, wish];
}
export function giftListError(error) {
  return /forbidden|^not_found$/.test(error?.message) ? 'Open your invitation or sign in again to access this gift list.' : /wish_not_found/.test(error?.message) ? 'This gift was removed on another device. Refresh your list to see the latest gifts.' : /wish_list_full|too large/.test(error?.message) ? 'Your gift list is full. Remove a gift or shorten a few notes first.' : 'We couldn’t update your list. Your saved gifts are safe. Try again.';
}
