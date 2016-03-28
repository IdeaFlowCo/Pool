/**
 *  @author: Albert "Errendir" Slawinski <errendir@gmail.com>
 *  @module: statelets/Pool
 */

import Immutable from 'immutable'

const getProperty = (element,key) => {
  const keyPieces = key.split('.');
  let currentValue = element;
  keyPieces.forEach(keyPiece => {
    currentValue = currentValue[keyPiece];
  })
  return currentValue;
};

const PoolPrototype = {
  getState() {
    return this.structure.toJS();
  },
  setUpdating(updating) {
    return wrapBarePool(this.structure.set('updating',updating));
  },
  push(element) {
    return this.__rawPush(element).__deduplicate();
  },
  __rawPush(element) {
    let newStructure = this.structure
      .update('elements', (elements) => elements.add(element))
      .update('indices', (indices) => {
        return indices.map((index,keyname) => {
          return index.update(
            getProperty(element,keyname),
            Immutable.OrderedSet(),
            (set) => set.add(element)
          );
        })
      })
    return wrapBarePool(newStructure);
  },
  removeByProp(prop,value) {
    const predicate = (element) => getProperty(element,prop) != value;
    return this.filter(predicate);
  },
  removeElement(element) {
    const predicate = (otherElement) => otherElement != element;
    return this.filter(predicate);
  },
  findByProp(prop,value) {
    const index = this.structure.get('indices').get(prop);
    if(!!index) {
      return index.get(value,Immutable.OrderedSet()).toArray();
    } else {
      const predicate = (element) => getProperty(element,prop) == value;
      return this.structure.get('elements').toArray().filter(predicate);
    };
  },
  filter(predicate) {
    let newStructure = this.structure
      .update('elements', (elements) => elements.filter(predicate))
      .update('indices', (indices) => {
        return indices.map((index) => {
          return index.map((set) => set.filter(predicate))
        })
      })
    return wrapBarePool(newStructure);
  },
  pushMany(elements) {
    let newPool = this;
    elements.forEach((element) => {
      newPool = newPool.__rawPush(element);
    });
    return newPool.__deduplicate();
  },
  addIndex(keyname) {
    let newStructure = this.structure
      .update('indices', (indices) => {
        let index = Immutable.Map();
        this.structure.get('elements').forEach((element) => {
          index = index.update(
            getProperty(element,keyname),
            Immutable.OrderedSet(),
            (set) => set.add(element)
          );
        })
        return indices.set(keyname,index);
      })
    return wrapBarePool(newStructure);
  },
  addUniqueIndex(keyname) {
    const indexed = this.addIndex(keyname)
    let newStructure = indexed.structure
      .update('uniqueIndicesNames',(uniqueIndicesNames) => uniqueIndicesNames.add(keyname))
    return wrapBarePool(newStructure).__deduplicate();
  },
  setPreferenceResolver(preferenceResolver) {
    let newStructure = this.structure.set('preferenceResolver',preferenceResolver);
    return wrapBarePool(newStructure);
  },
  __deduplicate() {
    let result = this;
    const preferenceResolver = result.structure.get('preferenceResolver');
    result.structure.get('uniqueIndicesNames').forEach((indexName) => {
      const index = result.structure.getIn(['indices',indexName]);
      index.forEach((setOfElements,key) => {
        let remainingElement = undefined;
        setOfElements.forEach((element) => {
          remainingElement = preferenceResolver(remainingElement,element);
        })
        const elementsToRemove = setOfElements.filter(
          (element) => element != remainingElement
        );
        elementsToRemove.forEach((element) => {
          result = result.removeElement(element);
        })
      })
    });
    return result;
  }
}

const wrapBarePool = (structure) => {
  return Object.assign(
    Object.create(PoolPrototype), {structure}
  )
}

const empty = wrapBarePool(Immutable.Map({
  updating: false,
  elements: Immutable.OrderedSet(),
  indices: Immutable.Map(),
  uniqueIndicesNames: Immutable.OrderedSet(),
  preferenceResolver: (a,b) => b
}))

export {
  empty
}
