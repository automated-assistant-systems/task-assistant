import fs from "fs";
import glob from "glob";

export function createTaskUtils(repoPath) {
  return {
    readFile(path) {
      return fs.readFileSync(path, "utf8");
    },

    writeFile(path, contents) {
      fs.writeFileSync(path, contents);
    },

    listFiles(pattern) {
      return glob.sync(pattern, { cwd: repoPath, absolute: true });
    },

    fileExists(path) {
      return fs.existsSync(path);
    },
  };
}
