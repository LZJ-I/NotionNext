/**
 * CDN 镜像配置
 */
module.exports = {
  JSDMIRROR_ENABLE:
    process.env.NEXT_PUBLIC_JSDMIRROR_ENABLE === undefined
      ? true
      : process.env.NEXT_PUBLIC_JSDMIRROR_ENABLE,
  JSDMIRROR_CDN_PREFIX:
    process.env.NEXT_PUBLIC_JSDMIRROR_CDN_PREFIX ||
    'https://cdn.jsdmirror.com'
}
