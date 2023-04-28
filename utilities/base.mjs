import { fs, path, chalk, os } from 'zx'
import ld from 'lodash'
const { merge } = ld

function cleanWZ(topic) {
  const pattern = new RegExp("^./werkzeuge/")
  topic = topic.replace(pattern, '')
  return topic.replace(/^werkzeug-/, '')
}

const log = {
  info:     (msg, topic = "") => console.log(chalk.blueBright(`   [${cleanWZ(topic)}] ${msg}`)),
  progress: (msg, topic = "") => console.log(chalk.green(`   [${cleanWZ(topic)}] ${msg}`)),
  complete: (msg, topic = "") => console.log(chalk.greenBright(`   [${cleanWZ(topic)}] ${msg}`)),
  warning:  (msg, topic = "") => console.log(chalk.yellow(`   [${cleanWZ(topic)}] ${msg}`)),
  error:    (msg, topic = "") => console.log(chalk.redBright(`   [${cleanWZ(topic)}] !!! ${msg} !!!`))
}

function raise(msg) {
  log.error(msg)
  process.exit(1)
}

async function ensureGit(remote) {
  let werkzeug = `./werkzeuge/${remote.replace(/\.git$/, '').split('/').at(-1)}`
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

async function reportGitStatus(werkzeug) {
  let gitStatus = await $`cd ${werkzeug} && git status --porcelain`
  let gStat = gitStatus.length > 0 ? `changed [${gitStatus}]` : "clean"
  log.progress(`git status: ${gStat}`, werkzeug)
}

async function ensureBauenYaml(werkzeug) {
  let bauenYaml = `${werkzeug}/bauen.yaml`
  if (! fs.existsSync(bauenYaml)) {
    raise(`${bauenYaml} not found`, werkzeug)
  }
  let bauen = YAML.parse(fs.readFileSync(bauenYaml, 'utf8'))
  if (bauen.tasks == null) {
    raise(`${bauenYaml} has no tasks`, werkzeug)
  }
  log.progress('bauen.yaml present', werkzeug)
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
      // TODO further up stream, calculate werkzeug and stash it in the task
      log.progress('backed up original', task.source)
    }
  }
}

export function detildify(p) {
  return p.replace(new RegExp("^~/"), os.homedir() + '/')
}

async function linkOperation(werkzeug, task) {
  let source = path.resolve(werkzeug, detildify(task.source))
  let target = path.resolve(detildify(task.target))
  await $`ln -s ${source} ${target}`
  log.progress('linked', werkzeug)
}

async function copyOperation(werkzeug, task) {
  let source = path.resolve(werkzeug, detildify(task.source))
  let target = path.resolve(werkzeug, detildify(task.target))
  await $`cp -f ${source} ${target}`
  log.progress('copied', werkzeug)
}

async function mergeYamlOperation(werkzeug, task) {
  let target = path.resolve(werkzeug, detildify(task.target))
  let targetFound = false
  let targetYaml = YAML.parse(
    fs.readFileSync(target, 'utf8'),
    { keepSourceTokens: true }
  )
  let mergedYaml = merge(targetYaml, task.changes)
  fs.writeFileSync(target, YAML.stringify(mergedYaml, { keepSourceTokens: true }))
  log.progress('yaml merged', werkzeug)
}

async function scriptOperation(werkzeug, task) {
  log.warning('script not implemented yet', werkzeug)
}

export async function runConfig(source) {
  let uname = os.platform()
  let werkzeug = await ensureAvailable(source)
  await reportGitStatus(werkzeug)
  let bauen = await ensureBauenYaml(werkzeug)
  for (const task of bauen.tasks) {
    if (! task.uname || uname === task.uname) {
      switch (task.operation) {
        case 'link':
          if (isAlreadyLinked(werkzeug, task)) {
            log.progress('was already linked', werkzeug)
          } else {
            await backupTarget(task).then(_ => linkOperation(werkzeug, task))
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
