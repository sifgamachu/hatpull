// Public browsing preferences only; never infer these from a person's name.
export const GIFT_GENDERS = [['any', 'No preference'], ['women', 'Women'], ['men', 'Men']];
export const GIFT_AGES = [['any', 'Any age'], ['kids', 'Kids · 3–12'], ['teens', 'Teens · 13–17'], ['adults', 'Adults · 18+']];
export const GIFT_INTERESTS = [
  ['coffee', 'Coffee & tea', 'coffee'], ['games', 'Games & puzzles', 'games'],
  ['home', 'Home & cozy', 'home'], ['tech', 'Tech & gadgets', 'electronics'],
  ['books', 'Books & journals', 'books'], ['crafts', 'Arts & crafts', 'crafts'],
  ['fitness', 'Sports & fitness', 'fitness'], ['outdoors', 'Outdoors & camping', 'camping'],
  ['care', 'Beauty & self-care', 'beauty'],
];
export const emptyGiftPreferences = () => ({ gender: 'any', age: 'any', interests: [] });
export function cleanGiftPreferences(value = {}) {
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
  const recipient = p.age === 'kids' ? (p.gender === 'women' ? 'girls' : p.gender === 'men' ? 'boys' : 'kids')
    : [p.age === 'teens' ? 'teen' : p.age === 'adults' && p.gender === 'any' ? 'adults' : '', p.gender === 'any' ? '' : p.gender].filter(Boolean).join(' ');
  const seed = base === 'gift set' && interest ? 'gift' : base;
  return [seed.slice(0, 50), interest, recipient].filter(Boolean).join(' ') || 'gift set';
}
