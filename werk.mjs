#!/usr/bin/env zx

import { chalk, fs, which, YAML } from 'zx'
import { ensureAvailable, runConfig } from './utilities/base.mjs'

// verbose output
$.verbose = !!process.env.DEBUG || !!process.env.VERBOSE

$.cwd = process.cwd()

// ensure dependencies
let deps = ['git']
deps.forEach(dep => {
  which.sync(dep)
})

// let manifest = "./example.manifest.yaml"
let manifestFile = "./manifest.yaml"
let manifest = YAML.parse(await fs.readFile(manifestFile, 'utf8'))
console.log("Bauen ze werkzeuge!")
for (const werkzeug of manifest) {
  await runConfig(werkzeug)
}
