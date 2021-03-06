export const arrowCommands = {
  LEFT: 0,
  UP: 1,
  RIGHT: 2,
  DOWN: 3,
};

export const inverseCommands = {
  LEFT: arrowCommands.RIGHT,
  UP: arrowCommands.DOWN,
  RIGHT: arrowCommands.LEFT,
  DOWN: arrowCommands.UP,
};

export const inputSequence = {
  'block': 'x', // - препятствие, через которое цифра не пройдет
  '2': '2',
  '4': '4',
  '8': '8',
  'A': 'A',
  'B': 'B',
  'C': 'C',
  'D': 'D',
  'E': 'E',
  'F': 'F',
  'G': 'G',
  'H': 'H',
  'I': 'I',
  'J': 'J',
  'K': 'K',
  'L': 'L',
  'M': 'M',
  'N': 'N',
  'O': 'O',
  'P': 'P',
  'Q': 'Q',
  'R': 'R',
  'S': 'S',
  'empty': ' ',
};

export const inputSequenceMap = {
  [inputSequence['block']]: null, // - препятствие, через которое цифра не пройдет
  [inputSequence['2']]: 2,
  [inputSequence['4']]: 4,
  [inputSequence['8']]: 8,
  [inputSequence['A']]: 16,
  [inputSequence['B']]: 32,
  [inputSequence['C']]: 64,
  [inputSequence['D']]: 128,
  [inputSequence['E']]: 256,
  [inputSequence['F']]: 512,
  [inputSequence['G']]: 1024,
  [inputSequence['H']]: 2048,
  [inputSequence['I']]: 4096,
  [inputSequence['J']]: 8192,
  [inputSequence['K']]: 16384,
  [inputSequence['L']]: 32768,
  [inputSequence['M']]: 65536,
  [inputSequence['N']]: 131072,
  [inputSequence['O']]: 262144,
  [inputSequence['P']]: 524288,
  [inputSequence['Q']]: 1048576,
  [inputSequence['R']]: 2097152,
  [inputSequence['S']]: 4194304,
  [inputSequence['empty']]: 0,
};
