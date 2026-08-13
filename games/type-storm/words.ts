/**
 * Word corpus for Type Storm: everyday, lowercase English words only (no
 * proper nouns, no offensive terms), 3–9 letters. `constants.ts` filters
 * this into per-difficulty pools (easy 3–5, medium 4–7, hard 5–9) — kept as
 * a flat list here rather than pre-split so there's exactly one place to
 * add or remove a word.
 */
export const WORDS: string[] = [
  // length 3 (25)
  'act', 'ash', 'bat', 'buy', 'cow', 'dew', 'eat', 'end', 'fix', 'fog',
  'fry', 'hit', 'hop', 'mix', 'mud', 'pan', 'pig', 'rat', 'run', 'saw',
  'sew', 'sip', 'sky', 'sun', 'tie',
  // length 4 (55)
  'axle', 'bean', 'bend', 'boat', 'boot', 'calm', 'chop', 'cone', 'cord', 'cube',
  'date', 'dice', 'drag', 'dune', 'edge', 'farm', 'fork', 'gate', 'goat', 'hawk',
  'hour', 'kick', 'knot', 'lazy', 'leap', 'lime', 'lock', 'math', 'mint', 'moth',
  'noon', 'oval', 'pier', 'poem', 'quiz', 'rake', 'rise', 'roof', 'salt', 'sell',
  'sigh', 'skip', 'snow', 'song', 'star', 'swan', 'tide', 'tray', 'turn', 'walk',
  'wash', 'week', 'wipe', 'wood', 'yard',
  // length 5 (65)
  'agree', 'apple', 'baker', 'bench', 'blend', 'brave', 'brown', 'camel', 'catch', 'chase',
  'clock', 'cobra', 'cover', 'curve', 'dirty', 'drift', 'earth', 'enter', 'flame', 'frame',
  'gecko', 'goose', 'grate', 'guide', 'honey', 'image', 'kneel', 'laugh', 'lever', 'loyal',
  'march', 'metal', 'mouse', 'night', 'ocean', 'otter', 'party', 'peach', 'piano', 'plate',
  'proud', 'quiet', 'reply', 'roast', 'scarf', 'shape', 'sheet', 'shore', 'skate', 'slice',
  'smile', 'solve', 'spend', 'stage', 'stare', 'stool', 'study', 'syrup', 'tempo', 'tiger',
  'today', 'train', 'verse', 'watch', 'wheat',
  // length 6 (65)
  'advise', 'arrive', 'avenue', 'basket', 'binder', 'bottle', 'bright', 'button', 'cancel', 'carpet',
  'center', 'choose', 'clever', 'cocoon', 'cotton', 'crease', 'dancer', 'depart', 'dinner', 'donate',
  'editor', 'fabric', 'father', 'follow', 'garage', 'gentle', 'glance', 'hammer', 'honest', 'iguana',
  'jacket', 'kitten', 'lesson', 'lonely', 'meadow', 'mirror', 'museum', 'nibble', 'outlet', 'parrot',
  'pepper', 'player', 'potato', 'python', 'ramble', 'repair', 'ribbon', 'runner', 'school', 'select',
  'shrink', 'sister', 'sleigh', 'spiral', 'sprint', 'statue', 'strict', 'studio', 'tackle', 'travel',
  'turnip', 'vacuum', 'walker', 'winner', 'wrench',
  // length 7 (55)
  'address', 'anxious', 'avocado', 'bedroom', 'biology', 'brother', 'builder', 'cabinet', 'catalog', 'chapter',
  'cheetah', 'cleaner', 'college', 'concert', 'content', 'crumple', 'curtain', 'diploma', 'drawing', 'explain',
  'firefly', 'giraffe', 'grocery', 'harmony', 'highway', 'hopeful', 'journey', 'lantern', 'lecture', 'library',
  'message', 'nervous', 'octopus', 'package', 'parsley', 'pattern', 'penguin', 'plastic', 'pottery', 'printer',
  'project', 'pyramid', 'rainbow', 'respond', 'scanner', 'scooter', 'shuttle', 'spinach', 'stretch', 'swallow',
  'texture', 'thirsty', 'traffic', 'volcano', 'weekend',
  // length 8 (35)
  'antelope', 'assemble', 'bathroom', 'broccoli', 'careless', 'cheerful', 'complete', 'continue', 'contrast', 'cylinder',
  'describe', 'document', 'envelope', 'exchange', 'generous', 'graceful', 'hedgehog', 'hospital', 'language', 'lunchbox',
  'mushroom', 'notebook', 'platform', 'postcard', 'practice', 'remember', 'sandwich', 'seahorse', 'separate', 'signpost',
  'spelling', 'stubborn', 'terminal', 'triangle', 'vineyard',
  // length 9 (25)
  'blueberry', 'boulevard', 'breakfast', 'butterfly', 'centipede', 'chameleon', 'chemistry', 'chocolate', 'confident', 'construct',
  'crosswalk', 'geography', 'jellyfish', 'landscape', 'lightning', 'paragraph', 'pineapple', 'pistachio', 'raspberry', 'recommend',
  'rectangle', 'sandpaper', 'surprised', 'tangerine', 'warehouse',
];
