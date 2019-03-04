const isArray = require('lodash/isArray')
const { createId, isObject, flattenArray } = require('./utils/helpers')

function getEntitiyNodeLinks(entities, nodeData) {
  // if (entities.length === 0) return {}
  const links = {}
  entities.forEach((entity) => {
    const { type } = entity.internal
    // if (type === 'content') {
    //   console.log(nodeData)
    //   console.log(type)
    // }
    const name = type + '___NODE'
    if (links[name]) {
      links[name] = isArray(links[name])
        ? [...links[name], entity.id]
        : [links[name], entity.id]
      // check if node-content is an array.
      // if so, make the link also an array, to avoid conflicts,
      // when you have node-content-arrays with just one element
    } else if (isArray(nodeData[type])) {
      links[name] = [entity.id]
    } else {
      links[name] = entity.id
    }
  })
  return links
}

function isRestricted(key) {
  const restrictedNodeFields = ['id', 'children', 'parent', 'fields', 'internal']
  if (restrictedNodeFields.includes(key)) {
    console.log(`The key "${key}" is restricted in GraphQl!`)
    return false
  }
  return true
}

function getChildNodeKeys(nodeData) {
  if (!nodeData) return []
  return Object.keys(nodeData).filter((key) => {
    if (isObject(nodeData[key])) return isRestricted(key)
    if (isArray(nodeData[key])) {
      if (isObject(nodeData[key][0])) return isRestricted(key)
    }
    return false
  })
}

function getChildEntities({
  nodeData, createNode, createNodeId, createContentDigest, childNodeKeys,
}) {
  // childNodeKeys.map(key => console.log(nodeData[key]))
  return childNodeKeys.map(key => (
    createNodeEntities({
      key,
      value: nodeData[key],
      createNode,
      createNodeId,
      createContentDigest,
    })
  ))
}

function getNodeDataWithoutChildEntities(nodeData, childNodeKeys) {
  const newData = { ...nodeData }
  childNodeKeys.forEach((key) => {
    delete newData[key]
  })
  return newData
}

// Helper function that processes a photo to match Gatsby's node structure
function buildNode({
  nodeName, nodeData, createNode, createNodeId, createContentDigest,
}) {
  const childNodeKeys = getChildNodeKeys(nodeData)
  const childEntities = flattenArray(getChildEntities({
    nodeData, createNode, createNodeId, createContentDigest, childNodeKeys,
  }))
  const nodeDataWithoutChildEntities = getNodeDataWithoutChildEntities(nodeData, childNodeKeys)

  const entitiyNodeLinks = getEntitiyNodeLinks(childEntities, nodeData)

  const nodeId = createNodeId(nodeName + createId())
  const nodeContent = JSON.stringify(nodeData)
  const nodeEntity = {
    ...nodeDataWithoutChildEntities,
    ...entitiyNodeLinks,
    ...{
      id: nodeId,
      childEntities, // childentities get flattened at the end!
      // type: nodeName,
      // url: nodeData.url,
      parent: null,
      children: [],
      internal: {
        type: nodeName,
        url: nodeData && nodeData.url,
        content: nodeContent,
        contentDigest: createContentDigest(nodeData),
      },
    },
  }
  return [
    nodeEntity,
  ]
}


// same file because of circulat dependency

function createNodeEntitiesFromArray({
  name, elements, createNode, createNodeId, createContentDigest,
}) {
  const entitiesArray = elements.map(element => buildNode({
    nodeName: name,
    nodeData: element,
    createNode,
    createNodeId,
    createContentDigest,
  }))
  return flattenArray(entitiesArray)
}

function createNodeEntitiesFromObject({
  key, value, createNode, createNodeId, createContentDigest,
}) {
  return buildNode({
    nodeName: key,
    nodeData: value,
    createNode,
    createNodeId,
    createContentDigest,
  })
}

function createNodeEntities({
  key, value, createNode, createNodeId, createContentDigest,
}) {
  if (typeof value === 'object') {
    if (isArray(value)) {
      return createNodeEntitiesFromArray({
        name: key,
        elements: value,
        createNode,
        createNodeId,
        createContentDigest,
      })
    }
    return createNodeEntitiesFromObject({
      key,
      value,
      createNode,
      createNodeId,
      createContentDigest,
    })
  }
  return []
}

module.exports = createNodeEntities
