import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { brotliCompressSync, gzipSync } from "node:zlib"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const packagesDir = path.join(rootDir, "packages")

const formatSize = (bytes) => {
  return `${(bytes / 1024).toFixed(2)}kb`
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
  const relativePath = path.relative(rootDir, filePath)

  console.log(
    `${relativePath} min:${formatSize(file.length)} / gzip:${formatSize(gzipSync(file).length)} / brotli:${formatSize(brotliCompressSync(file).length)}`,
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
