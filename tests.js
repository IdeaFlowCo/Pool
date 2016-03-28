import {assert, expect} from 'chai'

import * as Pool from './index'

describe('Pool', () => {
  it('should be capable of holding a number of elements', () => {
    const pool = Pool.empty
      .pushMany([1,2,3,4]);
    expect(pool.getState().elements).to.be.deep.equal([1,2,3,4]);
  });
  it('should be capable of being configured to index over a property', () => {
    const pool1 = Pool.empty
      .addIndex('a')
      .pushMany([{a:1},{a:2},{a:3},{a:4}])
    expect(pool1.getState().indices['a']).to.be.deep.equal({"1":[{a:1}],"2":[{a:2}],"3":[{a:3}],"4":[{a:4}]});

    const pool2 = Pool.empty
      .pushMany([{a:1},{a:2},{a:3},{a:4}])
      .addIndex('a')
    expect(pool2.getState().indices['a']).to.be.deep.equal({"1":[{a:1}],"2":[{a:2}],"3":[{a:3}],"4":[{a:4}]});
  });

  it('should be capable of indexing over a nested property', () => {
    const o1 = {a:{b:1}};
    const o2 = {a:{b:1},c:1};

    const pool1 = Pool.empty
      .addIndex('a.b')
      .pushMany([o1,o2]);
    expect(pool1.getState().indices['a.b'])
      .to.be.deep.equal({"1":[o1,o2]});

    const pool2 = Pool.empty
      .pushMany([o1,o2])
      .addIndex('a.b');
    expect(pool2.getState().indices['a.b'])
      .to.be.deep.equal({"1":[o1,o2]});
  });

  it('should be capable of being configured to have a unique index', () => {
    const pool1 = Pool.empty
      .addUniqueIndex('a')
      .pushMany([{a:1},{a:2},{a:1,b:3}])
    expect(pool1.getState().indices['a']).to.be.deep.equal({"2":[{a:2}],"1":[{a:1,b:3}]});

    const pool2 = Pool.empty
      .pushMany([{a:1},{a:2},{a:1,b:3}])
      .addUniqueIndex('a')
    expect(pool2.getState().indices['a']).to.be.deep.equal({"2":[{a:2}],"1":[{a:1,b:3}]});
  });

  it('should remove the duplicate items of the unique indexed items from all indices', () => {
    const pool1 = Pool.empty
      .addUniqueIndex('a')
      .addIndex('c')
      .pushMany([{a:1,c:2},{a:2,c:1},{a:1,b:3,c:2}])
    expect(pool1.getState().indices['a']).to.be.deep.equal({"2":[{a:2,c:1}],"1":[{a:1,b:3,c:2}]});
    expect(pool1.getState().indices['c']).to.be.deep.equal({"1":[{a:2,c:1}],"2":[{a:1,b:3,c:2}]});

    const pool2 = Pool.empty
      .pushMany([{a:1,c:2},{a:2,c:1},{a:1,b:3,c:2}])
      .addIndex('c')
      .addUniqueIndex('a')
    expect(pool2.getState().indices['a']).to.be.deep.equal({"2":[{a:2,c:1}],"1":[{a:1,b:3,c:2}]});
    expect(pool2.getState().indices['c']).to.be.deep.equal({"1":[{a:2,c:1}],"2":[{a:1,b:3,c:2}]});
  });

  it('should be capable of finding an element by the indexed prop value', () => {
    const o1 = {a:'1'}, o2 = {a:'2'}, o3 = {a:'1',b:'3'};
    const pool1 = Pool.empty
      .addIndex('a')
      .pushMany([o1,o2,o3])
    expect(pool1.findByProp('a','1')).to.be.deep.equal([o1,o3]);
  });

  it('should be capable of finding an element by the unindexed prop value', () => {
    const o1 = {a:'1'}, o2 = {a:'2'}, o3 = {a:'1',b:'3'};
    const pool1 = Pool.empty
      .pushMany([o1,o2,o3])
    expect(pool1.findByProp('a','1')).to.be.deep.equal([o1,o3]);
  });

  it('should correctly replace one object with another according to the preferenceResolver', () => {
    const definedOrGreater = (a,b) => {
      if(a !== undefined && b !== undefined) {
        return a > b ? +1 : -1;
      };
      if(a === undefined && b !== undefined) {
        return -1;
      }
      if(a !== undefined && b === undefined) {
        return +1;
      }
      return 0;
    }

    const newer = (a,b) => {
      const doit = () => {
        if(!a) return b;
        if(!b) return a;
        if(definedOrGreater(a.version,b.version) == +1) return a;
        if(definedOrGreater(a.version,b.version) == -1) return b;
        if(definedOrGreater(a.modificationTime,b.modificationTime) == +1) return a;
        if(definedOrGreater(a.modificationTime,b.modificationTime) == -1) return b;
        if(definedOrGreater(a.creationTime,b.creationTime) == +1) return a;
        if(definedOrGreater(a.creationTime,b.creationTime) == -1) return b;
        return b;
      };
      const val = doit();
      return val;
    }

    const emptyPool = Pool.empty
      .addUniqueIndex('id')
      .setPreferenceResolver(newer);

    const o1 = {"upvotes":0,"commentIds":[],"id":"435ef090-359e-4725-a215-f334930dd8d3","payload":{},"boardId":"003afd93-d16c-4256-b3c7-4c06ed42531a"};
    const o2 = {"_id":"56eddd44e0ddc97ae8573013","boardName":"","payload":{},"id":"435ef090-359e-4725-a215-f334930dd8d3","acl":{"owner":null,"readPermissions":[]},"modificationTime":1458429252453,"creationTime":1458429252453,"version":0}

    const pool1 = emptyPool
      .pushMany([o1])
      .pushMany([])
      .pushMany([o2]);
    expect(pool1.findByProp('id',o1.id)[0]).to.be.equal(o2);
  });
})
