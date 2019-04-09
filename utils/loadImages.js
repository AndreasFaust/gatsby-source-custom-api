const { createRemoteFileNode } = require('gatsby-source-filesystem')
// const path = require('path')

function isImageKey (key, imageKeys) {
  return imageKeys.includes(key)
}

async function createImageNodes ({
  entity, createNode, createNodeId, store, cache, imageCacheKey, dummyImageNode
}) {
  let fileNode
  try {
    fileNode = await createRemoteFileNode({
      url: entity.url,
      store,
      cache,
      createNode,
      createNodeId
    })
  } catch (e) {
    console.log(e)
  }
  if (fileNode) {
    await cache.set(imageCacheKey, {
      fileNodeID: fileNode.id,
      modified: entity.modified
    })

    return {
      ...entity,
      links: {
        ...entity.links,
        local___NODE: fileNode.id
      }
    }
  }
  return {
    ...entity,
    links: {
      ...entity.links,
      local___NODE: dummyImageNode.id
    }
  }
}

async function loadImages ({
  entities, imageKeys, createNode, createNodeId, store, cache, touchNode
}) {
  let dummyImageNode = await createRemoteFileNode({
    // url: path.dirname(__filename) + '/dummy-image.jpg',
    url: 'https://picsum.photos/200/300/?random',
    store,
    cache,
    createNode,
    createNodeId,
    ext: '.jpg'
  })

  return Promise.all(
    entities.map(async (entity) => {
      if (!isImageKey(entity.name, imageKeys)) {
        return Promise.resolve(entity)
      }
      if (entity.dummy || !entity.url) {
        return Promise.resolve({
          ...entity,
          links: {
            ...entity.links,
            local___NODE: dummyImageNode.id
          }
        })
      }

      const imageCacheKey = `local-image-${entity.url}`
      const cachedImage = await cache.get(imageCacheKey)
      // If we have cached image and it wasn't modified, reuse
      // previously created file node to not try to redownload
      if (cachedImage && entity.modified && entity.modified === cachedImage.modified) {
        const { fileNodeID } = cachedImage
        touchNode({ nodeId: fileNodeID })
        return Promise.resolve({
          ...entity,
          links: {
            ...entity.links,
            local___NODE: fileNodeID
          }
        })
      }
      return createImageNodes({
        entity, createNode, createNodeId, store, cache, imageCacheKey, dummyImageNode
      })
    })
  )
}

module.exports = loadImages
