import {Component, OnInit} from '@angular/core';
import {SocketService} from "../websocket.service";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  constructor(private socketService: SocketService) { }

  async ngOnInit() {

  }


}
