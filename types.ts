export enum EventType {
  CASAMENTO = 'Casamento',
  BATIZADO = 'Batizado',
  CHA_DE_BEBE = 'Chá de Bebé',
  CHA_REVELACAO = 'Chá Revelação',
  ANIVERSARIO = 'Aniversário',
  OUTRO = 'Outro',
}

export interface EventInquiry {
  name: string;
  email: string;
  phone: string;
  eventType: EventType;
  date: string;
  location: string;
  guestCount: number;
  budget?: string;
  stylePreferences: string;
  servicesNeeded: string[];
  details: string;
}

export const SERVICE_OPTIONS = [
  "Planeamento Completo",
  "Decoração & Design",
  "Coordenação do Dia",
  "Design Floral",
  "Consultoria de Imagem",
  "Gestão de Fornecedores"
];
