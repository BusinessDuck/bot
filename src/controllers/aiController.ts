import { deepqlearn } from 'convnetjs-ts';
import { readFileSync, writeFileSync } from 'jsonfile';
import {isNull} from 'util';
import {
  arrowCommands,
  inputSequence,
  inputSequenceMap,
} from '../constants';
import {GameService} from '../services/gameService';
import { getKeyByValue } from '../utils';
import {version} from "punycode";

export class AiController {
  private previousMove: string;
  private previousScore: number;
  private previousLocalScore: number;
  private brain: object;
  private gameService: GameService;
  private previousMoves: number;
  private lastReward: number;
  private previousPairs: number;
  private previousEmpty: number;

  constructor(gameServiceInstance: GameService) {
    this.gameService = gameServiceInstance;
    this.previousScore = 0;
    this.previousLocalScore = 0;
    this.previousMoves = 0;
    this.previousPairs = 0;
    this.previousEmpty = 0;
  }

  public saveToJSON() {
    const obj = this.brain.value_net.toJSON();
    writeFileSync(this.getFilePath(), JSON.stringify(obj));
  }

  public loadFromJSON(path, learn = false) {
    const json = JSON.parse(readFileSync(path));
    if (!learn) {
      this.brain.epsilon_test_time = 0.0; // don't make any random choices, ever
      this.brain.learning = false;
    }
  }

  public predictMove() {
    const inputs = this.buildInputs();
    const action = this.brain.forward(inputs);
    this.previousMove = getKeyByValue(arrowCommands, action);

    return this.previousMove;
  }

  public setPreviousScore(score: number) {
    this.previousScore = score;
    this.previousLocalScore = 0;
  }

  public rewardMove(currentScore: number, totalMoves: number, maxValue: number, emptyCount: number, pairs: number) {
    let reward: number = 0;
    let diff = Math.abs(currentScore - this.previousLocalScore);
    if (currentScore || (this.previousPairs < pairs && emptyCount > this.previousEmpty)) {
      if (diff !== 0) {
        reward = ( 1 + (-1 / diff ) ); //1
      } else {
        reward = 1;
      }

      diff = currentScore / maxValue;
      if (currentScore <= maxValue) {
        reward += Math.abs(1 / (( 1 - Math.log2(diff )) || 1)); //2
      }
      if (currentScore > maxValue) {
        reward += 1;
      }
      reward += Math.log2(emptyCount + 2) / this.gameService.fieldSize;
    }
    this.previousPairs = pairs;
    this.previousEmpty = emptyCount;
    this.previousLocalScore = currentScore;
    this.lastReward = reward * totalMoves;
    this.brain.backward(this.lastReward);
  }

  public trainingStart() {
    let initVector = [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, null, null, 0, 0,
      0, 0, null, null, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
    ];

    function spotNew(vector){
      const zeroIndexes = [];
      let score = 0;
      vector.forEach((item, index) => {
        if (item === 0) {
          zeroIndexes.push(index);
        }
      });
      const random1 = Math.floor(Math.random() * (zeroIndexes.length));
      const random2 = Math.floor(Math.random() * (zeroIndexes.length));
      if (zeroIndexes.length === 1) {
        vector[zeroIndexes[random1]] = 4;
        score += 4;
      }
      if (zeroIndexes.length >= 2) {
        vector[zeroIndexes[random1]] = 2;
        vector[zeroIndexes[random2]] = 2;
        score += 4;
      }

      return { vector, score };
    }
    let totalGameScore = 0;
    let currentVector = spotNew(initVector.slice()).vector;

    const checkGameOver = (vector) => {
      let count = 0;
      if (vector.filter(item => item !== 0).length !== vector.length) {
        return false;
      }
      vector.forEach((item, index) => {
        if (item && (
            (vector[index - 1] === item &&  ((index) % this.gameService.fieldSize !== 0)) ||
            (vector[index + 1] === item && ((index + 1) % this.gameService.fieldSize !== 0)) ||
            vector[this.gameService.fieldSize + index] === item ||
            vector[index - this.gameService.fieldSize] === item
          )
        ) {
          count += 1;
        }
      });

      return count === 0;
    };
    let prevGameScore = 1;
    let avgGameScore = 0;
    let gamesCount = 1;
    let totalMoves = 0;

    while(this.brain.age < 100000) {
      totalMoves += 1;
      this.gameService.updateRawVector(currentVector);
      const predictMove = this.predictMove();
      const localMeta = this.gameService.move(arrowCommands[predictMove]);
      currentVector = localMeta.outputVector;
      const metaSpot = spotNew(currentVector);
      totalGameScore += metaSpot.score;
      this.gameService.updateRawVector(metaSpot.vector);

      this.brain.backward(prevGameScore);

      if (checkGameOver(currentVector)) {
        this.visSelf(totalGameScore);
        currentVector = spotNew(initVector.slice()).vector;
        prevGameScore = totalGameScore;
        avgGameScore += totalGameScore;
        gamesCount += 1;
        totalGameScore = 0;
        totalMoves = 0;
      }
    }
    this.saveToJSON();
  }

  public visSelf(totalGameScore) {
    process.stdout.write(`\r\
      experience replay size:  ${this.brain.experience.length}\
      exploration epsilon: ${this.brain.epsilon}\
      age: ${this.brain.age}\
      average Q-learning loss: ${this.brain.average_loss_window.get_average()}\
      smooth-ish reward: ${this.brain.average_reward_window.get_average()}\
      previousScore: ${totalGameScore}\
    `);
  }

  public initBrain(fieldSize: number) {
    if (!this.brain) {
      // 16 inputs, 4 possible outputs (0,1,2,3)
      const inputsNumber = fieldSize;
      this.brain = new deepqlearn.Brain(inputsNumber, 4, this.getOpt(inputsNumber));
      this.brain.learning = true;
    }
  }

  private getOpt(inputSize: number) {
    // create a brain with the following hyperparameters
     return {
      temporal_window: 0,           // how many previous game states to use as input to the network, we use only current
      experience_size: 30000,       // how many state transitions to store in experience replay memory
      start_learn_threshold: 1000,  // how many transitions are needed in experience replay memory before starting learning
      gamma: 0.8,                   // future reward discount rate in Q-learning
      learning_steps_burnin: 3000,  // how many steps make only random moves (keep epsilon = 1)
      learning_steps_total: 100000, // then start decreasing epsilon from 1 to epsilon_min
      epsilon_min: 0.05,            // value of exploration rate after learning_steps_total steps
      epsilon_test_time: 0.01,      // exploration rate value when learning = false (not in use)
      layer_defs: [                 // network structure
        {type: 'input', out_sx: 1, out_sy: 1, out_depth: inputSize},
        {type: 'fc', num_neurons: 50, activation: 'relu'},
        {type: 'fc', num_neurons: 50, activation: 'relu'},
        {type: 'regression', num_neurons: 4},
        // for full documentation on layers see http://cs.stanford.edu/people/karpathy/convnetjs/docs.html
      ],
      tdtrainer_options: {
        method: 'adadelta',         // options: adadelta, adagrad or sgd, for overview see http://arxiv.org/abs/1212.5701
        learning_rate: 1,        // learning rate for all layers - the biggest 10^-n value that didn't blow up loss
        momentum: 0,                // momentum for all layers - suggested default for adadelta
        batch_size: 100,            // SGD minibatch size - average game session size?
        l2_decay: 0.001,             // L2 regularization - suggested default
      },
    };
  }

  private getFilePath() {
    return `../../networks/brain_age_${this.brain.age}.json`;
  }

  private getEmptyCount() {
    return this.gameService.getVector().filter((item: number) => {
      return item === inputSequenceMap[inputSequence.empty];
    }).length;
  }

  private getBlocksCount() {
    return this.gameService.getVector().filter((item: number) => {
      return item === inputSequenceMap[inputSequence.block];
    }).length;
  }

  private buildInputs() {
    const inputs: {}[] = this.gameService.getVector().map((value: number) => {
      if ( value === inputSequenceMap[inputSequence.block]) {
        return false;
      }

      return value;
    });

    // console.log(inputs.join());
    return inputs;
  }

  /**
   * Max reward calculation function for any moves
   * @param {Object} meta
   * @param {Number} meta.over
   */
  private bestMove() {
    const keysList: string[] = Object.keys(arrowCommands);
    let meta: {};
    meta = {
      reward: 0,
      move: null,
    };
    keysList.forEach((key: string) => {
      const localMeta = this.gameService.move(arrowCommands[key]);
      if (meta.reward < localMeta.reward) {
        meta.reward = localMeta.reward;
        meta.move = key;
      }
    });

    return meta.move;
  }

}
