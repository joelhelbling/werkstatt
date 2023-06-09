import { fs, path, chalk, os, YAML } from 'zx'
import ld from 'lodash'
const { merge, trimEnd } = ld

function cleanWZ(topic) {
  const pattern = new RegExp("^./werkzeuge/")
  topic = topic.replace(pattern, '')
  return topic.replace(/^werkzeug-/, '')
}

export const log = {
  info:     (msg, topic = "") => console.log(chalk.blueBright(`   [${cleanWZ(topic)}] ${msg}`)),
  progress: (msg, topic = "") => console.log(chalk.green(`   [${cleanWZ(topic)}] ${msg}`)),
  complete: (msg, topic = "") => console.log(chalk.greenBright(`   [${cleanWZ(topic)}] ${msg}`)),
  warning:  (msg, topic = "") => console.log(chalk.yellowBright(`   [${cleanWZ(topic)}] ${msg}`)),
  error:    (msg, topic = "") => console.log(chalk.redBright(`   [${cleanWZ(topic)}] !!! ${msg} !!!`))
}

function raise(msg) {
  log.error(msg)
  process.exit(1)
}

async function ensureGit(remote) {
  const werkzeug = `./werkzeuge/${remote.replace(/\.git$/, '').split('/').at(-1)}`
  log.info(`remote: ${remote}`, werkzeug)

  if (! fs.existsSync(werkzeug)) {
    await $`cd ./werkzeuge && git clone ${remote}`
  }
  await $`cd ${werkzeug} && git fetch origin`
  return werkzeug
}

async function ensureLocal(werkzeug) {
  if (! fs.existsSync(werkzeug)) {
    raise('werkzeug not found', werkzeug)
  } else if (! fs.statSync(werkzeug).isDirectory()) {
    raise('werkzeug path is not a directory', werkzeug)
  }
  log.progress('available', werkzeug)
  return werkzeug
}

export async function ensureAvailable(source) {
  let werkzeug;
  if (source.match(/^git@/) || source.match("^(https?|ssh):\/\/")) {
    return await ensureGit(source)
  } else if (source.match(/^[\.\/]/)) {
    return await ensureLocal(source)
  } else if (source.match(/^[^\/]+\/[^\/]+$/)) {
    return await ensureGit(`git@github.com:${source}`)
  } else {
    raise(`I don't understand this source: ${source}`)
  }
}

export async function reportGitStatus(werkzeug) {
  const gitStatus = trimEnd(
    (await $`cd ${werkzeug} && git status --porcelain`).stdout
  ).split(/\n/).join(', ')
  if (gitStatus.length > 0) {
    log.warning(`git status: ${gitStatus}`, werkzeug)
  } else {
    log.progress('git status: clean', werkzeug)
  }
}

async function ensureBauenYaml(werkzeug) {
  const bauenYaml = `${werkzeug}/bauen.yaml`
  if (! fs.existsSync(bauenYaml)) {
    raise(`${bauenYaml} not found`, werkzeug)
  }
  const bauen = YAML.parse(fs.readFileSync(bauenYaml, 'utf8'))
  if (bauen.tasks == null) {
    raise(`${bauenYaml} has no tasks`, werkzeug)
  }
  log.progress('bauen.yaml present', werkzeug)
  return bauen
}

async function uniqueToken() {
  const hash = await $`head /dev/urandom | md5sum | head -c 6`
  const dateStr = new Date().toISOString().replace(/[-\.\:]/g, '')
  return `${dateStr}_${hash}`
}

function isAlreadyLinked(task) {
  const werkzeug = task.werkzeug
  const target = path.resolve(werkzeug, detildify(task.target))
  const source = path.resolve(werkzeug, detildify(task.source))
  if (! fs.existsSync(target)) {
    return false
  }
  const isLink = fs.lstatSync(target).isSymbolicLink()
  if (isLink && fs.readlinkSync(target) == source) {
    return true
  } else {
    return false
  }
}

async function backupTarget(task) {
  if (task.preserve_original) {
    const target = path.resolve(task.werkzeug, detildify(task.target))
    if (fs.existsSync(target)) {
      const token = await uniqueToken()
      const backupLocation = `${target}.bak.${token}`
      await $`mv ${target} ${backupLocation}`
      log.progress('backed up original', task.werkzeug)
    }
  }
}

export function detildify(p) {
  return p.replace(new RegExp("^~/"), os.homedir() + '/')
}

async function linkOperation(werkzeug, task) {
  const source = path.resolve(werkzeug, detildify(task.source))
  const target = path.resolve(werkzeug, detildify(task.target))
  await $`ln -s ${source} ${target}`
  log.progress('linked', werkzeug)
}

async function copyOperation(werkzeug, task) {
  const source = path.resolve(werkzeug, detildify(task.source))
  const target = path.resolve(werkzeug, detildify(task.target))
  await $`cp -f ${source} ${target}`
  log.progress('copied', werkzeug)
}

async function mergeYamlOperation(werkzeug, task) {
  const target = path.resolve(werkzeug, detildify(task.target))
  const targetFound = false
  const targetYaml = YAML.parse(
    fs.readFileSync(target, 'utf8'),
    { keepSourceTokens: true }
  )
  const mergedYaml = merge(targetYaml, task.changes)
  fs.writeFileSync(target, YAML.stringify(mergedYaml, { keepSourceTokens: true }))
  log.progress('yaml merged', werkzeug)
}

async function scriptOperation(werkzeug, task) {
  log.warning('script not implemented yet', werkzeug)
}

export async function runConfig(werkzeug) {
  const uname = os.platform()
  const bauen = await ensureBauenYaml(werkzeug)
  for (const task of bauen.tasks) {
    task.werkzeug = werkzeug
    if (! task.uname || uname === task.uname) {
      switch (task.operation) {
        case 'link':
          if (isAlreadyLinked(task)) {
            log.progress('was already linked', werkzeug)
          } else {
            await backupTarget(task)
            await linkOperation(werkzeug, task)
          }
          break
        case 'copy':
          await copyOperation(werkzeug, task)
          break
        case 'merge_yaml':
          await mergeYamlOperation(werkzeug, task)
          break
        case 'script':
          await scriptOperation(werkzeug, task)
          break
        default:
          raise(`Don't know how to do operation: ${task.operation}`, werkzeug)
      }
    }
  }

  log.complete('configured', werkzeug)
}
