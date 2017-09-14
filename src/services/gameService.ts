import {arrowCommands, inputSequence, inputSequenceMap} from '../constants';

export class GameService {

  public fieldSize: number;
  public fieldVector: number[];
  protected fieldRaw: string;

  constructor(input: string) {
    this.fieldVector = [];
    this.initVector(input);
  }

  /**
   * Print current field interpretable as number matrix
   * @param {number[]} vector
   */
  public printField(vector: number[] = this.fieldVector) {
    const grid = vector.slice();
    while (grid.length > 0) {
      console.log(grid.splice(0, this.fieldSize).map(function (n: number){ // tslint:disable-line
        return n > 9 ? n : ` ${n}`;
      }).join(' '));
    }
  }

  /**
   * Re init vector
   * @param {string} input
   * @returns {any}
   */
  public updateVector(input: string) {
    if (this.fieldRaw === input) {
      return null;
    }

    return this.initVector(input);
  }

  /**
   * Move field to any side, working with left move only the other cases possible by rotation of array
   * @param {number} sideName
   * @returns {{ reward: number, outputVector: number[] }}
   */
  public move(sideName: number) {
    let result: { reward: number, outputVector: number[] };
    switch (sideName) {
      case arrowCommands.LEFT:
        return this.moveVectorItemsToLeft(this.fieldVector);
      case arrowCommands.DOWN:
        result = this.moveVectorItemsToLeft(this.rotateRightVector(this.fieldVector));

        return {
          outputVector: this.rotateLeftVector(result.outputVector),
          reward: result.reward,
        };
      case arrowCommands.RIGHT:
        result = this.moveVectorItemsToLeft(this.rotateRightVector(this.fieldVector, 2));

        return {
          outputVector: this.rotateLeftVector(result.outputVector, 2),
          reward: result.reward,
        };

      case arrowCommands.UP:
        result = this.moveVectorItemsToLeft(this.rotateLeftVector(this.fieldVector));

        return {
          outputVector: this.rotateRightVector(result.outputVector),
          reward: result.reward,
        };
      default:
        return this.moveVectorItemsToLeft(this.fieldVector);
    }
  }

  /**
   * Vector getter
   * @returns {number[]}
   */
  public getVector() {
    return this.fieldVector;
  }

  /**
   * Raw input getter
   * @returns {string}
   */
  public getRawVector() {
    return this.fieldRaw;
  }

  /**
   * Get field size
   * @returns {number}
   */
  public getVectorSize() {
    return this.fieldSize;
  }

  public getMaxValue() {
    const values: number[] = this.getVector().map(((item: number) => {
      return item + 0;
    }));

    return Math.max.apply(null, values);
  }

  public getEmptyCount() {
    return this.getVector().filter((item: number) => item === inputSequenceMap[inputSequence.empty]).length;
  }

  /**
   * Transform input string to vector with digits
   * @param {string} input
   */
  private initVector(input: string) {
    this.fieldVector.length = 0;
    this.fieldSize = Math.sqrt(input.length);
    this.fieldRaw = input;
    for (const value of input) {
      this.fieldVector.push(inputSequenceMap[value]);
    }
  }

  /**
   * Rotate 1-dimension array matrix to right side
   * @param {number[]} vector
   * @param {number} rotations
   * @returns {number[]}
   */
  private rotateRightVector(vector: number[], rotations: number = 1) {
    let iterations: number = 0;
    const result: number[] = [];
    while (iterations < rotations ) {
      iterations += 1;
      result.length = 0;
      for (let i = 0; i < this.fieldSize; i += 1) {
        for (let j = 0; j < this.fieldSize; j += 1) {
          result[i * this.fieldSize + j] = vector[(this.fieldSize - j - 1) * this.fieldSize + i];
        }
      }
      vector = result;
    }

    return result;
  }

  /**
   * Wrapper around right rotation, based on inverse input vector and rotating to the right side, hack it!
   * @param {number[]} vector
   * @param {number} rotations
   * @returns {number[]}
   */
  private rotateLeftVector(vector: number[], rotations: number = 1) {
    let result: number[] = vector;
    let iterations = 0;
    while (iterations < rotations ) {
      iterations += 1;
      result = this.rotateRightVector(result.reverse(), 1);
    }

    return result;
  }

  /**
   * Swipe left vector field realisation, magick here
   * Blocks e.g. 'x' - supported and called "gravityPoint" that mean the point is static and when
   * U move items to the any side that will be a accumulated point for some blocks (gravity)
   * @param {number[]} inputVector
   * @returns {{reward: number; outputVector: number[]}}
   */
  private moveVectorItemsToLeft(inputVector: number[]) {
    let reward: number = 0;
    let gravityRows: number[][] = [];
    let resultVector: number[] = [];
    const grid: number[] = inputVector.slice();
    while (grid.length > 0) {
      const row = grid.splice(0, this.fieldSize);
      //1. Get gravity points (blocks or end of row) e.g. [0, 2, 2, x, 2] -> [0, 2, 2], [2]
      gravityRows.length = 0;
      row.reduce(
        (result: number[], item: number, index: number) => {
          if (item === inputSequenceMap[inputSequence.block]) {
            gravityRows.push(result.slice());
            result.length = 0;
          } else {
            result.push(item);
          }
          if (index === row.length - 1) {
            gravityRows.push(result);
          }

          return result;
        },
        [],
      );
      //2. Move items [0, 2, 2] -> [2, 2] -> [4, 0, 0]
      gravityRows = gravityRows.map((gravityRow: number[]) => {
        const resultRow: number[] = gravityRow.filter((value: number) => {
          return value !== inputSequenceMap[inputSequence.empty];
        });

        //3. Merge same values and restore empty values after transformation
        for (let index = 0; index < gravityRow.length ; index += 1) {
          if (resultRow[index] && resultRow[index] === resultRow[index + 1]) {
            resultRow[index] = resultRow[index] * 2; //sum of same values equal
            reward += resultRow[index];
            resultRow.splice(index + 1, 1);
          }
          if (!resultRow[index]) {
            resultRow.push(inputSequenceMap[inputSequence.empty]);
          }
        }

        return resultRow;
      });

      //4. Restore gravity rows to origin row

      gravityRows.forEach((item: number[], index: number) => {
        resultVector = resultVector.concat(item);
        if (!item.length || gravityRows[index + 1]) {
          resultVector.push(inputSequenceMap[inputSequence.block]);
        }
      });
    }

    return {
      reward,
      outputVector: resultVector,
    };
  }

}
