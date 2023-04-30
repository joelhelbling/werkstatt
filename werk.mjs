#!/usr/bin/env zx

import { argv, chalk, fs, which, YAML } from 'zx'
import { ensureAvailable, log, reportGitStatus, runConfig } from './utilities/base.mjs'

function checkingGit() {
  return (argv._.includes('git') || argv._.includes('g'))
}

// verbose output
function checkVerbose() {
  return !!process.env.DEBUG ||
    !!process.env.VERBOSE ||
    argv.debug ||
    argv.d ||
    argv.verbose
}

function checkHelp() {
  return argv.h ||
    argv.help ||
    argv._.includes('help') ||
    argv._.includes('h')
}

if (checkHelp()) {
  console.log(`Werkstatt - a dotfiles configuration utility

 usage: werk [--verbose | -d | --debug] [-h | --help] [<command>]

 When no command is given, all toolsets (werkzeuge) will be checked for
 availability and then configured.

 To just check the git status of each toolset:
    git
`)
  process.exit(0)
}

console.log("Bauen ze werkzeuge!")

$.verbose = checkVerbose()

$.cwd = process.cwd()

// ensure dependencies
const deps = ['git', 'rg']
deps.forEach(dep => {
  which.sync(dep)
})

// let manifest = "./example.manifest.yaml"
const manifestFile = "./manifest.yaml"
const manifest = YAML.parse(await fs.readFile(manifestFile, 'utf8'))
for (const source of manifest) {
  const werkzeug = await ensureAvailable(source)
  const gitChanges = await reportGitStatus(werkzeug)
  if (checkingGit()) {
    log.complete('all done', werkzeug)
  } else {
    await runConfig(werkzeug)
  }
}
