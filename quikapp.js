"use strict";
// uglifyjs quikapp.js  -c --mangle-props reserved=['quikApp','H','TriggerEvent','view','dispatch','methods','destroy','hostNode','parentNode','wrapper','subscribeAtom'] -o quikapp.min.js

(() => {

  const isArr = o => Array.isArray(o)
  const isFunc = o => typeof o === "function"
  const isStr = o => typeof o === "string"
  
  let appRegistry = new Map()

  const getAppMountFn = name => appRegistry.get(name?.toLowerCase()) // return the mount function

  const createClass = v => {
    let out = ""
    if (isStr(v)) return v

    if (isArr(v)) {
      for (let k = 0; k < v.length; k++) {
        let tmp = createClass(v[k])
        if (tmp) out += (out && " ") + tmp
      }

    } else {
      for (let k in v) {
        if (v[k]) out += (out && " ") + k
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

    let appMountFn = getAppMountFn(node.tagName)
    if (appMountFn) node._unmount = appMountFn(node, parentNode)

    return node
  }

  const destroyNode = (vdom, parent) => {
    unmountChildren([vdom])
    parent.removeChild(vdom.node)
  }

  const getKey = vnode => vnode?.props?.key ?? vnode?.props?.id

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
      let isApp = getAppMountFn(oldVNode.tag) && !isRoot
      if (isApp) { oldVKids = []; newVKids = [] }
      let oldHead = 0, newHead = 0
      let oldTail = oldVKids.length - 1, newTail = newVKids.length - 1

      isSvg = isSvg || newVNode.tag === "svg"

      for (let i in oldProps) {
        let oldValue = i === "value" || i === "selected" || i === "checked" ? node[i] : oldProps[i]
        if (oldValue !== newProps[i]) patchProperty(node, i, oldProps[i], newProps[i], listener, isSvg)
      }
      for (let i in newProps) {
        if (i in oldProps) continue
        patchProperty(node, i, undefined, newProps[i], listener, isSvg)
      }

      while (newHead <= newTail && oldHead <= oldTail) {
        oldKey = getKey(oldVKids[oldHead])
        newKey = getKey(newVKids[newHead])
        if (oldKey == null || oldKey !== newKey) break

        patch(node, oldVKids[oldHead].node, oldVKids[oldHead], newVKids[newHead], listener, isSvg)
        ++oldHead
        ++newHead
      }

      while (newHead <= newTail && oldHead <= oldTail) {
        oldKey = getKey(oldVKids[oldTail])
        newKey = getKey(newVKids[newTail])
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
          oldKey = getKey(oldVKids[i])
          if (oldKey != null) keyed[oldKey] = oldVKids[i]
        }

        while (newHead <= newTail) {
          oldVKid = oldVKids[oldHead]
          oldKey = getKey(oldVKid)
          newKey = getKey(newVKids[newHead])

          if (newKeyed[oldKey] || (newKey != null && newKey === getKey(oldVKids[oldHead + 1]))) {
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
          if (getKey(oldVKid) == null) destroyNode(oldVKid, node)
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
    let action = event.currentTarget._events[event.type]
    let args = event.detail?._args_ || []
    if (!isArr(action)) action = [action]
    dispatch([...action, event, ...args])
  }

  const unmountChildren = children => {
    for (let c of children || []) {
      unmountChildren(c.children);
      c.node?._unmount?.(c.node)
    }
  }

  // an atom is a function (subscriberDispatch, subscriberAction, funsubscribe) =>  f
  // returned f is: () => val 	with .unsubscribe() method 

  // publishedAtoms: Map of atom -> [ selector, [ value ], subscribersMap ]
  // selector: () => value
  // value: the result of selector() invoked after every dispatch
  // subscribersMap: Map _ => [ subscriberDispatch,  subscriberAction, funsubscribe ]
  // subscribedAtoms: Map _ => unsubscribe 

  let atomsSubscriberFinalizationRegistry = new FinalizationRegistry(cleanupSubscription => cleanupSubscription())

  // using a separate function that only has arr in it's closure
  const createAtomAccessor = (valArr, activeArr) => {
		let res = () => valArr[0]
		res.unsubscribe = () => activeArr[0] = false
		return res
  }

  // create a new atom given a selector function that returns the atom value
  const atomPublish = (publishedAtoms, selector) => {
    let subscribersMap = new Map()
    let publishedAtomsEntry = [[selector()], selector , subscribersMap]

    const atom = (dispatch, subscriberAction, cleanupSubscription) => {
      let subscribersMapEntry = [[true], dispatch, subscriberAction, cleanupSubscription ] // first element is an array containing the active flag
      subscribersMap.set(Symbol(), subscribersMapEntry) 
      return createAtomAccessor(publishedAtomsEntry[0], subscribersMapEntry[0]) // minimize closure
    }

    publishedAtoms.set(atom, publishedAtomsEntry)
    return atom
  }

  const atomsDispatch = publishedAtoms => {
    const dispatched = new Map() // dispatched: Map<subscriberDispatch, Map<subscriberAction, { newVal, prevVal }>>

    for (const [, [prevArr, selector, subscribersMap]] of publishedAtoms) {
      const prevVal = prevArr[0]
      const newVal = selector()

      if (equal(newVal, prevVal)) continue
      prevArr[0] = newVal

      for (const [key, [[active], subscriberDispatch, subscriberAction]] of subscribersMap) {
        if (!active) { subscribersMap.delete(key); continue }

        let actionsMap = dispatched.get(subscriberDispatch)
        if (!actionsMap) dispatched.set(subscriberDispatch, actionsMap = new Map())
        actionsMap.set(subscriberAction, { newVal, prevVal })
      }
    }

    for (const [subscriberDispatch, actionsMap] of dispatched) {
      for (const [subscriberAction, { newVal, prevVal }] of actionsMap) {
        subscriberDispatch([subscriberAction, newVal, prevVal])
      }
    }
  }
  
  
  // register a subscriber so that whenever the atom value (on the publisher) changes
  // the publisher will invoke subscriberDispatch with action
  // returns atomAccessor: x => val to be used by the subscriber for ie rendering
  const noAction = () => {}
  const atomSubscribe = (subscribedAtoms, dispatch, atom, subscriberAction = noAction) => {
    let subscribedAtomsToken = {}
    
    const cleanupSubscription  = () => { 
      subscribedAtoms.delete(subscribedAtomsToken); 
      atomsSubscriberFinalizationRegistry.unregister(subscribedAtomsToken) 
    }
    
    let atomAccessor = atom(dispatch, subscriberAction, cleanupSubscription) // return the ()=>value function
    subscribedAtoms.set(subscribedAtomsToken, atomAccessor.unsubscribe) 
    atomsSubscriberFinalizationRegistry.register(atomAccessor, atomAccessor.unsubscribe, subscribedAtomsToken)
    return atomAccessor
  }

  const atomUnpublish = (valArr, subscribersMap) => {
    valArr[0] = undefined // clear value that is held by subscribers atomAccessor
    for (let [_, [[active], subscriberDispatch, subscriberAction, cleanupSubscription]] of subscribersMap) {
      if (!active) continue
      cleanupSubscription() 
      subscriberDispatch([subscriberAction, 'publisherdisconnected']) // notify subscribers
    }
    subscribersMap.clear()
  }

  const quikAppMount = (hostNode, parentNode, createAppDef) => {
    let root = hostNode
    let vdom = h(hostNode.nodeName, {}, [])
    let renderScheduled = false
    let appDef
    let publishedAtoms = new Map()
    let subscribedAtoms = new Map()

    const render = () => {
      renderScheduled = false
      let oldVNode = vdom
      let newView = appDef.view()
      vdom = h(root.nodeName, {}, newView)
      root = patch(root.parentNode, root, oldVNode, vdom, event => listener(dispatch, event), false, true)
    }

    let dispatch = action => {
      if (!hostNode.isConnected) vdom = undefined
      if (!vdom) return // app destroyed
      if (!isFunc(action) && !isArr(action)) throw new Error("Invalid action") // action must be a function ()=>() or array [ (...params) => () , ...params? ]

      if (isFunc(action)) action = [action]
      let [f, ...params] = action

      appDef.wrapper.forEach(a => (a[0])?.())
      f(...params)
      appDef.wrapper.forEach(a => (a[1])?.())

      if (!renderScheduled) { renderScheduled = true; requestAnimationFrame(render) }

      if (appDef.properties) for (const [name, getter] of Object.entries(appDef.properties)) hostNode[name] = getter();

      atomsDispatch(publishedAtoms)
    }

    appDef = createAppDef({
      hostNode,
      parentNode,
      H,
      dispatchFn: action => requestAnimationFrame(() => dispatch(action)),
      atomSubscribeFn: (atom, subscriberAction) => atomSubscribe(subscribedAtoms, dispatch, atom, subscriberAction),
      TriggerEvent: (node, eventName, ...payload) => { node.dispatchEvent(new CustomEvent(eventName, { detail: { _args_: payload } })) }
    })

    if (!appDef.wrapper) appDef.wrapper = []
    else if (!isArr(appDef.wrapper[0])) appDef.wrapper = [appDef.wrapper]

    // map methods to actions
    let methodsEntries = Object.entries(appDef.methods || {}).map(([name, action]) => [name, (...args) => dispatch([action].concat(args))])
    Object.assign(hostNode, Object.fromEntries(methodsEntries))

    if (appDef.atoms) {
      // convert appDef.atoms to hostNode.atoms
      let atomEntries = Object.entries(appDef.atoms).map(([name, selector]) => [name, atomPublish(publishedAtoms, selector) ])
      hostNode.atoms = Object.fromEntries(atomEntries)
    }
    
    let display = window.getComputedStyle(hostNode).display
    if (!display || display == 'inline') hostNode.style.display = 'inline-block'

    render()

    // return the unmount function
    return _ => {
      unmountChildren(vdom.children)
      for (let [atom, [valArr, selector , subscribersMap]] of publishedAtoms) atomUnpublish(valArr, subscribersMap) 
      publishedAtoms.clear()
      for (let [_, unsubscribe] of subscribedAtoms) unsubscribe()
      appDef.destroy?.()
      vdom = undefined
    }
  }

  window.quikApp = (name, arg0, arg1) => { 
    const appMountFn = typeof arg0 === 'function'
      ? (hostNode, parentNode) => quikAppMount(hostNode, parentNode, arg0)
      : arg1

    appRegistry.set(name.toLowerCase(), appMountFn)
    return appMountFn
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

    // register a new app
    // quikApp is a function: (name, createAppDef) => registers a new app name
    // name is the the name of the app (a string)
    // createAppDef is a function: ({ hostNode, parentNode, H, dispatchFn, subscribeAtom, TriggerEvent }) => { view, methods, atoms, wrapper, destroy }
    // createAppDef will be called when the app is mounted into hostNode, either by a direct call or when mounted as part of another app
    // hostNode is the node the app will be rendered into
    // parentNode is the parent of that node
    // H function parses a tagged HTML-template literal into QuikApp’s virtual DOM node tree
    // dispatchFn can be used to dispatch Actions from other Actions
    // TriggerEvent is a helper Action for triggering events
    // subscribeAtom can be used to subscribe to an event published in another QuikApp
    // view 

})()
