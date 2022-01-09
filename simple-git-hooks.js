module.exports = {
  'pre-commit': 'yarn lint-staged',
  'prepare-commit-msg': `grep -qE '^[^#]' .git/COMMIT_EDITMSG || (exec < /dev/tty && yarn cz --hook || true)`,
  'commit-msg': 'yarn commitlint --edit $1',
}
