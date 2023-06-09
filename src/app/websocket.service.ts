import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';


@Injectable({
  providedIn: 'root'
})

export class SocketService {
  private socket: Socket;
  private requestId = 1;
  private responses: { [requestId: string]: Subject<any> } = {};
  public DATA:any = {}
  public BALANCE:any = []
  constructor() {
    this.socket = io('http://localhost:8080');
    this.sendMessage('getCurrency',{}).subscribe(data=>{
      for (const dataKey of data.pair) {
        this.DATA[dataKey.pair] = []
        this.sendMessage('getHistory',{pair:dataKey.pair,limit:10}).subscribe(data=>{
          this.DATA[dataKey.pair] = data.history
        })

      }
    })
    this.sendMessage('getBalanceBinance',{}).subscribe(data=>{
      this.BALANCE = data.balance
    })


    this.socket.on('message', (response: any) => {
      console.log('INPUT',response)
      const { requestId, data } = response;
      if (this.responses[requestId]) {
        this.responses[requestId].next(data);
        delete this.responses[requestId];
      }
    });
  }

  public sendMessage(method: string, data: any): Observable<any> {
    const requestId = this.requestId.toString();
    const request = { method, requestId, data };

    this.socket.emit('message', request);
    console.log('OUTPUT',request)

    this.requestId++;

    const responseSubject = new Subject<any>();
    this.responses[requestId] = responseSubject;

    return responseSubject.asObservable();
  }
}
