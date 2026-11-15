// src/test/setup.js
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// testing-library only auto-registers cleanup when vitest globals are
// enabled; with explicit imports we wire it up here.
afterEach(cleanup)