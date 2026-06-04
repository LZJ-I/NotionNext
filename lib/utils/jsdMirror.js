const DEFAULT_CDN_PREFIX = 'https://cdn.jsdmirror.com'

const JSDMIRROR_HOSTS = new Set(['cdn.jsdmirror.com', 'cdn.jsdmirror.cn'])

const JSDMIRROR_PATH_PREFIXES = [
  '/npm/',
  '/gh/',
  '/wp/',
  '/combine/',
  '/cnb/'
]

const STATIC_EXT_RE =
  /\.(js|mjs|css|json|map|wasm|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif|ico|mp3|mp4|webm|ogg)(?:$|[?#])/i

const normalizeBoolean = value => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value !== 'false'
  return value !== false
}

const getDefaultOptions = () => ({
  enabled: normalizeBoolean(process.env.NEXT_PUBLIC_JSDMIRROR_ENABLE),
  cdnPrefix: process.env.NEXT_PUBLIC_JSDMIRROR_CDN_PREFIX || DEFAULT_CDN_PREFIX
})

const normalizeCdnPrefix = prefix => {
  const value = prefix || DEFAULT_CDN_PREFIX
  return value.endsWith('/') ? value.slice(0, -1) : value
}

const makeJsdMirrorUrl = (path, originalUrl, options = {}) => {
  const cdnPrefix = normalizeCdnPrefix(options.cdnPrefix)
  const result = `${cdnPrefix}${path}${originalUrl.search}${originalUrl.hash}`
  if (originalUrl.__protocolRelative) {
    return result.replace(/^https?:\/\//i, '//')
  }
  return result
}

const parseUrl = value => {
  if (typeof value !== 'string' || !value.trim()) return null
  const rawValue = value.trim()
  const protocolRelative = rawValue.startsWith('//')
  const maybeUrl = protocolRelative ? `https:${rawValue}` : rawValue

  try {
    const url = new URL(maybeUrl)
    url.__protocolRelative = protocolRelative
    return url
  } catch (error) {
    if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(rawValue)) {
      const url = new URL(`https://${rawValue}`)
      url.__protocolRelative = false
      return url
    }
  }

  return null
}

const isSupportedJsdMirrorPath = pathname =>
  JSDMIRROR_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))

const isJsdelivrHost = hostname =>
  hostname === 'cdn.jsdelivr.net' ||
  hostname === 'fastly.jsdelivr.net' ||
  hostname === 'gcore.jsdelivr.net' ||
  hostname.endsWith('.jsdelivr.net')

const mapAjaxLibsPath = pathname => {
  const match = pathname.match(/^\/ajax\/libs\/(.+)$/i)
  if (!match) return null
  return `/ajax/libs/${match[1]}`
}

const mapStaticFilePath = pathname => {
  const ajaxLibsPath = mapAjaxLibsPath(pathname)
  if (ajaxLibsPath) return ajaxLibsPath
  if (!STATIC_EXT_RE.test(pathname)) return null
  return `/ajax/libs${pathname.startsWith('/') ? pathname : `/${pathname}`}`
}

const mapGithubPathToJsdMirror = (url, fromRawHost = false) => {
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length < 4) return null
  const [owner, repo, modeOrRef, ...rest] = segments

  if (fromRawHost) {
    const filePath = rest.join('/')
    if (!STATIC_EXT_RE.test(filePath)) return null
    return `/gh/${owner}/${repo}@${modeOrRef}/${filePath}`
  }

  if (modeOrRef !== 'blob' && modeOrRef !== 'raw') return null
  const [ref, ...fileSegments] = rest
  const filePath = fileSegments.join('/')
  if (!ref || !filePath || !STATIC_EXT_RE.test(filePath)) return null
  return `/gh/${owner}/${repo}@${ref}/${filePath}`
}

export const rewriteStaticAssetUrl = (value, options = {}) => {
  const defaultOptions = getDefaultOptions()
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    enabled: normalizeBoolean(
      options.enabled === undefined ? defaultOptions.enabled : options.enabled
    )
  }

  if (!mergedOptions.enabled || typeof value !== 'string') {
    return value
  }

  const url = parseUrl(value)
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    return value
  }

  const hostname = url.hostname.toLowerCase()
  const pathname = url.pathname

  if (JSDMIRROR_HOSTS.has(hostname)) {
    return value
  }

  if (isJsdelivrHost(hostname) && isSupportedJsdMirrorPath(pathname)) {
    return makeJsdMirrorUrl(pathname, url, mergedOptions)
  }

  if (hostname === 'unpkg.com' || hostname === 'www.unpkg.com') {
    return makeJsdMirrorUrl(`/npm${pathname}`, url, mergedOptions)
  }

  if (
    hostname === 'cdnjs.cloudflare.com' ||
    hostname === 'cdnjs.snrat.com' ||
    hostname === 's4.zstatic.net' ||
    hostname === 'cdn.bootcdn.net'
  ) {
    const mappedPath = mapAjaxLibsPath(pathname)
    if (mappedPath) return makeJsdMirrorUrl(mappedPath, url, mergedOptions)
  }

  if (
    hostname === 'cdn.staticfile.net' ||
    hostname === 'cdn.staticfile.org'
  ) {
    const mappedPath = mapStaticFilePath(pathname)
    if (mappedPath) return makeJsdMirrorUrl(mappedPath, url, mergedOptions)
  }

  if (hostname === 'ajax.googleapis.com') {
    const mappedPath = mapAjaxLibsPath(pathname)
    if (mappedPath) return makeJsdMirrorUrl(mappedPath, url, mergedOptions)
  }

  if (hostname === 'raw.githubusercontent.com') {
    const mappedPath = mapGithubPathToJsdMirror(url, true)
    if (mappedPath) return makeJsdMirrorUrl(mappedPath, url, mergedOptions)
  }

  if (hostname === 'github.com') {
    const mappedPath = mapGithubPathToJsdMirror(url)
    if (mappedPath) return makeJsdMirrorUrl(mappedPath, url, mergedOptions)
  }

  return value
}

export const rewriteStaticAssetValue = (value, options = {}) => {
  if (typeof value === 'string') {
    return rewriteStaticAssetUrl(value, options)
  }

  if (Array.isArray(value)) {
    return value.map(item => rewriteStaticAssetValue(item, options))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        rewriteStaticAssetValue(item, options)
      ])
    )
  }

  return value
}
