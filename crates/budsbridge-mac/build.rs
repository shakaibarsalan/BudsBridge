// Compiles the small Objective-C bridge to IOBluetooth, on macOS only. On
// other platforms the crate is just its platform-independent logic.
fn main() {
    println!("cargo:rerun-if-changed=src/bluetooth.m");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("macos") {
        return;
    }
    cc::Build::new()
        .file("src/bluetooth.m")
        .flag("-fobjc-arc")
        .flag("-Wall")
        .compile("budsbridge_mac_bluetooth");
    for framework in ["Foundation", "IOBluetooth", "CoreBluetooth"] {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
}
