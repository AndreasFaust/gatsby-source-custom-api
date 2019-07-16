function removeChildEntities (ent) {
  const { childEntities, ...rest } = ent
  return rest
}

function flattenEntities (entities, flat) {
  let flatEntities = flat || []
  entities.forEach((ent) => {
    flatEntities = [...flatEntities, removeChildEntities(ent)]
    if (ent.childEntities) {
      flatEntities = flattenEntities(ent.childEntities, flatEntities)
    }
  })
  return flatEntities
}

module.exports = flattenEntities
