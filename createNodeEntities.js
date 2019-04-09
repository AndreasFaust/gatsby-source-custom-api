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

function isRestricted (key) {
  const restrictedNodeFields = ['id', 'children', 'parent', 'fields', 'internal']
  if (restrictedNodeFields.includes(key)) {
    console.log(`The key "${key}" is restricted in GraphQl!`)
    return false
  }
  return true
}

function getChildNodeKeys ({ nodeData, schemas }) {
  if (!nodeData) return []
  return Object.keys(nodeData).filter((key) => {
    if (isObject(nodeData[key])) return isRestricted(key)
    if (isArray(nodeData[key])) {
      if (!nodeData[key].length && schemas[key]) return true
      if (isObject(nodeData[key][0])) return isRestricted(key)
    }
    return false
  })
}

function getNodeDataWithoutChildEntities (nodeData, childNodeKeys) {
  const newData = { ...nodeData }
  childNodeKeys.forEach((key) => {
    delete newData[key]
  })
  return newData
}

function buildEntity ({
  nodeName, nodeData, schemas, isDummy, createNodeId
}) {
  const childNodeKeys = getChildNodeKeys({ nodeData, schemas })
  const childEntities = flattenArray(
    childNodeKeys.map(key => (
      createNodeEntities({ key, value: nodeData[key], schemas, isDummy, createNodeId })
    ))
  )

  const nodeDataWithoutChildEntities = getNodeDataWithoutChildEntities(nodeData, childNodeKeys)
  const entityNodeLinks = getEntityNodeLinks(childEntities, nodeData)

  const nodeEntity = {
    id: createNodeId(nodeName + createId()),
    name: nodeName,
    data: { ...nodeDataWithoutChildEntities, dummy: !!isDummy },
    links: entityNodeLinks,
    dummy: isDummy,
    childEntities
  }
  return [
    nodeEntity
  ]
}

// same file because of circulat dependency

function createNodeEntitiesFromArray ({
  name, elements, schemas, isDummy, createNodeId
}) {
  if (!elements.length && schemas[name]) {
    return buildEntity({
      nodeName: name,
      nodeData: schemas[name],
      schemas: schemas[name],
      isDummy: true,
      createNodeId
    })
  }
  const entitiesArray = elements.map(element => buildEntity({
    nodeName: name,
    nodeData: element,
    schemas,
    isDummy,
    createNodeId
  }))
  return flattenArray(entitiesArray)
}

function createNodeEntitiesFromObject ({
  key, value, schemas, isDummy, createNodeId
}) {
  return buildEntity({
    nodeName: key,
    nodeData: value,
    schemas,
    isDummy,
    createNodeId
  })
}

function createNodeEntities ({
  key, value, schemas, isDummy, createNodeId
}) {
  if (typeof value === 'object') {
    if (isArray(value)) {
      return createNodeEntitiesFromArray({
        name: key,
        elements: value,
        schemas,
        isDummy,
        createNodeId
      })
    }
    return createNodeEntitiesFromObject({
      key,
      value,
      schemas,
      isDummy,
      createNodeId
    })
  }
  return []
}

module.exports = createNodeEntities
