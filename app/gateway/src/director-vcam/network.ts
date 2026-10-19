import { isIPv4 } from "node:net";
import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";

const VIRTUAL_PREFIXES = ["utun", "tun", "tap", "ppp", "wg", "zt", "ts", "awdl", "llw", "bridge", "vmnet", "vbox", "docker", "veth", "vnic", "tailscale", "wireguard", "zerotier", "vpn", "vethernet"];

/** 优先有线或无线上的私网地址，跳过隧道和虚拟网卡。 */
export function lanAddresses(interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces()): string[] {
  const candidates: { address: string; score: number }[] = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    const lower = name.toLowerCase();
    const physical = !VIRTUAL_PREFIXES.some((prefix) => lower.startsWith(prefix));
    for (const entry of entries ?? []) {
      const ip = entry.address;
      if (entry.family !== "IPv4" || entry.internal || !isIPv4(ip) || /^(127\.|169\.254\.|0\.)/.test(ip)) continue;
      const privateIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
      const ethernet = /^(en|eth|wlan|wl|wi)/.test(lower);
      candidates.push({ address: ip, score: (physical ? 100 : 0) + (privateIp ? 50 : 0) + (ethernet ? 10 : 0) });
    }
  }
  return candidates.sort((left, right) => right.score - left.score).map(({ address }) => address);
}
