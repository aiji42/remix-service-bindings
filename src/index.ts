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
    exclude?: RegExp;
  }
): Plugin => ({
  name: "remix-service-bindings",
  setup(build) {
    if (!active) return;
    build.onLoad(
      {
        filter: new RegExp(
          `${(option?.appDirectory || "app").replace(
            /^\/|\/$/g,
            ""
          )}/routes/.*\\.(jsx?|tsx?)$`
        ),
      },
      async (args) => {
        if (option?.exclude && option.exclude.test(args.path)) return;

        const { ext } = path.parse(args.path);
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
            if (key === "default")
              node.forEach((n) => "remove" in n && n.remove());
          });
          src.removeDefaultExport();
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
