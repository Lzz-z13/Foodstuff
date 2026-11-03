import { useEffect, useState } from "react";
import api from "./axios";

export default function useUserSync() {
  const [revisao, setRevisao] = useState(0);
  useEffect(() => {
    let stopped = false;
    let pending = false;
    async function refresh() {
      const token = localStorage.getItem("token");
      if (!token || pending || document.hidden) return;
      const previous = localStorage.getItem("user");
      pending = true;
      try {
        const response = await api.getCurrentUser();
        // Ignore responses from a previous session or before a local edit.
        if (
          stopped ||
          token !== localStorage.getItem("token") ||
          previous !== localStorage.getItem("user")
        )
          return;
        const user = response.data?.data;
        if (!user) return;
        const next = JSON.stringify(user);
        if (next !== previous) {
          localStorage.setItem("user", next);
          window.dispatchEvent(new Event("userUpdated"));
        }
      } catch {
        // Keep the current profile while offline; try again on the next tick.
      } finally {
        pending = false;
      }
    }
    const changed = () => setRevisao((value) => value + 1);
    refresh();
    const timer = setInterval(refresh, 3000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("userUpdated", changed);
    window.addEventListener("storage", changed);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("userUpdated", changed);
      window.removeEventListener("storage", changed);
    };
  }, []);
  return revisao;
}
