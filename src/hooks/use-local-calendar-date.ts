import { useEffect, useState } from "react";

export function useLocalCalendarDate() {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => {
      const current = new Date();
      setDate((previous) =>
        previous.toDateString() === current.toDateString() ? previous : current,
      );
    };
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
    };
  }, []);
  return date;
}
