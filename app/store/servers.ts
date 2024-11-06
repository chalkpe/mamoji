import { atomWithStorage } from 'jotai/utils'

export const serversAtom = atomWithStorage<string[]>('servers', [])