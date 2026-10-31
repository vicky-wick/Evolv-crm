import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// lucide-react's barrel re-exports ~1500 icon modules, which makes builds very slow.
// Rewrite `import { A, B as C } from 'lucide-react'` into one import per icon file.
function lucideDirect() {
  const esm = join(dirname(createRequire(import.meta.url).resolve('lucide-react')), '..', 'esm')
  const files = {}
  for (const m of readFileSync(join(esm, 'lucide-react.js'), 'utf8').matchAll(/export \{([^}]+)\} from '\.\/icons\/([\w-]+)\.js'/g))
    for (const n of m[1].matchAll(/default as (\w+)/g)) files[n[1]] = join(esm, 'icons', m[2] + '.js').replace(/\\/g, '/')
  return {
    name: 'lucide-direct',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.jsx?$/.test(id) || id.includes('node_modules')) return
      return code.replace(/import \{([^}]+)\} from 'lucide-react'/g, (all, names) => {
        const parts = names.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.split(/\s+as\s+/))
        if (parts.some(([n]) => !files[n])) return all
        return parts.map(([n, alias]) => `import ${alias || n} from '${files[n]}'`).join('\n')
      })
    },
  }
}

export default defineConfig({ plugins: [lucideDirect(), react()], server: { port: 5173 } })
