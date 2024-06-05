import { Route } from '@angular/router'
import HomePage from '@/pages/home/home.component'
import BuilderPage from '@/pages/builder/builder.component'
import SurveyPage from '@/pages/survey/survey.component'
import AuthPage from '@/pages/auth/auth.component'
import authGuard from './guards/auth.guard'

export const appRoutes: Route[] = [
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'builder',
    component: BuilderPage,
    canActivate: [authGuard]
  },
  {
    path: 'survey/:id',
    component: SurveyPage,
    // canActivate: [authGuard]
  },
  {
    path: 'auth',
    component: AuthPage,
  }
];
