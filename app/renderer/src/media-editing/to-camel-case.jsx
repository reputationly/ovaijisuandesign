export const toCamelCase = (string2) =>
  string2.replace(/^([A-Z])|[\s-_]+(\w)/g, (match2, p1, p22) => (p22 ? p22.toUpperCase() : p1.toLowerCase()));

export const toPascalCase = (string2) => {
  const camelCase = toCamelCase(string2);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

/** 驼峰/帕斯卡 → kebab。产物里和上面两个函数连在一起，还原时漏掉了。 */
export const toKebabCase = (string2) => string2.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** 拼 className：去掉空值、去重、压掉首尾空白。同上，也是漏掉的一个。 */
export const mergeClasses = (...classes) =>
  classes
    .filter((className, index2, array2) => Boolean(className) && className.trim() !== "" && array2.indexOf(className) === index2)
    .join(" ")
    .trim();
