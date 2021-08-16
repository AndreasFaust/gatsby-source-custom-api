const { createRemoteFileNode } = require('gatsby-source-filesystem')

function isImageKey (key, imageKeys) {
  return imageKeys.includes(key)
}

async function createImageNodes ({
  entity,
  createNode,
  createNodeId,
  store,
  cache,
  imageName,
  imageCacheKey,
  auth
}) {
  let fileNode
  try {
    fileNode = await createRemoteFileNode({
      url: entity.data.url,
      auth: { htaccess_user: auth.username, htaccess_pass:  auth.password },
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
      id: fileNode.id,
      modified: entity.data.modified,
      internal: {
          type: entity.name
      }
    })
    console.log('Image downloaded: ' + imageName)
    return {
      ...entity,
      links: {
        ...entity.links,
        local___NODE: fileNode.id
      }
    }
  }
  return entity
}

function extensionIsValid (url) {
  const ext = url.split('.').pop().split('/')[0]
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return true
    default:
      return false
  }
}

async function loadImages ({
  entities, imageKeys, createNode, createNodeId, store, cache, touchNode
}) {
  return Promise.all(
    entities.map(async (entity) => {
      if (!isImageKey(entity.name, imageKeys) || !entity.data.url) {
        return Promise.resolve(entity)
      }
      if (!extensionIsValid(entity.data.url)) {
        console.log(`Image-Extension not valid: ${entity.data.url}`)
        return Promise.resolve(entity)
      }
      const imageName = entity.data.url.match(/([^/]*)\/*$/)[1]
      const imageCacheKey = `local-image-${imageName}`
      const cachedImage = await cache.get(imageCacheKey)
      // If we have cached image and it wasn't modified, reuse
      // previously created file node to not try to redownload
      if (
        cachedImage &&
        entity.data.modified &&
        entity.data.modified === cachedImage.modified
      ) {
        const { id } = cachedImage
        touchNode(cachedImage)
        console.log('Image from Cache: ' + imageName)
        return Promise.resolve({
          ...entity,
          links: {
            ...entity.links,
            local___NODE: id
          }
        })
      }
      return createImageNodes({
        entity,
        createNode,
        createNodeId,
        store,
        cache,
        imageName,
        imageCacheKey,
        auth
      })
    })
  )
}

module.exports = loadImages
