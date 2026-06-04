import { rewriteStaticAssetUrl } from '@/lib/utils/jsdMirror'
import { useEffect } from 'react'

const ATTRIBUTES = ['src', 'href', 'data-src', 'srcset']
const SELECTOR = [
  'script[src]',
  'link[href]',
  'img[src]',
  'source[src]',
  'source[srcset]',
  'iframe[src]'
].join(',')

const rewriteSrcset = value => {
  if (typeof value !== 'string') return value
  return value
    .split(',')
    .map(part => {
      const trimmed = part.trim()
      const [url, ...descriptor] = trimmed.split(/\s+/)
      return [rewriteStaticAssetUrl(url), ...descriptor].join(' ')
    })
    .join(', ')
}

const rewriteAttribute = (element, attribute) => {
  const value = element.getAttribute(attribute)
  if (!value) return
  const nextValue =
    attribute === 'srcset'
      ? rewriteSrcset(value)
      : rewriteStaticAssetUrl(value)
  if (nextValue !== value) {
    element.setAttribute(attribute, nextValue)
  }
}

const rewriteElement = element => {
  if (!element || typeof element.matches !== 'function') return
  if (!element.matches(SELECTOR)) return
  for (const attribute of ATTRIBUTES) {
    rewriteAttribute(element, attribute)
  }
}

const patchSetAttribute = () => {
  const proto = Element.prototype
  if (proto.__jsdMirrorSetAttributePatched) return () => {}

  // 保存原型方法，后面用 call 绑定到当前元素。
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalSetAttribute = proto.setAttribute
  proto.setAttribute = function patchedSetAttribute(name, value) {
    const attribute = String(name).toLowerCase()
    const nextValue =
      attribute === 'srcset'
        ? rewriteSrcset(value)
        : ATTRIBUTES.includes(attribute)
          ? rewriteStaticAssetUrl(value)
          : value
    return originalSetAttribute.call(this, name, nextValue)
  }
  proto.__jsdMirrorSetAttributePatched = true

  return () => {
    proto.setAttribute = originalSetAttribute
    delete proto.__jsdMirrorSetAttributePatched
  }
}

export default function JSDMirrorResourceHijack() {
  useEffect(() => {
    const unpatchSetAttribute = patchSetAttribute()
    document.querySelectorAll(SELECTOR).forEach(rewriteElement)

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          rewriteElement(mutation.target)
          continue
        }
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return
          rewriteElement(node)
          node.querySelectorAll?.(SELECTOR).forEach(rewriteElement)
        })
      }
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ATTRIBUTES
    })

    return () => {
      observer.disconnect()
      unpatchSetAttribute()
    }
  }, [])

  return null
}
