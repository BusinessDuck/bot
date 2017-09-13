import { client as WebSocketClient } from 'websocket';
import {inputSequenceMap} from "../constants/index";

export class GameController {
  public gameServerUrl: string;
  public gameClient: WebSocketClient;
  public onMessage: any; // tslint:disable-line
  public onGameStart: any; // tslint:disable-line
  public onGameOver: any; // tslint:disable-line
  public gameScore: number;
  private connection: any; // tslint:disable-line
  private previousMessage: string;
  private connectEstablished: boolean;
  private moves: number;

  constructor(
    onGameStart: {} = () => null,
    onGameOver: {} = () => null,
  ) {
    this.onGameStart = onGameStart;
    this.onGameOver = onGameOver;
    this.gameServerUrl = 'ws://84.47.146.179:8080/codenjoy-contest/ws?user=dyurov@luxoft.com';
    this.gameClient = new WebSocketClient();
    this.connectEstablished = false;
    this.onMessage = () => null;
    this.previousMessage = '';
    this.gameScore = 0;
  }

  public connect(callbackFn: any = () => null) { // tslint:disable-line
    this.gameClient.connect(this.gameServerUrl);
    this.gameClient.on('connect', (connection: any) => { // tslint:disable-line
      console.log('WebSocket Client Connected'); // tslint:disable-line
      this.connectEstablished = true;
      this.connection = connection;
      connection.on('error', (error: {}) => {
        console.log("Connection Error: " + error.toString()); // tslint:disable-line
        this.connectEstablished = false;
      });

      connection.on('close', () => {
        console.log('echo-protocol Connection Closed'); // tslint:disable-line
        this.connectEstablished = false;
        this.handleGameOver();
      });

      callbackFn();
    });
  }

  public addScore(score: number) {
    this.gameScore += score;
  }

  public setOnMessage(callbackFn: any) { //tslint:disable-line
    this.connection.on('message', (message: any) => {//tslint:disable-line
      if (message.type === 'utf8') {
        message = message.utf8Data.split('=').pop();
        if (this.detectGameStart()) {
          this.handleGameStart(message.length);
        }
        if (this.detectGameEnd(message)) {
          this.previousMessage = '';
          this.handleGameOver();
          callbackFn(this.previousMessage);
        } else {
          this.previousMessage = message;
          callbackFn(this.previousMessage);
        }
      }
    });
  }

  public sendMove(move: string) {
    if (this.connectEstablished) {
      this.moves += 1;
      this.connection.sendUTF(move);
    }
  }

  private detectGameStart() {
    return this.previousMessage === '';
  }

  private handleGameOver() {
    this.onGameOver(this.gameScore);
  }

  private handleGameStart(n: number) {
    this.gameScore = 0;
    this.moves = 0;
    this.onGameStart(n);
  }

  private detectGameEnd(message: string) {
    const result: number[] = [];
    for (const value of message) {
      result.push(inputSequenceMap[value]);
    }

    return Math.max.apply(null, result) <= 4 && this.moves > 20;
  }
}
