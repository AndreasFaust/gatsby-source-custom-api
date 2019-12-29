module.exports = ({
  entity: { id, name, data, links, childEntities },
  createContentDigest
}) => {
  return {
    ...data,
    ...links,
    id,
    childEntities, // childentities get flattened at the end!
    parent: null,
    children: [],
    internal: {
      type: name,
      content: JSON.stringify(data),
      contentDigest: createContentDigest(data)
    }
  }
}
