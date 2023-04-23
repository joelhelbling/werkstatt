// import { fs, cd, chalk } from 'zx/globals'

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

async function reportGitStatus(werkzeug) {
  let startingCwd = process.cwd()
  $.verbose = false
  cd(werkzeug)
  let gitStatus = await $`git status --porcelain`
  cd(startingCwd)
  $.verbose = true
  let gStat = gitStatus.length > 0 ? `changed [${gitStatus}]` : "clean"
  console.log(chalk.green(`  ◆ ...git status: ${gStat}`))
}

async function ensureBauenYaml(werkzeug) {
  let bauenYaml = `${werkzeug}/bauen.yaml`
  if (! fs.existsSync(bauenYaml)) {
    raise(`${bauenYaml} not found`)
  }
  let bauen = YAML.parse(
    await fs.readFile(bauenYaml, 'utf8')
  )
  if (bauen.tasks == null) {
    raise(`${bauenYaml} has no tasks`)
  }
  console.log(chalk.green("  ◆ ...bauen.yaml present"))
  return bauen
}

async function uniqueToken() {
  $.verbose = false
  let hash = await $`head /dev/urandom | md5sum | head -c 6`
  $.verbose = true
  let dateStr = new Date().toISOString().replace(/[-\.\:]/g, '')
  return `${dateStr}_${hash}`
}

async function backupTarget(target) {
  let backupLocation = `${target}.bak.${await uniqueToken()}` 
  $`mv ${target.replace(/^~/, '$HOME')} ${backupLocation.replace(/^~/, '$HOME')}`
  console.log(chalk.green("  ◆ ...backed up original"))
}

export async function runConfig(werkzeug) {
  await reportGitStatus(werkzeug)
  let bauen = await ensureBauenYaml(werkzeug)
  bauen.tasks.forEach(async task => {
    if (task.preserve_original) {
      await backupTarget(task.target)
    }
  })

  console.log(chalk.green(`  ◆ ...configured`))
}
