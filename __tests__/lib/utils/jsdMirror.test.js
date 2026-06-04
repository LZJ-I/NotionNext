import {
  rewriteStaticAssetUrl,
  rewriteStaticAssetValue
} from '@/lib/utils/jsdMirror'

const options = {
  enabled: true,
  cdnPrefix: 'https://cdn.jsdmirror.com'
}

describe('rewriteStaticAssetUrl', () => {
  it('rewrites jsdelivr npm URLs', () => {
    expect(
      rewriteStaticAssetUrl(
        'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
        options
      )
    ).toBe('https://cdn.jsdmirror.com/npm/jquery@3.7.1/dist/jquery.min.js')
  })

  it('rewrites unpkg URLs to npm paths', () => {
    expect(
      rewriteStaticAssetUrl(
        'https://unpkg.com/valine@1.5.1/dist/Valine.min.js',
        options
      )
    ).toBe('https://cdn.jsdmirror.com/npm/valine@1.5.1/dist/Valine.min.js')
  })

  it('rewrites cdnjs ajax library URLs to npm paths', () => {
    expect(
      rewriteStaticAssetUrl(
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
        options
      )
    ).toBe(
      'https://cdn.jsdmirror.com/ajax/libs/font-awesome/6.4.2/css/all.min.css'
    )
  })

  it('rewrites raw GitHub static files to gh paths', () => {
    expect(
      rewriteStaticAssetUrl(
        'https://raw.githubusercontent.com/user/repo/main/dist/app.js',
        options
      )
    ).toBe('https://cdn.jsdmirror.com/gh/user/repo@main/dist/app.js')
  })

  it('does not rewrite normal navigation links', () => {
    expect(
      rewriteStaticAssetUrl('https://github.com/notionnext-org/NotionNext', options)
    ).toBe('https://github.com/notionnext-org/NotionNext')
  })

  it('respects the enable switch', () => {
    expect(
      rewriteStaticAssetUrl(
        'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
        { ...options, enabled: false }
      )
    ).toBe('https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js')
  })
})

describe('rewriteStaticAssetValue', () => {
  it('recursively rewrites arrays and objects', () => {
    expect(
      rewriteStaticAssetValue(
        {
          scripts: [
            'https://cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.min.js'
          ]
        },
        options
      )
    ).toEqual({
      scripts: ['https://cdn.jsdmirror.com/npm/gitalk@1/dist/gitalk.min.js']
    })
  })
})
