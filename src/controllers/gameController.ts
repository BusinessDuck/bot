import { client as WebSocketClient } from 'websocket';

export class GameController {
  public gameServerUrl: string;
  public gameClient: WebSocketClient;
  public onMessage: any; // tslint:disable-line
  public onGameStart: any; // tslint:disable-line
  public onGameOver: any; // tslint:disable-line
  private connection: any; // tslint:disable-line
  private connectEstablished: boolean;

  constructor(
    onGameStart: {} = () => null,
    onGameOver: {} = () => null,
  ) {
    this.onGameStart = onGameStart;
    this.onGameOver = onGameOver;
    this.gameServerUrl = 'ws://2048.luxoft.com:8080/codenjoy-contest/ws?user=dyurov@luxoft.com';
    this.gameClient = new WebSocketClient();
    this.connectEstablished = false;
    this.onMessage = () => null;
  }

  public async connect(callbackFn: any = () => null) { // tslint:disable-line
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
        this.onGameOver();
      });

      callbackFn();
    });
  }

  public setOnMessage(callbackFn: any) { //tslint:disable-line
    this.connection.on('message', (message: any) => {//tslint:disable-line
      if (message.type === 'utf8') {
        callbackFn(message.utf8Data);
      }
    });
  }

  public sendMove(move: string) {
    if (this.connectEstablished) {
      this.connection.sendUTF(move);
    }
  }

}
