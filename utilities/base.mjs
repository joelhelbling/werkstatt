// import { fs, cd } from 'zx/globals'

function raise(msg) {
  console.error(chalk.redBright(msg))
  process.exit(1)
}

async function ensureGit(remote) {
  let werkzeug = `./werkzeuge/${remote.replace(/\.git$/, '').split('/').at(-1)}`
  if (! fs.existsSync(werkzeug)) {
    cd('./werkzeuge')
    $`git clone ${remote}`
    cd('..')
  }
  return werkzeug
}

async function ensureLocal(werkzeug) {
  if (! fs.existsSync(werkzeug)) {
    raise(`  ⧱ ...werkzeug not found: ${werkzeug}`)
  } else if (! fs.statSync(werkzeug).isDirectory()) {
    raise(`  ⧱ ...werkzeug path is not a directory: ${werkzeug}`)
  }
  console.log(chalk.green(`  ◆ ...available`))
  return werkzeug
}

export async function ensureAvailable(source) {
  let werkzeug;
  if (source.match(/^git@/) || source.match("^https?:\/\/")) {
    return ensureGit(source)
  } else if (source.match(/^[\.\/]/)) {
    return ensureLocal(source)
  } else if (source.match(/^[^\/]+\/[^\/]+$/)) {
    return ensureGit(`git@github.com:${source}`)
  } else {
    raise(`I don't understand this source: ${source}`)
  }
}

async function gitStatus(werkzeug) {
  let startingCwd = process.cwd()
  cd(werkzeug)
  let gitStatus = await $`git status --porcelain`
  cd(startingCwd)
  return gitStatus.length > 0 ? `changed [${gitStatus}]` : "clean"
}

export async function runConfig(werkzeug) {
  let gStat = await gitStatus(werkzeug)
  console.log(chalk.green(`  ◆ ...git status: ${gStat}`))
  console.log(chalk.green(`  ◆ ...configured`))
}
