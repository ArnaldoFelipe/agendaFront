import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { AgendamentoService } from '../../services/agendamento';
import { Agendamento } from '../../models/agendamento.model';
import { BloqueioService } from '../../services/bloqueio';
import { Bloqueio } from '../../models/bloqueio.model';
import { mensagemDaApi } from '../../utils/erro-api';

@Component({
  selector: 'app-modal-agendamento',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-agendamento.html',
  styleUrl: './modal-agendamento.css',
})
export class ModalAgendamento implements OnInit {

  private agendamentoService = inject(AgendamentoService);
  private bloqueioService = inject(BloqueioService);

  @Input() dataSelecionada: Date | null = null;
  @Input() agendamento: Agendamento | null = null;
  @Input() bloqueio: Bloqueio | null = null;
  @Output() fechar = new EventEmitter<void>();
  @Output() sucesso = new EventEmitter<string>();
  @Output() erro = new EventEmitter<string>();

  confirmandoExclusao = signal(false);
  modo = signal<'AGENDAR' | 'BLOQUEAR'>('AGENDAR');

  formAgendamento = new FormGroup({
    clienteNome: new FormControl('', [Validators.required, Validators.minLength(3)]),
    telefoneWpp: new FormControl('', [Validators.required, Validators.minLength(10)]),
    servico: new FormControl('')
  });

  formBloqueio = new FormGroup({
    motivo: new FormControl(''),
    diaTodo: new FormControl(false),
    horaInicio: new FormControl('', [Validators.required]),
    horaFim: new FormControl('', [Validators.required])
  });

  ngOnInit() {
    this.formBloqueio.get('diaTodo')?.valueChanges.subscribe((diaTodoMarcado) => {
      this.atualizarValidadoresBloqueio(!!diaTodoMarcado);
    });

    if (this.agendamento) {
      this.modo.set('AGENDAR');
      this.formAgendamento.patchValue({
        clienteNome: this.agendamento.clienteNome,
        telefoneWpp: this.agendamento.telefoneWpp,
        servico: this.agendamento.servico || ''
      });
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
        horaFim: horaF
      });

      this.atualizarValidadoresBloqueio(!!this.bloqueio.diaTodo);
      return;
    }

    if (this.dataSelecionada) {
      const horaInic = this.dataSelecionada.toTimeString().substring(0, 5);
      const objFim = new Date(this.dataSelecionada.getTime() + 60 * 60 * 1000);
      const horaF = objFim.toTimeString().substring(0, 5);

      this.formBloqueio.patchValue({
        horaInicio: horaInic,
        horaFim: horaF
      });
    }
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
        const dadosParaSalvar = {
          clienteNome: this.formAgendamento.value.clienteNome!,
          telefoneWpp: this.formAgendamento.value.telefoneWpp!,
          dataHora: this.dataSelecionada.toISOString(),
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

        const ano = this.dataSelecionada.getFullYear();
        const mes = String(this.dataSelecionada.getMonth() + 1).padStart(2, '0');
        const dia = String(this.dataSelecionada.getDate()).padStart(2, '0');
        const dataBaseStr = `${ano}-${mes}-${dia}`;

        const dadosBloqueio: any = {
          motivo: val.motivo || undefined,
          diaTodo: val.diaTodo || false,
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