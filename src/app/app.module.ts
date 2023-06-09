import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSidenavModule } from '@angular/material/sidenav';
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatListModule} from "@angular/material/list";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {LayoutModule} from "@angular/cdk/layout";
import { MainComponent } from './main/main.component';
import {SocketService} from "./websocket.service";
import { ChartComponent } from './chart/chart.component';
import { AppRoutingModule } from './app-routing.module';
import { CourseComponent } from './course/course.component';
import { NgChartsModule } from 'ng2-charts';
import { Calendar7dayComponent } from './components/calendar7day/calendar7day.component';
import {FormsModule} from "@angular/forms";
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import {DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule} from '@angular/material/core';
import {MatDatepickerModule} from "@angular/material/datepicker";
import {CustomDateAdapter} from "./custom-date-adapter";
import { MatFormFieldModule } from '@angular/material/form-field';
import { BalanceComponent } from './balance/balance.component';

registerLocaleData(localeRu);

@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    ChartComponent,
    CourseComponent,
    Calendar7dayComponent,
    BalanceComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    LayoutModule,
    AppRoutingModule,
    NgChartsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule
  ],
  providers: [
    SocketService,
    // { provide: DateAdapter, useClass: CustomDateAdapter },
    // { provide: MAT_DATE_LOCALE, useValue: 'ru' },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
