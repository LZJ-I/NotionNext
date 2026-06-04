'use client'

import { isBrowser } from '@/lib/utils'
import { rewriteStaticAssetUrl } from '@/lib/utils/jsdMirror'

/**
 * 自定义外部 script
 * 传入参数将转为 <script>标签。
 * @returns
 */
const ExternalScript = props => {
  const { src } = props
  const resourceSrc = rewriteStaticAssetUrl(src)
  if (!isBrowser || !resourceSrc) {
    return null
  }

  const element = document.querySelector(`script[src="${resourceSrc}"]`)
  if (element) {
    return null
  }
  const script = document.createElement('script')
  Object.entries(props).forEach(([key, value]) => {
    script.setAttribute(key, key === 'src' ? resourceSrc : value)
  })
  document.head.appendChild(script)
  // console.log('加载外部脚本', props, script)
  return null
}

export default ExternalScript
