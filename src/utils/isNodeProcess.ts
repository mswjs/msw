export function isNode() {
  return Object.prototype.toString.call(global.process) === '[object process]'
}
