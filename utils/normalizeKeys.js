function isRestricted (key) {
  const restrictedKeys = ['id', 'children', 'parent', 'fields', 'internal']
  if (restrictedKeys.includes(key)) {
    console.log(`The key "${key}" is restricted in GraphQl!`)
    return `${key}__normalized`
  }
  return key
}

module.exports = function checkRestricted (data) {
  const dataNormalized = {}
  Object.keys(data).forEach(key => {
    dataNormalized[isRestricted(key)] = data[key]
  })
  return dataNormalized
}
