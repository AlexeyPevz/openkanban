import { rename, rm, writeFile } from "node:fs/promises"

export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp`
  await writeFile(tempPath, content, "utf8")
  await rm(filePath, { force: true })
  await rename(tempPath, filePath)
}
