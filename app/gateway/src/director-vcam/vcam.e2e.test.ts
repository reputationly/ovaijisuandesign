import { mkdtempSync } from "node:fs";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";

import { createApp } from "../bootstrap.js";
import { lanAddresses } from "./network.js";
import { DirectorVcamService } from "./vcam.service.js";

function opened(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
}

function nextMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    socket.once("message", (data) => resolve(data.toString()));
  });
}

describe("导演机位", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("只在本机管理，桌面和手机配对后互相转发", async () => {
    expect(lanAddresses({
      utun0: [{ address: "10.9.0.1", family: "IPv4", internal: false, netmask: "255.0.0.0", mac: "00:00:00:00:00:00", cidr: "10.9.0.1/8" }],
      en0: [{ address: "192.168.1.20", family: "IPv4", internal: false, netmask: "255.255.255.0", mac: "00:00:00:00:00:01", cidr: "192.168.1.20/24" }],
    })).toEqual(["192.168.1.20", "10.9.0.1"]);

    app = await createApp();
    await app.init();
    const http = request(app.getHttpServer());
    const vcam = app.get(DirectorVcamService);
    vcam.interfaces = () => ["10.1.2.3"];
    vcam.cacheDir = mkdtempSync(path.join(tmpdir(), "ov-vcam-"));
    vcam.certificateFetch = async () => {
      throw new Error("offline");
    };

    const idle = await http.get("/api/director-stage/vcam/status");
    expect(idle.status).toBe(200);
    expect(idle.body).toMatchObject({ running: false, info: null, sessions: 0, phones: 0 });

    const foreign = await http.post("/api/director-stage/vcam/start").send({ lanIp: "8.8.8.8" });
    expect(foreign.status).toBe(400);
    expect(foreign.body.message).toBe("No matching LAN IPv4 address; connect to Wi-Fi or select a local network interface");

    const started = await http.post("/api/director-stage/vcam/start").send({ lanIp: "10.1.2.3" });
    expect(started.status).toBe(200);
    expect(started.body).toMatchObject({ lanIp: "10.1.2.3", certMode: "self-signed", phoneBase: `https://10.1.2.3:${started.body.httpsPort}` });
    const again = await http.post("/api/director-stage/vcam/start").send({ lanIp: "10.1.2.3" });
    expect(again.body.httpPort).toBe(started.body.httpPort);

    const desktop = new WebSocket(`ws://127.0.0.1:${started.body.httpPort}/vcam-ws?role=desktop&session=sess01&token=token_token_token1`);
    const hello = nextMessage(desktop);
    await opened(desktop);
    expect(JSON.parse(await hello)).toMatchObject({ type: "hello-ack", lanIp: "10.1.2.3", certMode: "self-signed" });

    const phone = new WebSocket(`wss://127.0.0.1:${started.body.httpsPort}/vcam-ws?role=phone&session=sess01&token=token_token_token1`, { rejectUnauthorized: false });
    const pairedDesktop = nextMessage(desktop);
    const pairedPhone = nextMessage(phone);
    await opened(phone);
    expect(JSON.parse(await pairedDesktop).type).toBe("paired");
    expect(JSON.parse(await pairedPhone).type).toBe("paired");
    const forwarded = nextMessage(phone);
    desktop.send(JSON.stringify({ type: "pose", y: 1 }));
    expect(JSON.parse(await forwarded)).toEqual({ type: "pose", y: 1 });

    const page = await new Promise<string>((resolve, reject) => {
      https.get({ host: "127.0.0.1", port: started.body.httpsPort, path: "/", rejectUnauthorized: false }, (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk as Buffer));
        response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }).on("error", reject);
    });
    expect(page).toContain("VCam 虚拟摄像机");
    desktop.close();
    phone.close();

    const stopped = await http.post("/api/director-stage/vcam/stop");
    expect(stopped.body.running).toBe(false);
    const health = await fetch(`http://127.0.0.1:${started.body.httpPort}/healthz`).catch((error: unknown) => error);
    expect(health).toBeInstanceOf(Error);
  });
});