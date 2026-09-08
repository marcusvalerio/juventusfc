import type { ClubProfile, ViewerProfile } from '@/types/domain';

export const clubProfile: ClubProfile = {
  name: 'Juventus Futebol Clube',
  shortName: 'Juventus F.C.',
  foundedAt: '1934',
  city: 'São Paulo, SP',
  stadium: 'Estádio Rua Javari',
  colors: 'Preto e dourado',
  president: 'Aurélio Mancini',
  email: 'contato@juventusfc.com.br',
  phone: '(11) 3271-4400',
};

/** Placeholder identity. Replaced by the authenticated session in the next phase. */
export const viewer: ViewerProfile = {
  name: 'Marcus Valério',
  role: 'Administração',
  initials: 'MV',
};
