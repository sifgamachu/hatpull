import { giftInspirationPlan } from './gift-inspiration.mjs';
import { giftPreferencesFromProfile } from './gift-preferences.mjs';

// Original, generic gift ideas. These are not retailer listings or stock/price claims.
const ideas = {
  mug:['An insulated camp mug','coffee'], inflator:['A compact tire inflator','inflator'],
  drone:['A mini camera drone','drone'], speaker:['A portable speaker','tech'],
  sockets:['A socket tool set','tools'], bits:['A screwdriver bit set','tools'],
  fitness:['A home workout board','fitness'], charger:['A portable power bank','charger'],
  coffee:['A coffee tasting set','coffee'], games:['A game-night favorite','games'],
  camping:['A camping lantern','lantern'], journal:['A fresh-page journal','books'],
  blanket:['A cozy throw blanket','cozy'], art:['A watercolor paint set','paint'],
  care:['A self-care gift set','wellness'], candle:['A scented candle','wellness'],
  tea:['A tea tasting set','coffee'], puzzle:['A satisfying puzzle','games'],
  mat:['A yoga mat','fitness'], book:['A creative coloring book','books'],
  headphones:['Wireless headphones','headphones'], crafts:['A creative craft kit','paint'],
  kidsblocks:['A building-block adventure','kids'], kidspuzzle:['A colorful puzzle','games'],
  kidsart:['A children’s art set','paint'], kidsgame:['A family board game','games'],
  kidsoutdoors:['Adventure binoculars','binoculars'], kidsbooks:['An illustrated storybook','books'],
  toddlersort:['A shape-sorting toy','kids'], toddlerblocks:['Big building blocks','kids'],
  toddlerpuzzle:['A first wooden puzzle','games'], toddlerbook:['A sturdy board book','books'],
  toddlerplush:['A cuddly stuffed animal','plush'], toddlerart:['Washable crayons','paint'],
};

export function storePreviewIdeas(profile, count = 3) {
  return giftInspirationPlan(giftPreferencesFromProfile(profile)).slice(0,count).map(({id,q})=>({
    id, query:q, title:ideas[id][0], art:ideas[id][1],
  }));
}
