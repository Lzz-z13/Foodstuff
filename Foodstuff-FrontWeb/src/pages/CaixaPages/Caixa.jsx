import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import api from '../../services/axios';
import CommandList from '../../components/cashier/CommandList';
import CommandDetails from '../../components/cashier/CommandDetails';
import { moeda } from '../../components/cashier/format';

export default function Caixa() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    let active = true;
    Promise.all([api.getCashierCommands(), api.getCashierSummary()])
      .then(([commands, summary]) => { if (active) { setData({ commands: commands.data.data, summary: summary.data.data }); setError(''); } })
      .catch(e => { if (active) setError(e?.response?.data?.message || 'Não foi possível carregar o caixa.'); });
    return () => { active = false; };
  }, [version]);
  const commands = data?.commands ?? [];
  const selected = params.get('comanda') || (commands[0] ? String(commands[0].command_id) : null);
  const term = search.trim().replace(/^#/, '').toLocaleLowerCase('pt-BR');
  const filtered = commands.filter(c => (filter === 'ALL' || c.status === filter) && `${c.customer_name} ${c.command_id} ${String(c.command_id).padStart(3, '0')} mesa ${c.table_number}`.toLocaleLowerCase('pt-BR').includes(term));
  return <div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Controle de Comandas</h1><p className="mt-1 text-xs text-slate-500">Gerencie contas e realize o fechamento das comandas do restaurante.</p></div>
      <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />{commands.filter(c => c.status === 'OPEN').length} Ativas</span><span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-500">Recebido hoje: <strong className="text-[#ff5f38]">{data ? moeda(data.summary.received_today) : '—'}</strong></span><button type="button" aria-label="Atualizar comandas" onClick={() => setVersion(v => v + 1)} className="rounded-lg border border-slate-200 bg-white p-2"><RefreshCw size={16} /></button></div>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!data && !error ? <p role="status" className="p-12 text-center text-sm text-slate-500">Carregando comandas...</p> : data && <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.1fr)]"><CommandList commands={filtered} selectedId={selected} onSelect={id => setParams({ comanda: id })} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} /><CommandDetails key={`${selected}-${version}`} commandId={selected} /></div>}
  </div>;
}
