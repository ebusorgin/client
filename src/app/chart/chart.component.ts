import { Component, OnInit } from '@angular/core';
import {SocketService} from "../websocket.service";

interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  close_time: string;
  quote_asset_volume: number;
  number_of_trades: number;
  taker_buy_base_asset_volume: number;
  taker_buy_quote_asset_volume: number;
  sma: number;
  rsi: number;
}

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent implements OnInit {
  data: ChartData[] = [
    {
      time: '2023-04-08 07:00:00.000',
      open: 27906.34,
      high: 27919.61,
      low: 27859.02,
      close: 27880.27,
      volume: 899.14307,
      close_time: '2023-04-08 07:59:59.999',
      quote_asset_volume: 25071156.9067933,
      number_of_trades: 28369,
      taker_buy_base_asset_volume: 483.69944,
      taker_buy_quote_asset_volume: 13486091.9662547,
      sma: 27999.569,
      rsi: 61.53
    },
  ];

  maxOpen: number = 0;
  chartData: number[] = [];
  chartHeights: string[] = [];
  chartLabels: string[] = [];

  constructor(private socketService: SocketService) {

  }
  async sendMessage(method:string,data:any) {
    this.socketService.sendMessage(method, data).subscribe(response => {
      console.log('Received1: ', response);
    });
  }
  ngOnInit() {
    this.maxOpen = Math.max(...this.data.map(entry => entry.open));
    this.chartData = this.data.map(entry => entry.open);
    this.chartHeights = this.data.map(entry => this.calculateHeight(entry.open));
    this.chartLabels = this.data.map(entry => entry.time);
  }

  calculateHeight(open: number): string {
    const maxOpenHeight = 200; // Максимальная высота панели
    const scale = maxOpenHeight / this.maxOpen;
    const height = open * scale;
    return `${height}px`;
  }
}
