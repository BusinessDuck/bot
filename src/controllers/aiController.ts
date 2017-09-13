import { deepqlearn } from 'convnetjs-ts';
import { writeFileSync, readFileSync } from 'jsonfile';
import {
  arrowCommands,
  inputSequence,
  inputSequenceMap,
} from '../constants';
import {GameService} from '../services/gameService';
import { getKeyByValue } from '../utils';

export class AiController {
  private previousMove: string;
  private previousScore: number;
  private brain: object;
  private gameService: GameService;

  constructor(gameServiceInstance: GameService) {
    this.gameService = gameServiceInstance;
    this.previousScore = 0;
  }

  public saveToJSON() {
    const obj = this.brain.value_net.toJSON();
    writeFileSync(this.getFilePath(), JSON.stringify(obj));
  }

  public loadFromJSON(path) {
    const json = JSON.parse(readFileSync(path));
    this.brain.value_net.fromJSON(json);
  }

  public predictMove() {
    const inputs = this.buildInputs();
    const action = this.brain.forward(inputs);
    this.previousMove = getKeyByValue(arrowCommands, action);

    return this.previousMove;
  }

  public rewardMove(currentScore: number) {
    const diff = currentScore - this.previousScore;
    let delta: number = 0;
    if (diff !== 0) {
      delta = ( 1 + (-1 / diff ) );
    }
    this.previousScore = currentScore;
    this.brain.backward(delta);
  }

  public visSelf() {
    process.stdout.write(`\r\
      experience replay size:  ${this.brain.experience.length}\
      exploration epsilon: ${this.brain.epsilon}\
      age: ${this.brain.age}\
      average Q-learning loss: ${this.brain.average_loss_window.get_average()}\
      smooth-ish reward: ${this.brain.average_reward_window.get_average()}\
    `);
  }

  public initBrain(fieldSize: number) {
    if (!this.brain) {
      // 16 inputs, 4 possible outputs (0,1,2,3)
      const inputsNumber = fieldSize + 5;
      this.brain = new deepqlearn.Brain(inputsNumber, 4, this.getOpt(inputsNumber));
    }
  }

  private getOpt(inputSize: number) {
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
        learning_rate: 0.01,        // learning rate for all layers - the biggest 10^-n value that didn't blow up loss
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
    const inputs: number[] = this.gameService.getVector().map((value: number) => {
      if (value > 0 && value !== inputSequenceMap[inputSequence.block]) {
        return  1 + ( -1 / value );
      }
      if ( value === inputSequenceMap[inputSequence.block]) {
        return -1;
      }

      return value;
    });

    const bestMeta: any = this.bestReward();
    inputs.push(arrowCommands[bestMeta.move] || -1);
    inputs.push(arrowCommands[this.previousMove] || 0 / 4);
    inputs.push(this.previousScore ? (1 + ( -1 / this.previousScore)) : 0);
    inputs.push(this.getBlocksCount());
    inputs.push(this.getEmptyCount());

//	console.log('Inputs: ', inputs);
    return inputs;

  }

  /**
   * Max reward calculation function for any moves
   * @param {Object} meta
   * @param {Number} meta.over
   */
  private bestReward() {
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

    return meta;
  }
}
