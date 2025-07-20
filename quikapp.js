"use strict";
// uglifyjs quikapp.js  -c --mangle-props reserved=['QuikApp','quikApp','app','mount','quickApp','H','DispatchEvent','view','dispatch','methods','destroy','hostNode','parentNode','dispatch','publishAtom','subscribeAtom','unpublishAtom','unsubscribeAtom'] -o quikapp.min.js

(() => {

  const isArr = o => Array.isArray(o)
  const isFunc = o => typeof o === "function"
  const isStr = o => typeof o === "string"

  let apps = new Map()

  const app = (name, mountFn) => { apps.set(name.toLowerCase(), mountFn) } // store mapping name -> func (hostNode, parentNode) => ()
  const getApp = name => apps.get(name?.toLowerCase()) // return the mount function
  const mount = (hostNode, parentNode) => getApp(hostNode.tagName)(hostNode, parentNode) // get and call mount 

  const DispatchEvent = (node, eventName, ...payload) => {
    let event = new CustomEvent(eventName, { detail: { _args_: payload } })
    node.dispatchEvent(event)
  }

  const createClass = obj => {
    let out = ""
    if (isStr(obj)) return obj

    if (isArr(obj)) {
      for (let k = 0; k < obj.length; k++) {
        let tmp = createClass(obj[k])
        if (tmp) out += (out && " ") + tmp
      }

    } else {
      for (let k in obj) {
        if (obj[k]) out += (out && " ") + k
      }
    }

    return out
  }

  const h = (tag, { class: c, ...props }, children = [], isText) => ({
    tag: isText ? tag : tag.toLowerCase(),
    props: { ...props, ...(c ? { class: createClass(c) } : {}) },
    children: isArr(children) ? children : [children],
    isText
  })

  const text = v => h(v, {}, [], true)

  const patchProperty = (node, name, oldValue, newValue, listener, isSvg) => {
    if (name === "style" && isStr(newValue)) {
      node.style.cssText = newValue

    } else if (name[0] === "o" && name[1] === "n") {
      if (!node._events) node._events = {}
      name = name.slice(2)
      node._events[name] = newValue

      if (!newValue) {
        node.removeEventListener(name, listener)
      } else if (!oldValue) {
        node.addEventListener(name, listener)
      }

    } else if (!isSvg && name !== "list" && name !== "form" && name in node) {
      node[name] = newValue == null ? "" : newValue

    } else if (newValue == null || newValue === false) {
      node.removeAttribute(name)

    } else {
      node.setAttribute(name, newValue)
    }
  }

  const createChildNode = (vdom, listener, isSvg, parentNode, referenceNode) => {
    let props = vdom.props
    let node = vdom.isText
      ? document.createTextNode(vdom.tag)
      : (isSvg = isSvg || vdom.tag === "svg")
        ? document.createElementNS("http://www.w3.org/2000/svg", vdom.tag, props.is && props)
        : document.createElement(vdom.tag, props.is && props)

    for (let k in props) patchProperty(node, k, null, props[k], listener, isSvg)

    for (let i = 0; i < vdom.children.length; i++) {
      createChildNode(vdom.children[i], listener, isSvg, node, null)
    }

    vdom.node = node
    parentNode.insertBefore(node, referenceNode)

    let mount = getApp(node.tagName)
    if (mount) node._unmount = mount(node, parentNode)

    return node
  }

  const destroyNode = (vdom, parent) => {
    vdom.node?._unmount?.(vdom.node)
    parent.removeChild(vdom.node)
  }

  const patch = (parent, node, oldVNode, newVNode, listener, isSvg, isRoot) => {
    if (!parent) return // removed
    if (oldVNode === newVNode) {

    } else if (oldVNode != null && oldVNode.isText && newVNode.isText) {
      if (oldVNode.tag !== newVNode.tag) node.nodeValue = newVNode.tag

    } else if (oldVNode == null || oldVNode.tag !== newVNode.tag) {
      node = createChildNode(newVNode, listener, isSvg, parent, node)
      if (oldVNode != null) destroyNode(oldVNode, parent)

    } else {
      let tmpVKid, oldVKid, oldKey, newKey
      let oldProps = oldVNode.props, newProps = newVNode.props
      let oldVKids = oldVNode.children, newVKids = newVNode.children
      let isApp = getApp(oldVNode.tag) && !isRoot
      if (isApp) { oldVKids = []; newVKids = [] }
      let oldHead = 0, newHead = 0
      let oldTail = oldVKids.length - 1, newTail = newVKids.length - 1

      isSvg = isSvg || newVNode.tag === "svg"

      for (let i in { ...oldProps, ...newProps }) {
        let oldValue = i === "value" || i === "selected" || i === "checked" ? node[i] : oldProps[i]
        if (oldValue !== newProps[i]) patchProperty(node, i, oldProps[i], newProps[i], listener, isSvg)
      }

      while (newHead <= newTail && oldHead <= oldTail) {
        oldKey = oldVKids[oldHead]?.props.key
        newKey = newVKids[newHead]?.props.key
        if (oldKey == null || oldKey !== newKey) break

        patch(node, oldVKids[oldHead].node, oldVKids[oldHead], newVKids[newHead], listener, isSvg)
        ++oldHead
        ++newHead
      }

      while (newHead <= newTail && oldHead <= oldTail) {
        oldKey = oldVKids[oldTail]?.props.key
        newKey = newVKids[newTail]?.props.key
        if (oldKey == null || oldKey !== newKey) break

        patch(node, oldVKids[oldTail].node, oldVKids[oldTail], newVKids[newTail], listener, isSvg)
        --oldTail
        --newTail
      }

      if (oldHead > oldTail) {
        while (newHead <= newTail) {
          oldVKid = oldVKids[oldHead]
          createChildNode(newVKids[newHead], listener, isSvg, node, oldVKid && oldVKid.node)
          newHead++
        }

      } else if (newHead > newTail) {
        while (oldHead <= oldTail) {
          destroyNode(oldVKids[oldHead], node)
          oldHead++
        }

      } else {
        let keyed = {}, newKeyed = {}
        for (let i = oldHead; i <= oldTail; i++) {
          oldKey = oldVKids[i].props.key
          if (oldKey != null) keyed[oldKey] = oldVKids[i]
        }

        while (newHead <= newTail) {
          oldVKid = oldVKids[oldHead]
          oldKey = oldVKid?.props.key
          newKey = newVKids[newHead]?.props.key

          if (newKeyed[oldKey] || (newKey != null && newKey === oldVKids[oldHead + 1]?.props.key)) {
            if (oldKey == null) destroyNode(oldVKid, node)
            oldHead++
            continue
          }

          if (newKey == null) {
            if (oldKey == null) {
              patch(node, oldVKid && oldVKid.node, oldVKid, newVKids[newHead], listener, isSvg)
              newHead++
            }
            oldHead++

          } else {
            if (oldKey === newKey) {
              patch(node, oldVKid.node, oldVKid, newVKids[newHead], listener, isSvg)
              newKeyed[newKey] = true
              oldHead++

            } else {
              tmpVKid = keyed[newKey]
              if (tmpVKid != null) {
                let kid = node.insertBefore(tmpVKid.node, oldVKid && oldVKid.node)
                patch(node, kid, tmpVKid, newVKids[newHead], listener, isSvg)
                newKeyed[newKey] = true

              } else {
                patch(node, oldVKid && oldVKid.node, null, newVKids[newHead], listener, isSvg)
              }
            }
            newHead++
          }
        }

        while (oldHead <= oldTail) {
          oldVKid = oldVKids[oldHead]
          if (oldVKid?.props.key == null) destroyNode(oldVKid, node)
          oldHead++
        }

        for (let i in keyed) {
          if (newKeyed[i] == null) destroyNode(keyed[i], node)
        }
      }
    }

    newVNode.node = node
    return node
  }

  const listener = (dispatch, event) => {
    let action = event.target._events[event.type]
    if (!isArr(action)) action = [action]
    action = action.concat([event])
    if (event.detail?._args_) action = action.concat(...event.detail._args_)
    dispatch(action)
  }

  const unmountChildren = children => {
    for (let c of children) {
      unmountChildren(c.children);
      c.node?._unmount?.(c.node)
    }
  }

  // an atom is a function (dispatch, atomAction) =>  () => val
  // which registers a subscriber and returns the atom's value getter

  // publishedAtoms: Map of atom -> [ fselector, [ value ], subscribersMap ]
  // fselector: () => value
  // subscribersMap: Map clientDispatch -> [atomAction, funsubscribe]

  // subscribedAtoms: set of Atoms

  // moving this into a separate function that only has entry in it's closure
  const getter = entry => () => entry[0]

  const atomPublish = (publishedAtoms, fselector) => {
    let subscribersMap = new Map()
    let entry = [fselector, [fselector()], subscribersMap]

    let atom = (dispatch, atomAction, funsubscribe) => {
      if (atomAction == 'subscriberdisconnected') { subscribersMap.delete(dispatch); return }
      subscribersMap.set(dispatch, [atomAction, funsubscribe])
      return getter(entry[1])
    }

    publishedAtoms.set(atom, entry)
    return atom
  }

  const emptyAction = () => { }

  const atomSubscribe = (subscribedAtoms, dispatch, atom, atomAction) => {
    subscribedAtoms.add(atom)
    return atom(dispatch, atomAction || emptyAction, atom => subscribedAtoms.delete(atom)) // return the value getter
  }

  const atomsDispatch = publishedAtoms => {
    for (let [atom, entry] of publishedAtoms) {
      let [fselector, [prevVal], subscribersMap] = entry
      let newVal = fselector()
      if (equal(newVal, prevVal)) continue;
      entry[1][0] = newVal
      for (let [clientDispatch, [atomAction, funsubscribe]] of subscribersMap) clientDispatch([atomAction, newVal, prevVal])
    }
  }

  const atomUnpublish = (publishedAtoms, atom) => {
    let entry = publishedAtoms.get(atom)
    if (!entry) return
    entry[1][0] = undefined // clear value that is held by subscribers getters
    for (let [clientDispatch, [atomAction, funsubscribe]] of entry[2]) {
      funsubscribe(atom)
      clientDispatch([atomAction, 'publisherdisconnected']) // notify subscribers
    }
    publishedAtoms.delete(atom)
  }

  const atomUnsubscribe = (subscribedAtoms, dispatch, atom) => {
    if (!subscribedAtoms.has(atom)) return
    atom(dispatch, 'subscriberdisconnected') // notify publisher
    subscribedAtoms.delete(atom)
  }


  const quikAppMount = (hostNode, parentNode, getConf) => {
    let root = hostNode
    let vdom = h(hostNode.nodeName, {}, [])
    let busy
    let conf
    let publishedAtoms = new Map()
    let subscribedAtoms = new Set()

    const rafDispatch = action => requestAnimationFrame(() => dispatch(action))

    const render = () => {
      busy = false
      let oldVNode = vdom
      let newView = conf.view()
      vdom = h(root.nodeName, {}, newView)
      root = patch(root.parentNode, root, oldVNode, vdom, event => listener(dispatch, event), false, true)
    }

    let dispatch = action => {
      if (!hostNode.isConnected) vdom = undefined
      if (!vdom) return // app destroyed
      if (!isFunc(action) && !isArr(action)) throw "Invalid action" // action must be a function ()=>() or array [ (...params) => () , ...params? ]

      if (isFunc(action)) action = [action]
      let [f, ...params] = action

      conf.dispatch.forEach(a => (a[0])?.())
      f(...params)
      conf.dispatch.forEach(a => (a[1])?.())

      if (!busy) { busy = true; requestAnimationFrame(render) }

      atomsDispatch(publishedAtoms)
    }

    const publishAtom = fselector => atomPublish(publishedAtoms, fselector)
    const subscribeAtom = (atom, atomAction) => atomSubscribe(subscribedAtoms, dispatch, atom, atomAction)
    const unpublishAtom = atom => atomUnpublish(publishedAtoms, atom)
    const unsubscribeAtom = atom => atomUnsubscribe(subscribedAtoms, dispatch, atom)

    conf = getConf({
      hostNode, parentNode, dispatch: rafDispatch,
      publishAtom, subscribeAtom, unpublishAtom, unsubscribeAtom,
    })

    if (!conf.dispatch) conf.dispatch = []
    else if (!isArr(conf.dispatch[0])) conf.dispatch = [conf.dispatch]

    // map methods to actions
    let methodsEntries = Object.entries(conf.methods || {}).map(([name, action]) => [name, (...args) => dispatch([action].concat(args))])
    Object.assign(hostNode, Object.fromEntries(methodsEntries))

    let display = window.getComputedStyle(hostNode).display
    if (!display || display == 'inline') hostNode.style.display = 'inline-block'

    render()

    // return the unmount function
    return _ => {
      for (let [atom, entry] of publishedAtoms) atomUnpublish(publishedAtoms, atom)
      for (let atom of subscribedAtoms) atomUnsubscribe(subscribedAtoms, dispatch, atom)
      unmountChildren(vdom.children)
      conf.destroy?.()
      vdom = undefined
    }
  }

  const quikApp = (name, getConf) => {
    const mountFn = (hostNode, parentNode) => quikAppMount(hostNode, parentNode, getConf)
    app(name, mountFn)
    return mount
  }


  // hyperlit Copyright © Zacharias Enochsson https://github.com/zaceno/hyperlit
  const NEXT = 0
  const TEXT = 1
  const TAG = 2
  const CLOSINGTAG = 3
  const TAGNAME = 4
  const PROPS = 5
  const SELFCLOSING = 6
  const PROPNAME = 7
  const PROPVAL = 8
  const PROPVALSTR = 9

  const ws = (c) => c == ' ' || c == '\t' || c == '\n' || c == '\r'

  const H = (strs, ...vals) => {
    let tagname,
      propname,
      props,
      parent,
      list = [],
      ch,
      buffer = '',
      mode = NEXT,
      newline = true

    const listpush = (x) => (x || x === 0) && list.push(typeof x == 'string' ? text(x) : typeof x == 'number' ? text('' + x) : x)

    const pushnode = (ch, children = ch.flat(2)) => {
      listpush(tagname.call ? tagname(props, children) : h(tagname, props, children))
      mode = NEXT
    }

    const gotText = (trim) => {
      if (trim) buffer = buffer.trimEnd()
      buffer && listpush(buffer)
      newline = false
      buffer = ''
    }

    const open = () => {
      parent = [list, tagname, props, parent]
      list = []
      mode = NEXT
    }

    const gotTagName = (m = mode) => {
      tagname = buffer
      buffer = ''
      props = {}
      mode = m
    }

    const defaultProp = (m = mode) => {
      props[buffer] = true
      mode = m
      buffer = ''
    }

    const gotProp = (v) => {
      props[propname] = v
      mode = PROPS
      buffer = ''
    }

    const close = () => {
      let children = list
        ;[list, tagname, props, parent] = parent
      pushnode(children)
    }

    for (let j = 0; j < strs.length; j++) {
      for (let i = 0; i < strs[j].length; i++) {
        ch = strs[j][i]
        if (mode == NEXT) {
          if (ch == '<') {
            mode = TAG
          } else if (!ws(ch)) {
            mode = TEXT
            buffer = ch
          } else if (ch == '\n') {
            newline = true
          } else if (!newline) {
            mode = TEXT
            buffer = ch
          }
        } else if (mode == TEXT) {
          if (ch == '<') {
            mode = TAG
          } else if (ch == '\n') {
            gotText(false)
            newline = true
            mode = NEXT
          } else {
            buffer += ch
          }
        } else if (mode == TAG) {
          if (ch == '/') {
            mode = CLOSINGTAG
            gotText(true)
          } else {
            mode = TAGNAME
            gotText(false)
            buffer = ch
          }
        } else if (mode == CLOSINGTAG) {
          if (ch == '>') close()
        } else if (mode == TAGNAME) {
          if (ws(ch)) {
            gotTagName(PROPS)
          } else if (ch == '/') {
            gotTagName(SELFCLOSING)
          } else if (ch == '>') {
            gotTagName()
            open()
          } else {
            buffer += ch
          }
        } else if (mode == SELFCLOSING) {
          if (ch == '>') {
            pushnode([])
          }
        } else if (mode == PROPS) {
          if (ch == '.') {
          } else if (ch == '/') {
            mode = SELFCLOSING
          } else if (ch == '>') {
            open()
          } else if (!ws(ch)) {
            buffer = ch
            mode = PROPNAME
          }
        } else if (mode == PROPNAME) {
          if (ch == '=') {
            propname = buffer
            mode = PROPVAL
          } else if (ch == '>') {
            defaultProp()
            open()
          } else if (ch == '/') {
            defaultProp(SELFCLOSING)
          } else if (ws(ch)) {
            defaultProp(PROPS)
          } else {
            buffer += ch
          }
        } else if (mode == PROPVAL) {
          if (ch == '"') {
            mode = PROPVALSTR
            buffer = ''
          }
        } else if (mode == PROPVALSTR) {
          if (ch == '"') {
            gotProp(buffer)
          } else {
            buffer += ch
          }
        }
      }
      if (mode == TAG) {
        tagname = vals[j]
        props = {}
        mode = PROPS
      } else if (mode == TEXT) {
        gotText(!vals[j])
        listpush(vals[j])
      } else if (mode == PROPS) {
        if (!isStr(vals[j])) props = { ...props, ...vals[j] }
        else if (vals[j] != '') props[vals[j]] = true
      } else if (mode == PROPVAL) {
        gotProp(vals[j])
      } else if (mode == PROPVALSTR) {
        buffer += vals[j]
      } else if (mode == NEXT && vals[j] != null) {
        listpush(vals[j])
      }
    }

    return list.flat(2)
  }

  // https://github.com/epoberezkin/fast-deep-equal
  const equal = (a, b) => {
    if (a === b) return true;

    if (a && b && typeof a == 'object' && typeof b == 'object') {
      if (a.constructor !== b.constructor) return false;

      let length, i, keys;
      if (Array.isArray(a)) {
        length = a.length;
        if (length != b.length) return false;
        for (i = length; i-- !== 0;) if (!equal(a[i], b[i])) return false;
        return true;
      }

      if ((a instanceof Map) && (b instanceof Map)) {
        if (a.size !== b.size) return false;
        for (i of a.entries()) if (!b.has(i[0])) return false;
        for (i of a.entries()) if (!equal(i[1], b.get(i[0]))) return false;
        return true;
      }

      if ((a instanceof Set) && (b instanceof Set)) {
        if (a.size !== b.size) return false;
        for (i of a.entries()) if (!b.has(i[0])) return false;
        return true;
      }

      if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
        length = a.length;
        if (length != b.length) return false;
        for (i = length; i-- !== 0;) if (a[i] !== b[i]) return false;
        return true;
      }

      if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
      if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
      if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

      keys = Object.keys(a);
      length = keys.length;
      if (length !== Object.keys(b).length) return false;

      for (i = length; i-- !== 0;) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

      for (i = length; i-- !== 0;) {
        let key = keys[i];
        if (!equal(a[key], b[key])) return false;
      }

      return true;
    }

    // true if both NaN, false otherwise
    return a !== a && b !== b;
  }


  window.QuikApp = { app, mount, quikApp, H, DispatchEvent }

})()
