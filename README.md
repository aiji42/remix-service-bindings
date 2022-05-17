# remix-service-bindings

This is a plugin for using cloudflare workers [service bindings](https://developers.cloudflare.com/workers/learning/using-services/) in Remix.

![](https://user-images.githubusercontent.com/6711766/168193222-d314552a-9e02-419f-85b7-2fdaf2ff3087.png)

**Script size must be kept under 1 megabyte to deploy to Cloudflare Workers. By splitting services and connecting them with service bindings, they are freed from that limitation.**

Automatically split scripts during production deployment and deploy to two workers.

One side receives access at the edge. But it does not have loader and action logic, it just SSRs the React component.  
The other holds the loader and action logic on behalf of the edge and is called from the edge by the service binding.  
In other words, the bundle size per worker can be reduced because it is automatically divided into two groups: workers with design-related libraries, such as UI libraries, and workers with logic and libraries for processing server-side data.

This worker isolation process is handled by esbuild plug-ins, so the developer does not need to be aware of any control over it.

![](https://user-images.githubusercontent.com/6711766/168193751-8ee86790-6a72-4a95-b0b1-8c89e5e199fe.png)

## Install

You need `wrangler >= 2.0.0`.

```bash
npm install -D wrangler remix-service-bindings remix-esbuild-override
```

## Setup

```js
// remix.config.js
const { withEsbuildOverride } = require("remix-esbuild-override");
const remixServiceBindings = require("remix-service-bindings").default;

withEsbuildOverride((option, { isServer }) => {
  if (isServer) {
    option.plugins = [
      /**
       * remixServiceBindings
       * @param isEdgeSide {boolean} - When this is true, the build is for edge (binder) and when false, the build is for bindee.
       *                               (Deployment (build) must be done in two parts.)
       * @param bindingsName {string} - The bind name set in toml. This name will be converted to a bind object.
       * @param enabled {boolean} - If this is false, this plugin is disabled.
       */
      remixServiceBindings(!process.env.BINDEE, "BINDEE", !!process.env.DEPLOY),
      ...option.plugins,
    ];
  }

  return option;
});

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  serverBuildTarget: "cloudflare-workers",
  server: "./server.js",
  devServerBroadcastDelay: 1000,
  ignoredRouteFiles: ["**/.*"],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
};
```

server.js

```js
import { createEventHandler } from "@remix-run/cloudflare-workers";
import * as build from "@remix-run/dev/server-build";

addEventListener(
  "fetch",
  createEventHandler({
    build,
    mode: process.env.NODE_ENV,
    getLoadContext: (event) => {
      return { event };
    },
  })
);
```

wrangler.edge.toml

```toml
# wrangler.toml
name = "your-service-name"

compatibility_date = "2022-05-11"

account_id = ""
workers_dev = true
main = "./build/index.js"

[[unsafe.bindings]]
name = "BINDEE"
type = "service"
service = "your-bindee-service-name"
environment = "production"

[site]
bucket = "./public"

[build]
command = "DEPLOY=true npm run build"
```

wrangler.bindee.toml

```toml
# wrangler.bindee.toml
name = "your-bindee-service-name"

compatibility_date = "2022-05-11"

account_id = ""
workers_dev = true
main = "./build/index.js"

[site]
bucket = "./public"

[build]
command = "DEPLOY=true BINDEE=true npm run build"
```

package.json

```json
"scripts": {
  "deploy:edge": "wrangler publish -c wrangler.edge.toml",
  "deploy:bindee": "wrangler publish -c wrangler.bindee.toml",
}
```

## Deploy

```bash
npm run deploy:bindee
rm -rf public/build
npm run deploy:edge
```

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/aiji42/remix-service-bindings/blob/main/LICENSE) file for details
