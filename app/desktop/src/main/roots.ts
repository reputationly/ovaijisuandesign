/**
 * 数据根的纯计算（不碰 electron，测试直接调）。
 *
 * 同机可能装着另一个同类应用，它用 `~/Movies/Hub`、`~/.hub` 和自己的 userData。
 * 我们的根一律换名，并且在打开工作区前挡掉落在那几处的路径：两边共用一个目录
 * 会互相改写索引库和项目列表，而且谁也察觉不到。
 */
import path from "node:path";

export const APP_DIR_NAME = "蒜狸小助手";

export interface Roots {
  /** 用户数据根：放 `Projects/`、`output_files/`。HILO_DATA_DIR 可覆盖。 */
  dataRoot: string;
  /** 新建工作区默认落在这里。 */
  projectsRoot: string;
  /** 项目空间（`.projects/<folderName>/`）。 */
  projectSpacesRoot: string;
  /** 应用级 gateway 的输出目录。 */
  outputDir: string;
  /** agent 家目录：profile 同步、用户级 skills。HILO_DATA_DIR 可覆盖。 */
  hubRoot: string;
}

export function resolveRoots(o: { env: NodeJS.ProcessEnv; home: string; userData: string }): Roots {
  const custom = o.env.HILO_DATA_DIR?.trim() || undefined;
  const dataRoot = custom ?? path.join(o.home, "Movies", APP_DIR_NAME);
  const projectsRoot = path.join(dataRoot, "Projects");
  return {
    dataRoot,
    projectsRoot,
    projectSpacesRoot: path.join(projectsRoot, ".projects"),
    outputDir: custom ? path.join(custom, "output_files") : path.join(o.userData, "output_files"),
    hubRoot: custom ?? path.join(o.home, ".ovhub"),
  };
}

/** 另一个应用的数据位置。只读比对，从不访问。 */
export function foreignRoots(home: string): string[] {
  return [
    path.join(home, "Movies", "Hub"),
    path.join(home, ".hub"),
    path.join(home, "Library", "Application Support", "@hilo"),
  ];
}

export function isForeignAppPath(p: string, home: string): boolean {
  const target = path.resolve(p).toLowerCase();
  return foreignRoots(home).some((root) => {
    const r = path.resolve(root).toLowerCase();
    return target === r || target.startsWith(r + path.sep);
  });
}
