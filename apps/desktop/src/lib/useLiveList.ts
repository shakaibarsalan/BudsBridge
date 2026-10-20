import { useEffect, useState } from "react";

import { api } from "./api";
import type { DeviceView } from "./types";

/** Device list kept in sync with the Rust runtime. */
export function useDevices() {
  const [devices, setDevices] = useState<DeviceView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unlisten = api.onDevicesChanged((next) => {
      if (active) setDevices(next);
    });
    api
      .listDevices()
      .then((initial) => {
        if (active) setDevices((current) => current ?? initial);
      })
      .catch((err: unknown) => {
        if (active) setError(String(err));
      });
    return () => {
      active = false;
      void unlisten.then((stop) => stop());
    };
  }, []);

  return { devices, error };
}
