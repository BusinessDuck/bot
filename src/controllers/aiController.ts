import { deepqlearn } from 'convnetjs-ts';
import {
  arrowCommands,
  inputSequence,
  inputSequenceMap,
} from '../constants';

export class AiController {
  private previousMove: number;
  private previousMoved: boolean;
  private brain: object;
  private grid: number[];

  constructor(grid: number[]) {
    this.brain = new deepqlearn.Brain(19, 4, {
      epsilon_test_time: 0.0,
      epsilon_min: 0.01,
      experience_size: 3000000,
    });
    this.grid = grid;
  }

  private getMaxVal() {
    return Math.max(...this.grid);
  }

  private getEmptyCount() {
    return this.grid.filter((item: number) => {
      return item === null;
    }).length;
  }

//   buildInputs(score, moved, timesMoved, pMove) {
//
//     var inputs = [];
//
//     var max = this.getMaxVal();
//
//     this.grid.cells.forEach(function (row, index) {
//       row.forEach(function (curVal) {
//
//         if (curVal) {
//           inputs.push(( 1 + ( -1 / curVal.value ) ));
//         } else {
//           inputs.push(0);
//         }
//       });
//     });
//
//     inputs.push(( this.previousMove > 0 ) ? this.previousMove / 4 : 0);
//     inputs.push(( score > 0 ) ? ( 1 + ( -1 / score ) ) : 0);
//     inputs.push(( moved ) ? 1 : 0);
//     inputs.push(( this.getEmptyCount() > 0 ) ? this.getEmptyCount() : 0);
//
// //	console.log('Inputs: ', inputs);
//     return inputs;
//
//   }

  getBest(grid, meta) {
    this.grid = grid;
    var inputs = this.buildInputs(meta.score, meta.moved);
    var action = this.brain.forward(inputs);

    var move = {
      move: this.moves[action]
    };

    this.previousMove = move.move;

    return move;

  }

  private setMoved(moved: boolean) {
    this.previousMoved = moved;
  }

  /**
   * Max reward calculation function for any moves
   * @param {Object} meta
   * @param {Number} meta.over
   */
  private bestReward() {
    let localReward: number = 0;
    Object.keys(arrowCommands).forEach((command: string) => {
      const currentReward: number = this.reward(command);
      if (localReward < currentReward) {
        localReward = currentReward;
      }
    });
    // this.brain.backward(reward); //todo uncomment
  }



  rewardMultiple(meta) {

    var max = this.getMaxVal();
    var scoreReward = ( 1 + (-1 / (meta.score - meta.previous ) ) );
    var maxReward = ( 1 + ( ( -1 * max ) / meta.score ) );
    var movesReward = ( ( meta.timesMoved > 0 ) ? ( 1 + (-1 / meta.timesMoved ) ) : 0);
    var emptyReward = ( ( meta.empty > 0 ) ? ( 1 + (-1 / meta.empty ) ) : 0 );

    this.brain.backward(scoreReward);
    this.brain.backward(maxReward);
    this.brain.backward(movesReward);
    this.brain.backward(emptyReward);
//	if( (Math.floor( Math.random() * (100 - 2) ) + 1) > 90 ){
    this.brain.visSelf(document.getElementById('brainInfo'));
//	}

  }
}