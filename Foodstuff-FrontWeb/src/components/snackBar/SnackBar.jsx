import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useEffect } from "react";

const snackbarTypes = {
  success: {
    icon: CheckCircle,
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    iconColor: "text-green-500",
  },

  error: {
    icon: XCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    iconColor: "text-red-500",
  },

  warning: {
    icon: AlertTriangle,
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    iconColor: "text-yellow-500",
  },

  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    iconColor: "text-blue-500",
  },
};

export default function Snackbar({
  message,
  type = "info",
  onClose,
  duration = 3000,
}) {
  const config = snackbarTypes[type] || snackbarTypes.info;

  const Icon = config.icon;

  useEffect(() => {
    // Se não houver uma função onClose passada, não ativa o timer
    if (!onClose) return;

    // Inicia o temporizador para fechar automaticamente
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    // Função de limpeza (cleanup): limpa o timer se o componente desmontar antes do tempo
    return () => clearTimeout(timer);
  }, [onClose, duration, message]);

  return (
    <div
      className={`
        fixed top-5 left-1/2 z-50
        flex w-[calc(100%-2rem)] max-w-md
        -translate-x-1/2
        items-center gap-3
        rounded-xl border
        px-4 py-3
        shadow-lg
        ${config.bg}
        ${config.border}
        
      `}
    >
      <Icon className={`h-5 w-5 shrink-0 ${config.iconColor}`} />

      <p className={`flex-1 text-sm font-medium ${config.text}`}>{message}</p>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-gray-400 transition hover:text-gray-600"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
