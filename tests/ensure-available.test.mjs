import { ensureAvailable } from '../utilities/base.mjs'

ensureAvailable("git@github.com:me/you.git")
ensureAvailable("https://github.com/me/us")
ensureAvailable("http://github.com/me/them.git")
ensureAvailable("./moo")
ensureAvailable("../moo")
ensureAvailable("/moo")
ensureAvailable("moo/cow")
ensureAvailable("bogus")
