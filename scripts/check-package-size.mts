import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { brotliCompressSync, gzipSync } from "node:zlib"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const packagesDir = path.join(rootDir, "packages")

const formatSize = (bytes) => {
  return `${(bytes / 1024).toFixed(2)}kb`
}

const resolveEsbuildModulePath = async () => {
  const pnpmDir = path.join(rootDir, "node_modules", ".pnpm")

  if (!existsSync(pnpmDir)) {
    throw new Error(
      "Could not find pnpm virtual store. Run `pnpm install` before checking package size.",
    )
  }

  const entries = await readdir(pnpmDir, { withFileTypes: true })
  const esbuildEntry = entries.find(
    (entry) => entry.isDirectory() && entry.name.startsWith("esbuild@"),
  )

  if (!esbuildEntry) {
    throw new Error("Could not resolve `esbuild`. Add it as a dependency or run `pnpm install`.")
  }

  return path.join(pnpmDir, esbuildEntry.name, "node_modules", "esbuild", "lib", "main.js")
}

const getEsbuild = async () => {
  const esbuildModulePath = await resolveEsbuildModulePath()
  return import(pathToFileURL(esbuildModulePath).href)
}

const esbuildPromise = getEsbuild()

const minifyFile = async (file: Buffer) => {
  const { transform } = await esbuildPromise
  const result = await transform(file.toString("utf8"), {
    format: "esm",
    legalComments: "none",
    minify: true,
    sourcemap: false,
    target: "es2022",
  })

  return Buffer.from(result.code)
}

const getBundlePaths = async () => {
  const packageEntries = await readdir(packagesDir, { withFileTypes: true })
  const bundlePaths = []

  for (const packageEntry of packageEntries) {
    if (!packageEntry.isDirectory()) {
      continue
    }

    const distDir = path.join(packagesDir, packageEntry.name, "dist")

    if (!existsSync(distDir)) {
      continue
    }

    const distEntries = await readdir(distDir, { withFileTypes: true })

    for (const distEntry of distEntries) {
      if (!distEntry.isFile() || !distEntry.name.endsWith(".mjs")) {
        continue
      }

      bundlePaths.push(path.join(distDir, distEntry.name))
    }
  }

  return bundlePaths.sort()
}

const checkFileSize = async (filePath) => {
  const file = await readFile(filePath)
  const minifiedFile = await minifyFile(file)
  const relativePath = path.relative(rootDir, filePath)

  console.log(
    `${relativePath} raw:${formatSize(file.length)} / min:${formatSize(minifiedFile.length)} / gzip:${formatSize(gzipSync(minifiedFile).length)} / brotli:${formatSize(brotliCompressSync(minifiedFile).length)}`,
  )
}

const main = async () => {
  const bundlePaths = await getBundlePaths()

  if (bundlePaths.length === 0) {
    throw new Error(
      "No built package bundles found. Run `pnpm build` before checking package size.",
    )
  }

  for (const bundlePath of bundlePaths) {
    await checkFileSize(bundlePath)
  }
}

await main()
