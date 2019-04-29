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

function getChildNodeKeys (data,  schemas) {
  if (!data) return []
  return Object.keys(data).filter((key) => {
    if (isObject(data[key])) return true
    // if (isArray(data[key])) return true
    if (isArray(data[key])) {
      if (isObject(data[key][0]) || schemas[key]) {
        return true
      }
    }
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

function validateChildData (name, data, schemas) {
  const validData = {}
  Object.keys(data).forEach(key => {
    if (isArray(data[key]) && !data[key].length) {
      if (schemas.hasOwnProperty(key)) {
        validData[key] = [schemas[key]]
      }
    } else {
      validData[key] = data[key]
    }
  })
  return validData
}

function buildEntity ({
  name, data, schemas, createNodeId
}) {
  const childNodeKeys = getChildNodeKeys(data, schemas)
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
  const validChildData = validateChildData(name, dataWithoutChildEntities, schemas)
  const entityNodeLinks = getEntityNodeLinks(childEntities, data)
  return [{
    id: createNodeId(name + createId()),
    name,
    data: validChildData,
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
