import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

const API_URL = 'http://localhost:3000';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  if (!req.url.startsWith(API_URL)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return from(auth.getAccessToken()).pipe(
    switchMap((token) => {
      const reqFinal = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

      return next(reqFinal).pipe(
        catchError((erro) => {
          if (erro.status === 401) {
            auth.sair().then(() => router.navigate(['/login']));
          }
          return throwError(() => erro);
        })
      );
    })
  );
};
