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
      const meta = getBestMove();
      gameController.sendMove(meta.move);
  });
});

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
    move: getRandomSample(keysList, 1).pop(),
  }; //tslint:disable-line
  keysList.forEach((key: string) => {
    const localMeta = fieldService.move(arrowCommands[key]);
    if (meta.reward < localMeta.reward) {
      meta.reward = localMeta.reward;
      meta.move = key;
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
