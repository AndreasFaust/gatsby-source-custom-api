
const fetch = require('node-fetch')
const createNodeEntities = require('./createNodeEntities')
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

function normalizeEntity (entity) {

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

  let entities = flattenEntities(createNodeEntities({
    key: rootKey,
    value: data,
    schemas,
    createNodeId
  }))

  entities = entities.map(entity => normalizeEntity(entity))

  entities = await loadImages({
    entities, imageKeys, createNode, createNodeId, touchNode, store, cache, createContentDigest
  })

  entities = entities.map(entity => buildNode({ entity, createContentDigest }))

  entities.forEach((entity) => {
    createNode(entity)
  })
}
