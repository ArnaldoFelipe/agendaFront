export interface CreateBloqueioDto {
    motivo?: string;
    diaTodo?: boolean;
    data?: string;
    horaInicio?: string;
    horaFim?: string;
    recorrente?: boolean;
    diasSemana?: number[] | null;
}

export interface Bloqueio extends CreateBloqueioDto{
    id: string;
}