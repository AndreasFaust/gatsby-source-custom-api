const { createRemoteFileNode } = require('gatsby-source-filesystem')

function isImageKey(key, imageKeys) {
    return imageKeys.includes(key)
}

async function createImageNodes({
    entity, createNode, createNodeId, store, cache, imageCacheKey
}) {
    let fileNode
    try {
        fileNode = await createRemoteFileNode({
            url: entity.url,
            store,
            cache,
            createNode,
            createNodeId,
        })
    } catch (e) {
        console.log(e)
    }
    if (fileNode) {
        await cache.set(imageCacheKey, {
            fileNodeID: fileNode.id,
            modified: entity.modified,
        })

        return {
            ...entity,
            local___NODE: fileNode.id,
        }
    }
    return entity
}

async function loadImages({
    entities, imageKeys, createNode, createNodeId, store, cache, touchNode
}) {
    return Promise.all(
        entities.map(async (entity) => {
            if (!isImageKey(entity.internal.type, imageKeys) || !entity.url) {
                return Promise.resolve(entity)
            }

            const imageCacheKey = `local-image-${entity.url}`
            const cachedImage = await cache.get(imageCacheKey)
            // If we have cached image and it wasn't modified, reuse
            // previously created file node to not try to redownload
            if (cachedImage
                && entity.modified
                && entity.modified === cachedImage.modified
            ) {
                fileNodeID = cachedImage.fileNodeID
                touchNode({ nodeId: cachedImage.fileNodeID })
                return Promise.resolve({
                    ...entity,
                    local___NODE: fileNodeID,
                })
            }
            return createImageNodes({
                entity, createNode, createNodeId, store, cache, imageCacheKey
            })
        }),
    )
}

module.exports = loadImages
