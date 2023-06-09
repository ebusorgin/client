import { Component } from '@angular/core';
import {SocketService} from "../websocket.service";

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html',
  styleUrls: ['./balance.component.css']
})
export class BalanceComponent {
  constructor(public socketService: SocketService) {

  }
}
