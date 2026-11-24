export enum StatusAgendamento{
    PENDENTE = 'PENDENTE',
    CONFIRMADO = 'CONFIRMADO',
    CANCELADO = 'CANCELADO'
}

export interface CreateAgendamentoDto{
    clienteNome: string;
    telefoneWpp: string;
    dataHora: string;
    horaFim: string;
    servico?: string;
    status?: StatusAgendamento;
}

export interface Agendamento extends CreateAgendamentoDto{
    id: string;
}

export interface IntervaloLivre{
    inicio: string;
    fim: string;
}

export interface HorarioLivreDia{
    data: string;
    intervalos: IntervaloLivre[];
}