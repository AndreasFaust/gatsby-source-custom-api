const { createId, isObject, flattenArray, isArray } = require('./utils/helpers')

function getEntityNodeLinks (entities, nodeData) {
  const links = {}
  entities.forEach((entity) => {
    const { name } = entity
    const linkName = name + '___NODE'
    if (links[linkName]) {
      links[linkName] = isArray(links[linkName])
        ? [...links[linkName], entity.id]
        : [links[linkName], entity.id]
      // check if node-content is an array.
      // if so, make the link also an array, to avoid conflicts,
      // when you have node-content-arrays with just one element
    } else if (isArray(nodeData[name])) {
      links[linkName] = [entity.id]
    } else {
      links[linkName] = entity.id
    }
  })
  return links
}

function getChildNodeKeys (data) {
  if (!data) return []
  return Object.keys(data).filter((key) => {
    if (isObject(data[key])) return true
    if (isArray(data[key])) return true
    return false
  })
}

function getDataWithoutChildEntities (data, childNodeKeys) {
  const newData = { ...data }
  childNodeKeys.forEach((key) => {
    delete newData[key]
  })
  return newData
}

function buildEntity ({
  name, data, schemas, createNodeId
}) {
  const childNodeKeys = getChildNodeKeys(data)
  const childEntities = flattenArray(
    childNodeKeys.map(key => (
      createNodeEntities({
        name: key,
        data: data[key],
        schemas,
        createNodeId
      })
    ))
  )
  const dataWithoutChildEntities = getDataWithoutChildEntities(data, childNodeKeys)
  const entityNodeLinks = getEntityNodeLinks(childEntities, data)

  return [{
    id: createNodeId(name + createId()),
    name,
    data: dataWithoutChildEntities,
    links: entityNodeLinks,
    childEntities
  }]
}

// same file because of circulat dependency

function normalizeData (name, data, schemas) {
  const schema = { ...schemas[name] }
  if (!schema) return data
  if (!Object.keys(data).length) return { ...schema, dummy: true }

  const dataNormalized = { ...data }
  Object.keys(schema).forEach(schemaKey => {
    if (!dataNormalized[schemaKey]) {
      dataNormalized[schemaKey] = schema[schemaKey]
    }
  })
  return dataNormalized
}

function createNodeEntitiesFromArray ({
  name, elements, createNodeId, schemas
}) {
  if (!elements.length && schemas[name]) {
    return buildEntity({
      name,
      data: { ...schemas[name], dummy: true },
      schemas,
      createNodeId
    })
  }
  const entitiesArray = elements.map(data => buildEntity({
    name,
    data: normalizeData(name, data, schemas),
    schemas,
    createNodeId
  }))
  return flattenArray(entitiesArray)
}

function createNodeEntitiesFromObject ({
  name, data, schemas, createNodeId
}) {
  return buildEntity({
    name,
    data: normalizeData(name, data, schemas),
    schemas,
    createNodeId
  })
}

function createNodeEntities ({
  name, data, createNodeId, schemas
}) {
  console.log(data)
  if (isArray(data)) {
    return createNodeEntitiesFromArray({
      name,
      elements: data,
      schemas,
      createNodeId
    })
  }
  if (isObject(data)) {
    return createNodeEntitiesFromObject({
      name,
      data,
      schemas,
      createNodeId
    })
  }
  return []
}

module.exports = createNodeEntities
