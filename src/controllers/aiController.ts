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

export class AiController {
  private previousMove: string;
  private previousScore: number;
  private previousLocalScore: number;
  private brain: object;
  private gameService: GameService;
  private previousMoves: number;
  private lastReward: number;

  constructor(gameServiceInstance: GameService) {
    this.gameService = gameServiceInstance;
    this.previousScore = 0;
    this.previousLocalScore = 0;
    this.previousMoves = 0;
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

  public rewardMove(currentScore: number, totalMoves: number, maxValue: number, emptyCount: number) {
    let reward: number = 0;
    let diff = Math.abs(currentScore - this.previousLocalScore);
    if (diff !== 0 && currentScore !== 0) {
      reward = ( 1 + (-1 / diff ) ); //1
    }
    reward += (1 - 1 / Math.log2(totalMoves + 2)); //2

    diff = currentScore / maxValue;
    if (currentScore !== 0 && diff !== 0 && currentScore <= maxValue) {
      reward += Math.abs(1 / (( 1 - Math.log2(diff)) || 1)); //3
    }
    if (currentScore > maxValue) {
      reward += 1;
    }
    reward += 1 - (Math.exp(1 / (emptyCount + 2)) - 1);

    this.previousLocalScore = currentScore;
    this.lastReward = reward / 4;
    this.brain.backward(this.lastReward);
  }

  public visSelf() {
    process.stdout.write(`\r\
      experience replay size:  ${this.brain.experience.length}\
      exploration epsilon: ${this.brain.epsilon}\
      age: ${this.brain.age}\
      average Q-learning loss: ${this.brain.average_loss_window.get_average()}\
      smooth-ish reward: ${this.brain.average_reward_window.get_average()}\
      previousScore: ${this.previousScore}\
      previousLocalScore: ${this.previousLocalScore}\
      lastReward: ${parseFloat(this.lastReward).toFixed(5)}\
    `);
  }

  public initBrain(fieldSize: number) {
    if (!this.brain) {
      // 16 inputs, 4 possible outputs (0,1,2,3)
      const inputsNumber = fieldSize + 2;
      this.brain = new deepqlearn.Brain(inputsNumber, 4, this.getOpt(fieldSize));
      this.brain.learning = true;
    }
  }

  private getOpt(inputSize: number) {
    const num_inputs = inputSize + 2; // 9 eyes, each sees 3 numbers (wall, green, red thing proximity)
    const num_actions = 4; // 4 possible side can turn
    const temporal_window = 1; // amount of temporal memory. 0 = agent lives in-the-moment :)
    const network_size = num_inputs * temporal_window + num_actions * temporal_window + num_inputs;

  // the value function network computes a value of taking any of the possible actions
  // given an input state. Here we specify one explicitly the hard way
  // but user could also equivalently instead use opt.hidden_layer_sizes = [20,20]
  // to just insert simple relu hidden layers.
    const layer_defs = [];
    layer_defs.push({type: 'input', out_sx: 1, out_sy: 1, out_depth: network_size});
    layer_defs.push({type: 'fc', num_neurons: 50, activation: 'relu'});
    layer_defs.push({type: 'fc', num_neurons: 50, activation: 'relu'});
    layer_defs.push({type: 'regression', num_neurons: num_actions});

    // options for the Temporal Difference learner that trains the above net
    // by backpropping the temporal difference learning rule.
    const tdtrainer_options = {learning_rate: 0.001, momentum: 0.0, batch_size: 64, l2_decay: 0.01};

    const opt = {};
    opt.temporal_window = temporal_window;
    opt.experience_size = 30000;
    opt.start_learn_threshold = 1000;
    opt.gamma = 0.7;
    opt.learning_steps_total = 20000;
    opt.learning_steps_burnin = 3000;
    opt.epsilon_min = 0.05;
    opt.epsilon_test_time = 0.05;
    opt.layer_defs = layer_defs;
    opt.tdtrainer_options = tdtrainer_options;

    return opt;
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
    const max = this.gameService.getMaxValue();
    const min = 2;
    const inputs: {}[] = this.gameService.getVector().map((value: number) => {
      if (value > 0 && value !== inputSequenceMap[inputSequence.block]) {
        return  (value - min) / (max - min);
      }
      if ( value === inputSequenceMap[inputSequence.block]) {
        return false;
      }

      return value;
    });

    // const bestMeta: any = this.bestReward();
    // const bestMetaMove = isNull(bestMeta) ? -1 : arrowCommands[bestMeta.move];
    // // console.log(bestMeta.move);
    // inputs.push(bestMetaMove / 4);
    inputs.push((arrowCommands[this.previousMove] || -1) / 4);
    inputs.push(this.previousLocalScore ? (1 + ( -1 / this.previousLocalScore)) : 0);

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
