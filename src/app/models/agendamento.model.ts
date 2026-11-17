export enum StatusAgendamento{
    PENDENTE = 'PENDENTE',
    CONFIRMADO = 'CONFIRMADO',
    CANCELADO = 'CANCELADO'
}

export interface CreateAgendamentoDto{
    clienteNome: string;
    telefoneWpp: string;
    dataHora: string;
    servico?: string;
    status?: StatusAgendamento;
}

export interface Agendamento extends CreateAgendamentoDto{
    id: string;
}