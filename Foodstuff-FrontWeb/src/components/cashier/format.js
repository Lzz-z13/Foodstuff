export const moeda = value => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numeroComanda = id => `#${String(id).padStart(3, '0')}`;
export const hora = date => date ? new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
export const STATUS = { OPEN: 'Ativa', CLOSED: 'Fechada', PAID: 'Paga', CANCELLED: 'Cancelada' };
export const painel = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
export const botao = 'flex items-center justify-center gap-2 rounded-xl bg-[#ff5f38] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#ef4f29] disabled:cursor-not-allowed disabled:opacity-50';
