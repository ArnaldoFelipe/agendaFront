import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Inject, Input, OnInit, Output, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormsModule } from '@angular/forms';
import { AgendamentoService } from '../../services/agendamento';
import { Agendamento } from '../../models/agendamento.model';

@Component({
  selector: 'app-modal-agendamento',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-agendamento.html',
  styleUrl: './modal-agendamento.css',
})
export class ModalAgendamento  implements OnInit{

  private agendamentoService = inject(AgendamentoService);

  @Input() dataSelecionada: Date | null = null;
  @Input() agendamento: Agendamento | null = null;
  @Output() fechar = new EventEmitter<void>();
  @Output() sucesso = new EventEmitter<string>();
  @Output() erro = new EventEmitter<string>();

  confirmandoExclusao = signal(false);

  formAgendamento = new FormGroup({
    clienteNome: new FormControl('', [Validators.required, Validators.minLength(3)]),
    telefoneWpp: new FormControl('', [Validators.required, Validators.minLength(10)]),
    servico: new FormControl('')
  });

  ngOnInit() {
    if (this.agendamento) {
      this.formAgendamento.patchValue({
        clienteNome: this.agendamento.clienteNome,
        telefoneWpp: this.agendamento.telefoneWpp,
        servico: this.agendamento.servico || ''
      });
    }
  }

  fecharModal(){
    this.formAgendamento.reset();
    this.fechar.emit();
  }

  salvar(){

    if(this.formAgendamento.valid && this.dataSelecionada){
      const dadosParaSalvar = {
        clienteNome: this.formAgendamento.value.clienteNome!,
        telefoneWpp: this.formAgendamento.value.telefoneWpp!,
        dataHora: this.dataSelecionada.toISOString(),
        servico: this.formAgendamento.value.servico || undefined
      };

      if(this.agendamento && this.agendamento.id){
        this.agendamentoService.atualizarAgendamento(this.agendamento.id, dadosParaSalvar).subscribe({
          next: (resposta: Agendamento) => {
            this.sucesso.emit(`Agendamento de ${resposta.clienteNome} atualizado com sucesso!`);
            this.fecharModal();
          },
          error: (erroDoBackend: string) => {
            console.error(erroDoBackend);
            this.erro.emit('Falha ao atualizar agendamento. O servidor pode estar fora.');
          }
        });

      } else {this.agendamentoService.criarAgendamento(dadosParaSalvar).subscribe({
        next: (resposta: Agendamento) => {
          this.sucesso.emit(`Agendamento de ${resposta.clienteNome} salvo com sucesso!`);
          this.fecharModal();
        },
        error: (erroDoBackend: string) =>{
          console.error(erroDoBackend);
          this.erro.emit('Falha ao salvar agendamento. O servidor pode estar fora.');
        }
      });
      }
    }
  }

  iniciarExclusao(){
    this.confirmandoExclusao.set(true);
  }

  confirmarExclusao(){
    if (this.agendamento && this.agendamento.id) {
      this.agendamentoService.deletarAgendamento(this.agendamento.id).subscribe({
        next: () => {
          this.sucesso.emit('Agendamento removido com sucesso!');
          this.fecharModal();
        },
        error: (erroDoBackend) => {
          console.error(erroDoBackend);
          this.erro.emit('Falha ao excluir o agendamento.');
          this.confirmandoExclusao.set(false); 
        }
      });
    }
  }
}
