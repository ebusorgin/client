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
  public DATA_NOW:any = {}
  public MESSAGE_LOG = {}
  public BALANCE:any = []
  public ORDERS:any = []
  public lastFivePredictions:any = []
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
    this.sendMessage('getOrders',{}).subscribe(data=>{
      this.ORDERS = data.orders
    })


    this.socket.on('message', (response: any) => {

      const { requestId, data, method } = response;
if (method=='streamKlineCourse'){
  console.log('INPUT',response)
}

      if (this.responses[requestId]) {
        this.responses[requestId].next(data);
        delete this.responses[requestId];
      }else{
        // streamKlineCourse
        switch (method) {
          case 'updateCourse':
            this.MESSAGE_LOG = {method,data}
            break;
          case 'streamKlineCourse':
            this.DATA_NOW[data.candle.symbol] = data.candle
            break;
          case 'streamKlineTicker':
            if (!this.DATA_NOW[data.symbol]){
              this.DATA_NOW[data.symbol] = {}
            }

            this.DATA_NOW[data.symbol].bestBid = data.bestBid
            this.DATA_NOW[data.symbol].bestAsk = data.bestAsk
            break;

          case 'lastFivePredictions':
            console.log('INPUT',response)
            this.lastFivePredictions = data
            let newData = {
              currency:[],
              trend:[]
            }
            for (let i = 0; i < data.symbols.length; i++) {

              newData.currency.push({
                pair:data.symbols[i],
                otn: data.lastFivePredictions[0][i]
              })


            }
            newData.currency.sort((a,b)=>b.otn-a.otn)
            newData.trend.push(data.lastFivePredictions[0][data.symbols.length-3])
            newData.trend.push(data.lastFivePredictions[0][data.symbols.length-2])
            newData.trend.push(data.lastFivePredictions[0][data.symbols.length-1])
            this.lastFivePredictions = newData


            break;

        }

      }
    });
  }

  public sendMessage(method: string, data: any): Observable<any> {
    const requestId = this.requestId.toString();
    const request = { method, requestId, data };

    this.socket.emit('message', request);
    // console.log('OUTPUT',request)

    this.requestId++;

    const responseSubject = new Subject<any>();
    this.responses[requestId] = responseSubject;

    return responseSubject.asObservable();
  }
}
