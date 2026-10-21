// Search landing pages. Each one targets a phrase people actually type into Google
// (taken from Google's autocomplete suggestions) and leads into the same generator.
// occ = index into OCCASIONS in lib/core.js (0 Secret Santa, 6 Eid, 8 Diwali, 12 Mother's Day, 13 Father's Day, 14 Birthday, 15 Office party).

const COMMON_FAQ = {
  self: ["Can someone draw their own name?", "No. The generator never lets anyone draw themselves, so the draw always works the first time."],
  free: ["Is it free?", "Yes. Drawing names, invitations and wish lists are free, with no sign-up."],
  account: ["Does everyone need an account or an email address?", "No. Everyone joins from one invitation link and taps their own name. Nobody has to sign up or hand over an email address."],
  organizer: ["Can the organizer see who drew whom?", "Not while the exchange is running. After the celebration date, the organizer can view the results, so you can avoid the same matches next year."],
};

export const LANDINGS = [
  // ── Christmas / Secret Santa ──────────────────────────────────────────
  {
    slug: "secret-santa-generator-no-email",
    festive: true, occ: 0, group: "santa",
    nav: "No email needed",
    title: "Secret Santa Generator With No Email or Sign-Up",
    description: "Free Secret Santa generator that needs no email addresses and no accounts. Share one link in the group chat, everyone taps their name and draws.",
    kicker: "No email · No sign-up",
    h1: ["Secret Santa with ", "no email addresses."],
    lede: "Collecting everyone's email is the worst part of organizing. Skip it. Share one link in the family chat, and each person taps their own name to draw.",
    intro: [
      "Most Secret Santa sites make the organizer type in an email address for every single person, then hope nobody's invitation lands in spam. Hatpull works the way groups actually talk: one link, shared wherever your group already chats.",
      "Send it on WhatsApp, by text, in Slack or by email if you want to. Each person opens the link, picks their name from the list, and sees who they're buying for. Their draw is saved on their phone, so they can come back to it any time.",
    ],
    points: [
      ["🔗 One link for everyone", "The same invitation works for the whole group. No per-person emails to type or chase."],
      ["📱 Works in any chat app", "Built-in buttons for WhatsApp, text message and email, or copy the link anywhere."],
      ["🙈 Still completely secret", "Each person only ever sees their own match. The organizer can't peek while the exchange is running."],
      ["🎁 Wish lists included", "People add gift ideas with links. Whoever drew them can reserve a gift secretly."],
    ],
    faq: [
      ["How do people get their name without an email?", "You share one invitation link. Each person opens it, taps their own name, and draws. Hatpull remembers them on that device with a private link, so they can come back to check their match or wish list."],
      ["What if someone forgets who they drew?", "Their match stays saved on the phone they drew on. Hatpull also gives each person a personal link to keep, which opens their draw on any device."],
      ["What stops someone from tapping another person's name?", "Once a name has been claimed it's locked to that person. Nobody else can open it from the invitation link."],
      COMMON_FAQ.self, COMMON_FAQ.free,
    ],
  },
  {
    slug: "secret-santa-generator-with-wish-list",
    festive: true, occ: 0, group: "santa",
    nav: "With wish lists",
    title: "Secret Santa Generator With Wish Lists",
    description: "Draw names and share Christmas wish lists in one place. Add gift ideas with links and prices, and reserve gifts secretly so nobody buys the same thing twice.",
    kicker: "Draw names + wish lists",
    h1: ["Secret Santa generator ", "with wish lists."],
    lede: "Everyone draws a name and writes a wish list. Whoever drew them sees the list, reserves a gift secretly, and nobody wraps the same sweater twice.",
    intro: [
      "A name on its own leaves people guessing. With a wish list attached to every person, your Secret Santa knows your size, your favorite things and the exact link to the gift you want.",
      "Lists can include links to any store, a price and notes. When someone reserves a gift, it's hidden from the person who asked for it, so the surprise stays intact.",
    ],
    points: [
      ["📝 Gift ideas with links", "Paste a link from any store, add a price and a note about size or color."],
      ["🔒 Secret reservations", "Reserve a gift so nobody else buys it. The person who wished for it never sees who reserved it."],
      ["🤫 Anonymous questions", "Ask your person a question without giving yourself away, and they answer on their list."],
      ["🧒 Lists for kids", "Parents can add wish lists for children who aren't drawing names themselves."],
    ],
    faq: [
      ["Can people see who reserved their gift?", "No. The person who made the wish list can't see reservations at all. Other people only see that a gift is taken, so nobody doubles up."],
      ["Can I use an Amazon wish list?", "Yes. Paste links from Amazon or any other store into your list. Each gift keeps its link, price and notes."],
      ["Can I make a wish list without drawing names?", "Yes. You can start a wish-list-only group for birthdays, weddings or any occasion where everyone buys for everyone."],
      COMMON_FAQ.account, COMMON_FAQ.free,
    ],
  },
  {
    slug: "secret-santa-generator-with-exclusions",
    festive: true, occ: 0, group: "santa",
    nav: "With exclusions",
    title: "Secret Santa Generator With Exclusions (Keep Couples Apart)",
    description: "Free Secret Santa generator with exclusions. Stop couples, siblings and housemates from drawing each other, or avoid last year's matches.",
    kicker: "Exclusions built in",
    h1: ["Secret Santa with ", "exclusions."],
    lede: "Keep couples, siblings and housemates from drawing each other. Hatpull checks that a fair draw is still possible before anyone opens their link.",
    intro: [
      "Couples already buy for each other. Kids shouldn't draw their own parents. And nobody wants the same person three years running. Exclusions fix all of that.",
      "Set any pair as a no-match and the generator finds a draw that respects every rule. If your rules make a draw impossible, for example in a very small group, it tells you straight away instead of failing later.",
    ],
    points: [
      ["💑 Couples and families", "Tick off any pair who shouldn't draw each other, in either direction."],
      ["✅ Checks before you share", "Hatpull confirms a fair draw exists before you send the invitation."],
      ["🔁 Avoid last year's matches", "After the exchange, check who drew whom and add those pairs as exclusions next year."],
      ["🎩 Never draws yourself", "Nobody can ever draw their own name, so the draw always works the first time."],
    ],
    faq: [
      ["How many exclusions can I add?", "As many as you like. The only limit is that a fair draw must still be possible, and the generator checks that for you."],
      ["Do exclusions work both ways?", "Yes. If Sam and Alex are excluded, Sam won't draw Alex and Alex won't draw Sam."],
      ["Can I change exclusions after people have drawn?", "Yes. The organizer can update exclusions and redraw. Everyone gets a fresh match in the new round."],
      COMMON_FAQ.organizer, COMMON_FAQ.free,
    ],
  },
  {
    slug: "office-secret-santa",
    festive: true, occ: 0, group: "santa",
    nav: "Office Secret Santa",
    title: "Office Secret Santa Generator for Work Teams",
    description: "Run a Secret Santa at work in a minute. One link for the whole team, a clear budget, exclusions for remote teams, and wish lists so nobody guesses.",
    kicker: "For teams and offices",
    h1: ["Office Secret Santa, ", "sorted in a minute."],
    lede: "Paste one link into Slack or Teams. Everyone draws a name, sees the budget and date, and adds a wish list. No spreadsheet, no hat, no email collecting.",
    intro: [
      "Office gift exchanges fall apart in the details: who's in, what's the budget, when's the swap, and what does the new person in accounting actually like. Hatpull puts all of it on one page.",
      "Share the invitation in your team channel. People who opt in tap their name and draw. The budget and exchange date sit at the top of everyone's page, and wish lists take the guesswork out of buying for someone you only know from meetings.",
    ],
    points: [
      ["💸 Budget everyone can see", "Set the spending limit once. It's on every person's page, so nobody overspends."],
      ["📅 Exchange date and reminders", "Everyone sees the countdown. The organizer can send a reminder with one tap."],
      ["🏢 Up to 200 people", "Big enough for a whole department. Split teams with separate groups if you prefer."],
      ["🔴 Live draw on a call", "Reveal everyone's names at the same moment during a team meeting."],
    ],
    faq: [
      ["Do coworkers need to sign up?", "No. They open the invitation link and tap their name. No accounts and no email addresses."],
      ["Can people join after the draw?", "Yes. The organizer can add someone and redraw. Everyone gets a fresh match."],
      ["What's a good office Secret Santa budget?", "Most workplaces pick $15 to $30. Keep it low enough that nobody feels pressured, and put it in writing on the invitation."],
      COMMON_FAQ.self, COMMON_FAQ.free,
    ],
  },
  {
    slug: "family-secret-santa",
    festive: true, occ: 0, group: "santa",
    nav: "Family Secret Santa",
    title: "Family Secret Santa App: Draw Names for Christmas",
    description: "Draw names for your family Christmas online. Keep couples apart, add wish lists for the kids, and share one link in the family chat.",
    kicker: "For families",
    h1: ["Family Secret Santa, ", "without the chaos."],
    lede: "Draw names for the whole family in the group chat. Keep couples apart, add lists for the little ones, and let Grandma join with one tap.",
    intro: [
      "Big families mean big gift bills. Drawing names means everyone buys one great present instead of a dozen rushed ones, and it works just as well when half the family lives in another city.",
      "Share the link in the family chat. Each person taps their name and draws. Parents can add wish lists for children who are too young to draw, so aunts and uncles know exactly what to get.",
    ],
    points: [
      ["💑 Keep couples apart", "Exclusions stop partners, parents and kids from drawing each other."],
      ["🧒 Kids' wish lists", "Add lists for children who aren't drawing, managed by their parents."],
      ["👵 Easy for everyone", "No app to install and no account. If you can open a link, you can draw."],
      ["🔁 No repeats next year", "See this year's matches after Christmas and exclude them next time."],
    ],
    faq: [
      ["Can family members far away take part?", "Yes. Everything happens online, so relatives anywhere can draw and see wish lists. They can ship gifts straight from the links on the list."],
      ["Can kids take part?", "Yes. Older kids can draw like anyone else. For little ones, a parent can add a wish list for them without them drawing a name."],
      COMMON_FAQ.account, COMMON_FAQ.self, COMMON_FAQ.free,
    ],
  },
  {
    slug: "draw-names-from-a-hat-online",
    festive: true, occ: 0, group: "santa",
    nav: "Draw names from a hat",
    title: "Draw Names From a Hat Online, Free",
    description: "Draw names out of a hat online for Secret Santa or any gift exchange. Nobody draws themselves, couples stay apart, and everyone draws from their own phone.",
    kicker: "The hat, online",
    h1: ["Draw names from a hat, ", "online."],
    lede: "Just like slips of paper in a hat, except nobody pulls their own name, nobody has to be in the same room, and nobody loses their slip.",
    intro: [
      "The paper-and-hat method has three problems: someone always draws themselves, everyone has to be there at once, and someone always forgets who they got. Drawing names online fixes all three.",
      "Add the names, share one link, and let each person draw from their own phone. If you'd rather keep the drama of a group reveal, start a live draw and everyone sees their name at the same moment.",
    ],
    points: [
      ["🎩 Nobody draws themselves", "Every draw is valid the first time. No putting slips back and starting over."],
      ["📍 From anywhere", "People draw from their own phones, wherever they are."],
      ["🧠 Nothing to forget", "Your match is saved on your private link. Look it up any time."],
      ["🎯 Just need a quick pick?", "For raffles and classrooms, use the free name picker wheel instead."],
    ],
    faq: [
      ["Is drawing names online random?", "Yes. Matches are shuffled at random on our server, so nobody, including the organizer, can steer the result."],
      ["Can we all draw at the same time?", "Yes. Start a live draw and everyone's name is revealed at the same moment, which works well on a video call."],
      ["I just need to pick one name, not a gift exchange.", "Use the free name picker wheel. Paste a list of names, spin, and get a winner."],
      COMMON_FAQ.free,
    ],
  },
  {
    slug: "secret-santa-gift-ideas",
    festive: true, occ: 0, group: "santa", ideas: true,
    nav: "Gift ideas",
    title: "Secret Santa Gift Ideas by Budget",
    description: "Secret Santa gift ideas under $10, $20, $30 and $50. Practical picks for coworkers, family and friends, plus a free gift finder.",
    kicker: "Gift ideas",
    h1: ["Secret Santa gift ideas, ", "by budget."],
    lede: "Stuck on what to buy? Start with the budget, then pick something useful, edible or cozy. Better yet, check their wish list first.",
    intro: [
      "The best Secret Santa gift is the one on their wish list. If your person hasn't written one, or you want a backup, these ideas work for almost anyone and stay inside common budgets.",
      "Tap any idea to see current options and prices. For something more personal, try the gift finder and filter by age, budget and interests.",
    ],
    points: [],
    faq: [
      ["What's a normal Secret Santa budget?", "Most groups pick between $15 and $30. Offices tend to go lower and close families sometimes go higher. Agree on it before anyone shops."],
      ["What if I don't know my person well?", "Go for something consumable or cozy, like good coffee, chocolate or warm socks, or ask them an anonymous question through their wish list."],
      ["Should a Secret Santa gift be a surprise?", "The surprise is who gave it, not what it is. Buying from someone's wish list is perfectly fine."],
    ],
  },

  // ── Year-round gift exchanges ─────────────────────────────────────────
  {
    slug: "gift-exchange-generator",
    festive: false, occ: 15, group: "year",
    nav: "Gift exchange generator",
    title: "Gift Exchange Generator for Any Occasion",
    description: "Free gift exchange generator for birthdays, office parties, holidays and family get-togethers. Draw names, set a budget, share wish lists.",
    kicker: "Any occasion, any time of year",
    h1: ["Gift exchange generator ", "for any occasion."],
    lede: "Not just for Christmas. Draw names for a birthday swap, an office party, Eid, Diwali or a family reunion, with wish lists and a budget built in.",
    intro: [
      "A gift exchange works for any group that wants to give one good present instead of many small ones. Pick the occasion, set the date and budget, and share one link.",
      "Everyone draws a name from their own phone and adds a wish list. Whoever drew them can reserve a gift secretly, so nothing gets bought twice.",
    ],
    points: [
      ["🗓️ Any date", "Birthdays, office parties, holidays, reunions or a random Friday."],
      ["💸 Shared budget", "Set the limit once and everyone sees it."],
      ["🎁 Wish lists", "Gift ideas with links and secret reservations."],
      ["🙅 Exclusions", "Keep couples or teammates from drawing each other."],
    ],
    faq: [
      ["What's the difference between a gift exchange and Secret Santa?", "Secret Santa is a gift exchange where the giver stays anonymous, usually at Christmas. A gift exchange can be any time of year, and you can choose whether to reveal who gave what."],
      ["Can we just share wish lists without drawing names?", "Yes. Start a wish-list-only group where everyone can see everyone's list, which works well for birthdays and weddings."],
      COMMON_FAQ.account, COMMON_FAQ.self, COMMON_FAQ.free,
    ],
  },
  {
    slug: "birthday-gift-exchange",
    festive: false, occ: 14, group: "year",
    nav: "Birthday gift exchange",
    title: "Birthday Gift Exchange and Group Wish Lists",
    description: "Organize a birthday gift exchange or share birthday wish lists with friends and family. Reserve gifts secretly so nobody doubles up.",
    kicker: "Birthdays",
    h1: ["Birthday gifts, ", "without the duplicates."],
    lede: "Share birthday wish lists with the family, or draw names for a friends' birthday swap. Reserve gifts secretly so nobody shows up with the same thing.",
    intro: [
      "Birthdays are when duplicate gifts happen most: three people, one obvious present. A shared wish list with secret reservations ends that.",
      "For friend groups that celebrate a few birthdays close together, draw names so each person buys one gift for one friend.",
    ],
    points: [
      ["🎂 Birthday wish lists", "Add gift ideas with links and prices for the birthday person."],
      ["🔒 Secret reservations", "Others see a gift is taken. The birthday person never sees who took it."],
      ["🧒 Great for kids' parties", "Parents can share a list so guests know what to bring."],
      ["🎩 Or draw names", "For group birthdays, draw names so everyone buys one gift."],
    ],
    faq: [
      ["Can I share a wish list without drawing names?", "Yes. Choose wish lists only when you start, and invite everyone who might buy a gift."],
      COMMON_FAQ.account, COMMON_FAQ.free,
    ],
  },
  {
    slug: "mothers-day-gift-exchange",
    festive: false, occ: 12, group: "year",
    nav: "Mother's Day",
    title: "Mother's Day Gift Exchange and Wish Lists",
    description: "Coordinate Mother's Day gifts with siblings. Share wish lists, reserve gifts secretly, and set a budget so nobody doubles up.",
    kicker: "Mother's Day",
    h1: ["Coordinate Mother's Day ", "with the whole family."],
    lede: "Siblings, partners and grandkids all buying for Mom? Share one wish list and reserve gifts so nobody buys the same flowers.",
    intro: [
      "Mother's Day often means several people shopping for the same person at once. A shared list keeps everyone coordinated without spoiling the surprise.",
      "Start a wish-list group, add Mom's gift ideas (or ask her to add them), and let everyone reserve what they're buying.",
    ],
    points: [
      ["💐 One shared list", "Everyone sees what's left to buy."],
      ["🔒 Secret reservations", "Mom never sees who's buying what."],
      ["💸 Budget", "Agree on a spending limit up front."],
      ["📅 Date reminder", "A countdown keeps everyone on time."],
    ],
    faq: [COMMON_FAQ.account, COMMON_FAQ.free],
  },
  {
    slug: "eid-gift-exchange",
    festive: false, occ: 6, group: "year",
    nav: "Eid gift exchange",
    title: "Eid Gift Exchange: Draw Names for Eid",
    description: "Draw names for an Eid gift exchange with family or friends. Set a budget, share wish lists, and keep it fair for everyone.",
    kicker: "Eid",
    h1: ["Eid gift exchange, ", "made simple."],
    lede: "Draw names for Eid with family or friends, near or far. Everyone buys one thoughtful gift, with a budget and wish lists to help.",
    intro: [
      "Gift exchanges are a lovely way to share Eid with a big family or a group of friends, especially when people are spread across cities or countries.",
      "Share one link, let everyone draw a name, and add wish lists. Set the date for Eid al-Fitr or Eid al-Adha and a budget that works for everyone.",
    ],
    points: [
      ["🌙 Any Eid date", "Choose the date that matches your celebration."],
      ["🌍 Family anywhere", "Everyone draws from their own phone."],
      ["🎁 Wish lists", "Gift ideas with links so nobody guesses."],
      ["🙅 Exclusions", "Keep couples or close siblings apart."],
    ],
    faq: [COMMON_FAQ.account, COMMON_FAQ.self, COMMON_FAQ.free],
  },
  {
    slug: "diwali-gift-exchange",
    festive: false, occ: 8, group: "year",
    nav: "Diwali gift exchange",
    title: "Diwali Gift Exchange: Draw Names Online",
    description: "Draw names for a Diwali gift exchange with family, friends or coworkers. Budget, wish lists and exclusions included.",
    kicker: "Diwali",
    h1: ["Diwali gift exchange, ", "drawn online."],
    lede: "Organize a Diwali gift swap with family, friends or the office. One link, one name each, and wish lists so every gift lands well.",
    intro: [
      "A name draw keeps Diwali gifting fair and affordable for bigger groups, while still giving everyone something to look forward to.",
      "Share one invitation link, set the budget and date, and let everyone draw and add wish lists from their own phone.",
    ],
    points: [
      ["🪔 Set your date", "Pick the day you're exchanging gifts."],
      ["💸 Shared budget", "Everyone sees the same limit."],
      ["🎁 Wish lists", "Gift ideas with links and secret reservations."],
      ["🏢 Works for offices", "Up to 200 people in one draw."],
    ],
    faq: [COMMON_FAQ.account, COMMON_FAQ.self, COMMON_FAQ.free],
  },
];

export const getLanding = slug => LANDINGS.find(l => l.slug === slug);

// Gift ideas by budget for the ideas page. Each idea links to a store search.
export const IDEAS_BY_BUDGET = [
  { label: "Under $10", lo: 0, hi: 10, items: ["fuzzy socks", "hot cocoa bombs", "lip balm set", "mini succulent", "funny coffee mug", "pocket puzzle"] },
  { label: "Under $20", lo: 10, hi: 20, items: ["scented candle", "tea sampler", "phone stand", "card game for adults", "insulated tumbler", "desk plant"] },
  { label: "Under $30", lo: 20, hi: 30, items: ["cozy throw blanket", "gourmet chocolate box", "portable charger", "board game", "coffee sampler", "bath gift set"] },
  { label: "Under $50", lo: 30, hi: 50, items: ["bluetooth speaker", "weighted blanket", "wireless earbuds", "cookbook", "smart plug set", "leather wallet"] },
];
