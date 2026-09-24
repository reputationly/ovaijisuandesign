/**
 * 主进程一侧的总线：每个 webContents 一条连接，走三个原始通道
 * `hilo:hello`（建连）/ `hilo:message`（数据）/ `hilo:disconnect`（断开）。
 *
 * 同一个 webContents 重新 hello（页面刷新）时，旧连接按断开处理再建新的 ——
 * 否则旧连接上的订阅会一直往新页面推事件。
 */
import type { IMessagePassingProtocol } from "./channel.js";
import { IPC } from "./channels.js";
import { type ClientConnectionEvent, IPCServer } from "./connection.js";
import { Emitter, type Event } from "./events.js";
import { asBytes } from "./wire.js";

/** 用到的 electron 能力的最小形状，方便测试替换。 */
export interface SenderLike {
  readonly id: number;
  send(channel: string, ...args: unknown[]): void;
  isDestroyed(): boolean;
  once(event: "destroyed", listener: () => void): unknown;
}

export interface IpcMainLike {
  on(channel: string, listener: (event: { sender: SenderLike }, ...args: unknown[]) => void): unknown;
}

interface Peer {
  sender: SenderLike;
  messages: Emitter<Uint8Array>;
  gone: Emitter<void>;
}

function clientConnections(ipcMain: IpcMainLike): Event<ClientConnectionEvent> {
  const connected = new Emitter<ClientConnectionEvent>();
  const peers = new Map<number, Peer>();

  const drop = (id: number) => {
    const peer = peers.get(id);
    if (!peer) return;
    peers.delete(id);
    peer.gone.fire();
    peer.gone.dispose();
    peer.messages.dispose();
  };

  ipcMain.on(IPC.hello, (event) => {
    const sender = event.sender;
    drop(sender.id);
    const peer: Peer = { sender, messages: new Emitter<Uint8Array>(), gone: new Emitter<void>() };
    peers.set(sender.id, peer);
    sender.once("destroyed", () => {
      if (peers.get(sender.id) === peer) drop(sender.id);
    });
    const protocol: IMessagePassingProtocol = {
      send(message) {
        if (!sender.isDestroyed()) sender.send(IPC.message, message);
      },
      onMessage: peer.messages.event,
    };
    connected.fire({ protocol, onDidClientDisconnect: peer.gone.event });
  });

  ipcMain.on(IPC.message, (event, data) => {
    const peer = peers.get(event.sender.id);
    if (!peer || peer.sender !== event.sender) return;
    try {
      peer.messages.fire(asBytes(data));
    } catch {
      // 不是二进制的消息直接丢
    }
  });

  ipcMain.on(IPC.disconnect, (event) => drop(event.sender.id));

  return connected.event;
}

export function createMainIpcServer(ipcMain: IpcMainLike): IPCServer<string> {
  return new IPCServer<string>(clientConnections(ipcMain));
}
