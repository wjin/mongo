// SERVER-16676 Make sure compact doesn't leave the collection with bad indexes
// SERVER-16967 Make sure compact doesn't crash while collections are being dropped
// in a different database.

(function() {
    'use strict';

    var coll = db.compact_keeps_indexes;

    coll.drop();
    coll.insert({_id:1, x:1});
    coll.ensureIndex({x:1});

    assert.eq(coll.getIndexes().length, 2);

    var res = coll.runCommand('compact');
    // Some storage engines (for example, inMemoryExperiment) do not support the compact command.
    if (res.code == 115) { // CommandNotSupported
        return;
    }
    assert.commandWorked(res);

    assert.eq(coll.getIndexes().length, 2);
    assert.eq(coll.find({_id:1}).itcount(), 1);
    assert.eq(coll.find({x:1}).itcount(), 1);

    // Run compact repeatedly while simultaneously creating and dropping a collection in a
    // different database.
    var dropCollectionShell = startParallelShell(function() {
        var t = db.getSiblingDB('test_compact_keeps_indexes_drop').testcoll;
        t.drop();
        for (var i=0; i<100; i++) {
            t.save({a: 1});
            t.drop();
        }
    });
    for (var i=0; i<10; i++) {
       coll.runCommand('compact');
    }
    dropCollectionShell();
}())
