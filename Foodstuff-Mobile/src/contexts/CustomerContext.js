import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import sheets from "../services/api";

const CustomerContext = createContext(null);

export function useCustomer() {
  return useContext(CustomerContext);
}

export function CustomerProvider({ children, qrToken, onStaffLogin }) {
  const [table, setTable] = useState(null);
  const [command, setCommand] = useState(null);
  const [session, setSession] = useState({});
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sending = useRef(false);

  useEffect(() => {
    let active = true;

    async function carregarMesa() {
      setLoading(true);
      setError(null);
      try {
        const response = await sheets.resolveQrCodeByToken(qrToken);
        const mesa = response.data.data;
        const stored = await SecureStore.getItemAsync(`foodstuff.customer.table.${mesa.table_id}`);
        const saved = stored ? JSON.parse(stored) : {};
        let comanda = null;

        if (saved.session_token) {
          const result = await sheets.getPublicCommandBySession(saved.session_token);
          comanda = result.data.data;
          if (Number(comanda.table_id) !== Number(mesa.table_id)) {
            throw new Error("A comanda salva pertence a outra mesa.");
          }
        }

        if (!active) return;
        await SecureStore.setItemAsync("foodstuff.customer.lastQr", qrToken);
        if (!active) return;
        setTable(mesa);
        setSession(saved);
        setCommand(comanda);
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Não foi possível recuperar a mesa. Confira a conexão e tente novamente.");
      } finally {
        if (active) setLoading(false);
      }
    }

    carregarMesa();
    return () => { active = false; };
  }, [qrToken, attempt]);

  const refresh = useCallback(async () => {
    if (!session.session_token || sending.current) return;
    const response = await sheets.getPublicCommandBySession(session.session_token);
    setCommand(response.data.data);
  }, [session.session_token]);

  const canOrder = !loading && !error && table && !session.pending &&
    (!command || command.status === "OPEN");

  function addItem(product, quantity, observation) {
    if (!canOrder || sending.current) throw new Error("Esta comanda não aceita novos pedidos.");
    const note = observation.trim();
    const key = `${product.product_id}:${note}`;
    const existing = cart.find((item) => item.key === key);
    if (quantity < 1 || quantity + (existing?.quantity || 0) > 99) {
      throw new Error("Escolha até 99 unidades por item.");
    }

    if (existing) {
      setCart(cart.map((item) => item.key === key
        ? { ...item, quantity: item.quantity + quantity } : item));
    } else {
      setCart([...cart, {
        key, product_id: product.product_id, name: product.name,
        price: Number(product.price), quantity, observation: note,
      }]);
    }
  }

  function changeQuantity(key, delta) {
    if (sending.current) return;
    setCart(cart.map((item) => item.key === key
      ? { ...item, quantity: Math.min(99, item.quantity + delta) } : item)
      .filter((item) => item.quantity > 0));
  }

  async function saveSession(next) {
    setSession(next);
    await SecureStore.setItemAsync(`foodstuff.customer.table.${table.table_id}`, JSON.stringify(next));
  }

  async function checkout(name) {
    if (sending.current) return;
    if (!canOrder || !cart.length) throw new Error("Confira a comanda e os itens do carrinho.");
    if (!session.session_token && (!name.trim() || name.trim().length > 100)) {
      throw new Error("Informe um nome de referência de até 100 caracteres.");
    }

    sending.current = true;
    setSubmitting(true);
    let current = session;
    try {
      // Confere os preços antes de enviar; a API valida a comanda e os produtos.
      const response = await sheets.getPublicProducts();
      const updated = cart.map((item) => {
        const product = response.data.data.find((entry) => entry.product_id === item.product_id);
        if (!product) throw new Error(`${item.name} não está mais disponível. Remova esse item do carrinho.`);
        return { ...item, price: Number(product.price) };
      });
      if (updated.some((item, index) => item.price !== cart[index].price)) {
        setCart(updated);
        throw new Error("Os preços mudaram. Revise o total e confirme novamente.");
      }

      if (!current.session_token) {
        current = { pending: "opening" };
        await saveSession(current);
        const opened = await sheets.postCommandByQr(qrToken, { customer_name: name.trim() });
        current = { session_token: opened.data.data.session_token, pending: null };
        setCommand({ ...opened.data.data, customer_name: name.trim() });
        // Guarda a comanda antes do pedido para reutilizá-la se o envio falhar.
        await saveSession(current);
      }

      current = { ...current, pending: "order" };
      await saveSession(current);
      const result = await sheets.postPublicOrder(current.session_token, {
        items: cart.map((item) => ({
          product_id: item.product_id, quantity: item.quantity, observation: item.observation,
        })),
      });
      setCart([]);
      current = { ...current, pending: null };
      let storageWarning = false;
      try { await saveSession(current); } catch { storageWarning = true; }
      return { orderId: result.data.data.order_id, storageWarning };
    } catch (err) {
      const status = err.response?.status;
      if (status >= 400 && status < 500 && status !== 408) {
        await saveSession({ ...current, pending: null });
      }
      // Sem resposta do servidor, não reenvia automaticamente um pedido que pode ter sido recebido.
      throw err;
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  async function startNewCommand() {
    const response = await sheets.getPublicCommandBySession(session.session_token);
    if (response.data.data.status === "OPEN" || session.pending) {
      throw new Error("A comanda atual ainda está aberta ou tem uma confirmação pendente.");
    }
    await SecureStore.deleteItemAsync(`foodstuff.customer.table.${table.table_id}`);
    setSession({});
    setCommand(null);
    setCart([]);
  }

  async function resolvePending() {
    await saveSession({ ...session, pending: null });
    setCart([]);
  }

  function openStaffLogin() {
    if (sending.current) return;
    Alert.alert("Acesso da equipe", "O carrinho será limpo. Sua comanda continuará salva.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Ir para login", onPress: async () => {
        await SecureStore.deleteItemAsync("foodstuff.customer.lastQr");
        onStaffLogin();
      } },
    ]);
  }

  return (
    <CustomerContext.Provider value={{
      table, command, cart, loading, error, submitting, canOrder, pending: session.pending,
      refresh, checkout, addItem, changeQuantity, startNewCommand, resolvePending, openStaffLogin,
      retry: () => setAttempt(attempt + 1),
      removeItem: (key) => { if (!sending.current) setCart(cart.filter((item) => item.key !== key)); },
    }}>
      {children}
    </CustomerContext.Provider>
  );
}
