
const fetch = require('node-fetch')
const createNodeEntities = require('./createNodeEntities')
const normalizeKeys = require('./utils/normalizeKeys')
const flattenEntities = require('./utils/flattenEntities')
const loadImages = require('./utils/loadImages')

const urlErrorMessage = 'Url-Error. Please require a valid Url.'

function getUrl (env, url) {
  if (!url) {
    console.log(urlErrorMessage)
    return
  }
  if (typeof url === 'string') return url
  const URL = env === 'production'
    ? url.production
    : url.development
  if (URL) return URL
  console.log(urlErrorMessage)
}

function buildNode ({
  entity: { id, name, data, links, childEntities },
  createNodeId,
  createContentDigest
}) {
  return {
    ...data,
    ...links,
    id,
    childEntities, // childentities get flattened at the end!
    parent: null,
    children: [],
    internal: {
      type: name,
      url: data && data.url,
      content: JSON.stringify(data),
      contentDigest: createContentDigest(data)
    }
  }
}

exports.sourceNodes = async (
  {
    actions, createNodeId, createContentDigest, store, cache
  },
  configOptions
) => {
  const { createNode, touchNode } = actions
  const {
    url,
    rootKey = 'customAPI',
    imageKeys = ['image'],
    schemas = {}
  } = configOptions

  const URL = getUrl(process.env.NODE_ENV, url)
  const data = await fetch(URL).then(res => res.json())

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
    entities, imageKeys, createNode, createNodeId, touchNode, store, cache, createContentDigest
  })

  // build gatsby-node-object
  entities = entities.map(entity => buildNode({ entity, createContentDigest }))

  // render nodes
  entities.forEach((entity) => {
    createNode(entity)
  })
}
