// Public browsing preferences only; never infer these from a person's name.
export const GIFT_GENDERS = [['any', 'No preference'], ['women', 'Women'], ['men', 'Men']];
export const GIFT_AGES = [['any', 'Any age'], ['preschool', 'Under 5'], ['kids', 'Kids · 5–11'], ['teens', 'Teens · 12–17'], ['young_adults', '18–29'], ['adults', 'Adults · 18+'], ['seniors', '65+']];
export const WISH_AGES = ['Under 5', '5–11', '12–17', '18–29', '30–44', '45–64', '65+'];
export function cleanWishDemographics(profile = {}) {
  return { age: WISH_AGES.includes(profile?.age) ? profile.age : '', who: ['women','men'].includes(profile?.who) ? profile.who : '' };
}
export function giftPreferencesFromProfile(profile) {
  const p = cleanWishDemographics(profile);
  const age = { 'Under 5':'preschool', '5–11':'kids', '12–17':'teens', '18–29':'young_adults', '30–44':'adults', '45–64':'adults', '65+':'seniors' }[p.age] || 'any';
  return { gender: p.who || 'any', age, interests: [] };
}
export const GIFT_INTERESTS = [
  ['coffee', 'Coffee & tea', 'coffee'], ['games', 'Games & puzzles', 'games'],
  ['home', 'Home & cozy', 'home'], ['tech', 'Tech & gadgets', 'electronics'],
  ['books', 'Books & journals', 'books'], ['crafts', 'Arts & crafts', 'crafts'],
  ['fitness', 'Sports & fitness', 'fitness'], ['outdoors', 'Outdoors & camping', 'camping'],
  ['care', 'Beauty & self-care', 'beauty'],
];
export const emptyGiftPreferences = () => ({ gender: 'any', age: 'any', interests: [] });
export function cleanGiftPreferences(value = {}) {
  value = value || {};
  return {
    gender: GIFT_GENDERS.some(([id]) => id === value.gender) ? value.gender : 'any',
    age: GIFT_AGES.some(([id]) => id === value.age) ? value.age : 'any',
    interests: GIFT_INTERESTS.filter(([id]) => Array.isArray(value.interests) && value.interests.includes(id)).map(([id]) => id).slice(0, 3),
  };
}
export function giftPreferenceChips(value) {
  const p = cleanGiftPreferences(value);
  return [
    ...(p.gender === 'any' ? [] : [{ kind: 'gender', id: p.gender, label: GIFT_GENDERS.find(([id]) => id === p.gender)[1] }]),
    ...(p.age === 'any' ? [] : [{ kind: 'age', id: p.age, label: GIFT_AGES.find(([id]) => id === p.age)[1] }]),
    ...p.interests.map(id => ({ kind: 'interest', id, label: GIFT_INTERESTS.find(([key]) => key === id)[1] })),
  ];
}
export function giftSearchQuery(term, value) {
  const p = cleanGiftPreferences(value), base = String(term || 'gift set').trim().replace(/\s+/g, ' ');
  if (!giftPreferenceChips(p).length) return base || 'gift set';
  // A single bounded retailer query avoids one request per interest. Commas in
  // parentheses are eBay's OR syntax. Only allowlisted interest terms go here.
  const words = GIFT_INTERESTS.filter(([id]) => p.interests.includes(id)).map(([, , word]) => word);
  const interest = words.length > 1 ? `(${words.join(',')})` : words[0] || '';
  const recipient = p.age === 'preschool' ? 'toddler'
    : p.age === 'kids' ? (p.gender === 'women' ? 'girls' : p.gender === 'men' ? 'boys' : 'kids')
    : [p.age === 'teens' ? 'teen' : p.age === 'young_adults' ? 'young adult' : p.age === 'seniors' ? 'senior' : p.age === 'adults' && p.gender === 'any' ? 'adults' : '', p.gender === 'any' ? '' : p.gender].filter(Boolean).join(' ');
  const seed = base === 'gift set' && interest ? 'gift' : base;
  return [seed.slice(0, 50), interest, recipient].filter(Boolean).join(' ') || 'gift set';
}
