export class MediaRegistry {
  assets = new Map();

  registerVideoAsset(file) {
    const assetId = crypto.randomUUID();
    const objectUrl = URL.createObjectURL(file);
    const asset = {
      id: assetId,
      file,
      objectUrl,
      mime: file.type,
      name: file.name,
      size: file.size,
    };
    this.assets.set(assetId, asset);
    return asset;
  }

  registerAudioAsset(file) {
    return this.registerVideoAsset(file);
  }

  getAsset(assetId) {
    return this.assets.get(assetId) ?? null;
  }

  releaseAsset(assetId) {
    const asset = this.assets.get(assetId);
    if (!asset) return;
    URL.revokeObjectURL(asset.objectUrl);
    this.assets.delete(assetId);
  }

  clear() {
    for (const asset of this.assets.values()) {
      URL.revokeObjectURL(asset.objectUrl);
    }
    this.assets.clear();
  }

  has(assetId) {
    return this.assets.has(assetId);
  }
}
