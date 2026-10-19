/**
 * 字幕编辑器的会话/存储层 —— 从产物主包逐字取回（第 74 轮）。
 *
 * `canvas-v3-hooks.js` 里的 `useSubtitleEditors` 依赖这两个类；它们原先只存在于
 * 产物里，树里没有。`SubtitleSession` 139 行、`SubtitleEditorStore` 46 行。
 *
 * 说明：只搬实现，未改语义。
 */

class SubtitleSession {
  constructor(adapter) {
    this.adapter = adapter;
  }
  adapter;
  state = { content: null, dirty: false, saving: false, error: null };
  baseline = null;
  pending = null;
  deferred = null;
  timer;
  running;
  loading;
  listeners = /* @__PURE__ */ new Set();
  epoch = 0;
  readGeneration = 0;
  getSnapshot = () => this.state;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  publish(patch2) {
    this.state = { ...this.state, ...patch2 };
    for (const listener of this.listeners) listener();
  }
  cancelTimer() {
    clearTimeout(this.timer);
    this.timer = void 0;
  }
  receive(source) {
    if (source.revision === this.baseline?.revision) return;
    if (this.pending) {
      this.deferred = source;
      return;
    }
    if (this.state.dirty) {
      this.cancelTimer();
      this.publish({ error: "conflict" });
      return;
    }
    this.baseline = source;
    this.publish({ content: source.content, error: null });
  }
  load = () => {
    if (this.loading) return this.loading;
    const epoch = this.epoch;
    const generation = this.readGeneration;
    const operation2 = this.adapter.load().then(
      (source) => {
        if (epoch === this.epoch && generation === this.readGeneration) this.receive(source);
      },
      () => {
        if (epoch === this.epoch && generation === this.readGeneration && !this.baseline)
          this.publish({ error: "load" });
      }
    ).finally(() => {
      if (this.loading === operation2) this.loading = void 0;
    });
    this.loading = operation2;
    return operation2;
  };
  edit = (content2) => {
    if (!this.baseline) return;
    this.cancelTimer();
    this.publish({ content: content2, dirty: !!this.pending || content2 !== this.baseline.content });
    if (this.state.error) return;
    this.timer = setTimeout(() => {
      void this.flush().catch(() => {
      });
    }, 500);
  };
  flush = () => {
    this.cancelTimer();
    if (this.running) return this.running.then(() => this.flush());
    if (this.state.error === "conflict") return Promise.reject(new Error("SUBTITLE_CONFLICT"));
    if (!this.state.dirty) return Promise.resolve();
    const epoch = this.epoch;
    this.readGeneration++;
    this.loading = void 0;
    const operation2 = this.drain(epoch).finally(() => {
      if (this.running === operation2) this.running = void 0;
    });
    this.running = operation2;
    return operation2;
  };
  async drain(epoch) {
    this.publish({ saving: true, error: null });
    try {
      while (this.state.dirty && epoch === this.epoch) {
        if (!this.baseline || this.state.content === null) throw new Error("SUBTITLE_NOT_LOADED");
        this.pending ??= {
          content: this.state.content,
          revision: this.baseline.revision,
          requestId: crypto.randomUUID()
        };
        const write = this.pending;
        const revision2 = await this.adapter.save(write);
        if (epoch !== this.epoch) return;
        this.readGeneration++;
        this.pending = null;
        this.baseline = { content: write.content, revision: revision2 };
        this.publish({ dirty: this.state.content !== write.content });
        const deferred = this.deferred;
        this.deferred = null;
        if (deferred) this.receive(deferred);
        if (this.state.error === "conflict") throw new Error("SUBTITLE_CONFLICT");
      }
    } catch (error) {
      if (epoch === this.epoch)
        this.publish({
          error: this.state.error === "conflict" || error instanceof Error && error.message === "SUBTITLE_CONFLICT" ? "conflict" : "save"
        });
      throw error;
    } finally {
      if (epoch === this.epoch) this.publish({ saving: false });
    }
  }
  /** Explicitly discard the draft and read the latest head. Never run on a version refresh. */
  reload = async () => {
    await this.running?.catch(() => {
    });
    this.discard();
    this.baseline = null;
    this.publish({ content: null });
    await this.load();
  };
  discard = () => {
    this.cancelTimer();
    this.epoch++;
    this.loading = void 0;
    this.pending = null;
    this.deferred = null;
    this.publish({
      content: this.baseline?.content ?? null,
      dirty: false,
      saving: false,
      error: null
    });
  };
}

class SubtitleEditorStore {
  savedListeners = /* @__PURE__ */ new Set();
  notifySaved = () => {
    for (const listener of this.savedListeners) listener();
  };
  subscribeSaved = (listener) => {
    this.savedListeners.add(listener);
    return () => {
      this.savedListeners.delete(listener);
    };
  };
  sessions = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  get(key2, create2) {
    let session = this.sessions.get(key2);
    if (!session) {
      session = new SubtitleSession(create2());
      this.sessions.set(key2, session);
      session.subscribe(() => {
        for (const listener of this.listeners) listener();
      });
    }
    return session;
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getStatus = () => {
    const states = [...this.sessions.values()].map((session) => session.getSnapshot());
    if (states.some((state2) => state2.dirty && state2.error)) return "failed";
    if (states.some((state2) => state2.saving)) return "saving";
    return states.some((state2) => state2.dirty) ? "dirty" : "clean";
  };
  flush = async () => {
    const results = await Promise.allSettled(
      [...this.sessions.values()].map((session) => session.flush())
    );
    const failure2 = results.find((result) => result.status === "rejected");
    if (failure2?.status === "rejected") throw failure2.reason;
    if (this.getStatus() !== "clean") throw new Error("SUBTITLE_UNSAVED");
  };
  discard = () => {
    for (const session of this.sessions.values()) session.discard();
  };
}

export { SubtitleSession, SubtitleEditorStore };
