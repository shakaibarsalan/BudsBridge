import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { SourceView } from "../lib/types";
import { PhoneAudioPanel } from "./PhoneAudioPanel";

const phone: SourceView = {
  id: "phone",
  name: "Pixel",
  enabled: true,
  state: "waiting",
  lastError: "The phone didn't answer. Is its Bluetooth on and is it nearby?",
};

describe("PhoneAudioPanel", () => {
  it("shows state and the last error", () => {
    render(<PhoneAudioPanel phones={[phone]} onToggle={vi.fn()} />);
    expect(screen.getByText("Waiting for the phone (retrying)")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("didn't answer");
    expect(screen.getByRole("switch", { name: "Hear Pixel in my buds" })).toBeChecked();
  });

  it("turns a phone off", async () => {
    const onToggle = vi.fn();
    render(<PhoneAudioPanel phones={[phone]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("switch", { name: "Hear Pixel in my buds" }));
    expect(onToggle).toHaveBeenCalledWith(phone, false);
  });

  it("marks a connecting phone as busy", () => {
    render(<PhoneAudioPanel phones={[{ ...phone, state: "connecting" }]} onToggle={vi.fn()} />);
    expect(screen.getByRole("listitem", { name: "Pixel" })).toHaveAttribute("aria-busy", "true");
  });

  it("shows a loading state", () => {
    render(<PhoneAudioPanel phones={null} onToggle={vi.fn()} />);
    expect(screen.getByText("Looking for paired phones…")).toBeInTheDocument();
  });
});
