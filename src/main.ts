// import { AiController } from './controllers/aiController';
// import { MoveController } from './controllers/moveController';
import { arrowCommands } from './constants';
import { GameController } from './controllers/gameController';
import { FieldService } from './services/fieldService';

const fieldService = new FieldService('');

const gameConfig = {
  onGameStart: () => {},
  onGameOver: () => {},
};
const gameController = new GameController(gameConfig);
gameController.connect(() => {
  gameController.setOnMessage((message: string) => { //tslint:disable-line
      fieldService.updateVector(message.split('=').pop());
      const horizontal = isHorizontalFull(fieldService.fieldVector, fieldService.fieldSize);
      const vertical = isVerticalFull(fieldService.fieldVector, fieldService.fieldSize);
      const meta = getBestMove(horizontal, vertical);
      gameController.sendMove(meta.move);
  });
});

function onlyUnique(value) {
  let result = true;
  let previousItem = null;
  value.forEach(item => {
    if (item === previousItem || item === 0) {
      result = false;
    }
    previousItem = item;
  });

  return result;
}

function isHorizontalFull(vector, size) {
  return onlyUnique(vector.slice().splice(0, size));
}

function isVerticalFull(vector, size) {
  const verticalVector = [];
  vector.forEach((item, index) => {
    if (index % size === 0) {
      verticalVector.push(item);
    }
  });

  return onlyUnique(verticalVector);
}

function getRandomSample(array, count) {
  const indices = [];
  const result = new Array(count);
  for (let i = 0; i < count; i++ ) {
    let j = Math.floor(Math.random() * (array.length - i) + i);
    result[i] = array[indices[j] === undefined ? j : indices[j]];
    indices[j] = indices[i] === undefined ? i : indices[i];
  }

  return result;
}

function getBestMove() {
  let keysList: string[] = Object.keys(arrowCommands);
  let meta: any;
  meta = {
    reward: 0,
    move: "LEFT",
    pairs: 0,
  }; //tslint:disable-line

  keysList.forEach((key: string) => {
    const localMeta = fieldService.move(arrowCommands[key]);
    if (meta.reward < localMeta.reward) {
      meta.reward = localMeta.reward;
      meta.move = key;
      meta.pairs = localMeta.pairs;
    }
  });

  return meta;
}
// fieldService.printField();
// const {outputVector, reward} = fieldService.move(arrowCommands.DOWN);
// console.log(' -----------result---------- ', reward);
// fieldService.printField(outputVector);
// const AI = new AiController(fieldService.fieldVector);
// const moveController = new MoveController();
