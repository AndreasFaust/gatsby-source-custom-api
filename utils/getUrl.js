const urlErrorMessage = 'Url-Error. Please require a valid Url.'

module.exports = (env, url) => {
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
