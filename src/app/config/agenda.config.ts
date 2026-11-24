// Regras de atendimento da agenda. Mudar aqui muda o calendário e a marcação.
export const AGENDA = {
  duracaoAtendimentoMin: 100, // 1h40
  horaInicial: 6,             // primeiro atendimento pode começar a partir desta hora
  ultimoInicio: 20,           // último atendimento pode começar até esta hora
  horaFimGrade: 22,           // até onde o calendário mostra (o último atendimento termina antes)
};
