// Things he owns that he can go and use (round 25, the owner: a showcase of what he bought, and a
// visit to the car, the jet, the house...). One visit a season each lifts his mood a little;
// the public ones raise his profile too. Experiences that are over once bought (a vacation, a
// dinner) are not here.

type Place = 'road' | 'sky' | 'sea' | 'home' | 'court' | 'field' | 'city' | 'night';

export interface Visit {
  verb: string; // the button
  place: Place; // the backdrop of the scene
  lines: string[]; // one is picked for each visit
  rep?: number; // a public visit also raises his profile
}

export const VISITS: Record<string, Visit> = {
  'gaming-setup': { verb: 'Play a few games', place: 'home', lines: ['Three hours, two controllers, one rematch you will never admit losing.', 'You beat your little cousin. Barely.'] },
  'gaming-chair': { verb: 'Sit in the chair', place: 'home', lines: ['It reclines further than any chair should. You fall asleep in it.', 'Twelve settings. You find the one you like on the eleventh try.'] },
  'stream-setup': { verb: 'Go live', place: 'home', lines: ['Forty thousand people watch you lose at a racing game. They love it.', 'You answer questions for an hour. Someone asks about your free throws.'], rep: 1 },
  'podcast-studio': { verb: 'Record an episode', place: 'home', lines: ['Your guest talks for ninety minutes. You say eleven words. Great episode.', 'You tell the story about your first dunk again. It gets longer every time.'], rep: 1 },
  'family-seats': { verb: 'Wave to the family seats', place: 'court', lines: ['Your mother holds up a sign. Your brother is on the jumbotron for a full minute.', 'They saw you hit the game-winner from the best seats in the building.'] },
  'backyard-court': { verb: 'Shoot around out back', place: 'court', lines: ['The neighbour kids hear the ball and come over. You lose a game of HORSE.', 'Two hundred shots under the porch light. The old routine.'] },
  charity: { verb: 'Visit the court back home', place: 'court', lines: ['The paint is still fresh. Every hoop has a kid under it.', 'Someone has painted your number at centre court.'], rep: 1 },
  'youth-camp': { verb: 'Coach at your camp', place: 'court', lines: ['A ten-year-old crosses you over. You sign his shoe.', 'Three hundred kids, one whistle, no voice left by lunch.'], rep: 1 },
  'scholarship-fund': { verb: 'Meet this year’s scholars', place: 'city', lines: ['Six students, six plans. One wants to be your agent.', 'A thank-you letter in very neat handwriting.'], rep: 1 },
  car: { verb: 'Take it for a drive', place: 'road', lines: ['Windows down on the coast road. Nobody recognises you at the gas station.', 'You drive to your old high school and sit in the parking lot for a while.'] },
  'car-collection': { verb: 'Pick a car for the day', place: 'road', lines: ['You take the oldest one out. It breaks down twice. Best day of the summer.', 'Forty cars. You drive the one you bought first.'] },
  jet: { verb: 'Fly somewhere', place: 'sky', lines: ['Breakfast at home, dinner on another coast.', 'You land, eat the best tacos of your life, and fly back.'] },
  mansion: { verb: 'Spend a weekend in', place: 'home', lines: ['You get lost on the way to the kitchen. Again.', 'Eleven bathrooms and you still use the one by the gym.'] },
  'parents-home': { verb: 'Visit your parents', place: 'home', lines: ['Your father shows you the garage he finally has room for.', 'Your mother has framed every newspaper clipping. Every single one.'] },
  penthouse: { verb: 'Shoot on the roof', place: 'night', lines: ['Half court, forty floors up, the city lights below. Swish.', 'You miss one off the back iron. It lands in the pool.'] },
  watches: { verb: 'Pick a watch', place: 'home', lines: ['The one your grandfather would have liked.', 'You are on time for practice. A first.'] },
  art: { verb: 'Walk the collection', place: 'home', lines: ['You stand in front of the big blue one for a long time.', 'The curator explains a painting. You nod like you understand.'] },
  'art-wing': { verb: 'Walk your museum wing', place: 'city', lines: ['A school group walks past your name above the door.', 'Free entry for kids. The room is full on a Tuesday.'], rep: 1 },
  esports: { verb: 'Watch your team play', place: 'night', lines: ['Your team wins the final in overtime. You scream louder than at any game of yours.', 'They lose. You give the speech you hear from coaches.'] },
  vineyard: { verb: 'Taste this year’s wine', place: 'field', lines: ['The label has your number on it. The wine is better than the label.', 'Harvest week. You carry crates for a whole morning.'] },
  yacht: { verb: 'Take it out', place: 'sea', lines: ['Dolphins off the bow. Your phone stays in a drawer.', 'You fall asleep on deck and wake up with a sunburn.'] },
  superyacht: { verb: 'Sail to the islands', place: 'sea', lines: ['The helicopter brings lunch. The hoop on the top deck brings a crowd.', 'Your teammates come for a week and stay for two.'] },
  island: { verb: 'Get away to the island', place: 'sea', lines: ['No phone signal. No signal at all. Perfect.', 'You run on the sand every morning. Your legs thank you in October.'] },
  'island-resort': { verb: 'Host the team on the island', place: 'sea', lines: ['The whole roster, a week of sun, and one very serious beach volleyball final.', 'The rookies cook dinner. Nobody gets sick. Chemistry.'] },
  restaurant: { verb: 'Eat at your restaurant', place: 'city', lines: ['The chef sends out a dish named after your crossover.', 'A full house on a Monday. Your mother gets the best table.'], rep: 1 },
  'pet-dog': { verb: 'Walk the dog', place: 'field', lines: ['He finds a stick bigger than him and carries it all the way home.', 'Every neighbour knows his name. Nobody knows yours.'] },
  'club-stake': { verb: 'Watch your club back home', place: 'court', lines: ['They win at home. The fans chant your name in the second half.', 'You sit in the board meeting and ask about the youth team.'], rep: 1 },
  racehorses: { verb: 'Watch them race', place: 'field', lines: ['The one named after your crossover wins by a nose.', 'Fourth place. You buy the jockey dinner anyway.'] },
  foundation: { verb: 'Visit the foundation', place: 'city', lines: ['A new gym opens in your old neighbourhood. The ribbon is the easy part.', 'Forty coaches trained this year. The letters fill a box.'], rep: 1 },
  'media-company': { verb: 'Sit in on a show', place: 'city', lines: ['Your show tops the charts this week. You are only in it for two minutes.', 'You pitch an idea. The writers are kind about it.'], rep: 1 },
  'hometown-arena': { verb: 'Play pickup at your arena', place: 'court', lines: ['Eight thousand seats, forty people watching, the best run of the summer.', 'The high school team wins the state title in your building.'], rep: 1 },
  'hometown-film': { verb: 'Watch your film again', place: 'night', lines: ['The kid who plays you is better at defense than you were.', 'You cry at the same scene. Every time.'] },
  'nba-stake': { verb: 'Sit in an owners’ meeting', place: 'city', lines: ['They talk about the salary cap for three hours. You know more about it now than you want to.', 'You vote on the new uniforms. You lose.'], rep: 1 },
  'sneaker-buyout': { verb: 'Visit the factory', place: 'city', lines: ['A line of your shoes runs past on the belt. Thousands of them.', 'You sign the first pair of the new model. And the second. And the five-hundredth.'], rep: 1 },
  // round 36: the rafters
  'framed-jersey': { verb: 'Straighten the frame', place: 'home', lines: ['The number is smaller than you remember. So were you.', 'A visitor asks if it is a replica. You tell them about the hole in the left armpit.'] },
  'rafters-banner': { verb: 'Look up at the banner', place: 'home', lines: ['The garage light hums. Your name on the banner, your car parked under it, your shot still going up every night.', 'Your neighbour asks when the real one goes up. Not yet, you tell him. Not yet.'] },
  // round 35: friends
  'gym-key': { verb: 'Run with your friends', place: 'court', lines: ['Ten guys, one ball, nobody calls fouls. You lose the last game to a dentist.', 'Your old coach unlocks the door and stays to watch. He still yells about your footwork.'] },
  'game-night': { verb: 'Host game night', place: 'home', lines: ['You lose four hands in a row to a friend who has never seen you play. He wants to keep it that way.', 'Midnight, pizza boxes, the same argument about the best team ever. Nobody wins it.'] },
  'friends-cabin': { verb: 'Go up to the cabin', place: 'field', lines: ['Eight friends, one dock, and a game of HORSE against the boathouse that lasts until dark.', 'No signal on the lake. Somebody brings a radio and you hear your own name on the sports news.'] },
};
