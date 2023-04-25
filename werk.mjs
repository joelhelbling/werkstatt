#!/usr/bin/env zx

import { chalk, fs, which, YAML } from 'zx'
import { ensureAvailable, runConfig } from './utilities/base.mjs'

// verbose output
$.verbose = !!process.env.DEBUG || !!process.env.VERBOSE

// ensure dependencies
let deps = ['git']
deps.forEach(dep => {
  which.sync(dep)
})

// let manifest = "./example.manifest.yaml"
let manifestFile = "./manifest.yaml"
let manifest = YAML.parse(await fs.readFile(manifestFile, 'utf8'))
console.log("Bauen ze werkzeuge!")
manifest.forEach(async source => {
  console.log(chalk.blueBright(`• ${source}`))
  let werkzeug = await ensureAvailable(source)
  runConfig(werkzeug)
})

