export interface CreateBloqueioDto {
    motivo?: string;
    diaTodo?: boolean;
    data?: string;
    horaInicio?: string;
    horaFim?: string;
}

export interface Bloqueio extends CreateBloqueioDto{
    id: string;
}