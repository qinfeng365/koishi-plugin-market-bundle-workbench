# koishi-plugin-market-bundle-workbench

`market-bundle-workbench` is a developer workbench for creating Koishi Market NEXT plugin bundles (`koishi-plugin-pa-*`).

It helps authors assemble a bundle manifest, validate npm metadata, generate `package.json` / `koishi.bundle` / README snippets, and run `npm pack --dry-run` before publishing.

The workbench is intentionally separate from `koishi-plugin-market-next`: Market NEXT installs and manages bundles, while this plugin helps developers build them.

## Features

- Optional Console page, controlled by `enableWorkbench`.
- Generate npm-valid bundle package metadata.
- Validate package names, versions, semver ranges, duplicate members, self references, direct cycles, npm existence, and published versions.
- Pick installed plugins as members or enter package names manually.
- Edit required/optional members and preset config JSON.
- Generate dry-run and publish commands without storing npm tokens.

## Usage

1. Install and enable this plugin in Koishi.
2. Turn on `enableWorkbench`.
3. Open **插件包工作台** in the Console.
4. Build the member list, validate, generate files, then run the suggested npm commands in your project.

The first version does not publish packages directly. It only generates files and commands so authors can review the final output.
