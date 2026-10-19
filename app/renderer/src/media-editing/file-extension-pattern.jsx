export const FILE_EXTENSION_PATTERN = /\.[a-z0-9]{1,8}$/i;
export function hasFileExtension(name2) {
  const dot2 = name2.lastIndexOf(".");
  return dot2 > 0 && FILE_EXTENSION_PATTERN.test(name2);
}