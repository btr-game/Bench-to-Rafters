// The events by what they are about (round 27): the Catalog groups them so, and the project
// summary's Turning points chapter uses the same themes.

export const EVENT_THEMES: [string, string[]][] = [
  ['Training and skills', ["corner3", "offhand", "formRebuild", "focus", "aau", "elitecamp", "pickup", "fiveam", "coachable", "skillstrainer", "filmstudy", "shootingcamp", "bigmancamp", "handlesummer", "lockdowncoach", "explosive", "glasswork", "pickuppros", "newmove", "weakspot", "filmiq", "pnrlab", "touchsummer", "passers", "arc-jumper", "summerLeague", "proAm", "clutchDrill", "glassCleaner", "passingGuru", "boxingTraining", "longArms", "ftRoutine"]],
  ['Body, health and weight', ["ankle", "growthspurt", "kneescare", "loadmgmt", "burnout", "illness", "nutrition", "longevity", "arc-ankle", "arc-body", "diet", "shoeLab", "loadManagement", "weightCut", "bulkUp", "trimDown", "skinnyKid", "holidayFeast", "campHeavy", "plantBased", "couchWeeks", "combineWeighIn", "growthSpurt", "comebackLighter", "veteranTrim", "teamChef", "carcrash"]],
  ['On the court: form and big games', ["finals", "hotstreak", "slump", "rivalgame", "posterdunk", "opportunity", "starHurt", "ref", "rivalTalk", "trash", "arc-rival", "underdogSpirit", "rivalFilm", "reputationTest", "recordCircus", "farewellOvation", "coldNight", "gameBall", "shotDiet"]],
  ['Team, coaches and the locker room', ["captain", "mentor", "coachfeud", "definedrole", "starbeef", "coachfired", "coachpos", "complacent", "legendCalls", "arc-veteran", "arc-coach", "superteamCall", "mentorRookie", "rookieMentor", "styleClash", "playersOnlyMeeting", "newTeammateClash", "ringChaserDoubt", "duoShootaround", "duoLastShot", "duoExtension", "spotlightGrumble", "teamFirstNoticed", "chaserYoungStar", "prankWar", "coachDinner", "coachPoached", "mentorThanks", "arc-protege", "tankJob"]],
  ['Career moves and contracts', ["powerhouse", "tradeRequest", "extension", "agent", "contractYear", "agentRaise"]],
  ['Media, fame and brands', ["paper", "nil", "viral", "sneaker", "mediagaffe", "socialbeef", "localPaper", "charityGame", "storyMedia", "docuStart", "docuRelease", "arc-brand", "burgerDeal", "nickname-hate", "brand-scandal", "shoe-sellout", "rival-talk", "quote-shirt", "house-tour", "farewellJersey"]],
  ['Life off the court', ["party", "family", "booster", "nightlife", "homesick", "fight", "betting", "grades", "psychologist", "newborn", "youthcamp", "arc-family", "arc-love", "arc-homesick", "arc-sibling", "arc-mind", "classGrades", "anniversary", "kidAtGame"]],
  ['Money, family and giving back', ["investment", "agentfraud", "foundation", "arc-investment", "arc-foundation", "charityCourt", "homeCamp", "homeCampKid", "tuition", "cousin-business", "parents-retire", "friend-loan", "real-estate", "restaurant-chain", "sneaker-startup", "college-facility", "national-team", "hall-wing"]],
  ['Hiring and keeping staff', ["hire-chef", "hire-nutritionist", "hire-trainer", "hire-physio", "hire-shooting", "hire-skills", "hire-psychologist", "hire-analyst", "hire-sleep", "staff-poached"]],
];

/** The theme an event belongs to (Other for one added since). */
export const themeOf = (id: string): string => EVENT_THEMES.find(([, ids]) => ids.includes(id))?.[0] ?? 'Other';
