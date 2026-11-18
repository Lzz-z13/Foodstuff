import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Coffee,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from "lucide-react";
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

function ProductImage({ product, className = "" }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`cliente-photo ${className}`}>
      {product.image && !failed ? (
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cliente-photo-fallback" aria-hidden="true">
          <UtensilsCrossed strokeWidth={1.4} />
          <span>FOODSTUFF</span>
        </div>
      )}
    </div>
  );
}

function Sheet({
  open,
  onClose,
  title,
  children,
  busy = false,
  className = "",
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`cliente-sheet ${className}`}
      aria-label={title}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
    >
      <div className="cliente-sheet-inner">
        <div className="cliente-sheet-handle" aria-hidden="true" />
        <header className="cliente-sheet-header">
          <h2>{title}</h2>
          <button
            className="cliente-icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
          >
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

function ProductDetails({ product, onClose, onAdd, canOrder }) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  return (
    <Sheet
      open
      onClose={onClose}
      title="Detalhes do produto"
      className="cliente-product-sheet"
    >
      <div className="cliente-sheet-scroll">
        <ProductImage product={product} className="cliente-detail-photo" />
        <div className="cliente-detail-copy">
          <span className="cliente-eyebrow">
            {product.category_name || "No nosso cardápio"}
          </span>
          <h3>{product.name}</h3>
          <p>{product.description || "Prepare seu pedido do seu jeito."}</p>
          <strong className="cliente-detail-price">
            {money(product.price)}
          </strong>
        </div>
        <label className="cliente-field">
          <span>
            Alguma observação? <small>Opcional</small>
          </span>
          <textarea
            maxLength={255}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: sem cebola, molho à parte..."
          />
          <small className="cliente-field-hint">
            {note.length}/255 caracteres
          </small>
        </label>
        {error && (
          <p className="cliente-inline-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="cliente-sheet-footer cliente-add-footer">
        <div className="cliente-stepper">
          <button
            aria-label="Diminuir quantidade"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => q - 1)}
          >
            <Minus size={18} />
          </button>
          <span aria-live="polite">{quantity}</span>
          <button
            aria-label="Aumentar quantidade"
            disabled={quantity >= 99}
            onClick={() => setQuantity((q) => q + 1)}
          >
            <Plus size={18} />
          </button>
        </div>
        <button
          className="cliente-primary"
          disabled={!canOrder}
          onClick={() => {
            const result = onAdd(product, quantity, note);
            if (result) setError(result);
            else onClose();
          }}
        >
          <span>Adicionar</span>
          <strong>{money(Number(product.price) * quantity)}</strong>
        </button>
      </footer>
    </Sheet>
  );
}

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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [noticeSuccess, setNoticeSuccess] = useState(false);
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
  useEffect(() => {
    if (!session.session_token) return;
    let active = true;
    let pending = false;
    async function refreshCommand() {
      if (pending || sending.current || document.hidden) return;
      pending = true;
      try {
        const response = await publicApi.get(
          `/public/commands/${encodeURIComponent(session.session_token)}`,
        );
        if (active && !sending.current) setCommand(response.data.data);
      } catch {
        /* Mantém a última leitura; o servidor valida cada operação. */
      } finally {
        pending = false;
      }
    }
    const timer = setInterval(refreshCommand, 10000);
    window.addEventListener("focus", refreshCommand);
    document.addEventListener("visibilitychange", refreshCommand);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refreshCommand);
      document.removeEventListener("visibilitychange", refreshCommand);
    };
  }, [session.session_token]);
  async function closeCommand() {
    if (sending.current || !session.session_token) return;
    sending.current = true;
    setBusy(true);
    setNoticeSuccess(false);
    try {
      const response = await publicApi.post(
        `/public/commands/${encodeURIComponent(session.session_token)}/close`,
      );
      setCommand((current) => ({
        ...current,
        status: response.data.data.status,
      }));
      setCart([]);
      setCloseConfirm(false);
      setCartOpen(false);
      setNoticeSuccess(true);
      setNotice(
        response.data.data.status === "CLOSED"
          ? "Conta solicitada. Você já pode finalizar o pagamento no caixa."
          : "Comanda encerrada. Obrigado pela visita!",
      );
    } catch (err) {
      setNotice(message(err));
      setCloseConfirm(false);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
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
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  function add(product, quantity, text) {
    if (!canOrder || sending.current)
      return "Esta comanda não aceita novos pedidos.";
    const observation = text.trim();
    const existing = cart.find(
      (x) =>
        x.product_id === product.product_id && x.observation === observation,
    );
    if (quantity + (existing?.quantity || 0) > 99)
      return "Escolha até 99 unidades por item.";
    setCart((prev) =>
      existing
        ? prev.map((x) =>
            x.product_id === product.product_id && x.observation === observation
              ? { ...x, quantity: x.quantity + quantity }
              : x,
          )
        : [...prev, { ...product, observation, quantity }],
    );
    return null;
  }
  function changeQuantity(index, delta) {
    if (sending.current) return;
    setCart((prev) =>
      prev
        .map((item, i) =>
          i === index
            ? { ...item, quantity: Math.min(99, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }
  async function submit() {
    setNoticeSuccess(false);
    if (sending.current || !canOrder || !cart.length) return;
    if (!session.session_token && (!name.trim() || name.trim().length > 100)) {
      setNotice("Informe um nome para a comanda (até 100 caracteres).");
      return;
    }
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
      setNoticeSuccess(true);
      setCartOpen(false);
      setNotice(
        `Pedido #${response.data.data.order_id} enviado para a cozinha. Agora é só aguardar!`,
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
    setNoticeSuccess(false);
    try {
      const cmd = (
        await publicApi.get(
          `/public/commands/${encodeURIComponent(session.session_token)}`,
        )
      ).data.data;
      if (["OPEN", "CLOSED"].includes(cmd.status) || session.pending)
        throw new Error(
          "Finalize a comanda e o pagamento antes de iniciar outra.",
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
  const noticeBox = notice && (
    <div
      className={`cliente-notice ${noticeSuccess ? "is-success" : "is-warning"}`}
      role={noticeSuccess ? "status" : "alert"}
    >
      {noticeSuccess ? <CheckCircle2 size={21} /> : <CircleAlert size={21} />}
      <p>{notice}</p>
      <button
        className="cliente-icon-button"
        aria-label="Fechar mensagem"
        onClick={() => setNotice("")}
      >
        <X size={18} />
      </button>
    </div>
  );
  return (
    <main className="cliente">
      <header className="cliente-topbar">
        <div className="cliente-container cliente-topbar-inner">
          <a
            href="#cardapio"
            className="cliente-brand"
            aria-label="Foodstuff, início do cardápio"
          >
            <span className="cliente-brand-icon">
              <UtensilsCrossed size={22} />
            </span>
            <span>
              Foodstuff<span className="cliente-brand-dot">.</span>
            </span>
          </a>
          {table && (
            <span className="cliente-table">
              <span className="cliente-status-dot" />
              Mesa {String(table.number).padStart(2, "0")}
            </span>
          )}
        </div>
      </header>
      {loading ? (
        <div className="cliente-container cliente-loading" aria-busy="true">
          <LoaderCircle className="cliente-spin" size={30} />
          <h1>Preparando seu cardápio</h1>
          <p>Só um instante, estamos buscando as delícias da casa.</p>
          <div className="cliente-skeletons" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <div key={i} />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="cliente-container cliente-error-state">
          <span className="cliente-empty-icon">
            <CircleAlert size={32} />
          </span>
          <h1>Não conseguimos abrir esta mesa</h1>
          <p role="alert">{error}</p>
          <button
            className="cliente-primary"
            onClick={() => setRetry((x) => x + 1)}
          >
            Tentar novamente <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="cliente-container">
            <section className="cliente-hero" id="cardapio">
              <div className="cliente-hero-copy">
                <span className="cliente-eyebrow">
                  <span />
                  SENTE-SE. ESCOLHA. APROVEITE.
                </span>
                <h1>
                  Seu próximo
                  <br />
                  pedido começa aqui<span>.</span>
                </h1>
                <p>
                  Explore o cardápio e escolha seus favoritos.
                  <br className="cliente-desktop-break" /> A gente cuida do
                  resto.
                </p>
                <span className="cliente-hero-caption">
                  <UtensilsCrossed size={15} /> À mesa, do seu jeito
                </span>
              </div>
              <div className="cliente-hero-art" aria-hidden="true">
                <div className="cliente-plate">
                  <div>
                    <UtensilsCrossed strokeWidth={1.2} />
                  </div>
                </div>
                <span className="cliente-art-spark">✦</span>
                <span className="cliente-art-dot" />
              </div>
            </section>
            {!cartOpen && noticeBox}
            {session.pending && (
              <section className="cliente-warning">
                <CircleAlert size={22} />
                <div>
                  <h2>Vamos conferir seu último pedido?</h2>
                  <p>
                    O envio ficou sem confirmação. Confira com o garçom se ele
                    foi recebido antes de pedir novamente.
                  </p>
                  <button
                    className="cliente-text-button"
                    onClick={() => setPendingConfirm(true)}
                  >
                    Já conversei com o garçom <ChevronRight size={16} />
                  </button>
                </div>
              </section>
            )}
            {command && (
              <div className="cliente-command">
                <ClipboardList size={20} />
                <div>
                  <strong>Comanda de {command.customer_name}</strong>
                  <span>
                    {command.status === "OPEN"
                      ? "Faça seus pedidos abaixo!"
                      : command.status === "CLOSED"
                        ? "Conta solicitada. Aguardando pagamento no caixa."
                        : "Esta comanda foi encerrada."}
                  </span>
                </div>
                {command.status === "OPEN" && (
                  <button
                    className="cliente-text-button"
                    disabled={busy || !!session.pending}
                    onClick={() => setCloseConfirm(true)}
                  >
                    Solicitar conta
                  </button>
                )}
                {["PAID", "CANCELLED"].includes(command.status) && (
                  <button
                    className="cliente-text-button"
                    disabled={!!session.pending}
                    onClick={newCommand}
                  >
                    Nova comanda
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="cliente-menu-tools">
            <div className="cliente-container">
              <label className="cliente-search">
                <Search size={20} />
                <input
                  type="search"
                  placeholder="O que você está com vontade de comer?"
                  aria-label="Buscar no cardápio"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="cliente-icon-button"
                    onClick={() => setSearch("")}
                    aria-label="Limpar busca"
                  >
                    <X size={18} />
                  </button>
                )}
              </label>
              <nav
                className="cliente-categories"
                aria-label="Categorias do cardápio"
              >
                <button
                  className={!category ? "is-active" : ""}
                  aria-pressed={!category}
                  onClick={() => setCategory("")}
                >
                  <SlidersHorizontal size={16} />
                  Todos
                </button>
                {categories.map((c) => (
                  <button
                    key={c.category_id}
                    aria-pressed={category === String(c.category_id)}
                    className={
                      category === String(c.category_id) ? "is-active" : ""
                    }
                    onClick={() => setCategory(String(c.category_id))}
                  >
                    {c.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
          <div className="cliente-container cliente-menu-layout">
            <section className="cliente-menu" aria-label="Produtos">
              <div className="cliente-section-heading">
                <div>
                  <span className="cliente-eyebrow">FEITO PARA A SUA FOME</span>
                  <h2>
                    {search
                      ? "Resultados da busca"
                      : categories.find(
                          (c) => String(c.category_id) === category,
                        )?.name || "Nosso cardápio"}
                  </h2>
                </div>
                <span>
                  {filtered.length} {filtered.length === 1 ? "opção" : "opções"}
                </span>
              </div>
              <div className="cliente-grid">
                {filtered.map((p) => (
                  <article className="cliente-card" key={p.product_id}>
                    <button
                      className="cliente-product-button"
                      onClick={() => setSelectedProduct(p)}
                      aria-label={`Ver ${p.name}, ${money(p.price)}`}
                    >
                      <div className="cliente-product-copy">
                        <span className="cliente-product-category">
                          {p.category_name ||
                            categories.find(
                              (c) =>
                                Number(c.category_id) === Number(p.category_id),
                            )?.name ||
                            "Da nossa cozinha"}
                        </span>
                        <h3>{p.name}</h3>
                        <p>
                          {p.description ||
                            "Toque para ver detalhes e personalizar seu pedido."}
                        </p>
                        <strong>{money(p.price)}</strong>
                      </div>
                      <div className="cliente-product-visual">
                        <ProductImage product={p} />
                        <span
                          className="cliente-product-plus"
                          aria-hidden="true"
                        >
                          <Plus size={20} />
                        </span>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <div className="cliente-empty">
                  <Search size={32} />
                  <h3>
                    {products.length
                      ? "Não encontramos essa opção"
                      : "O cardápio está sendo preparado"}
                  </h3>
                  <p>
                    {products.length
                      ? "Tente outro nome ou explore as categorias."
                      : "Consulte o garçom para saber as opções disponíveis."}
                  </p>
                  {products.length > 0 && (
                    <button
                      className="cliente-text-button"
                      onClick={() => {
                        setSearch("");
                        setCategory("");
                      }}
                    >
                      Ver todo o cardápio <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              )}
            </section>
            <aside className="cliente-desktop-cart">
              <span className="cliente-empty-icon">
                <ShoppingBag size={26} />
              </span>
              <h2>Seu pedido, do seu jeito</h2>
              <p>
                {itemCount
                  ? `${itemCount} ${itemCount === 1 ? "item escolhido" : "itens escolhidos"}. Revise antes de enviar para a cozinha.`
                  : "Escolha algo gostoso. Seus favoritos aparecem aqui."}
              </p>
              {!!itemCount && (
                <div className="cliente-summary-total">
                  <span>Subtotal</span>
                  <strong>{money(total)}</strong>
                </div>
              )}
              <button
                className="cliente-primary"
                onClick={() => setCartOpen(true)}
              >
                {itemCount ? "Revisar pedido" : "Ver carrinho"}
                <ArrowRight size={18} />
              </button>
              <div className="cliente-aside-note">
                <Coffee size={17} />
                <span>
                  Aproveite o momento.
                  <br />O resto é com a gente.
                </span>
              </div>
            </aside>
          </div>
          <footer className="cliente-page-footer">
            <UtensilsCrossed size={16} />
            <span>Foodstuff · Bom apetite!</span>
          </footer>
          <div className="cliente-cart-dock">
            <div className="cliente-container">
              <button
                onClick={() => setCartOpen(true)}
                className="cliente-cart-trigger"
              >
                <span className="cliente-cart-count">
                  {itemCount || <ShoppingBag size={19} />}
                </span>
                <span>
                  {itemCount ? "Ver meu pedido" : "Meu carrinho"}
                  <small>
                    {itemCount
                      ? "Revise e envie para a cozinha"
                      : "Escolha seus favoritos no cardápio"}
                  </small>
                </span>
                <strong>{money(total)}</strong>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <Sheet
            open={cartOpen}
            onClose={() => {
              if (!sending.current) setCartOpen(false);
            }}
            title="Meu pedido"
            busy={busy}
          >
            <div className="cliente-sheet-scroll">
              <div className="cliente-cart-context">
                <span className="cliente-table">
                  <span className="cliente-status-dot" />
                  Mesa {String(table.number).padStart(2, "0")}
                </span>
                <span>
                  {itemCount} {itemCount === 1 ? "item" : "itens"}
                </span>
              </div>
              {cartOpen && noticeBox}
              {!canOrder && (
                <p className="cliente-inline-error" role="status">
                  {session.pending
                    ? "Confira o envio pendente com o garçom antes de continuar."
                    : "Esta comanda não aceita novos pedidos."}
                </p>
              )}
              {!cart.length ? (
                <div className="cliente-empty cliente-cart-empty">
                  <span className="cliente-empty-icon">
                    <ShoppingBag size={34} />
                  </span>
                  <h3>Seu carrinho está esperando</h3>
                  <p>Que tal começar com um dos seus favoritos?</p>
                  <button
                    className="cliente-primary"
                    onClick={() => setCartOpen(false)}
                  >
                    Explorar cardápio <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="cliente-cart-items">
                    {cart.map((item, i) => (
                      <article
                        className="cliente-cart-item"
                        key={`${item.product_id}-${item.observation}`}
                      >
                        <ProductImage product={item} />
                        <div className="cliente-cart-item-copy">
                          <h3>{item.name}</h3>
                          {item.observation && <p>{item.observation}</p>}
                          <span>{money(item.price)} cada</span>
                          <div className="cliente-cart-item-bottom">
                            <strong>{money(item.price * item.quantity)}</strong>
                            <div className="cliente-stepper">
                              <button
                                disabled={busy}
                                aria-label={`Diminuir ${item.name}`}
                                onClick={() => changeQuantity(i, -1)}
                              >
                                <Minus size={16} />
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                disabled={busy || item.quantity >= 99}
                                aria-label={`Aumentar ${item.name}`}
                                onClick={() => changeQuantity(i, 1)}
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <button
                    className="cliente-text-button cliente-more-items"
                    disabled={busy}
                    onClick={() => setCartOpen(false)}
                  >
                    <Plus size={18} />
                    Adicionar mais itens
                  </button>
                  <div className="cliente-identification">
                    <ClipboardList size={21} />
                    <div>
                      <h3>
                        {command
                          ? `Comanda de ${command.customer_name}`
                          : "Como podemos chamar você?"}
                      </h3>
                      <p>
                        {command
                          ? "Este pedido será adicionado à sua comanda."
                          : "Só um nome para identificar sua comanda. Sem cadastro."}
                      </p>
                      {!command && (
                        <label className="cliente-field">
                          <span className="cliente-sr-only">
                            Nome para a comanda
                          </span>
                          <input
                            autoComplete="given-name"
                            maxLength={100}
                            value={name}
                            disabled={busy}
                            onChange={(e) => {
                              setName(e.target.value);
                            }}
                            placeholder="Seu nome ou o nome do grupo"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="cliente-order-summary">
                    <h3>Resumo do pedido</h3>
                    <div>
                      <span>Subtotal dos produtos</span>
                      <strong>{money(total)}</strong>
                    </div>
                    <p>
                      Taxa de serviço, quando aplicável, é apresentada no
                      fechamento da comanda.
                    </p>
                  </div>
                </>
              )}
            </div>
            {!!cart.length && (
              <footer className="cliente-sheet-footer">
                <button
                  className="cliente-primary cliente-send"
                  disabled={!canOrder || busy}
                  onClick={submit}
                >
                  {busy ? (
                    <>
                      <LoaderCircle className="cliente-spin" size={20} />
                      Enviando pedido...
                    </>
                  ) : (
                    <>
                      <span>Confirmar e enviar</span>
                      <strong>{money(total)}</strong>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <p>Seu pedido será enviado para a cozinha.</p>
              </footer>
            )}
          </Sheet>
          {selectedProduct && (
            <ProductDetails
              key={selectedProduct.product_id}
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onAdd={add}
              canOrder={canOrder && !busy}
            />
          )}
          <Sheet
            open={closeConfirm}
            onClose={() => {
              if (!sending.current) setCloseConfirm(false);
            }}
            title="Solicitar a conta?"
            busy={busy}
          >
            <div className="cliente-sheet-scroll">
              <p className="cliente-confirm-copy">
                A comanda deixará de aceitar novos pedidos. Os pedidos já
                enviados continuam no preparo e o pagamento é feito no caixa.
              </p>
              {!!cart.length && (
                <p className="cliente-inline-error">
                  Há itens no carrinho que ainda não foram enviados. Ao
                  solicitar a conta, eles serão descartados.
                </p>
              )}
            </div>
            <footer className="cliente-sheet-footer">
              <button
                className="cliente-primary"
                disabled={busy}
                onClick={closeCommand}
              >
                {busy ? "Solicitando..." : "Confirmar solicitação da conta"}
              </button>
              <button
                className="cliente-text-button"
                disabled={busy}
                onClick={() => setCloseConfirm(false)}
              >
                Continuar consumindo
              </button>
            </footer>
          </Sheet>
          <Sheet
            open={pendingConfirm}
            onClose={() => setPendingConfirm(false)}
            title="Conferiu com o garçom?"
          >
            <div className="cliente-sheet-scroll">
              <p className="cliente-confirm-copy">
                Continue somente depois de confirmar se o último envio foi
                recebido. O carrinho será limpo para evitar um pedido repetido.
              </p>
            </div>
            <footer className="cliente-sheet-footer">
              <button
                className="cliente-primary"
                onClick={() => {
                  try {
                    save({ ...session, pending: null });
                    setCart([]);
                    setPendingConfirm(false);
                  } catch (err) {
                    setNoticeSuccess(false);
                    setNotice(message(err));
                    setPendingConfirm(false);
                  }
                }}
              >
                <Check size={18} />
                Sim, já conferi
              </button>
              <button
                className="cliente-text-button"
                onClick={() => setPendingConfirm(false)}
              >
                <ArrowLeft size={16} />
                Voltar e conferir
              </button>
            </footer>
          </Sheet>
        </>
      )}
    </main>
  );
}
