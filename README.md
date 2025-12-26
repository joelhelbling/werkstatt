# werkstatt

_Werkstatt_ means "workshop" in German, and its the name I've chosen for this coordinating repository which is able to install and configure development tools whose configurations are stored in other repositories whose structure and artifacts conform to a the _werkzeug_ schema, which will be defined below.

By convention, those other tool configuration repositories can use the word _werkzeug_ as a prefix. _Workzeug_ is a German word which means "tool" or "toolset".  The conventional form takes the following format: `werkzeug-<toolname>`. For example, for a Neovim configuration, we could use the name `werkzeug-neovim`.  We _could_ use that name, as this is a recommended convention.  Howerver, in practice it is possible to use any name.

## werkzeug
A `werkzeug` tool config repository will likely contain dotfiles or other config files in many cases.  It could also contian scripts which perform other changes, and it should contain indications to this `werkstatt` program for things such as backing up pre-existing artifacts which will be modified or replaced.

Besides whole dotfiles or config files, a `werkzeug` repository needs a `bauen.yaml` (again with the German, _bauen_ means "build").  The `bauen.yaml` is a declarative instruction for how to setup the relevant tool.

Here is a possible `bauen.yaml` for setting up a Neovim configuration:

```yaml
---
tasks:
  - location: ~/.config/nvim
    source: ./source/config_nvim/
    operation: link # possible operations: link, copy, append, script
    preserve_original: true
  - location: ~/.bashrc
    source: ./source/bachrc_config.sh
    operation: append
    preserve_original: false
```

This YAML file would tell `werkstatt` to:

1. backup ~/.config/nvim (if it exists)
2. create a symbolic link at ~/.config/nvim which points to this repository's `./source/config_nvim/` directory

## configuring werkstatt

Of course, `werkstatt` needs to know which `werkzeug`s to setup, and where to find them.  For this purpose, we need a `manifest.yaml` in the root of the `werkstatt` working directory.  The manifest is (and should be) ignored by Git, however, there is an `example.manifest.yaml` in the root of this project.  The manifest should look something like this:

```yaml
---
- joelhelbling/werkzeug-alacritty
- joelhelbling/werkzeug-neovim
- joelhelbling/werkzeug-fish
- git@gitea.my-server.com:me/werkzeug-bash.git
- ../dev/tools/werkzeug-starship
```

In the first three items in this example, the resource being referenced is in a Github repository.  Werkstatt knows how to knows how to retrieve those repositories, and will clone them into a subdirectory in this working directory called `./werkzeuge/` (you guessed it, plural for `werkzeug`).  Anything that looks like <github user>/<repo> will be presumed to be a Github repo.

In the fourth item above, we have a git remote.  We can use anything here which will work as an argument to pass to `git clone`.

In that last item, instead of cloning that int `./werkzeuge/`, werkstatt will go and look for it in that directory.  Basically, any werkzeug which starts with a linux directory-related symbol (i.e. "/", ".", or "..") will be assumed to already be cloned into that location.

You can edit the manifest yourself, or you use the `./werk` script:

```shell
$ ./werk add joelhelbling/werkzeug-tmuxp
```

...which does the same thing.

## using werkstatt

Werkstatt is designed to be idempotent, and so the first time, and anytime, you can simply type `./werk`, which does these things, for each of the `werkzeug` in included in the manifest:

### 1. ensure the `werkzeug` is present

If not present, the action will depend on what kind of entry it is.  If it is a Github repo or a valid git remote, `werkstatt` will clone it into the `./werkzeuge/` subdirectory.  If it is a local working directory, but the local directory isn't there, `werkstatt` will halt and display a helpful error.

### 2. ensure the `werkzeug` is configured

Using the `bauen.yaml` the `werkzeug`'s root, `werkstatt` will make sure the `werkzeug` is setup properly.  For links, it will confirm the link points to the right place.  For copies, it will confirm the target and the source have an empty diff.  For appended content to other files, it will confir the appended content exists in the file (grep).

### 3. report non-empty git status

`werkstatt` will do a `git fetch` in each `workzeug` working directory, and then build a report which shows:

- count of commits ahead or behind
- nonzero number of lines in changeset
- nonzero number of untracked files
- git state (e.g. the working directory is mid-rebase, detatched HEAD, etc)

This makes it easier to keep all the `werkzeug` local working directories synced and up to date.  As an additional convenience, you can use `./werk` to quickly jump into a particular `werkzeug` like so: `./werk neovim` which effectively does this: `pushd <path_to>/werkzeug-neovim`.  Or alternatively you can type `./werk next` which will jump to the first out-of-sync `werkzeug` directory so that you can resolve by pulling, pushing, committing, or other git activities.

## dependencies

`werkstatt` depends on the following:

- git - for cloning git repos and other git operations
- [yq](https://github.com/mikefarah/yq) - for parsing YAML files
- rg - ripgrep
