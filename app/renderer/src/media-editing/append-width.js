// append-width.js

export function appendWidth(url2, width) {
  return `${url2}${url2.includes("?") ? "&" : "?"}w=${width}`;
}

export function canAnnotateCanvasImage(kind, name2, url2) {
  return kind === "image" && !!url2 && !/\.gif(?:$|[?#])/i.test(name2);
}
