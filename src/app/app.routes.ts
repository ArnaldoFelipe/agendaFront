import { Routes } from '@angular/router';
import { Agenda } from './pages/agenda/agenda';
import { Login } from './pages/login/login';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    {path: '', redirectTo: 'agenda', pathMatch: 'full'},
    {path: 'login', component: Login},
    {path: 'agenda', component: Agenda, canActivate: [authGuard]}
];
