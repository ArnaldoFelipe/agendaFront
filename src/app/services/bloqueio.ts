import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Bloqueio, CreateBloqueioDto } from '../models/bloqueio.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BloqueioService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/bloqueios`;

  listarBloqueios(): Observable<Bloqueio[]>{
    return this.http.get<Bloqueio[]>(this.apiUrl);
  }

  criarBloqueio(bloqueio: CreateBloqueioDto): Observable<Bloqueio>{
    return this.http.post<Bloqueio>(this.apiUrl, bloqueio);
  }

  excluirBloqueio(id: string): Observable<void>{
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  atualizarBloqueio(id: string, dados: Bloqueio): Observable<Bloqueio>{
    return this.http.patch<Bloqueio>(`${this.apiUrl}/${id}`, dados);
  }
}
