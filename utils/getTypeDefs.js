const getTypeDef = (name, schema, imageKeys) => {
  const local = imageKeys.includes(name) ? 'local: File @link(by: "id", from: "local___NODE")' : ''
  return `
    type ${name} implements Node {
      ${schema}
      ${local}
    }
  `
}

module.exports = (schemas, imageKeys) => {
  return Object.keys(schemas)
    .map(key => getTypeDef(key, schemas[key], imageKeys))
}
