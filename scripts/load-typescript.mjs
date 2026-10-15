import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

// Test-only loader: compile local TS with the existing compiler, no new runtime dependency.
const load = createRequire(import.meta.url);
const ts = load("typescript");
load.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
export { load };
