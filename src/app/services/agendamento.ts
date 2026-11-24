import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Agendamento, CreateAgendamentoDto, HorarioLivreDia, StatusAgendamento } from '../models/agendamento.model';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AgendamentoService {

  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/agendamentos`;

  criarAgendamento(dados: CreateAgendamentoDto): Observable<Agendamento>{
    return this.http.post<Agendamento>(this.apiUrl, dados);
  }

  listarAgendamentos(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(this.apiUrl);
  }

  atualizarAgendamento(id: string, dados:Partial<Agendamento>): Observable<Agendamento>{
    return this.http.patch<Agendamento>(`${this.apiUrl}/${id}`, dados);
  }

  deletarAgendamento(id:string): Observable<void>{
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  alterarStatus(id: string, novoStatus: StatusAgendamento): Observable<Agendamento>{
    return this.http.patch<Agendamento>(`${this.apiUrl}/${id}/status`, { status: novoStatus });
  }

  confirmarAgendamento(id: string): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.apiUrl}/${id}/confirmar`, {});
  }

  cancelarAgendamento(id: string): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.apiUrl}/${id}/cancelar`, {});
  }

  listarHorariosLivres(): Observable<HorarioLivreDia[]> {
    return this.http.get<HorarioLivreDia[]>(`${this.apiUrl}/horarios-livres`);
  }
}
