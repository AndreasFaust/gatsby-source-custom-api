const { createRemoteFileNode } = require('gatsby-source-filesystem')

function isImageKey(key, imageKeys) {
    return imageKeys.includes(key)
}

async function createImageNodes({
    entity, createNode, createNodeId, store, cache,
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
        return {
            ...entity,
            local___NODE: fileNode.id,
        }
    }
    return entity
}

async function loadImages({
    entities, imageKeys, createNode, createNodeId, store, cache,
}) {
    return Promise.all(
        entities.map(async (entity) => {
            if (isImageKey(entity.internal.type, imageKeys)) {
                return createImageNodes({
                    entity, createNode, createNodeId, store, cache,
                })
            }
            return Promise.resolve(entity)
        }),
    )
}

module.exports = loadImages
