import { vi } from 'vitest'

function suppressConsoleOutput(): void {
  return
}

vi.spyOn(console, 'assert').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'count').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'countReset').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'debug').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'dir').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'dirxml').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'error').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'group').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'groupCollapsed').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'groupEnd').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'info').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'log').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'table').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'time').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'timeEnd').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'timeLog').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'trace').mockImplementation(suppressConsoleOutput)
vi.spyOn(console, 'warn').mockImplementation(suppressConsoleOutput)
