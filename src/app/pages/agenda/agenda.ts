import { Component, inject, OnInit, signal, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import { ModalAgendamento } from '../../components/modal-agendamento/modal-agendamento';
import { Agendamento, HorarioLivreDia, StatusAgendamento } from '../../models/agendamento.model';
import { AgendamentoService } from '../../services/agendamento';
import { BloqueioService } from '../../services/bloqueio';
import { Bloqueio } from '../../models/bloqueio.model';
import { AGENDA } from '../../config/agenda.config';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { mensagemDaApi } from '../../utils/erro-api';

@Component({
  selector: 'app-agenda',
  imports: [CommonModule, FullCalendarModule, ModalAgendamento],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css'
})
export class Agenda implements OnInit {
  
  @ViewChild('calendario') calendarComponent!: FullCalendarComponent;
  private agendamentoService = inject(AgendamentoService);
  private bloqueioService = inject(BloqueioService); 
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private timeoutAlerta: any;
  private eventosAgendamentos: EventInput[] = [];
  private eventosBloqueios: EventInput[] = [];

  modalAberto = signal(false);
  dataParaOModal = signal<Date | null>(null);
  
  mostrarAlerta = signal(false);
  mensagemAlerta = signal('');
  tipoAlerta = signal<'sucesso' | 'erro' >('erro');
  
  agendamentoEdicao = signal<Agendamento | null>(null); 
  bloqueioEdicao = signal<Bloqueio | null>(null); 

  isMobile = window.innerWidth < 768;
  mesAtual = String(new Date().getMonth() + 1).padStart(2, '0');
  visaoAtual = this.isMobile ? 'timeGridDay' : 'semanaDinamica';
  menuMesAberto = false;

  mesesDoAno = [
    { val: '01', nome: 'Janeiro' }, { val: '02', nome: 'Fevereiro' },
    { val: '03', nome: 'Março' }, { val: '04', nome: 'Abril' },
    { val: '05', nome: 'Maio' }, { val: '06', nome: 'Junho' },
    { val: '07', nome: 'Julho' }, { val: '08', nome: 'Agosto' },
    { val: '09', nome: 'Setembro' }, { val: '10', nome: 'Outubro' },
    { val: '11', nome: 'Novembro' }, { val: '12', nome: 'Dezembro' }
  ];

  get nomeMesAtual() {
    return this.mesesDoAno.find(m => m.val === this.mesAtual)?.nome || '';
  }

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    height: 'auto',
    slotEventOverlap: false,
    
    eventContent: (arg) => {
      const dados = arg.event.extendedProps['dadosCompletos'];
      const tipo = arg.event.extendedProps['tipo'] || 'AGENDAMENTO'; 
      
      if (!dados) return true;

     
      if (tipo === 'BLOQUEIO') {
        const textoMotivo = dados.motivo ? `⛔ ${dados.motivo}` : '⛔ BLOQUEADO';
        return {
          html: `
            <div class="w-full h-full flex items-center justify-center p-1 rounded overflow-hidden shadow-sm"
                 style="background: repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 10px, #e5e7eb 10px, #e5e7eb 20px); border: 1px solid #d1d5db; color: #4b5563;">
              <span class="font-bold text-[10px] uppercase text-center bg-white/80 px-2 py-0.5 rounded-md shadow-sm truncate max-w-full">
                ${textoMotivo}
              </span>
            </div>
          `
        };
      }

      
      const inicio = arg.event.start?.getTime() || 0;
      const fim = arg.event.end?.getTime() || 0;
      const duracaoMinutos = (fim - inicio) / (1000 * 60);
      const corFundo = arg.event.backgroundColor;
      
      const isVisaoDia = arg.view.type === 'timeGridDay';

      if (arg.view.type === 'dayGridMonth') {
        return {
          html: `
            <div style="background-color: ${corFundo} !important; color: #ffffff !important;" 
                 class="p-1.5 w-full rounded shadow-sm leading-tight border border-black/10">
              <div class="font-bold text-xs mb-0.5 truncate">
                ${arg.timeText} - ${dados.clienteNome}
              </div>
              <div class="flex justify-between items-center text-[10px] font-bold opacity-90">
                <span class="uppercase">[${dados.status}]</span>
                ${dados.servico ? `<span class="truncate max-w-[50%]">${dados.servico}</span>` : ''}
              </div>
            </div>
          `
        };
      }
      
      if (duracaoMinutos <= 30) {
        return {
          html: `
            <div class="flex items-center justify-between w-full h-full overflow-hidden px-1 leading-none gap-1">
              <div class="text-[10px] font-bold truncate flex-1">
                ${arg.timeText} - ${dados.clienteNome}
                ${isVisaoDia ? `<span class="opacity-80 font-semibold ml-1">[${dados.status}]</span>` : ''}
              </div>
              ${dados.servico ? `
                <div class="text-[8px] uppercase font-bold opacity-90 shrink-0 max-w-[35%] truncate text-right">
                  ${dados.servico}
                </div>
              ` : ''}
            </div>
          `
        };
      }
      
      return {
        html: `
          <div class="flex flex-col w-full h-full overflow-hidden p-1 leading-tight relative">
            <div class="flex justify-between items-start mb-0.5 gap-1">
              <div class="text-[10px] font-semibold opacity-90 truncate">
                ${arg.timeText}
              </div>
              ${dados.servico ? `
                <div class="text-[8px] uppercase font-bold opacity-90 shrink-0 max-w-[40%] truncate text-right">
                  ${dados.servico}
                </div>
              ` : ''}
            </div>
            
            <div class="text-[11px] font-bold truncate mt-0.5">
              ${dados.clienteNome}
            </div>
            
            ${isVisaoDia ? `
              <div class="text-[9px] uppercase font-bold opacity-90 truncate mt-auto">
                [${dados.status}]
              </div>
            ` : ''}
          </div>
        `
      };
    },
    
    views: {
      semanaDinamica: { type: 'timeGrid', duration: { days: 7 } },
      tresDias: { type: 'timeGrid', duration: { days: 3 } },
      dayGridMonth: {
        dayMaxEvents: 0,
        eventDisplay: 'block'
      }
    },

    moreLinkContent: (args) => {
      return { 
        html: `<div class="bg-rose-100 text-rose-600 rounded px-1 py-1 text-xs font-bold text-center w-full shadow-sm hover:bg-rose-200 transition-colors">+ ${args.num}</div>` 
      };
    },
    moreLinkClick: 'day',
    initialView: this.visaoAtual, 
    locale: ptBrLocale, 
    titleFormat: { year: 'numeric', month: 'long' },
    dayHeaderFormat: { weekday: 'short', day: 'numeric' },
    
    customButtons: {
      horariosLivres: {
        text: 'Horários livres',
        hint: 'Enviar horários livres',
        click: () => this.compartilharHorariosLivres()
      },
      lembretes: {
        text: 'Lembretes',
        hint: 'Lembretes de amanhã',
        click: () => this.abrirLembretes()
      }
    },

    headerToolbar: {
      left: 'title',
      center: '',
      right: 'prev,next today horariosLivres,lembretes'
    },
    
    slotMinTime: `${String(AGENDA.horaInicial).padStart(2, '0')}:00:00`,
    slotMaxTime: `${String(AGENDA.horaFimGrade).padStart(2, '0')}:00:00`,
    allDaySlot: true,
    selectable: true,
    selectAllow: (selectInfo) => {
      return selectInfo.start.getTime() > new Date().getTime();
    },
    selectLongPressDelay: 100,

    dateClick: (info) => {
      if (info.view.type === 'dayGridMonth') {
        this.mudarVisao('timeGridDay');
        this.calendarComponent.getApi().gotoDate(info.date);
        return;
      }

      this.tentarAbrirModal(info.date);
    },
    
    datesSet: this.sincronizarMes.bind(this),
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
  };

  ngOnInit() {
    this.carregarAgendamentos();
  }

  
  carregarAgendamentos() {
    forkJoin({
      agendamentos: this.agendamentoService.listarAgendamentos(),
      bloqueios: this.bloqueioService.listarBloqueios()
    }).subscribe({
      next: (resultado) => {
        
        const agendamentosOrdenados = [...resultado.agendamentos].sort((a, b) => {
          return new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
        });

        const eventosAgendamentos = agendamentosOrdenados.map((agendamento) => {
          let cor = '#3b82f6';
          if (agendamento.status === 'PENDENTE') cor = '#f59e0b';
          if (agendamento.status === 'CONFIRMADO') cor = '#22c55e';
          if (agendamento.status === 'CANCELADO') cor = '#ef4444';

          return {
            id: 'AG-' + agendamento.id, // Ajuda a não conflitar com ID de bloqueio
            title: `${agendamento.clienteNome} (${agendamento.status}) ${agendamento.servico ? ' - ' + agendamento.servico : ''}`,
            start: agendamento.dataHora,
            end: agendamento.horaFim,
            backgroundColor: cor,
            borderColor: cor,
            extendedProps: { 
              tipo: 'AGENDAMENTO', 
              dadosCompletos: agendamento 
            }
          };
        });

        
        const horaDoDia = (data: Date) => data.toTimeString().substring(0, 8);

        const eventosBloqueios: EventInput[] = resultado.bloqueios.map(bloqueio => {
          const base: EventInput = {
            id: 'BL-' + bloqueio.id,
            backgroundColor: '#e5e7eb',
            borderColor: '#d1d5db',
            extendedProps: {
              tipo: 'BLOQUEIO',
              dadosCompletos: bloqueio
            }
          };

          if (!bloqueio.recorrente) {
            return {
              ...base,
              start: bloqueio.horaInicio,
              end: bloqueio.horaFim,
              allDay: bloqueio.diaTodo
            };
          }

          // Recorrente: o FullCalendar repete sozinho nos dias da semana escolhidos.
          const inicio = new Date(bloqueio.horaInicio as string);
          const fim = new Date(bloqueio.horaFim as string);

          return {
            ...base,
            daysOfWeek: bloqueio.diasSemana ?? [],
            startRecur: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()),
            allDay: bloqueio.diaTodo,
            ...(bloqueio.diaTodo ? {} : { startTime: horaDoDia(inicio), endTime: horaDoDia(fim) })
          };
        });

        // Junta as duas listas e passa para o calendário
        this.eventosAgendamentos = eventosAgendamentos;
        this.eventosBloqueios = eventosBloqueios;
        this.atualizarEventosDaVisao(this.calendarComponent?.getApi()?.view.type ?? this.visaoAtual);

        this.cdr.detectChanges();
      },
      error: (erro) => {
        console.error('Erro ao listar agenda completa:', erro);
        this.exibirAviso(mensagemDaApi(erro, 'Falha ao carregar a agenda do servidor.'), 'erro');
      } 
    });
  }

  mudarVisao(novaVisao: string) {
    const telaCelular = window.innerWidth < 768;
    if (novaVisao === 'semanaDinamica' && this.isMobile) {
      novaVisao = 'tresDias';
    }
    
    this.visaoAtual = novaVisao;
    this.calendarComponent.getApi().changeView(novaVisao);
  }

  mudarMesCustomizado(mesSelecionado: string) {
    this.menuMesAberto = false;
    const calendarApi = this.calendarComponent.getApi();
    const anoAtualDoCalendario = calendarApi.getDate().getFullYear();
    const hoje = new Date();
    const mesAtualReal = String(hoje.getMonth() + 1).padStart(2, '0');
    const anoAtualReal = hoje.getFullYear();

    if (mesSelecionado === mesAtualReal && anoAtualDoCalendario === anoAtualReal) {
      calendarApi.gotoDate(hoje);
    } else {
      const dataAlvo = `${anoAtualDoCalendario}-${mesSelecionado}-01`;
      calendarApi.gotoDate(dataAlvo);
    }
  }

  sincronizarMes() {
    if (this.calendarComponent) {
      const api = this.calendarComponent.getApi();
      const dataCalendario = api.getDate();
      this.mesAtual = String(dataCalendario.getMonth() + 1).padStart(2, '0');
      this.atualizarEventosDaVisao(api.view.type);
    }
  }

  // Lembretes: atendimentos de amanhã, com link de WhatsApp para enviar a mensagem.
  lembretesAberto = signal(false);
  carregandoLembretes = signal(false);
  lembretes = signal<Agendamento[]>([]);

  abrirLembretes() {
    this.lembretesAberto.set(true);
    this.carregandoLembretes.set(true);

    this.agendamentoService.listarAgendamentos().subscribe({
      next: (agendamentos) => {
        this.lembretes.set(this.filtrarDeAmanha(agendamentos));
        this.carregandoLembretes.set(false);
      },
      error: (erro) => {
        this.carregandoLembretes.set(false);
        this.exibirAviso(mensagemDaApi(erro, 'Falha ao carregar os lembretes.'), 'erro');
      }
    });
  }

  fecharLembretes() {
    this.lembretesAberto.set(false);
  }

  confirmarLembrete(agendamento: Agendamento) {
    this.agendamentoService.alterarStatus(agendamento.id, StatusAgendamento.CONFIRMADO).subscribe({
      next: () => {
        this.lembretes.update(lista =>
          lista.map(l => l.id === agendamento.id ? { ...l, status: StatusAgendamento.CONFIRMADO } : l)
        );
        // Atualiza também o calendário, para a cor do agendamento mudar na hora.
        this.carregarAgendamentos();
      },
      error: (erro) => this.exibirAviso(mensagemDaApi(erro, 'Falha ao confirmar o agendamento.'), 'erro')
    });
  }

  // Link do WhatsApp com a mensagem pronta. Número só com dígitos e DDI 55.
  linkLembrete(agendamento: Agendamento): string {
    let numero = agendamento.telefoneWpp.replace(/\D/g, '');
    if (numero.length <= 11) {
      numero = '55' + numero;
    }

    const hora = new Date(agendamento.dataHora).toTimeString().substring(0, 5);
    const texto = `Oi, ${agendamento.clienteNome}! Passando para lembrar do seu horário amanhã às ${hora}. Podemos confirmar?`;

    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  private filtrarDeAmanha(agendamentos: Agendamento[]): Agendamento[] {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const diaAmanha = this.dataLocalTexto(amanha);

    return agendamentos
      .filter(a => a.status !== StatusAgendamento.CANCELADO && this.dataLocalTexto(new Date(a.dataHora)) === diaAmanha)
      .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
  }

  private dataLocalTexto(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  // Na visão de mês só aparecem os atendimentos; bloqueios ficam nas visões de semana e dia.
  private atualizarEventosDaVisao(tipoVisao: string) {
    const api = this.calendarComponent?.getApi();
    const eventos = tipoVisao === 'dayGridMonth'
      ? this.eventosAgendamentos
      : [...this.eventosAgendamentos, ...this.eventosBloqueios];

    if (api) {
      api.removeAllEventSources();
      api.addEventSource(eventos);
    } else {
      this.calendarOptions = { ...this.calendarOptions, events: eventos };
    }
  }

  handleDateSelect(selectInfo: any) {
    if (selectInfo.view.type === 'dayGridMonth') {
      this.mudarVisao('timeGridDay');
      this.calendarComponent.getApi().gotoDate(selectInfo.start);
      return;
    }

    this.tentarAbrirModal(selectInfo.start);
  }

  handleEventClick(info: any) {
    const tipo = info.event.extendedProps.tipo;
    const dados = info.event.extendedProps.dadosCompletos;

    // Protege para não quebrar o modal de cliente caso seja um bloqueio
    if (tipo === 'BLOQUEIO') {
      this.agendamentoEdicao.set(null);
      this.bloqueioEdicao.set(dados);
      this.dataParaOModal.set(info.event.start || new Date(dados.horaInicio));
      this.modalAberto.set(true);
      return;
    }

  
    this.bloqueioEdicao.set(null);
    this.agendamentoEdicao.set(dados);
    this.dataParaOModal.set(new Date(dados.dataHora));
    this.modalAberto.set(true);
  }

  exibirAviso(mensagem: string, tipo: 'sucesso' | 'erro' = 'erro') {
    if (this.timeoutAlerta) {
      clearTimeout(this.timeoutAlerta);
    }

    this.mensagemAlerta.set(mensagem);
    this.tipoAlerta.set(tipo);
    this.mostrarAlerta.set(true);
    this.cdr.detectChanges();

    this.timeoutAlerta = setTimeout(() => {
      this.mostrarAlerta.set(false);
      this.cdr.detectChanges();
    }, 3000);
  }

  async logOut(){
    await this.auth.sair();
    this.router.navigate(['/login']);
  }

  private tentarAbrirModal(inicio: Date) {
    // Impede duplo disparo se o modal já estiver abrindo
    if (this.modalAberto()) return;

    const api = this.calendarComponent?.getApi();
    const agora = new Date();

    if (inicio.getTime() <= agora.getTime()) {
      api?.unselect();
      this.exibirAviso('Não é possível Agendar/Bloquear em horários passados.', 'erro');
      return;
    }

    this.agendamentoEdicao.set(null);
    this.bloqueioEdicao.set(null);
    this.dataParaOModal.set(inicio);
    this.modalAberto.set(true);
  }

  montarTextoHorariosLivres(dias: HorarioLivreDia[]): string {
    if (!dias.length) {
      return 'Não há horários livres neste mês.';
    }

    const nomesDosDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const linhas = dias.map(dia => {
      const [, mes, diaDoMes] = dia.data.split('-');
      const diaDaSemana = nomesDosDias[new Date(dia.data + 'T12:00:00').getDay()];
      const intervalos = dia.intervalos.map(i => `${i.inicio} às ${i.fim}`).join(', ');
      return `${diaDaSemana} ${diaDoMes}/${mes}: ${intervalos}`;
    });

    return ['Horários disponíveis 📅', ...linhas].join('\n');
  }

  compartilharHorariosLivres() {
    this.agendamentoService.listarHorariosLivres().subscribe({
      next: async (dias) => {
        const texto = this.montarTextoHorariosLivres(dias);

        try {
          // No celular abre o menu de compartilhar (WhatsApp); no PC copia direto.
          const celular = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
          if (celular && navigator.share) {
            await navigator.share({ text: texto });
            return;
          }

          await navigator.clipboard.writeText(texto);
          this.exibirAviso('Horários copiados!', 'sucesso');
        } catch (erro: any) {
          // Cancelar o menu de compartilhar não é erro.
          if (erro?.name === 'AbortError') return;

          console.error(erro);
          this.exibirAviso('Não foi possível compartilhar os horários.', 'erro');
        }
      },
      error: (erro) => {
        this.exibirAviso(mensagemDaApi(erro, 'Falha ao buscar os horários livres.'), 'erro');
      }
    });
  }
}