import {Component, OnChanges, SimpleChanges, ViewChild} from '@angular/core';
import 'chartjs-adapter-date-fns';
import { BaseChartDirective } from 'ng2-charts';
import {Chart, ChartConfiguration, ChartEvent, ChartType, LegendElement, LegendItem} from 'chart.js';
import { enUS } from 'date-fns/locale';
import { add, parseISO } from 'date-fns';
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement, } from 'chartjs-chart-financial';
import {SocketService} from "../websocket.service";
import zoomPlugin from 'chartjs-plugin-zoom';
const chartStates:boolean[] = [true,true,false,false,false,false,false]
const defaultLegendClickHandler = Chart.defaults.plugins.legend.onClick;

export class Prediction {
  symbol: string;
  prediction: number[];
}
@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.css']
})

export class CourseComponent implements OnChanges {
  tradingArr = []
  activePair = ''
  activePeriod = 24
  selectedDate: Date = new Date();
  weekDays = ['пн','вт','ср','чт','пт','сб','вс']
  predictions: Prediction[];
  public financialChartType: ChartType = 'candlestick';

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  constructor(public socketService: SocketService) {
    Chart.register(CandlestickController, OhlcController, CandlestickElement, OhlcElement,zoomPlugin);

  }
  createOrder(currency,price,type){
    console.log(1/price*12)
    const data = {
      type,
      currency,
      count:1/price*12,
      price:this.pf(price),
      date:new Date()
    }
    this.socketService.sendMessage('createOrder',data).subscribe(data=>{
      console.log(data)
    })
    this.socketService.ORDERS.push(data)
  }

  getAverage(prediction: number[]): number {
    return prediction['prediction'].reduce((prev, curr) => prev + curr, 0) / prediction.length;
  }
  pf(n){
    return parseFloat(n).toFixed(3)
  }
  onDateChange(event: any) {
    const selectedDate = new Date((event.target as HTMLInputElement).value);
    console.log(selectedDate); // Вывод выбранной даты в формате new Date()
  }




  public financialChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        label: 'CHRT - Chart.js Corporation',
        data: [],
        yAxisID: 'y-axis-0',
        type: this.financialChartType
      },
      {
        label: 'Volume',
        data: [],
        yAxisID: 'y-axis-1',
        type: 'line',
        borderColor: 'rgba(0, 123, 255, 0.5)',
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        fill: true,
      }
    ]
  };

  public financialChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    animation: false,
    maintainAspectRatio: false,

    scales: {
      x: {
        time: {
          unit: 'day'
        },
        adapters: {
          date: {
            locale: enUS
          }
        },
        ticks: {
          source: 'auto'
        }
      },
      // 'y-axis-0': {
      //   type: 'linear',
      //   position: 'left',
      // },
      // 'y-axis-1': {
      //   type: 'linear',
      //   position: 'right',
      //   grid: {
      //     drawOnChartArea: true, // only want the grid lines for one axis to show up
      //   },
      // }
    },
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy',
          modifierKey:"alt"
        },
        zoom: {

          wheel: {
            enabled: true,
            modifierKey:'shift'
          },
          // pinch: {
          //   enabled: true,
          // },
          // drag:{
          //   enabled:true,
          //   threshold:99
          // },

          mode: 'x',
        },
      },
      legend: {
        display: true,
        onClick: (event, legendItem, legend) => {
          const datasetIndex = legendItem.datasetIndex;

          // Получаем текущее состояние hidden
          const isHidden = this.financialChartData.datasets[datasetIndex].hidden;
          chartStates[datasetIndex] = !chartStates[datasetIndex]
          // Инвертируем состояние hidden
          this.financialChartData.datasets[datasetIndex].hidden = !isHidden;

          // Обновляем график
          this.chart?.update();
        }
      },
      tooltip: {
        enabled: true,
        mode: 'nearest',
        intersect: false,
        callbacks: {label: function(context) {
            const label = context.dataset.label || '';
            let tooltipItems = [label];

            if (context.datasetIndex === 0 && context.raw) {
              const o = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((context.raw as any).o);
              const h = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((context.raw as any).h);
              const l = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((context.raw as any).l);
              const c = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((context.raw as any).c);

              tooltipItems.push(`Открытие: ${o}`);
              tooltipItems.push(`Максимум: ${h}`);
              tooltipItems.push(`Минимум: ${l}`);
              tooltipItems.push(`Закрытие: ${c}`);
            } else if (context.datasetIndex === 1 && context.parsed) {
              const volume = new Intl.NumberFormat('en-US').format(context.parsed.y);
              tooltipItems.push(`Volume: ${volume}`);
            } else if (context.datasetIndex === 2 && context.parsed) {
              const quote_asset_volume = new Intl.NumberFormat('en-US').format(context.parsed.y);
              tooltipItems.push(`Quote Asset Volume: ${quote_asset_volume}`);
            } else if (context.datasetIndex === 3 && context.parsed) {
              const rsi = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(context.parsed.y);
              tooltipItems.push(`RSI: ${rsi}`);
            } else if (context.datasetIndex === 4 && context.parsed) {
              const sma = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(context.parsed.y);
              tooltipItems.push(`SMA: ${sma}`);
            } else if (context.datasetIndex === 5 && context.parsed) {
              const taker_buy_base_asset_volume = new Intl.NumberFormat('en-US').format(context.parsed.y);
              tooltipItems.push(`Taker Buy Base Asset Volume: ${taker_buy_base_asset_volume}`);
            } else if (context.datasetIndex === 6 && context.parsed) {
              const taker_buy_quote_asset_volume = new Intl.NumberFormat('en-US').format(context.parsed.y);
              tooltipItems.push(`Taker Buy Quote Asset Volume: ${taker_buy_quote_asset_volume}`);
            }

            return tooltipItems;
          }
        }
      }
    }
  };

  togglePair(pair: string,index:number): void {
    // this.chartStates[index] = !this.chartStates[index];
    this.activePair = pair;
    this.loadData();
  }

  togglePeriod(p: number): void {
    this.activePeriod = p;
    this.loadData();
  }

  calculateLimit(): number {
    return this.activePeriod;
  }

  transformData(data: any[]): any {
    return data.map(item => ({
      x: +new Date(item.time),
      o: parseFloat(item.open),
      h: parseFloat(item.high),
      l: parseFloat(item.low),
      c: parseFloat(item.close),
      v: parseFloat(item.volume),
      quote_asset_volume: parseFloat(item.quote_asset_volume),
      rsi: parseFloat(item.rsi),
      sma: parseFloat(item.sma),
      taker_buy_base_asset_volume: parseFloat(item.taker_buy_base_asset_volume),
      taker_buy_quote_asset_volume: parseFloat(item.taker_buy_quote_asset_volume),
    }));
  }

  loadData(): void {
    if (!this.activePair) {
      return;
    }

    this.socketService.sendMessage('getHistory', {
      pair: this.activePair,
      limit: this.calculateLimit()
    }).subscribe(data => {
      const transformedData = this.transformData(data.history);
      this.financialChartData = {
        datasets: [
          {
            label: `${this.activePair}`,
            data: transformedData,
            // yAxisID: 'pairs',
            type: 'candlestick',
            backgroundColor: 'rgba(5,0,148,0.5)',
            borderColor: 'rgba(89,0,0,0.5)',
            barThickness:21,
            hidden:!chartStates[0]
          },
          {
            label: 'Open',
            data: transformedData.map((item: any) => ({
              x: item.x,
              y: item.o
            })),
            // yAxisID: 'Open',
            type: 'line',
            borderColor: 'rgba(146,190,232,0.5)',
            backgroundColor: 'rgba(0, 123, 255, 0.5)',
            fill: true,
            hidden:!chartStates[1]
          },
          {
            label: 'Объем',
            data: transformedData.map((item: any) => ({
              x: item.x,
              y: item.v
            })),
            yAxisID: 'v',
            type: 'line',
            borderColor: 'rgba(0, 123, 255, 0.5)',
            backgroundColor: 'rgba(0, 123, 255, 0.5)',
            fill: true,
            hidden:!chartStates[1]
          },
          // Добавить дополнительные наборы данных
          {
            label: 'Quote Asset Volume',
            data: transformedData.map((item: any) => ({
              x: item.x,
              y: parseFloat(item.quote_asset_volume)
            })),
            // yAxisID: 'Quote Asset Volume',
            type: 'line',
            borderColor: 'rgba(255, 0, 0, 0.5)',
            backgroundColor: 'rgba(255, 0, 0, 0.5)',
            fill: false,
            hidden:!chartStates[2]
          },
          {
            label: 'RSI',
            data: transformedData.map((item: any) => ({
              x: item.x,
              y: item.rsi !== null ? parseFloat(item.rsi) : null
            })),
            // yAxisID: 'RSI',
            type: 'line',
            borderColor: 'rgba(0, 255, 0, 0.5)',
            backgroundColor: 'rgba(0, 255, 0, 0.5)',
            fill: false,
            hidden:!chartStates[3]
          },
          {
            label: 'SMA',
            data: transformedData.map((item: any) => ({
              x: item.x,
              y: item.sma !== null ? parseFloat(item.sma) : null
            })),
            // yAxisID: 'SMA',
            type: 'line',
            borderColor: 'rgba(0, 0, 255, 0.5)',
            backgroundColor: 'rgba(0, 0, 255, 0.5)',
            fill: false,

            hidden:!chartStates[4]
          },
          {
            label: 'Taker Buy Base Asset Volume',
            data: transformedData.map((item: any) => ({
              x: item.x,
              y: parseFloat(item.taker_buy_base_asset_volume)
            })),
            // yAxisID: 'Taker Buy Base Asset Volume',
            type: 'line',
            borderColor: 'rgba(255, 255, 0, 0.5)',
            backgroundColor: 'rgba(255, 255, 0, 0.5)',
            fill: false,
            hidden:!chartStates[5]
          },
          {
            label: 'Taker Buy Quote Asset Volume',
            data: transformedData.map((item: any) => ({
              x: item.x,
              y: parseFloat(item.taker_buy_quote_asset_volume)
            })),
            // yAxisID: 'Taker Buy Quote Asset Volume',
            type: 'line',
            borderColor: 'rgba(0, 255, 255, 0.5)',
            backgroundColor: 'rgba(0, 255, 255, 0.5)',
            fill: false,

            hidden:!chartStates[6]
          }
        ]
      };
    });
  }
  getObjectKeys(data:any){
    return Object.keys(data)
  }
  ngOnChanges(changes: SimpleChanges): void {
  }

  protected readonly Date = Date;
}
