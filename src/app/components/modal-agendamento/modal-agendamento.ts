import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { AgendamentoService } from '../../services/agendamento';
import { Agendamento, StatusAgendamento } from '../../models/agendamento.model';
import { BloqueioService } from '../../services/bloqueio';
import { Bloqueio } from '../../models/bloqueio.model';
import { mensagemDaApi } from '../../utils/erro-api';
import { AGENDA } from '../../config/agenda.config';

@Component({
  selector: 'app-modal-agendamento',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-agendamento.html',
  styleUrl: './modal-agendamento.css',
})
export class ModalAgendamento implements OnInit {

  readonly StatusAgendamento = StatusAgendamento;

  private agendamentoService = inject(AgendamentoService);
  private bloqueioService = inject(BloqueioService);

  @Input() dataSelecionada: Date | null = null;
  @Input() agendamento: Agendamento | null = null;
  @Input() bloqueio: Bloqueio | null = null;
  @Output() fechar = new EventEmitter<void>();
  @Output() sucesso = new EventEmitter<string>();
  @Output() erro = new EventEmitter<string>();

  statusAberto = signal(false);
  statusSelecionado: StatusAgendamento = StatusAgendamento.PENDENTE;
  confirmandoExclusao = signal(false);
  modo = signal<'AGENDAR' | 'BLOQUEAR'>('AGENDAR');

  formAgendamento = new FormGroup({
    clienteNome: new FormControl('', [Validators.required, Validators.minLength(3)]),
    telefoneWpp: new FormControl('', [Validators.required, Validators.minLength(10)]),
    horaFim: new FormControl('', [Validators.required]),
    servico: new FormControl('')
  });

  formBloqueio = new FormGroup({
    motivo: new FormControl(''),
    diaTodo: new FormControl(false),
    horaInicio: new FormControl('', [Validators.required]),
    horaFim: new FormControl('', [Validators.required]),
    recorrente: new FormControl(false),
    diasSemana: new FormControl<number[]>([])
  });

  diasDaSemana = [
    { valor: 0, letra: 'D' }, { valor: 1, letra: 'S' }, { valor: 2, letra: 'T' },
    { valor: 3, letra: 'Q' }, { valor: 4, letra: 'Q' }, { valor: 5, letra: 'S' }, { valor: 6, letra: 'S' }
  ];

  get diasSelecionados(): number[] {
    return this.formBloqueio.get('diasSemana')?.value ?? [];
  }

  // Só muda o status na tela; o servidor recebe junto com os outros dados ao clicar em Salvar.
  selecionarStatus(status: StatusAgendamento) {
    this.statusSelecionado = status;
    this.statusAberto.set(false);
  }

  toggleDia(valor: number) {
    const atuais = this.diasSelecionados;
    const novos = atuais.includes(valor) ? atuais.filter(d => d !== valor) : [...atuais, valor];
    this.formBloqueio.get('diasSemana')?.setValue(novos.sort((a, b) => a - b));
  }

  ngOnInit() {
    this.formBloqueio.get('diaTodo')?.valueChanges.subscribe((diaTodoMarcado) => {
      this.atualizarValidadoresBloqueio(!!diaTodoMarcado);
    });

    if (this.agendamento) {
      this.modo.set('AGENDAR');
      this.formAgendamento.patchValue({
        clienteNome: this.agendamento.clienteNome,
        telefoneWpp: this.agendamento.telefoneWpp,
        horaFim: this.agendamento.horaFim ? new Date(this.agendamento.horaFim).toTimeString().substring(0, 5) : '',
        servico: this.agendamento.servico || ''
      });
      this.statusSelecionado = this.agendamento.status ?? StatusAgendamento.PENDENTE;
      return;
    }

    if (this.bloqueio) {
      this.modo.set('BLOQUEAR');

      let horaInic = '08:00';
      let horaF = '09:00';

      if (!this.bloqueio.diaTodo && this.bloqueio.horaInicio && this.bloqueio.horaFim) {
        horaInic = new Date(this.bloqueio.horaInicio).toTimeString().substring(0, 5);
        horaF = new Date(this.bloqueio.horaFim).toTimeString().substring(0, 5);
      }

      this.formBloqueio.patchValue({
        motivo: this.bloqueio.motivo || '',
        diaTodo: !!this.bloqueio.diaTodo,
        horaInicio: horaInic,
        horaFim: horaF,
        recorrente: !!this.bloqueio.recorrente,
        diasSemana: this.bloqueio.diasSemana ?? []
      });

      this.atualizarValidadoresBloqueio(!!this.bloqueio.diaTodo);
      return;
    }

    if (this.dataSelecionada) {
      this.formAgendamento.patchValue({
        horaFim: this.horaFimPadrao(this.dataSelecionada)
      });

      const horaInic = this.dataSelecionada.toTimeString().substring(0, 5);
      const objFim = new Date(this.dataSelecionada.getTime() + 60 * 60 * 1000);
      const horaF = objFim.toTimeString().substring(0, 5);

      this.formBloqueio.patchValue({
        horaInicio: horaInic,
        horaFim: horaF,
        diasSemana: [this.dataSelecionada.getDay()]
      });
    }
  }

  // Término sugerido: início + duração padrão do atendimento.
  private horaFimPadrao(inicio: Date): string {
    return new Date(inicio.getTime() + AGENDA.duracaoAtendimentoMin * 60 * 1000).toTimeString().substring(0, 5);
  }

  private atualizarValidadoresBloqueio(diaTodoMarcado: boolean) {
    const horaInicControl = this.formBloqueio.get('horaInicio');
    const horaFimControl = this.formBloqueio.get('horaFim');

    if (diaTodoMarcado) {
      horaInicControl?.clearValidators();
      horaFimControl?.clearValidators();
    } else {
      horaInicControl?.setValidators([Validators.required]);
      horaFimControl?.setValidators([Validators.required]);
    }

    horaInicControl?.updateValueAndValidity();
    horaFimControl?.updateValueAndValidity();
  }

  private emitirErro(erro: any, mensagemPadrao: string) {
    console.error(erro);
    this.erro.emit(mensagemDaApi(erro, mensagemPadrao));
  }

  fecharModal() {
    this.formAgendamento.reset();
    this.formBloqueio.reset();
    this.confirmandoExclusao.set(false);
    this.modo.set('AGENDAR');
    this.fechar.emit();
  }

  salvar() {
    if (this.modo() === 'AGENDAR') {
      if (this.formAgendamento.valid && this.dataSelecionada) {
        const inicioMin = this.dataSelecionada.getHours() * 60 + this.dataSelecionada.getMinutes();
        if (inicioMin < AGENDA.horaInicial * 60 || inicioMin > AGENDA.ultimoInicio * 60) {
          this.erro.emit(`Atendimentos só podem começar entre ${AGENDA.horaInicial}:00 e ${AGENDA.ultimoInicio}:00.`);
          return;
        }

        const [horas, minutos] = this.formAgendamento.value.horaFim!.split(':').map(Number);
        const fim = new Date(this.dataSelecionada);
        fim.setHours(horas, minutos, 0, 0);

        if (fim.getTime() <= this.dataSelecionada.getTime()) {
          this.erro.emit('O horário de término deve ser depois do início.');
          return;
        }

        const dadosParaSalvar = {
          clienteNome: this.formAgendamento.value.clienteNome!,
          telefoneWpp: this.formAgendamento.value.telefoneWpp!,
          dataHora: this.dataSelecionada.toISOString(),
          horaFim: fim.toISOString(),
          status: this.statusSelecionado,
          servico: this.formAgendamento.value.servico || undefined
        };

        if (this.agendamento && this.agendamento.id) {
          this.agendamentoService.atualizarAgendamento(this.agendamento.id, dadosParaSalvar).subscribe({
            next: (resposta: Agendamento) => {
              this.sucesso.emit(`Agendamento de ${resposta.clienteNome} atualizado com sucesso!`);
              this.fecharModal();
            },
            error: (erro) => this.emitirErro(erro, 'Falha ao atualizar agendamento.')
          });
        } else {
          this.agendamentoService.criarAgendamento(dadosParaSalvar).subscribe({
            next: (resposta: Agendamento) => {
              this.sucesso.emit(`Agendamento de ${resposta.clienteNome} salvo com sucesso!`);
              this.fecharModal();
            },
            error: (erro) => this.emitirErro(erro, 'Falha ao salvar agendamento.')
          });
        }
      }
    } else if (this.modo() === 'BLOQUEAR') {
      if (this.formBloqueio.valid && this.dataSelecionada) {
        const val = this.formBloqueio.value;

        if (val.recorrente && this.diasSelecionados.length === 0) {
          this.erro.emit('Escolha ao menos um dia da semana.');
          return;
        }

        const ano = this.dataSelecionada.getFullYear();
        const mes = String(this.dataSelecionada.getMonth() + 1).padStart(2, '0');
        const dia = String(this.dataSelecionada.getDate()).padStart(2, '0');
        const dataBaseStr = `${ano}-${mes}-${dia}`;

        const dadosBloqueio: any = {
          motivo: val.motivo || undefined,
          diaTodo: val.diaTodo || false,
          recorrente: !!val.recorrente,
          diasSemana: val.recorrente ? [...this.diasSelecionados].sort((a, b) => a - b) : undefined,
        };

        if (val.diaTodo) {
          dadosBloqueio.data = dataBaseStr;
        } else {
          dadosBloqueio.horaInicio = new Date(`${dataBaseStr}T${val.horaInicio}:00`).toISOString();
          dadosBloqueio.horaFim = new Date(`${dataBaseStr}T${val.horaFim}:00`).toISOString();
        }

        if (this.bloqueio && this.bloqueio.id) {
          this.bloqueioService.atualizarBloqueio(this.bloqueio.id, dadosBloqueio).subscribe({
            next: () => {
              this.sucesso.emit('Bloqueio atualizado com sucesso!');
              this.fecharModal();
            },
            error: (erro) => this.emitirErro(erro, 'Falha ao atualizar bloqueio.')
          });
        } else {
          this.bloqueioService.criarBloqueio(dadosBloqueio).subscribe({
            next: () => {
              this.sucesso.emit('Horário bloqueado com sucesso!');
              this.fecharModal();
            },
            error: (erro) => this.emitirErro(erro, 'Falha ao bloquear horário.')
          });
        }
      }
    }
  }

  iniciarExclusao() {
    this.confirmandoExclusao.set(true);
  }

  confirmarExclusao() {
    if (this.agendamento && this.agendamento.id) {
      this.agendamentoService.deletarAgendamento(this.agendamento.id).subscribe({
        next: () => {
          this.sucesso.emit('Agendamento removido com sucesso!');
          this.fecharModal();
        },
        error: (erro) => {
          this.emitirErro(erro, 'Falha ao remover agendamento.');
          this.confirmandoExclusao.set(false);
        }
      });
      return;
    }

    if (this.bloqueio && this.bloqueio.id) {
      this.bloqueioService.excluirBloqueio(this.bloqueio.id).subscribe({
        next: () => {
          this.sucesso.emit('Bloqueio removido com sucesso!');
          this.fecharModal();
        },
        error: (erro) => {
          this.emitirErro(erro, 'Falha ao remover bloqueio.');
          this.confirmandoExclusao.set(false);
        }
      });
    }
  }
}