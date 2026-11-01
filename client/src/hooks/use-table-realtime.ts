import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createSocket } from "../lib/socket";

export function useTableRealtime(tableNumber: number, tableKey?: string) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = createSocket();

    const invalidateSession = () => {
      void queryClient.invalidateQueries({
        queryKey: ["table-session", tableNumber, tableKey],
      });
    };

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("table:join", { tableNumber, tableKey }, (response) => {
        if (!response?.ok && response?.error) {
          toast.error(response.error);
        }
      });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("order:created", invalidateSession);
    socket.on("order:updated", (order) => {
      invalidateSession();
      const messages: Record<string, string> = {
        PREPARING: `Order #${order.orderNumber} is being prepared.`,
        READY: `Order #${order.orderNumber} is ready.`,
        DELIVERED: `Order #${order.orderNumber} has been delivered.`,
        CANCELLED: `Order #${order.orderNumber} was cancelled.`,
      };
      const message = messages[order.status];
      if (message) toast.info(message);
    });
    socket.on("bill:created", invalidateSession);
    socket.on("bill:updated", (bill) => {
      invalidateSession();
      if (bill.status === "SETTLED") {
        toast.success("Your bill has been settled. Thank you!");
      }
    });
    socket.on("menu:updated", () => {
      void queryClient.invalidateQueries({ queryKey: ["table-menu"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [tableNumber, tableKey, queryClient]);

  return { connected };
}
