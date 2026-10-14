// append-width.js

export function appendWidth(url, width) {
  return `${url}${url.includes("?") ? "&" : "?"}w=${width}`;
}

export function canAnnotateCanvasImage(kind, fileName, url) {
  return kind === "image" && !!url && !/\.gif(?:$|[?#])/i.test(fileName);
}
