//! Text shown in the tray. Pure functions, unit-tested.

use budsbridge_core::{ConnectionState, DeviceView};

pub fn menu_label(view: &DeviceView) -> String {
    let status = match (view.state, view.reconnect_attempt) {
        (ConnectionState::Connecting, Some(_)) => "reconnecting…",
        (ConnectionState::Disconnected, Some(_)) => "will retry",
        (ConnectionState::Connected, _) => "connected",
        (ConnectionState::Connecting, None) => "connecting…",
        (ConnectionState::Disconnecting, _) => "disconnecting…",
        (ConnectionState::Disconnected, None) => "not connected",
    };
    format!("{} ({status})", view.name)
}

pub fn tooltip(views: &[DeviceView]) -> String {
    let connected: Vec<&str> = views
        .iter()
        .filter(|view| view.state == ConnectionState::Connected)
        .map(|view| view.name.as_str())
        .collect();
    if connected.is_empty() {
        "BudsBridge: no buds connected".to_owned()
    } else {
        format!("BudsBridge: {} connected", connected.join(", "))
    }
}

#[cfg(test)]
mod tests {
    use budsbridge_core::DeviceId;

    use super::*;

    fn view(name: &str, state: ConnectionState, attempt: Option<u32>) -> DeviceView {
        DeviceView {
            id: DeviceId::new(name),
            name: name.to_owned(),
            profiles: Vec::new(),
            state,
            reconnect_attempt: attempt,
            last_error: None,
        }
    }

    #[test]
    fn menu_labels() {
        use ConnectionState::*;
        assert_eq!(menu_label(&view("Buds", Connected, None)), "Buds (connected)");
        assert_eq!(menu_label(&view("Buds", Connecting, None)), "Buds (connecting…)");
        assert_eq!(menu_label(&view("Buds", Connecting, Some(2))), "Buds (reconnecting…)");
        assert_eq!(menu_label(&view("Buds", Disconnected, Some(2))), "Buds (will retry)");
        assert_eq!(menu_label(&view("Buds", Disconnected, None)), "Buds (not connected)");
        assert_eq!(menu_label(&view("Buds", Disconnecting, None)), "Buds (disconnecting…)");
    }

    #[test]
    fn tooltips() {
        use ConnectionState::*;
        assert_eq!(tooltip(&[]), "BudsBridge: no buds connected");
        assert_eq!(
            tooltip(&[view("A", Connected, None), view("B", Connecting, None), view("C", Connected, None)]),
            "BudsBridge: A, C connected"
        );
    }
}
