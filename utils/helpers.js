function createId() {
    return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase()
}

function isObject(element) {
    if (!element) return false
    if (typeof element !== 'object') return false
    if (element instanceof Array) return false
    return true
}

function flattenArray(array) {
    return [].concat(...array)
}

module.exports = {
    createId,
    isObject,
    flattenArray,
}
