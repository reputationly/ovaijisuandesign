fn main() {
    let which = std::env::args().nth(1).unwrap_or_default();
    if which == "system" {
        println!("{}", gateway::agent::SYSTEM);
    } else {
        println!("{}", serde_json::to_string(&gateway::agent::catalog::schema()).unwrap());
    }
}
