/**
 * 总线上的值编码。每个值 = 1 字节类型标记 + 负载；长度和整数用小端 7 位变长整数
 * （高位 1 表示后面还有）。
 *
 *   0 undefined   1 字符串   2/3 字节串   4 数组   5 JSON   6 非负 32 位整数
 *
 * 只有非负整数走 6：负数按无符号编码会解回一个大正数，所以负数一律落到 JSON。
 */

const Tag = { Undefined: 0, String: 1, NodeBytes: 2, Bytes: 3, Array: 4, Json: 5, Uint: 6 } as const;

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

class ByteSink {
  private parts: Uint8Array[] = [];
  private size = 0;

  push(bytes: Uint8Array): void {
    this.parts.push(bytes);
    this.size += bytes.byteLength;
  }

  byte(b: number): void {
    this.push(Uint8Array.of(b));
  }

  varuint(n: number): void {
    const out: number[] = [];
    let v = n >>> 0;
    do {
      let b = v & 0x7f;
      v >>>= 7;
      if (v !== 0) b |= 0x80;
      out.push(b);
    } while (v !== 0);
    this.push(Uint8Array.from(out));
  }

  toBytes(): Uint8Array {
    const all = new Uint8Array(this.size);
    let at = 0;
    for (const p of this.parts) {
      all.set(p, at);
      at += p.byteLength;
    }
    return all;
  }
}

export class ByteSource {
  private at = 0;
  constructor(private readonly buf: Uint8Array) {}

  get done(): boolean {
    return this.at >= this.buf.byteLength;
  }

  byte(): number {
    if (this.at >= this.buf.byteLength) throw new Error("wire: unexpected end of message");
    return this.buf[this.at++]!;
  }

  take(n: number): Uint8Array {
    if (this.at + n > this.buf.byteLength) throw new Error("wire: truncated payload");
    const slice = this.buf.subarray(this.at, this.at + n);
    this.at += n;
    return slice;
  }

  varuint(): number {
    let result = 0;
    let shift = 0;
    for (;;) {
      const b = this.byte();
      result += (b & 0x7f) * 2 ** shift;
      if ((b & 0x80) === 0) return result;
      shift += 7;
      if (shift > 35) throw new Error("wire: varint too long");
    }
  }
}

function put(sink: ByteSink, value: unknown): void {
  if (value === undefined) {
    sink.byte(Tag.Undefined);
  } else if (typeof value === "string") {
    const bytes = utf8Encoder.encode(value);
    sink.byte(Tag.String);
    sink.varuint(bytes.byteLength);
    sink.push(bytes);
  } else if (value instanceof Uint8Array) {
    sink.byte(Tag.Bytes);
    sink.varuint(value.byteLength);
    sink.push(value);
  } else if (Array.isArray(value)) {
    sink.byte(Tag.Array);
    sink.varuint(value.length);
    for (const item of value) put(sink, item);
  } else if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffffffff) {
    sink.byte(Tag.Uint);
    sink.varuint(value);
  } else {
    const bytes = utf8Encoder.encode(JSON.stringify(value));
    sink.byte(Tag.Json);
    sink.varuint(bytes.byteLength);
    sink.push(bytes);
  }
}

function get(src: ByteSource): unknown {
  const tag = src.byte();
  switch (tag) {
    case Tag.Undefined:
      return undefined;
    case Tag.String:
      return utf8Decoder.decode(src.take(src.varuint()));
    case Tag.NodeBytes:
    case Tag.Bytes:
      // 复制出来：原缓冲区属于这条消息，调用方可能长期持有
      return src.take(src.varuint()).slice();
    case Tag.Array: {
      const n = src.varuint();
      const arr: unknown[] = [];
      for (let i = 0; i < n; i++) arr.push(get(src));
      return arr;
    }
    case Tag.Json:
      return JSON.parse(utf8Decoder.decode(src.take(src.varuint())));
    case Tag.Uint:
      return src.varuint();
    default:
      throw new Error(`wire: unknown tag ${tag}`);
  }
}

/** 把若干值依次编码进一条消息。 */
export function encodeValues(...values: unknown[]): Uint8Array {
  const sink = new ByteSink();
  for (const v of values) put(sink, v);
  return sink.toBytes();
}

export function readValue(src: ByteSource): unknown {
  return get(src);
}

export function decodeValue(bytes: Uint8Array): unknown {
  return get(new ByteSource(bytes));
}

/** Electron 送来的可能是 Buffer、Uint8Array 或 ArrayBuffer，统一成 Uint8Array。 */
export function asBytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  throw new Error("wire: message is not binary");
}
