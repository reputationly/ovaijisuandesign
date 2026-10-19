export function splitMentionFilename(filename) {
  const dot2 = filename.lastIndexOf(".");
  if (dot2 <= 0 || dot2 >= filename.length - 1) return {
    stem: filename,
    ext: ""
  };
  return {
    stem: filename.slice(0, dot2),
    ext: filename.slice(dot2)
  };
}