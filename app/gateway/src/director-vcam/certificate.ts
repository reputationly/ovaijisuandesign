import { createPrivateKey, generateKeyPairSync, randomBytes, sign, X509Certificate } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createSecureContext, rootCertificates } from "node:tls";

const SHARED_BASE = "https://local-ip.co/cert/";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export type VcamCertificate = { cert: string; key: string; phoneHost: string; certMode: "trusted" | "self-signed" };

type Stored = { cert: string; key: string; savedAt: number };

function der(tag: number, ...parts: Buffer[]): Buffer {
  const body = Buffer.concat(parts);
  const hex = body.length.toString(16).padStart(body.length.toString(16).length + (body.length.toString(16).length % 2), "0");
  const length = Buffer.from(hex, "hex");
  return Buffer.concat([Buffer.from([tag]), body.length < 128 ? Buffer.from([body.length]) : Buffer.concat([Buffer.from([128 | length.length]), length]), body]);
}

const seq = (...parts: Buffer[]) => der(48, ...parts);
const oid = (hex: string) => der(6, Buffer.from(hex, "hex"));
const integer = (bytes: Buffer) => der(2, (bytes[0] ?? 0) & 128 ? Buffer.concat([Buffer.from([0]), bytes]) : bytes);
const algorithm = () => seq(oid("2a864886f70d01010b"), der(5));

function pem(name: string, bytes: Buffer): string {
  return `-----BEGIN ${name}-----\n${bytes.toString("base64").match(/.{1,64}/g)?.join("\n")}\n-----END ${name}-----\n`;
}

function certificates(pems: string): X509Certificate[] {
  return (pems.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? []).map((value) => new X509Certificate(value));
}

async function completeChain(pems: string, roots: string[], download?: (url: string) => Promise<Buffer>): Promise<string> {
  const candidates = certificates(pems);
  const anchors = roots.map((value) => new X509Certificate(value));
  let current = candidates.shift();
  const chain: X509Certificate[] = [];
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (Date.now() < Date.parse(current.validFrom) || Date.now() >= Date.parse(current.validTo)) throw new Error("VCam chain contains expired certificate");
    chain.push(current);
    const node = current;
    if (anchors.some((root) => root.fingerprint256 === node.fingerprint256)) return chain.map((cert) => cert.toString()).join("\n");
    const child = current;
    const isIssuer = (issuer: X509Certificate) => issuer.ca && child.checkIssued(issuer) && child.verify(issuer.publicKey);
    const issuer = [...candidates, ...anchors].find(isIssuer);
    if (issuer) {
      current = issuer;
      continue;
    }
    if (!download) break;
    const aia = /CA Issuers - URI:(\S+)/.exec(child.infoAccess ?? "")?.[1];
    if (!aia) break;
    const url = new URL(aia);
    if (!["http:", "https:"].includes(url.protocol) || url.port || url.username || url.password || !["secure.globalsign.com", "crt.sectigo.com"].includes(url.hostname)) break;
    const fetched = new X509Certificate(await download(url.href));
    if (!isIssuer(fetched)) break;
    current = fetched;
  }
  throw new Error("VCam certificate chain does not reach a trusted root");
}

async function usable(value: Stored, host: string, roots: string[]): Promise<void> {
  const cert = new X509Certificate(value.cert);
  const now = Date.now();
  if (now < Date.parse(cert.validFrom) || now + 86_400_000 >= Date.parse(cert.validTo)) throw new Error("VCam certificate expired or not yet valid");
  if (!cert.checkHost(host) || !cert.checkPrivateKey(createPrivateKey(value.key))) throw new Error("VCam certificate hostname/key mismatch");
  await completeChain(value.cert, roots);
  createSecureContext({ cert: value.cert, key: value.key });
}

async function save(file: string, value: Stored): Promise<void> {
  const temporary = `${file}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await rename(temporary, file);
}

export function createCertificate(ip: string): { cert: string; key: string } {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const name = seq(der(49, seq(oid("550403"), der(12, Buffer.from("MiniMax Hub VCam")))));
  const date = (offset: number) => der(24, Buffer.from(new Date(Date.now() + offset).toISOString().replace(/[-:T]/g, "").replace(/\.\d{3}Z$/, "Z")));
  const san = seq(der(135, Buffer.from(ip.split(".").map(Number))), der(135, Buffer.from([127, 0, 0, 1])), der(130, Buffer.from("localhost")));
  const tbs = seq(
    der(160, integer(Buffer.from([2]))),
    integer(randomBytes(16)),
    algorithm(),
    name,
    seq(date(-86_400_000), date(30 * 86_400_000)),
    name,
    publicKey.export({ type: "spki", format: "der" }) as Buffer,
    der(163, seq(seq(oid("551d11"), der(4, san)), seq(oid("551d25"), der(4, seq(oid("2b06010505070301")))))),
  );
  const signature = sign("sha256", tbs, privateKey);
  const cert = pem("CERTIFICATE", seq(tbs, algorithm(), der(3, Buffer.from([0]), signature)));
  if (!new X509Certificate(cert).checkIP(ip)) throw new Error("VCam certificate SAN mismatch");
  return { cert, key: privateKey.export({ type: "pkcs8", format: "pem" }).toString() };
}

export async function prepareCertificate(ip: string, options: { cacheDir?: string; fetch?: typeof fetch; roots?: readonly string[] } = {}): Promise<VcamCertificate> {
  const dir = options.cacheDir ?? path.join(homedir(), ".cache", "minimax-hub", "vcam");
  const phoneHost = `${ip.replace(/\./g, "-")}.my.local-ip.co`;
  const sharedFile = path.join(dir, "shared.json");
  const roots = [...(options.roots ?? rootCertificates)];
  let cached: Stored | undefined;
  try {
    cached = JSON.parse(await readFile(sharedFile, "utf8")) as Stored;
    await usable(cached, phoneHost, roots);
  } catch {
    cached = undefined;
  }
  try {
    if (!cached || !Number.isFinite(cached.savedAt) || Date.now() - cached.savedAt >= MAX_AGE) {
      const fetcher = options.fetch ?? globalThis.fetch;
      const download = async (url: string) => {
        const response = await fetcher(url, { signal: AbortSignal.timeout(6000), redirect: "error" });
        if (!response.ok) throw new Error(`VCam certificate download: ${response.status}`);
        const body = Buffer.from(await response.arrayBuffer());
        if (body.length > 128 * 1024) throw new Error("VCam certificate response too large");
        return body;
      };
      const get = async (name: string) => (await download(`${SHARED_BASE}${name}`)).toString();
      const [leaf, chain, key] = await Promise.all([get("server.pem"), get("chain.pem"), get("server.key")]);
      const cert = await completeChain(`${leaf.trim()}\n${chain.trim()}\n`, roots, download);
      const next = { cert, key, savedAt: Date.now() };
      await usable(next, phoneHost, roots);
      cached = next;
      await mkdir(dir, { recursive: true, mode: 0o700 }).then(() => save(sharedFile, next)).catch(() => undefined);
    }
  } catch (error) {
    console.warn("[vcam] Shared certificate unavailable:", error instanceof Error ? error.message : String(error));
  }
  if (cached) return { cert: cached.cert, key: cached.key, phoneHost, certMode: "trusted" };
  const file = path.join(dir, `self-${ip}.json`);
  let self: Stored;
  try {
    self = JSON.parse(await readFile(file, "utf8")) as Stored;
    const cert = new X509Certificate(self.cert);
    if (!cert.checkIP(ip) || !cert.checkPrivateKey(createPrivateKey(self.key)) || Date.now() < Date.parse(cert.validFrom) || Date.now() + 86_400_000 >= Date.parse(cert.validTo)) throw new Error("VCam self-signed certificate needs renewal");
    createSecureContext(self);
  } catch {
    self = { ...createCertificate(ip), savedAt: Date.now() };
    await mkdir(dir, { recursive: true, mode: 0o700 }).then(() => save(file, self)).catch(() => undefined);
  }
  return { cert: self.cert, key: self.key, phoneHost: ip, certMode: "self-signed" };
}
