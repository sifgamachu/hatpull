import test from 'node:test';
import assert from 'node:assert/strict';
import { GIFT_INTERESTS, GIFT_GENDERS, GIFT_AGES, cleanGiftPreferences, emptyGiftPreferences, giftSearchQuery, giftPreferenceChips } from '../lib/gift-preferences.mjs';
import { searchKey } from '../lib/ebay-search-cache.mjs';
import { ebayQuery } from '../lib/ebay-catalog.mjs';

test('preferences accept only supported values and remove duplicate or unknown interests', () => {
  assert.deepEqual(cleanGiftPreferences({gender:'private name',age:'1990-01-01',interests:['unknown','games','games','coffee']}),{country:'US',gender:'any',age:'any',interests:['coffee','games']});
  assert.equal(cleanGiftPreferences({interests:GIFT_INTERESTS.map(([id])=>id)}).interests.length,3);
  assert.deepEqual(giftPreferenceChips(emptyGiftPreferences()),[]);
});

test('recommendations change by explicit preferences, combine interests with OR and preserve manual searches', () => {
  const p={gender:'women',age:'teens',interests:['coffee','games']};
  assert.equal(giftSearchQuery('gift set',p),'gift (coffee,games) teen women');
  assert.equal(giftSearchQuery('travel',p),'travel (coffee,games) teen women');
  assert.equal(giftSearchQuery('gift set',{gender:'men',age:'kids'}),'gift set boys');
  assert.equal(giftSearchQuery('gift set',{age:'adults'}),'gift set adults');
  assert.equal(giftSearchQuery('  coffee   mugs ',emptyGiftPreferences()),'coffee mugs');
  assert.equal(giftSearchQuery('coffee',{...p,gender:'any',age:'any',interests:[]}), 'coffee');
});

test('all preference combinations stay within the existing catalog query and budget bounds', () => {
  for(const [gender] of GIFT_GENDERS)for(const [age] of GIFT_AGES) {
    const preferences={gender,age,interests:['tech','fitness','outdoors']};
    const key=searchKey({q:giftSearchQuery('x'.repeat(50),preferences),max:25,sort:'low',page:2});
    const query=ebayQuery(new URLSearchParams(key));
    assert.ok(query.q.length<=100);assert.equal(query.max,25);assert.equal(query.page,2);assert.equal(query.sort,'low');
  }
  const a=searchKey({q:giftSearchQuery('gift set',{gender:'women'}),max:25});
  const b=searchKey({q:giftSearchQuery('gift set',{gender:'men'}),max:25});
  assert.notEqual(a,b);
  assert.equal(giftSearchQuery('gift set',{interests:['games','coffee']}),giftSearchQuery('gift set',{interests:['coffee','games']}));
});
