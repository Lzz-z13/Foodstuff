import { useState } from "react";
import { Bell, ChevronDown, CircleHelp, Lock } from "lucide-react";

const CARGOS = ["Administrador Geral", "Gerente", "Garçom", "Cozinha"];
const SESSOES = [
  { id: 1, dispositivo: "Chrome no MacOS", ip: "191.185.12.44", atual: true, quando: "Ativo agora" },
  { id: 2, dispositivo: "Safari no iPhone 15", ip: "191.185.12.44", quando: "Ontem às 18:34" },
  { id: 3, dispositivo: "Firefox no Windows", ip: "177.34.180.91", quando: "12 Jan, 2026 às 10:12" },
];
const INPUT = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ff5a47]";

function Campo({ label, children }) {
  return <label className="flex flex-col gap-1.5"><span className="text-[12px] font-semibold text-slate-800">{label}</span>{children}</label>;
}

function CampoSenha({ label, ...props }) {
  return <Campo label={label}><div className="relative"><Lock size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><input type="password" className={`${INPUT} pl-9`} {...props} /></div></Campo>;
}

function Toggle({ ligado, onChange, label }) {
  return <button type="button" role="switch" aria-checked={ligado} aria-label={label} onClick={onChange} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${ligado ? "bg-[#ff5a47]" : "bg-slate-300"}`}><span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${ligado ? "translate-x-5" : ""}`} /></button>;
}

export default function Conta() {
  const usuario = JSON.parse(localStorage.getItem("user") ?? "null") ?? {};
  const [dados, setDados] = useState({ nome: usuario.name ?? "", email: usuario.email ?? "", telefone: usuario.phone ?? "", cargo: CARGOS[0] });
  const [senha, setSenha] = useState({ atual: "", nova: "", confirmar: "" });
  const [notificacoes, setNotificacoes] = useState({ email: true, push: true, sms: false });

  const atualizarDados = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });
  const atualizarSenha = (campo) => (e) => setSenha({ ...senha, [campo]: e.target.value });
  const alternar = (campo) => setNotificacoes({ ...notificacoes, [campo]: !notificacoes[campo] });

  const NOTIFICACOES = [
    { id: "email", titulo: "Notificações por E-mail", descricao: "Receber relatórios diários e alertas de faturamento." },
    { id: "push", titulo: "Alertas Push (Navegador)", descricao: "Notificações instantâneas de novos pedidos e KDS." },
    { id: "sms", titulo: "Alertas SMS", descricao: "Apenas em casos urgentes ou indisponibilidade de mesa." },
  ];

  function salvar(e) {
    e.preventDefault();
    console.log("Salvar alterações", { dados, notificacoes });
  }

  function cancelar() {
    setDados({ nome: usuario.name ?? "", email: usuario.email ?? "", telefone: usuario.phone ?? "", cargo: CARGOS[0] });
    setSenha({ atual: "", nova: "", confirmar: "" });
  }

  return (
    <form onSubmit={salvar} className="min-h-screen bg-slate-50 px-4 pb-8 md:px-6">
      <header className="flex items-start justify-between gap-3 py-5">
        <div><h1 className="text-[22px] font-bold text-slate-900">Minha Conta</h1><p className="mt-0.5 text-[13px] text-slate-500">Atualize suas informações pessoais, altere sua senha e configure suas preferências.</p></div>
        <div className="flex shrink-0 items-center gap-4 text-slate-700">
          <button type="button" aria-label="Notificações"><Bell size={17} /></button><button type="button" aria-label="Ajuda"><CircleHelp size={17} /></button><span className="h-8 w-8 rounded-full bg-gray-300" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-900">Dados Pessoais</h2>
            <div className="mt-4 flex items-center gap-4"><span className="h-[68px] w-[68px] shrink-0 rounded-full bg-gray-300" /><div><button type="button" className="rounded-md bg-[#ff5a47] px-4 py-1.5 text-[12px] font-semibold text-white">Alterar Foto</button><p className="mt-1.5 text-[10px] text-slate-400">JPG ou PNG de até 2MB</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Campo label="Nome Completo"><input value={dados.nome} onChange={atualizarDados("nome")} className={INPUT} /></Campo>
              <Campo label="E-mail Corporativo"><input type="email" value={dados.email} onChange={atualizarDados("email")} className={INPUT} /></Campo>
              <Campo label="Telefone"><input type="tel" value={dados.telefone} onChange={atualizarDados("telefone")} placeholder="(11) 91234-5678" className={INPUT} /></Campo>
              <Campo label="Cargo / Função"><div className="relative"><select value={dados.cargo} onChange={atualizarDados("cargo")} className={`${INPUT} cursor-pointer appearance-none pr-9`}>{CARGOS.map((cargo) => <option key={cargo}>{cargo}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600" /></div></Campo>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-900">Segurança e Senha</h2>
            <div className="mt-4 flex flex-col gap-4">
              <CampoSenha label="Senha Atual" value={senha.atual} onChange={atualizarSenha("atual")} autoComplete="current-password" />
              <div className="grid gap-4 sm:grid-cols-2"><CampoSenha label="Nova Senha" placeholder="Min. 8 caracteres" value={senha.nova} onChange={atualizarSenha("nova")} autoComplete="new-password" /><CampoSenha label="Confirmar Nova Senha" placeholder="Digite novamente" value={senha.confirmar} onChange={atualizarSenha("confirmar")} autoComplete="new-password" /></div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-900">Preferências de Notificação</h2>
            <ul className="mt-4 divide-y divide-slate-200">{NOTIFICACOES.map((n) => <li key={n.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="text-[12px] font-semibold text-slate-800">{n.titulo}</p><p className="mt-0.5 text-[11px] text-slate-500">{n.descricao}</p></div><Toggle ligado={notificacoes[n.id]} onChange={() => alternar(n.id)} label={n.titulo} /></li>)}</ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-900">Sessões Ativas</h2>
            <ul className="mt-4 flex flex-col gap-3.5">{SESSOES.map((s) => <li key={s.id} className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-[12px] font-semibold text-slate-800">{s.dispositivo}{s.atual && <span className="rounded bg-green-100 px-1.5 py-px text-[9px] font-bold text-green-600">ATUAL</span>}</p><p className="mt-0.5 text-[10px] text-slate-400">{s.ip}{s.atual && " • Esta sessão"}</p></div><span className="shrink-0 text-[11px] text-slate-500">{s.quando}</span></li>)}</ul>
          </section>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3"><button type="button" onClick={cancelar} className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700">Cancelar</button><button type="submit" className="rounded-lg bg-[#ff5a47] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm">Salvar Alterações</button></div>
    </form>
  );
}
