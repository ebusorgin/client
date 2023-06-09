import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterModule, Routes} from "@angular/router";
import {ChartComponent} from "./chart/chart.component";
import {MainComponent} from "./main/main.component";
import {CourseComponent} from "./course/course.component";
import {BalanceComponent} from "./balance/balance.component";


const routes: Routes = [

  { path: 'course', component: CourseComponent },
  { path: 'balance', component: BalanceComponent },
  { path: 'link3', component: ChartComponent },
  { path: '**', component: MainComponent },
];


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
