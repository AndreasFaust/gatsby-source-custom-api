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
      url: entity.data.url,
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
      modified: entity.data.modified
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
    url: 'https://via.placeholder.com/100.jpg/0000FF/FFFFFF?Text=Dummy',
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
      if (entity.data.dummy || !entity.data.url) {
        return Promise.resolve({
          ...entity,
          links: {
            ...entity.links,
            local___NODE: dummyImageNode.id
          }
        })
      }

      const imageCacheKey = `local-image-${entity.data.url}`
      const cachedImage = await cache.get(imageCacheKey)
      // If we have cached image and it wasn't modified, reuse
      // previously created file node to not try to redownload
      if (cachedImage && entity.data.modified && entity.data.modified === cachedImage.modified) {
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
