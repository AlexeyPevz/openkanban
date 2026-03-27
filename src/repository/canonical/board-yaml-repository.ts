import { readFile } from "node:fs/promises"
import { join } from "node:path"

import YAML from "yaml"

import { BoardSchema, type AgentRegistry, type Board, type BoardRepository } from "../contracts.js"
import { atomicWrite } from "../write/atomic-write.js"

function pickBoardNode(input: unknown): unknown {
  if (typeof input !== "object" || input === null) {
    return input
  }

  const record = input as Record<string, unknown>
  return record.board ?? input
}

export class BoardYamlRepository implements BoardRepository {
  constructor(private readonly rootDir: string) {}

  private getBoardPath(): string {
    return join(this.rootDir, ".tasks", "board.yml")
  }

  async loadBoard(): Promise<Board> {
    const rawBoard = await readFile(this.getBoardPath(), "utf8")
    const parsedBoard = YAML.parse(rawBoard)

    return BoardSchema.parse(pickBoardNode(parsedBoard))
  }

  async updateAgentRegistry(transform: (registry: AgentRegistry) => AgentRegistry): Promise<Board> {
    const board = await this.loadBoard()
    const nextRegistry = transform(board.agent_registry)
    const updatedBoard = BoardSchema.parse({
      ...board,
      agent_registry: nextRegistry,
    })

    await atomicWrite(this.getBoardPath(), YAML.stringify({ board: updatedBoard }))

    return updatedBoard
  }
}
