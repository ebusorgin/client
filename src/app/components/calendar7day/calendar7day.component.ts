import {Component, ElementRef, OnInit} from '@angular/core';
import {DatePipe} from "@angular/common";
interface Day {
  label: string;
  date: Date;
}
@Component({
  selector: 'app-calendar7day',
  templateUrl: './calendar7day.component.html',
  styleUrls: ['./calendar7day.component.css']
})
export class Calendar7dayComponent {
  days: Day[] = [];
  selectedDate = new Date()
  selectedWeek: string | null = null;

  constructor() {
    this.initDays();
  }

  initDays(): void {
    const today = new Date();
    const weekStart = this.getWeekStart(today);

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
      const label = `${date.getDate()} ${this.getMonthName(date)} ${this.getDayName(date)}`;

      this.days.push({ label, date });
    }
  }

  getWeekStart(date: Date): Date {
    let dayOfWeek = date.getDay();
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Переводим воскресенье из 0 в 7
    const diff = date.getDate() - dayOfWeek + 1; // Понедельник теперь считается первым днем недели (1)

    return new Date(date.getFullYear(), date.getMonth(), diff);
  }


  getDayName(date: Date): string {
    const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

    return dayNames[date.getDay()];
  }

  getMonthName(date: Date): string {
    const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

    return monthNames[date.getMonth()];
  }

  isToday(date: Date): boolean {
    const today = new Date();

    return date.toDateString() === today.toDateString();
  }

  isSelected(date: Date): boolean {
    if (!this.selectedDate) {
      return false;
    }

    const selectedDate = new Date(this.selectedDate);

    return date.toDateString() === selectedDate.toDateString();
  }

  onDayClick(date: Date): void {
    this.selectedDate = date;
    console.log(`Selected date: ${this.selectedDate}`); // Вывод выбранной даты в консоль
    document.title = date.toString(); // Показать выбранную дату в title
    this.updateDays();
  }



  onWeekChange(): void {
    if (this.selectedWeek) {
      const [year, week] = this.selectedWeek.split('-W').map(Number);

      // Начинаем с первого дня года
      let date = new Date(year, 0, 1);

      // Увеличиваем на количество недель, учитывая, что первый день года может быть не понедельником
      const day = date.getDay();
      const dayInWeek = (day === 0 ? 7 : day); // Переводим воскресенье из 0 в 7, чтобы быть в Европейском формате (1 - понедельник, 7 - воскресенье)
      const offset = (week +1) * 7 - dayInWeek + 1; // Вычисляем смещение в днях до понедельника указанной недели

      // Применяем вычисленное смещение к дате
      date.setDate(date.getDate() + offset);

      let r1 = this.getWeekNumber(date)
      r1[1]--
      let r2 = this.getWeekNumber(new Date())
      let is_same = (r1.length == r2.length) && r1.every(function(element, index) {
        return element === r2[index];
      });
      if (is_same){
        this.onDayClick(new Date())
      }else{
        date.setDate(date.getDate() - 7)
        this.onDayClick(date)
      }

      this.updateDays();
    }

  }
  getWeekNumber(d ): any {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil(( ( (d - +yearStart) / 86400000) + 1)/7);
    // Return array of year and week number
    return [d.getUTCFullYear(), weekNo];
  }







  updateDays(): void {
    this.days = [];
    const weekStart = this.selectedDate ? this.getWeekStart(this.selectedDate) : this.getWeekStart(new Date());

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
      const label = `${date.getDate()} ${this.getMonthName(date)} ${this.getDayName(date)}`;

      this.days.push({ label, date });
    }
  }

}
