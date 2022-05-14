import { Project, VariableDeclarationKind } from "ts-morph";
import path from "path";
import fs from "fs";
import type { Loader, Plugin } from "esbuild";

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
});

const plugin = (
  isEdge: boolean,
  bindingName: string,
  active = false,
  option?: {
    appDirectory?: string;
  }
): Plugin => ({
  name: "remix-service-bindings",
  setup(build) {
    if (!active) return;
    const appRoot = (option?.appDirectory || "app").replace(/^\/|\/$/g, "");
    const filter = new RegExp(
      `${appRoot}/(routes/.*|root|entry\\.server)\\.[jt]sx?$`
    );
    build.onLoad(
      {
        filter,
      },
      async (args) => {
        const { ext, name } = path.parse(args.path);
        if (isEdge && name.startsWith("__")) return;

        const src = project.createSourceFile(
          `tmp${ext}`,
          fs.readFileSync(args.path, "utf8"),
          { overwrite: true }
        );

        if (isEdge) {
          const replaced: string[] = [];
          src.getExportedDeclarations().forEach((node, key) => {
            if (["loader", "action"].includes(key)) {
              node.forEach((n) => "remove" in n && n.remove());
              replaced.push(key);
            }
          });
          src.getExportDeclarations().forEach((node) => {
            node.getNamedExports().forEach((node) => {
              if (["action", "loader"].includes(node.getName())) node.remove();
            });
          });

          if (replaced.length > 0) {
            src.addVariableStatement({
              declarationKind: VariableDeclarationKind.Const,
              declarations: replaced.map((key) => ({
                name: key,
                initializer: `async ({ context }) => await ${bindingName}.fetch(context.event.request.clone())`,
              })),
              isExported: true,
            });
          }
        }

        if (!isEdge) {
          src.getExportedDeclarations().forEach((node, key) => {
            if (["ErrorBoundary", "CatchBoundary", "default"].includes(key))
              node.forEach((n) => "remove" in n && n.remove());
          });
          src.getExportDeclarations().forEach((node) => {
            node.getNamedExports().forEach((node) => {
              if (["ErrorBoundary", "CatchBoundary"].includes(node.getName()))
                node.remove();
            });
          });
          src.removeDefaultExport();
          if (new RegExp(`${appRoot}/root\\.[jt]sx?$`).test(args.path)) {
            src.addFunction({
              name: "Root",
              parameters: undefined,
              statements: "return null",
              isDefaultExport: true,
            });
          }
        }

        return {
          contents: src.getFullText(),
          loader: ext.replace(/^\./, "") as Loader,
          resolveDir: path.dirname(args.path),
        };
      }
    );
  },
});

export default plugin;
