const fetch = require('node-fetch')
const createNodeEntities = require('./createNodeEntities')
const normalizeKeys = require('./utils/normalizeKeys')
const flattenEntities = require('./utils/flattenEntities')
const loadImages = require('./utils/loadImages')
const getUrl = require('./utils/getUrl')
const getTypeDefs = require('./utils/getTypeDefs')
const buildNode = require('./utils/buildNode')

exports.createSchemaCustomization = async (
  {
    actions, createNodeId, createContentDigest, store, cache
  },
  configOptions
) => {
  const { createNode, createTypes, touchNode } = actions
  const {
    url,
    headers,
    auth,
    rootKey = 'customAPI',
    imageKeys = ['image'],
    schemas = {}
  } = configOptions

  const URL = getUrl(process.env.NODE_ENV, url)
  const data = await fetch(URL, { headers }).then(res => res.json()).catch(err => console.log(err))

  const typeDefs = getTypeDefs(schemas, imageKeys)
  createTypes(typeDefs)

  // build entities and correct schemas, where necessary
  let entities = flattenEntities(createNodeEntities({
    name: rootKey,
    data,
    schemas,
    createNodeId
  }))

  // check for problematic keys
  entities = entities.map(entity => ({
    ...entity,
    data: normalizeKeys(entity.data)
  }))

  // load images or default-dummy-image
  entities = await loadImages({
    entities, imageKeys, createNode, createNodeId, touchNode, store, cache, createContentDigest, auth
  })

  // build gatsby-node-object
  entities = entities.map(entity => buildNode({ entity, createContentDigest }))

  // render nodes
  entities.forEach((entity) => {
    createNode(entity)
  })
}
