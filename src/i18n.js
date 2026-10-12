export const T = {
  en: {
    title: 'Potion Mixer', sub: 'A cinematic 3D Halloween mini-game',
    h1: 'Read the recipe card at the top', h2: 'Tap or drag the ingredients into the cauldron — in the right order!', h3: 'Right brew = a creature rises. Wrong = goo explosion. 60 seconds, faster and faster',
    h3k: 'Kids mode: no timer. Mix any 3 ingredients and discover 8 secret potions', play: 'Play', kids: 'Kids mode', quality: 'Quality',
    score: 'Score', time: 'Time', combo: 'Combo', best: 'Best', newBest: 'New highscore!', recipe: 'Recipe', next: 'next',
    over: 'The cauldron rests', timeUp: 'Time is up!', name: 'Your name', again: 'Play again', card: 'Save highscore card', share: 'Share', menu: 'Menu', finish: 'Finish',
    brewed: 'potions brewed', maxCombo: 'best combo', secrets: 'secret potions', found: 'Secret potion found!', discover: 'Discover the secret potions', mixed: 'In the brew',
    wrong: 'BLORP!', tooSlow: 'Too slow!', cardLine: 'Can you brew more?', cardCta: 'Play free in your browser', kidsCard: 'secret potions discovered',
    d_easy: 'Easy', d_medium: 'Medium', d_hard: 'Hard', difficulty: 'Difficulty',
    eye: 'eye', frog: 'frog', mushroom: 'mushroom', wing: 'bat wing', moonflower: 'moonflower', pumpkin: 'pumpkin', crystal: 'crystal',
    ghost: 'Ghost', bats: 'Bat swarm', king: 'Pumpkin King', frogk: 'Frog King', q_low: 'Low', q_mid: 'Medium', q_high: 'High', q_ultra: 'Ultra', autoQ: 'Quality adjusted:'
  },
  de: {
    title: 'Potion Mixer', sub: 'Ein filmisches 3D-Halloween-Minispiel',
    h1: 'Lies die Rezeptkarte oben', h2: 'Tippe oder ziehe die Zutaten in den Kessel — in der richtigen Reihenfolge!', h3: 'Richtig = ein Wesen steigt auf. Falsch = Schleim-Explosion. 60 Sekunden, immer schneller',
    h3k: 'Kindermodus: ohne Zeit. Mische 3 beliebige Zutaten und entdecke 8 geheime Tränke', play: 'Spielen', kids: 'Kindermodus', quality: 'Qualität',
    score: 'Punkte', time: 'Zeit', combo: 'Combo', best: 'Rekord', newBest: 'Neuer Rekord!', recipe: 'Rezept', next: 'als Nächstes',
    over: 'Der Kessel ruht', timeUp: 'Zeit um!', name: 'Dein Name', again: 'Nochmal', card: 'Rekord-Karte speichern', share: 'Teilen', menu: 'Menü', finish: 'Fertig',
    brewed: 'Tränke gebraut', maxCombo: 'beste Combo', secrets: 'Geheimtränke', found: 'Geheimtrank entdeckt!', discover: 'Entdecke die Geheimtränke', mixed: 'Im Kessel',
    wrong: 'BLUBB!', tooSlow: 'Zu langsam!', cardLine: 'Braust du mehr?', cardCta: 'Kostenlos im Browser spielen', kidsCard: 'Geheimtränke entdeckt',
    d_easy: 'Leicht', d_medium: 'Mittel', d_hard: 'Schwer', difficulty: 'Schwierigkeit',
    eye: 'Auge', frog: 'Frosch', mushroom: 'Pilz', wing: 'Fledermausflügel', moonflower: 'Mondblume', pumpkin: 'Kürbis', crystal: 'Kristall',
    ghost: 'Geist', bats: 'Fledermausschwarm', king: 'Kürbiskönig', frogk: 'Froschkönig', q_low: 'Niedrig', q_mid: 'Mittel', q_high: 'Hoch', q_ultra: 'Ultra', autoQ: 'Qualität angepasst:'
  }
};
export const RECIPES = [
  { id: 'shadow', en: 'Shadow Soup', de: 'Schattensuppe', ing: ['eye', 'frog', 'moonflower'], creature: 'bats', a: '#b46bff', b: '#2a0a4a' },
  { id: 'spirit', en: 'Spirit Draught', de: 'Geistertrunk', ing: ['moonflower', 'crystal', 'eye'], creature: 'ghost', a: '#9ff0ff', b: '#0a3a5a' },
  { id: 'harvest', en: 'Harvest Stew', de: 'Erntesud', ing: ['pumpkin', 'mushroom', 'crystal'], creature: 'king', a: '#ffa21a', b: '#5a1a00' },
  { id: 'swamp', en: 'Swamp Punch', de: 'Sumpfpunsch', ing: ['frog', 'mushroom', 'wing'], creature: 'frog', a: '#7aff3a', b: '#0a4a10' },
  { id: 'night', en: 'Night Flight', de: 'Nachtflug', ing: ['wing', 'eye', 'pumpkin'], creature: 'bats', a: '#ff4aa8', b: '#3a0030' },
  { id: 'moon', en: 'Moonlight Mist', de: 'Mondnebel', ing: ['crystal', 'moonflower', 'wing'], creature: 'ghost', a: '#d8c8ff', b: '#2a1a5a' },
  { id: 'royal', en: 'Royal Gourd', de: 'Königskürbis', ing: ['mushroom', 'pumpkin', 'eye'], creature: 'king', a: '#ffd23a', b: '#6a2a00' },
  { id: 'lily', en: 'Lily Pad Potion', de: 'Seerosentrank', ing: ['moonflower', 'frog', 'crystal'], creature: 'frog', a: '#3affc8', b: '#003a2a' }
];
