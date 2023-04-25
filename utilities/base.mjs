// import { fs, cd, chalk } from 'zx/globals'

function raise(msg) {
  console.error(chalk.redBright(msg))
  process.exit(1)
}

async function ensureGit(remote) {
  let werkzeug = `./werkzeuge/${remote.replace(/\.git$/, '').split('/').at(-1)}`

  if (! fs.existsSync(werkzeug)) {
    await cd('./werkzeuge')
    await $`git clone ${remote}`
    await cd('..')
  }
  await cd(werkzeug)
  await $`git fetch origin`
  await cd('../../')
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
  cd(werkzeug)
  let gitStatus = await $`git status --porcelain`
  cd(startingCwd)
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
  let hash = await $`head /dev/urandom | md5sum | head -c 6`
  let dateStr = new Date().toISOString().replace(/[-\.\:]/g, '')
  return `${dateStr}_${hash}`
}

function isAlreadyLinked(werkzeug, task) {
  let target = detildify(task.target)
  let source = path.resolve(werkzeug, detildify(task.source))
  if (! fs.existsSync(target)) {
    return false
  }
  let isLink = fs.lstatSync(target).isSymbolicLink()
  if (isLink && fs.readlinkSync(target) == source) {
    return true
  } else {
    console.log(chalk.red(`----- isLink: ${isLink}, ${fs.readlinkSync(target)} != ${source}`))
    return false
  }
}

async function backupTarget(task) {
  if (task.preserve_original) {
    let target = detildify(task.target)
    if (fs.existsSync(target)) {
      let token = await uniqueToken()
      let backupLocation = `${target}.bak.${token}`
      await $`mv ${target} ${backupLocation}`
      console.log(chalk.green("  ◆ ...backed up original"))
    }
  }
}

export function detildify(p) {
  return p.replace(new RegExp("^~/"), os.homedir() + '/')
}

async function makeSymbolicLink(werkzeug, task) {
  let source = path.resolve(werkzeug, detildify(task.source))
  let target = path.resolve(detildify(task.target))
  await $`ln -s ${source} ${target}`
  console.log(chalk.green("  ◆ ...linked"))
}

export async function runConfig(werkzeug) {
  await reportGitStatus(werkzeug)
  let bauen = await ensureBauenYaml(werkzeug)
  await bauen.tasks.forEach(async task => {
    switch (task.operation) {
      case 'link':
        if (isAlreadyLinked(werkzeug, task)) {
          console.log(chalk.green("  ◆ ...was already linked"))
        } else {
          await backupTarget(task)
          await makeSymbolicLink(werkzeug, task)
        }
        break
      case 'script':
        console.log(chalk.yellow("  ◆ ...script not implemented yet"))
        break
      default:
        raise(`Don't know how to do operation: ${task.operation}`)
    }
  })

  console.log(chalk.green(`  ◆ ...configured`))
}
