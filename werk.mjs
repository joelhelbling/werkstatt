#!/usr/bin/env zx

import 'zx/globals'
import { ensureAvailable, runConfig } from './utilities/base.mjs'

// check for dependencies
let deps = ['git']
deps.forEach(dep => {
  which.sync(dep)
})

// let manifest = "./example.manifest.yaml"
let manifestFile = "./manifest.yaml"
let manifest = YAML.parse(
  await fs.readFile(manifestFile, 'utf8')
)

// source ./utilities/base.sh

// some "tests"
// ensureAvailable("git@github.com:me/you.git")
// ensureAvailable("https://github.com/me/us")
// ensureAvailable("http://github.com/me/them.git")
// ensureAvailable("./moo")
// ensureAvailable("../moo")
// ensureAvailable("/moo")
// ensureAvailable("moo/cow")
// ensureAvailable("bogus")
// process.exit(0)

console.log("Bauen ze werkzeuge!")
manifest.forEach(async source => {
  console.log(chalk.blueBright(`• ${source}`))
  let werkzeug = await ensureAvailable(source)
  runConfig(werkzeug)
})

