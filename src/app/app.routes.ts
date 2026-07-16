import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { FullHistoryComponent } from './fullhistory/fullhistory.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'history', component: FullHistoryComponent },
  { path: 'home', component: HomeComponent },

  { path: '**', redirectTo: '' }
];
