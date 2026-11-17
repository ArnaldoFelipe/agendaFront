import { Component, inject, OnInit, signal, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import { ModalAgendamento } from './components/modal-agendamento/modal-agendamento';
import { Agendamento } from './models/agendamento.model';
import { AgendamentoService } from './services/agendamento';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FullCalendarModule, ModalAgendamento], 
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  
  @ViewChild('calendario') calendarComponent!: FullCalendarComponent;
  private agendamentoService = inject(AgendamentoService);
  private cdr = inject(ChangeDetectorRef);

  protected readonly title = signal('agenda-front');
  modalAberto = signal(false);
  dataParaOModal = signal<Date | null>(null);
  
  mostrarAlerta = signal(false);
  mensagemAlerta = signal('');
  tipoAlerta = signal<'sucesso' | 'erro' >('erro');
  
  agendamentoEdicao = signal<Agendamento | null>(null); 

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
      if (!dados) return true;

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
    
    headerToolbar: {
      left: 'title',
      center: '',
      right: 'prev,next today' 
    },
    
    slotMinTime: '08:00:00',
    slotMaxTime: '22:00:00',
    allDaySlot: true,
    selectable: true,
    selectAllow: (selectInfo) => selectInfo.start.getTime() > new Date().getTime(),
    selectLongPressDelay: 100,

    dateClick: (info) => {
      if(info.view.type === 'dayGridMonth'){
        this.mudarVisao('timeGridDay');
        this.calendarComponent.getApi().gotoDate(info.date);
        return;
      }

      const agora = new Date();
      if (info.date.getTime() > agora.getTime()) {
        this.agendamentoEdicao.set(null); 
        this.dataParaOModal.set(info.date);
        this.modalAberto.set(true);
      } else {
        this.exibirAviso('Não é possível Agendar/Bloquear em horários passados.');
      }
    },
    
    datesSet: this.sincronizarMes.bind(this),
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
  };

  ngOnInit() {
    this.carregarAgendamentos();
  }

  carregarAgendamentos() {
    this.agendamentoService.listarAgendamentos().subscribe({
      next: (agendamentosDoBanco) => {
        const agendamentosOrdenados = [...agendamentosDoBanco].sort((a, b) => {
          return new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
        });

        const eventosParaOCalendario = agendamentosOrdenados.map((agendamento, index, array) => {
          let cor = '#3b82f6';
          if (agendamento.status === 'PENDENTE') cor = '#f59e0b';
          if (agendamento.status === 'CONFIRMADO') cor = '#22c55e';
          if (agendamento.status === 'CANCELADO') cor = '#ef4444';

          const dataInicio = new Date(agendamento.dataHora);
          let dataFim = new Date(dataInicio.getTime() + (60 * 60 * 1000));

          const proximoAgendamento = array[index + 1];
          if (proximoAgendamento) {
            const inicioDoProximo = new Date(proximoAgendamento.dataHora);
            if (inicioDoProximo < dataFim && inicioDoProximo > dataInicio) {
              dataFim = inicioDoProximo; 
            }
          }

          return {
            id: agendamento.id.toString(),
            title: `${agendamento.clienteNome} (${agendamento.status}) ${agendamento.servico ? ' - ' + agendamento.servico : ''}`,
            start: agendamento.dataHora,
            end: dataFim.toISOString(),
            backgroundColor: cor,
            borderColor: cor,
            extendedProps: { dadosCompletos: agendamento }
          };
        });

        if (this.calendarComponent && this.calendarComponent.getApi()) {
          const api = this.calendarComponent.getApi();
          api.removeAllEventSources(); 
          api.addEventSource(eventosParaOCalendario); 
        } else {
          this.calendarOptions = {
            ...this.calendarOptions,
            events: eventosParaOCalendario
          };
        }

        this.cdr.detectChanges(); 
      },
      error: (erro) => {
        console.error('Erro ao listar agendamentos:', erro);
        this.exibirAviso('Falha ao carregar a agenda do servidor.', 'erro');
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
      const dataCalendario = this.calendarComponent.getApi().getDate();
      this.mesAtual = String(dataCalendario.getMonth() + 1).padStart(2, '0');
    }
  }

  handleDateSelect(selectInfo: any) {
    if (selectInfo.view.type === 'dayGridMonth') {
      this.mudarVisao('timeGridDay');
      this.calendarComponent.getApi().gotoDate(selectInfo.start);
      return;
    }

    const agora = new Date();
    if (selectInfo.start.getTime() > agora.getTime()) {
      this.agendamentoEdicao.set(null); 
      this.dataParaOModal.set(selectInfo.start);
      this.modalAberto.set(true);
    } else {
      this.exibirAviso('Não é possível agendar em horários que já passaram.');
    }
  }

  handleEventClick(info: any) {
    const agendamentoClicado = info.event.extendedProps.dadosCompletos;
    this.agendamentoEdicao.set(agendamentoClicado);
    this.dataParaOModal.set(new Date(agendamentoClicado.dataHora));
    this.modalAberto.set(true);
  }

  exibirAviso(mensagem: string, tipo: 'sucesso' | 'erro' = 'erro') {
    this.mensagemAlerta.set(mensagem);
    this.tipoAlerta.set(tipo); 
    this.mostrarAlerta.set(true);
    this.cdr.detectChanges(); 
    
    setTimeout(() => {
      this.mostrarAlerta.set(false);
      this.cdr.detectChanges();
    }, 3000);
  }
}