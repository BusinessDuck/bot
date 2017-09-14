import { arrowCommands } from './constants';
import { AiController } from './controllers/aiController';
import { GameController } from './controllers/gameController';
import { GameService } from './services/gameService';

const fieldService = new GameService('');
const aiController = new AiController(fieldService);
const gameConfig = {
  onGameStart: (n: number) => {
    aiController.initBrain(n); //todo load from some json mb
    aiController.loadFromJSON('../../networks/brain_age_21427.json', false);
  },
  onGameOver: (totalScore) => {
    aiController.setPreviousScore(totalScore);
  },
};

const gameController = new GameController(
  gameConfig.onGameStart,
  gameConfig.onGameOver,
);

gameController.connect(() => {
  gameController.setOnMessage((message: string) => { //tslint:disable-line
      fieldService.updateVector(message.split('=').pop());
      const predictMove = aiController.predictMove();
      const localMeta = fieldService.move(arrowCommands[predictMove]);
      gameController.addScore(localMeta.reward);
      aiController.rewardMove(
        localMeta.reward,
        gameController.getTotalMoves(),
        fieldService.getMaxValue(),
        fieldService.getEmptyCount(),
      );
      gameController.sendMove(predictMove);
      aiController.visSelf();
  });
});

process.on('SIGINT', () => {
  aiController.saveToJSON();
  process.exit();
});

// function getRandomSample(array, count) {
//   const indices = [];
//   const result = new Array(count);
//   for (let i = 0; i < count; i++ ) {
//     let j = Math.floor(Math.random() * (array.length - i) + i);
//     result[i] = array[indices[j] === undefined ? j : indices[j]];
//     indices[j] = indices[i] === undefined ? i : indices[i];
//   }
//
//   return result;
// }

// function getBestMove() {
//   let keysList: string[] = Object.keys(arrowCommands);
//   let meta: any;
//   meta = {
//     reward: 0,
//     move: getRandomSample(keysList, 1).pop(),
//   }; //tslint:disable-line
//   keysList.forEach((key: string) => {
//     const localMeta = fieldService.move(arrowCommands[key]);
//     if (meta.reward < localMeta.reward) {
//       meta.reward = localMeta.reward;
//       meta.move = key;
//     }
//   });
//
//   return meta;
// }
// fieldService.printField();
// const {outputVector, reward} = fieldService.move(arrowCommands.DOWN);
// console.log(' -----------result---------- ', reward);
// fieldService.printField(outputVector);
// const AI = new AiController(fieldService.fieldVector);
// const moveController = new MoveController();
