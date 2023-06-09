import { NativeDateAdapter } from '@angular/material/core';
import {MatDatepickerIntl} from "@angular/material/datepicker";

export class CustomDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }

}

