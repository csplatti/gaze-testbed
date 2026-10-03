export class FakeElement {
  constructor(tagName, options = {}) {
    this.tagName = tagName.toUpperCase()
    this.dataset = {}
    this.attributes = new Map()
    this.children = []
    this.parentElement = null
    this._rect = { left: 0, top: 0, width: 0, height: 0, ...options.rect }
    this._visible = options.visible !== false
    this._style = { display: 'block', visibility: 'visible', opacity: '1', ...options.style }
    this._outerHTML = options.outerHTML

    if (options.component) this.setAttribute('data-component', options.component)
    if (options.role) this.setAttribute('role', options.role)
    if (options.source) this.setAttribute('data-source', options.source)
    if (options.gazeOverlay) this.setAttribute('data-gaze-overlay', 'true')
    if (options.gazeTarget) this.setAttribute('data-gaze-target', 'true')
    for (const [name, value] of Object.entries(options.attributes ?? {})) {
      this.setAttribute(name, value)
    }
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this
      this.children.push(child)
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value))
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      this.dataset[key] = String(value)
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null
  }

  closest(selector) {
    let current = this
    while (current) {
      if (selector === '[data-component]' && current.dataset.component) return current
      if (
        selector === '[data-gaze-overlay="true"]' &&
        current.dataset.gazeOverlay === 'true'
      ) return current
      current = current.parentElement
    }
    return null
  }

  getBoundingClientRect() {
    const { left, top, width, height } = this._rect
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }
  }

  getClientRects() {
    return this._visible && this._style.display !== 'none' && this._style.visibility !== 'hidden'
      ? [this.getBoundingClientRect()]
      : []
  }

  get outerHTML() {
    if (this._outerHTML !== undefined) return this._outerHTML
    const component = this.dataset.component
      ? ` data-component="${this.dataset.component}"`
      : ''
    return `<${this.tagName.toLowerCase()}${component}></${this.tagName.toLowerCase()}>`
  }
}

function flatten(element, result = []) {
  result.push(element)
  for (const child of element.children) flatten(child, result)
  return result
}

export function installFakeDom(children = []) {
  const html = new FakeElement('html')
  const body = new FakeElement('body')
  html.append(body)
  body.append(...children)

  let hitStack = []
  const document = {
    documentElement: html,
    body,
    querySelectorAll(selector) {
      if (selector !== '[data-component]') throw new Error(`Unsupported selector: ${selector}`)
      return flatten(html).filter((element) => Boolean(element.dataset.component))
    },
    elementsFromPoint() {
      return hitStack
    },
    setHitStack(elements) {
      hitStack = elements
    },
  }

  const previous = {
    Element: globalThis.Element,
    window: globalThis.window,
    document: globalThis.document,
  }
  globalThis.Element = FakeElement
  globalThis.window = {
    getComputedStyle(element) {
      return element._style
    },
  }
  globalThis.document = document

  return {
    document,
    restore() {
      if (previous.Element === undefined) delete globalThis.Element
      else globalThis.Element = previous.Element
      if (previous.window === undefined) delete globalThis.window
      else globalThis.window = previous.window
      if (previous.document === undefined) delete globalThis.document
      else globalThis.document = previous.document
    },
  }
}

export function rect(left, top, width, height) {
  return { left, top, width, height }
}
