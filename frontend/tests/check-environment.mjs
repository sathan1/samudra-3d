import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const resolved = {}
for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
  const actual = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8'))
  assert.equal(actual.version, version, `${name} direct pin`)
  assert.equal(lock.packages[`node_modules/${name}`].version, version, `${name} lock`)
  resolved[name] = { version: actual.version, engines: actual.engines, peerDependencies: actual.peerDependencies, peerDependenciesMeta: actual.peerDependenciesMeta }
}
assert.equal(resolved.react.version, '18.3.1')
assert.equal(resolved['react-dom'].version, '18.3.1')
console.log(JSON.stringify({ timestamp: new Date().toISOString(), node: process.version, platform: process.platform, architecture: process.arch, packages: resolved, result: 'PASS' }, null, 2))
