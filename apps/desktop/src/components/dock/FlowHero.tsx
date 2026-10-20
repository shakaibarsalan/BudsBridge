import { bridgeStatusLabel, shortName, statusLabel } from "../../lib/format";
import type { DeviceView, SourceView } from "../../lib/types";

interface FlowHeroProps {
  device: DeviceView | null;
  phone: SourceView | null;
}

const PHONE_STATE: Record<SourceView["state"], string> = {
  off: "Off",
  connecting: "Connecting",
  waiting: "Waiting",
  streaming: "Playing",
};

/**
 * Phone → laptop → buds, with the sound drawn moving along each link that
 * is live. A pure function of the current state, like InverterBar's heroes.
 */
export function FlowHero({ device, phone }: FlowHeroProps) {
  const budsOn = device?.state === "connected";
  const budsBusy = device?.state === "connecting" || device?.state === "disconnecting";
  const phoneOn = phone?.state === "streaming";
  const phoneBusy = phone?.state === "connecting" || phone?.state === "waiting";
  const laptopDetail = budsOn ? (phoneOn ? "Mixing phone + laptop" : "Playing to buds") : "Idle";

  const description = [
    phone
      ? `${phone.name}: ${bridgeStatusLabel(phone.state).toLowerCase()}`
      : "No phone paired",
    device ? `${device.name}: ${statusLabel(device).toLowerCase()}` : "No buds paired",
  ].join(". ");

  return (
    <svg className="flow" viewBox="0 0 352 132" role="img" aria-label={description}>
      {/* links */}
      <line
        className={`flow__link ${phoneOn ? "flow__link--phone" : phoneBusy ? "flow__link--busy" : ""}`}
        x1="58"
        y1="47"
        x2="120"
        y2="47"
      />
      <line
        className={`flow__link ${budsOn ? "flow__link--buds" : budsBusy ? "flow__link--busy" : ""}`}
        x1="232"
        y1="47"
        x2="276"
        y2="47"
      />

      {/* phone */}
      <g className={`flow__node ${phoneOn ? "flow__node--phone" : ""}`}>
        <rect x="20" y="18" width="34" height="58" rx="7" />
        <rect className="flow__inset" x="24.5" y="25" width="25" height="42" rx="2.5" />
        {phoneOn && (
          <g className="flow__notes">
            <path d="M33 52 v-12 l9 -2.5 v12" />
            <circle cx="31" cy="52.5" r="2.5" />
            <circle cx="40" cy="50" r="2.5" />
          </g>
        )}
      </g>

      {/* laptop */}
      <g className={`flow__node ${budsOn ? "flow__node--laptop" : ""}`}>
        <rect x="124" y="12" width="104" height="66" rx="6" />
        <rect className="flow__inset" x="130" y="18" width="92" height="54" rx="2.5" />
        <path d="M110 82 h132 l-7 8 h-118 z" />
        <g className={`flow__eq ${budsOn ? "flow__eq--on" : ""}`}>
          {[0, 1, 2, 3, 4].map((bar) => (
            <rect key={bar} x={159 + bar * 7} y="34" width="4" height="22" rx="2" />
          ))}
        </g>
      </g>

      {/* buds */}
      <g className={`flow__node ${budsOn ? "flow__node--buds" : ""}`}>
        <circle cx="292" cy="38" r="11" />
        <rect x="286" y="45" width="8" height="24" rx="4" />
        <circle cx="322" cy="38" r="11" />
        <rect x="320" y="45" width="8" height="24" rx="4" />
      </g>

      {/* labels */}
      <g className="flow__labels">
        <text x="37" y="104" className="flow__name">
          {phone ? shortName(phone.name) : "Phone"}
        </text>
        <text x="37" y="119" className="flow__state">
          {phone ? PHONE_STATE[phone.state] : "Not paired"}
        </text>
        <text x="176" y="104" className="flow__name">
          This laptop
        </text>
        <text x="176" y="119" className="flow__state">
          {laptopDetail}
        </text>
        <text x="307" y="104" className="flow__name">
          {device ? shortName(device.name) : "Buds"}
        </text>
        <text x="307" y="119" className="flow__state">
          {device ? statusLabel(device) : "Not paired"}
        </text>
      </g>
    </svg>
  );
}
