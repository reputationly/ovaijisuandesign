fn main() {
    let p = std::env::args().nth(1).expect("路径");
    match gateway::mp4::probe_file(std::path::Path::new(&p)) {
        Some(i) => println!("{}x{}  时长 {:?}s", i.width, i.height, i.duration),
        None => println!("读不到"),
    }
}
