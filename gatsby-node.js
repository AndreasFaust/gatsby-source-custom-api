
const fetch = require('node-fetch')
const createNodeEntities = require('./createNodeEntities')
const flattenEntities = require('./utils/flattenEntities')
const loadImages = require('./utils/loadImages')

const urlErrorMessage = 'Url-Error. Please require a valid Url.'

function getUrl(env, url) {
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

exports.sourceNodes = async (
    {
        actions, createNodeId, createContentDigest, store, cache,
    },
    configOptions,
) => {
    const { createNode } = actions
    const {
        url,
        rootKey = 'jsonAPI',
        imageKeys = ['image'],
    } = configOptions
    const URL = getUrl(process.env.NODE_ENV, url)
    const data = await fetch(URL).then(res => res.json())

    let entities = flattenEntities(createNodeEntities({
        key: rootKey,
        value: data,
        createNode,
        createNodeId,
        createContentDigest,
    }))

    entities = await loadImages({
        entities, imageKeys, createNode, createNodeId, store, cache,
    })

    entities.forEach((entity) => {
        createNode(entity)
    })
}

