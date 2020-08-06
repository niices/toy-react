const childreSymbol = Symbol("children");
class ElementWapper {
  constructor(type) {
    this.type = type;
    this.props = Object.create(null);
    this[childreSymbol] = [];
    this.children = [];
  }
  setAttribute(name, value) {
    // if (name.match(/^on([\s\S]+)$/)) {
    //     const eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLowerCase())
    //     this.node.addEventListener(eventName, value)
    // }
    // if (name === 'className') {
    //     name = 'class'
    // }
    // this.node.setAttribute(name, value)
    this.props[name] = value;
  }
  appendChild(vchild) {
    this[childreSymbol].push(vchild);
    this.children.push(vchild.vdom);
    // 实dom，用range 来获取dom范围，或者设置dom范围
    // const range = document.createRange();
    // if (this.node.children && this.node.children.length) {
    //     range.setStartAfter(this.node.lastChild)
    //     range.setEndAfter(this.node.lastChild)
    // } else {
    //     range.setStart(this.node, 0)
    //     range.setEnd(this.node, 0)
    // }

    // vchild.mountTo(range)
  }
  get vdom() {
    return this;
  }
  mountTo(range) {
    this.range = range;
    const element = document.createElement(this.type);
    const placeholder = document.createComment("");
    const cRange = document.createRange();
    cRange.setStart(range.endContainer, range.endOffset);
    cRange.setEnd(range.endContainer, range.endOffset);
    cRange.insertNode(placeholder);
    range.deleteContents();
    for (let name in this.props) {
      const value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        const eventName = RegExp.$1.replace(/^[\s\S]/, (s) => s.toLowerCase());
        element.addEventListener(eventName, value);
      }
      if (name === "className") {
        name = "class";
      }
      element.setAttribute(name, value);
    }
    for (let child of this.children) {
      if (child) {
        const currange = document.createRange();
        if (element.children && element.children.length) {
          currange.setStartAfter(element.lastChild);
          currange.setEndAfter(element.lastChild);
        } else {
          currange.setStart(element, 0);
          currange.setEnd(element, 0);
        }
        child.mountTo(currange);
      }
    }
    range.insertNode(element);
  }
}

// 文本组件
class TextWapper {
  constructor(content) {
    this.content = content || "";
    this.type = "#text";
    this.children = [];
    this.props = Object.create(null);
    this.dom = document.createTextNode(content);
  }
  get vdom() {
    return this;
  }
  mountTo(range) {
    this.range = range;
    this.range.deleteContents();
    this.range.insertNode(this.dom);
  }
}

// 虚拟组件
export class Component {
  constructor() {
    this.children = [];
    this.props = Object.create(null);
  }
  get type() {
    return this.constructor.name;
  }
  setAttribute(name, value) {
    this[name] = value;
    this.props[name] = value;
  }
  mountTo(range) {
    this.range = range;
    this.update();
  }
  update() {
    // 比对虚拟dom树，利用jsx生成虚拟dom
    const vnode = this.vdom;
    if (this.oldVdom) {
      const isSameNode = (node1, node2) => {
        if (node1.type !== node2.type) {
          return false;
        }

        if (node1.type === "#text") {
          // 如果是文本节点就看内容是否一致
          return node1.content === node2.content;
        }

        for (const name in node1.props) {
          if (
            typeof node1.props[name] === "function" &&
            typeof node2.props[name] === "function" &&
            node1.props[name].toString() === node2.props[name].toString()
          ) {
            continue;
          }
          if (
            typeof node1.props[name] === "object" &&
            typeof node2.props[name] === "object" &&
            JSON.stringify(node1.props[name]) ===
              JSON.stringify(node2.props[name])
          ) {
            continue;
          }
          if (node1.props[name] !== node2.props[name]) {
            return false;
          }
        }
        if (
          Object.keys(node1.props).length !== Object.keys(node2.props).length
        ) {
          return false;
        }

        if (node1.key !== node2.key) {
          // key变化了，强制更新
          return false;
        }
        return true;
      };
      const isSameTree = (node1, node2) => {
        node1.range = node2.range; // 保存上次的挂载的地方
        if (!isSameNode(node1, node2)) {
          return false;
        }
        if (node1.children.length !== node2.children.length) {
          return false;
        }
        for (const idx in node1.children) {
          if (!isSameTree(node1.children[idx], node2.children[idx])) {
            return false;
          }
        }
        return true;
      };
      const replace = (newTree, oldTree) => {
        if (isSameTree(newTree, oldTree)) {
          return;
        }
        if (!isSameNode(newTree, oldTree)) {
          newTree.mountTo(oldTree.range);
        } else {
          if (newTree.children.length !== oldTree.children.length) {
            // 如果子节点长度不一样，就直接更新根节点
            newTree.mountTo(oldTree.range);
            return;
          }
          for (const i in newTree.children) {
            replace(newTree.children[i], oldTree.children[i]);
          }
        }
      };
      replace(vnode, this.oldVdom);
    } else {
      vnode.mountTo(this.range);
    }
    this.oldVdom = vnode;
  }
  get vdom() {
    return this.render().vdom;
  }
  appendChild(vchild) {
    this.children.push(vchild);
  }
  setState(state) {
    const merge = (oldState, newState) => {
      for (const p in newState) {
        if (typeof newState[p] === "object" && newState[p] !== null) {
          if (typeof oldState[p] !== "object") {
            if (newState[p] instanceof Array) {
              oldState[p] = [];
            } else {
              oldState[p] = {};
            }
          }
          merge(oldState[p], newState[p]);
        } else {
          oldState[p] = newState[p];
        }
      }
    };
    if (!this.state) {
      this.state = {};
    }
    merge(this.state, state);
    this.update();
  }
}

export let ToyReact = {
  createElement,
  render(vdom, parentNode) {
    const range = document.createRange();
    if (parentNode.children && parentNode.children.length) {
      range.setStartAfter(parentNode.lastChild);
      range.setEndAfter(parentNode.lastChild);
    } else {
      range.setStar(parentNode, 0);
      range.setEnd(parentNode, 0);
    }
    vdom.mountTo(range);
  },
};

export default ToyReact;

function createElement(type, attr, ...children) {
  let element;
  if (typeof type === "string") {
    element = new ElementWapper(type);
  } else {
    element = new type();
  }
  for (const key in attr) {
    element.setAttribute(key, attr[key]);
  }
  const insertChild = (children) => {
    for (const i in children) {
      let child = children[i];
      if (typeof child === "object" && child instanceof Array) {
        insertChild(child);
      } else {
        if (child === null || child === void 0) {
          child = "";
        } else if (
          !(child instanceof ElementWapper) &&
          !(child instanceof TextWapper) &&
          !(child instanceof Component)
        ) {
          child = String(child);
        }
        if (typeof child === "string") {
          child = new TextWapper(child);
        }
        if (
          child instanceof ElementWapper ||
          child instanceof Component ||
          child instanceof TextWapper
        ) {
          child.key = child.key || i;
          child.parent = element;
        }
        element.appendChild(child);
      }
    }
  };
  insertChild(children);
  return element;
}
