// 对渲染层的补丁：{ id, file（按前缀匹配，带哈希的文件名写到哈希之前）, find, replace, count（默认 1） }。
// 只放界面代码里写死、没法从主进程或 gateway 侧改的东西。
export const VERSION = "3.0.16";

export const PATCHES = [];
