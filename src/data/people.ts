import type { Person } from '@/types/domain';
import { stamped } from './_util';

type Seed = Omit<Person, 'createdAt' | 'updatedAt'>;

const seeds: Seed[] = [
  { id: 'per-001', fullName: 'Aurélio Mancini', nickname: 'Seu Aurélio', birthDate: '1968-02-11', phone: '(11) 98812-4471', email: 'aurelio.mancini@juventusfc.com.br', document: '154.882.330-17', address: 'Rua Javari, 117', city: 'São Paulo', status: 'ativo', roles: ['diretoria'], notes: 'Presidente desde 2021. Responsável pelas relações institucionais.' },
  { id: 'per-002', fullName: 'Beatriz Rangel', birthDate: '1979-07-23', phone: '(11) 99640-2280', email: 'beatriz.rangel@juventusfc.com.br', document: '288.410.775-02', address: 'Av. Celso Garcia, 2210', city: 'São Paulo', status: 'ativo', roles: ['diretoria'], notes: 'Diretora financeira. Conduz o fechamento mensal do caixa.' },
  { id: 'per-003', fullName: 'Henrique Salgado', birthDate: '1974-11-04', phone: '(11) 98123-7719', email: 'henrique.salgado@juventusfc.com.br', document: '331.775.019-64', city: 'São Paulo', status: 'ativo', roles: ['diretoria'] },
  { id: 'per-004', fullName: 'Cláudia Perretti', birthDate: '1983-03-19', phone: '(11) 99215-6603', email: 'claudia.perretti@juventusfc.com.br', document: '412.009.887-30', city: 'Santo André', status: 'ativo', roles: ['diretoria', 'administrativo'] },
  { id: 'per-005', fullName: 'Ivan Bertolucci', birthDate: '1965-09-30', phone: '(11) 97744-1180', email: 'ivan.bertolucci@juventusfc.com.br', city: 'São Paulo', status: 'ativo', roles: ['diretoria'] },
  { id: 'per-006', fullName: 'Rogério Tavares', birthDate: '1971-05-12', phone: '(11) 98330-9075', email: 'rogerio.tavares@juventusfc.com.br', city: 'Guarulhos', status: 'ativo', roles: ['comissao'], notes: 'Treinador do profissional.' },
  { id: 'per-007', fullName: 'Wesley Fontenele', birthDate: '1985-01-27', phone: '(11) 99881-3320', email: 'wesley.fontenele@juventusfc.com.br', city: 'São Paulo', status: 'ativo', roles: ['comissao'] },
  { id: 'per-008', fullName: 'Danilo Aoki', birthDate: '1988-08-08', phone: '(11) 98007-4412', email: 'danilo.aoki@juventusfc.com.br', city: 'São Paulo', status: 'ativo', roles: ['comissao'] },
  { id: 'per-009', fullName: 'Marina Duarte', birthDate: '1990-12-02', phone: '(11) 99512-8890', email: 'marina.duarte@juventusfc.com.br', city: 'Osasco', status: 'ativo', roles: ['comissao'], notes: 'Preparadora física, também atende o Sub-20.' },
  { id: 'per-010', fullName: 'Paulo Sérgio Vasques', birthDate: '1977-06-15', phone: '(11) 98444-2201', city: 'São Paulo', status: 'ativo', roles: ['comissao'] },
  { id: 'per-011', fullName: 'Thiago Mancuso', nickname: 'Thiaguinho', birthDate: '1998-04-21', phone: '(11) 99120-5540', email: 'thiago.mancuso@gmail.com', document: '480.221.663-90', address: 'Rua Nazaré Paulista, 88', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-012', fullName: 'Rafael Corsini', birthDate: '1996-09-13', phone: '(11) 98722-3318', email: 'rafa.corsini@gmail.com', city: 'São Caetano do Sul', status: 'ativo', roles: ['jogador'] },
  { id: 'per-013', fullName: 'Émerson Caldeira', nickname: 'Cacá', birthDate: '1999-01-30', phone: '(11) 99904-7712', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-014', fullName: 'Nícolas Ferraz', birthDate: '2001-10-05', phone: '(11) 98115-9903', email: 'nicolas.ferraz@outlook.com', city: 'Diadema', status: 'ativo', roles: ['jogador'] },
  { id: 'per-015', fullName: 'Vinícius Abreu', nickname: 'Vini', birthDate: '2000-02-17', phone: '(11) 99333-1247', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-016', fullName: 'Kauã Belmiro', birthDate: '2004-07-09', phone: '(11) 98650-2214', city: 'Ferraz de Vasconcelos', status: 'ativo', roles: ['jogador'] },
  { id: 'per-017', fullName: 'Leonardo Bastos', birthDate: '1994-03-28', phone: '(11) 99771-8802', email: 'leo.bastos94@gmail.com', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-018', fullName: 'Gustavo Peçanha', nickname: 'Guto', birthDate: '1997-11-11', phone: '(11) 98244-6650', city: 'Mauá', status: 'ativo', roles: ['jogador'] },
  { id: 'per-019', fullName: 'André Kuroda', birthDate: '1995-05-02', phone: '(11) 99887-3341', email: 'andre.kuroda@gmail.com', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-020', fullName: 'Murilo Sampaio', birthDate: '2002-08-24', phone: '(11) 98002-1176', city: 'Guarulhos', status: 'ativo', roles: ['jogador'] },
  { id: 'per-021', fullName: 'Fernando Quirino', nickname: 'Nando', birthDate: '1993-12-19', phone: '(11) 99640-7789', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-022', fullName: 'Iago Bertoldo', birthDate: '2003-06-06', phone: '(11) 98338-4420', city: 'Itaquaquecetuba', status: 'ativo', roles: ['jogador'] },
  { id: 'per-023', fullName: 'Caio Vasconcelos', birthDate: '1999-09-01', phone: '(11) 99450-9987', email: 'caio.vasc@gmail.com', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-024', fullName: 'Bruno Sartori', birthDate: '1996-01-14', phone: '(11) 98812-0034', city: 'Santo André', status: 'ativo', roles: ['jogador'] },
  { id: 'per-025', fullName: 'Otávio Lemgruber', birthDate: '2001-04-03', phone: '(11) 99228-7714', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-026', fullName: 'Ruan Diniz', birthDate: '2005-02-26', phone: '(11) 98770-5512', city: 'Suzano', status: 'ativo', roles: ['jogador'] },
  { id: 'per-027', fullName: 'Sidnei Palhares', birthDate: '1992-10-16', phone: '(11) 99001-4432', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-028', fullName: 'Diego Marchetti', birthDate: '1998-07-19', phone: '(11) 98515-2288', email: 'diego.marchetti@gmail.com', city: 'São Bernardo do Campo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-029', fullName: 'Alan Ribeiro Pinto', birthDate: '2000-11-23', phone: '(11) 99772-0091', city: 'São Paulo', status: 'ativo', roles: ['jogador'] },
  { id: 'per-030', fullName: 'Juliano Vasquez', birthDate: '1997-03-07', phone: '(11) 98221-6674', city: 'Taboão da Serra', status: 'inativo', roles: ['jogador'], notes: 'Afastado a pedido desde julho. Mantém vínculo social.' },
  { id: 'per-031', fullName: 'Renata Colombo', birthDate: '1986-05-25', phone: '(11) 99334-8812', email: 'renata.colombo@juventusfc.com.br', document: '509.117.442-08', city: 'São Paulo', status: 'ativo', roles: ['administrativo'], notes: 'Secretaria e atendimento aos atletas.' },
  { id: 'per-032', fullName: 'Jorge Antunes', birthDate: '1963-08-13', phone: '(11) 98660-3390', city: 'São Paulo', status: 'ativo', roles: ['administrativo'], notes: 'Zelador do centro de treinamento.' },
  { id: 'per-033', fullName: 'Sônia Verdi', birthDate: '1958-04-30', phone: '(11) 99118-2245', email: 'sonia.verdi@gmail.com', city: 'São Paulo', status: 'ativo', roles: ['outro'], notes: 'Sócia-torcedora histórica, apoia os eventos do clube.' },
  { id: 'per-034', fullName: 'Marcelo Grimaldi', birthDate: '1981-09-09', phone: '(11) 98004-7781', email: 'marcelo.grimaldi@gmail.com', city: 'São Paulo', status: 'ativo', roles: ['outro'], notes: 'Contato do patrocinador Grimaldi Materiais.' },
];

export const people = stamped(seeds) as Person[];
