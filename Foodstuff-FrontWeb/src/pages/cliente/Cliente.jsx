import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./cliente.css";

const publicApi = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://foodstuff-production-862333e7.up.railway.app/api/foodstuff",
  timeout: 15000,
});
const money = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const message = (error) =>
  error.response?.data?.message ||
  error.message ||
  "Verifique sua conexão e tente novamente.";

export default function Cliente() {
  const { token } = useParams();
  const [table, setTable] = useState(null),
    [products, setProducts] = useState([]),
    [categories, setCategories] = useState([]);
  const [session, setSession] = useState({}),
    [command, setCommand] = useState(null),
    [cart, setCart] = useState([]);
  const [name, setName] = useState(""),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  const sending = useRef(false);
  const key = table && `foodstuff.customer.table.${table.table_id}`;
  function save(value) {
    localStorage.setItem(key, JSON.stringify(value));
    setSession(value);
  }
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [t, p, c] = await Promise.all([
          publicApi.get(`/qr-codes/token/${encodeURIComponent(token)}`),
          publicApi.get("/public/products"),
          publicApi.get("/public/categories"),
        ]);
        const mesa = t.data.data;
        let saved = JSON.parse(
          localStorage.getItem(`foodstuff.customer.table.${mesa.table_id}`) ||
            "{}",
        );
        let cmd = null;
        if (saved.session_token) {
          try {
            cmd = (
              await publicApi.get(
                `/public/commands/${encodeURIComponent(saved.session_token)}`,
              )
            ).data.data;
            if (Number(cmd.table_id) !== Number(mesa.table_id))
              throw new Error("A comanda salva pertence a outra mesa.");
          } catch (err) {
            if (err.response?.status !== 404 || saved.pending) throw err;
            localStorage.removeItem(
              `foodstuff.customer.table.${mesa.table_id}`,
            );
            saved = {};
          }
        }
        if (active) {
          setTable(mesa);
          setProducts(p.data.data || []);
          setCategories(c.data.data || []);
          setSession(saved);
          setCommand(cmd);
        }
      } catch (err) {
        if (active) setError(message(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token, retry]);
  const canOrder = !session.pending && (!command || command.status === "OPEN");
  const filtered = products.filter(
    (p) =>
      (!category || String(p.category_id) === category) &&
      p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const total =
    cart.reduce(
      (sum, p) => sum + Math.round(Number(p.price) * 100) * p.quantity,
      0,
    ) / 100;
  function add(product) {
    const input = window.prompt(
      "Alguma observação para este item? (opcional)",
      "",
    );
    if (input === null) return;
    const observation = input.trim();
    if (observation.length > 255) {
      setNotice("A observação deve ter no máximo 255 caracteres.");
      return;
    }
    setCart((prev) => {
      const existing = prev.find(
        (x) =>
          x.product_id === product.product_id && x.observation === observation,
      );
      return existing
        ? prev.map((x) =>
            x === existing
              ? { ...x, quantity: Math.min(99, x.quantity + 1) }
              : x,
          )
        : [...prev, { ...product, observation, quantity: 1 }];
    });
  }
  async function submit() {
    if (sending.current || !canOrder || !cart.length) return;
    if (!session.session_token && (!name.trim() || name.trim().length > 100)) {
      setNotice("Informe um nome para a comanda (até 100 caracteres).");
      return;
    }
    if (!window.confirm(`Enviar o pedido de ${money(total)} para a cozinha?`))
      return;
    sending.current = true;
    setBusy(true);
    setNotice("");
    let current = session;
    try {
      const fresh = (await publicApi.get("/public/products")).data.data;
      const updated = cart.map((item) => {
        const p = fresh.find((x) => x.product_id === item.product_id);
        if (!p) throw new Error(`${item.name} não está mais disponível.`);
        return { ...item, price: p.price };
      });
      if (
        updated.some((item, i) => Number(item.price) !== Number(cart[i].price))
      ) {
        setCart(updated);
        throw new Error(
          "Os preços mudaram. Revise o total antes de confirmar novamente.",
        );
      }
      if (current.session_token) {
        const cmd = (
          await publicApi.get(
            `/public/commands/${encodeURIComponent(current.session_token)}`,
          )
        ).data.data;
        setCommand(cmd);
        if (cmd.status !== "OPEN")
          throw new Error("Esta comanda não aceita novos pedidos.");
      } else {
        current = { pending: "opening" };
        save(current);
        const opened = (
          await publicApi.post(
            `/qr-codes/token/${encodeURIComponent(token)}/commands`,
            { customer_name: name.trim() },
          )
        ).data.data;
        current = { session_token: opened.session_token, pending: null };
        save(current);
        setCommand({ ...opened, customer_name: name.trim() });
      }
      current = { ...current, pending: "order" };
      save(current);
      const response = await publicApi.post(
        `/public/commands/${encodeURIComponent(current.session_token)}/orders`,
        {
          items: cart.map(({ product_id, quantity, observation }) => ({
            product_id,
            quantity,
            observation,
          })),
        },
      );
      setCart([]);
      save({ ...current, pending: null });
      setNotice(
        `Pedido #${response.data.data.order_id} enviado para a cozinha.`,
      );
    } catch (err) {
      if (
        err.response?.status >= 400 &&
        err.response.status < 500 &&
        err.response.status !== 408
      ) {
        try {
          save({ ...current, pending: null });
        } catch {
          /* preserve pending state */
        }
      }
      setNotice(message(err));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function newCommand() {
    try {
      const cmd = (
        await publicApi.get(
          `/public/commands/${encodeURIComponent(session.session_token)}`,
        )
      ).data.data;
      if (cmd.status === "OPEN" || session.pending)
        throw new Error(
          "A comanda ainda está aberta ou tem confirmação pendente.",
        );
      localStorage.removeItem(key);
      setSession({});
      setCommand(null);
      setCart([]);
      setName("");
    } catch (err) {
      setNotice(message(err));
    }
  }
  if (loading)
    return (
      <main className="cliente">
        <p>Carregando cardápio...</p>
      </main>
    );
  if (error)
    return (
      <main className="cliente">
        <h1>Não foi possível abrir a mesa</h1>
        <p role="alert">{error}</p>
        <button onClick={() => setRetry((x) => x + 1)}>Tentar novamente</button>
      </main>
    );
  return (
    <main className="cliente">
      <header className="cliente-header">
        <div>
          <small>FOODSTUFF</small>
          <h1>Cardápio</h1>
          <p>
            Mesa {table.number}
            {command && ` · Comanda de ${command.customer_name}`}
          </p>
        </div>
      </header>
      {notice && (
        <p className="cliente-notice" role="status">
          {notice}
        </p>
      )}
      {session.pending && (
        <section className="cliente-warning">
          <strong>Envio sem confirmação</strong>
          <p>
            Confira com o garçom se a comanda ou o pedido foi recebido antes de
            continuar. Não reenvie sem conferir.
          </p>
          <button
            onClick={() => {
              if (
                window.confirm("Você já confirmou a situação com o garçom?")
              ) {
                save({ ...session, pending: null });
                setCart([]);
              }
            }}
          >
            Já confirmei com o garçom
          </button>
        </section>
      )}
      {command && command.status !== "OPEN" && (
        <section className="cliente-warning">
          <p>Esta comanda não aceita novos pedidos.</p>
          <button onClick={newCommand} disabled={!!session.pending}>
            Iniciar nova comanda
          </button>
        </section>
      )}
      <section className="cliente-tools">
        <input
          aria-label="Buscar no cardápio"
          placeholder="Buscar produtos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>
      <section className="cliente-grid">
        {filtered.map((p) => (
          <article className="cliente-card" key={p.product_id}>
            {p.image && <img src={p.image} alt="" />}
            <div>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <strong>{money(p.price)}</strong>
              <button disabled={!canOrder || busy} onClick={() => add(p)}>
                Adicionar
              </button>
            </div>
          </article>
        ))}
        {!filtered.length && <p>Nenhum produto encontrado.</p>}
      </section>
      <section className="cliente-cart">
        <h2>Seu carrinho</h2>
        {cart.length === 0 && <p>Escolha produtos no cardápio.</p>}
        {cart.map((item, i) => (
          <div
            className="cliente-item"
            key={`${item.product_id}-${item.observation}`}
          >
            <div>
              <strong>{item.name}</strong>
              {item.observation && <p>{item.observation}</p>}
              <span>{money(item.price)} cada</span>
            </div>
            <div>
              <button
                disabled={busy}
                aria-label={`Diminuir ${item.name}`}
                onClick={() =>
                  setCart((prev) =>
                    prev
                      .map((x, j) =>
                        j === i ? { ...x, quantity: x.quantity - 1 } : x,
                      )
                      .filter((x) => x.quantity > 0),
                  )
                }
              >
                −
              </button>{" "}
              {item.quantity}{" "}
              <button
                disabled={busy || item.quantity >= 99}
                aria-label={`Aumentar ${item.name}`}
                onClick={() =>
                  setCart((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, quantity: x.quantity + 1 } : x,
                    ),
                  )
                }
              >
                +
              </button>
            </div>
          </div>
        ))}
        {!!cart.length && (
          <>
            <p>
              <strong>Subtotal: {money(total)}</strong>
            </p>
            <p>
              Taxa de serviço, quando aplicável, será apresentada no fechamento.
            </p>
            {!command && (
              <label>
                Nome para a comanda
                <input
                  maxLength="100"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome ou o nome do grupo"
                />
              </label>
            )}
            <button
              className="cliente-submit"
              disabled={!canOrder || busy}
              onClick={submit}
            >
              {busy ? "Enviando..." : "Enviar pedido"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
