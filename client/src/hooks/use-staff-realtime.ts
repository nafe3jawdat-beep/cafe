import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createSocket } from "../lib/socket";
import { useLocalization } from "../lib/localization";

type NotificationSound = "order" | "call" | "bill";

const notificationSounds: Record<NotificationSound, number[]> = {
  order: [660, 880],
  call: [523, 523, 784],
  bill: [784, 587],
};

function playNotificationSound(type: NotificationSound) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const context = new AudioContextClass();
    const now = context.currentTime;
    const frequencies = notificationSounds[type];
    const interval = type === "call" ? 0.12 : type === "bill" ? 0.22 : 0.14;

    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * interval);
      gain.gain.exponentialRampToValueAtTime(0.08, now + index * interval + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * interval + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * interval);
      oscillator.stop(now + index * interval + 0.2);
    });

    window.setTimeout(() => void context.close(), 800);
  } catch {
    // Audio is best-effort and may be blocked before user interaction.
  }
}

export function useStaffRealtime() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const { translate } = useLocalization();
  const translateRef = useRef(translate);
  translateRef.current = translate;

  useEffect(() => {
    const t = (text: string) => translateRef.current(text);
    const socket = createSocket();

    const refreshAll = () => {
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    };

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("staff:join", (response) => {
        if (!response?.ok) {
          console.warn("[socket] staff join failed:", response?.error);
        }
      });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("order:created", (order) => {
      refreshAll();
      playNotificationSound("order");
      toast.success(
        `${t("New order")} #${order.orderNumber} · ${t("Table")} ${order.table.number}`,
        { duration: 6000 }
      );
    });

    socket.on("order:updated", (order) => {
      refreshAll();
      toast.info(
        `${t("Order")} #${order.orderNumber} → ${t(order.status.toLowerCase())}`
      );
    });

    socket.on("call:created", (call) => {
      refreshAll();
      playNotificationSound("call");
      toast.warning(
        `${t("Table")} ${call.table.number} ${t("is requesting service")}`,
        { duration: 7000 }
      );
    });

    socket.on("call:updated", () => refreshAll());

    socket.on("bill:created", (bill) => {
      refreshAll();
      playNotificationSound("bill");
      toast.success(
        `${t("Bill requested")} · ${t("Table")} ${bill.table.number}`,
        { duration: 7000 }
      );
    });

    socket.on("bill:updated", () => refreshAll());
    socket.on("menu:updated", () => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "menu"] });
      void queryClient.invalidateQueries({ queryKey: ["table-menu"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return { connected };
}
