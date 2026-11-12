import { useEffect, useState } from "react";

import { api } from "../lib/api";

interface AirPlayHelpProps {
  /** Class for the paragraphs, so it fits the dock or the settings window. */
  textClass: string;
}

/**
 * macOS: a Mac can't receive a phone's Bluetooth audio, so phone audio comes
 * from an iPhone or iPad over AirPlay. Says how, and offers to open the
 * setting when AirPlay Receiver is off.
 */
export function AirPlayHelp({ textClass }: AirPlayHelpProps) {
  const [receiver, setReceiver] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      api
        .airplayReceiver()
        .then((value) => {
          if (active) setReceiver(value);
        })
        .catch((err: unknown) => console.warn("reading AirPlay Receiver failed", err));
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, []);

  const openSetting = () => {
    setError(null);
    api.openSystemSettings("airplay").catch((err: unknown) => setError(String(err)));
  };

  return (
    <div className="airplay">
      <p className={textClass}>
        <strong>iPhone or iPad:</strong> play something, tap AirPlay and choose this Mac. It plays in
        your buds together with the Mac&apos;s own sound.
      </p>
      {receiver === false && (
        <p className={`${textClass} airplay__off`}>
          AirPlay Receiver is off on this Mac.
          <button type="button" className="pill" onClick={openSetting}>
            Turn it on
          </button>
        </p>
      )}
      {error && (
        <p className={textClass} role="alert">
          {error}
        </p>
      )}
      <p className={textClass}>
        <strong>Android:</strong> a Mac can&apos;t receive a phone&apos;s audio over Bluetooth, so
        Android phones can&apos;t play through it yet.
      </p>
    </div>
  );
}
