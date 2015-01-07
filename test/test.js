'use strict';

var DS = require('../.'),
  expect = require('chai').expect,
  sinon = require('sinon');

var MockElement = function () {
  this.nodeName = 'nodeNameString';
};
MockElement.prototype = {
  addEventListener: function () {},
  querySelectorAll: function () {}
};

describe('', function () {
  var sandbox,
    fakeName = 'jkfldsa',
    anotherFakeName = 'kalsdew',
    el = new MockElement(),
    anotherEl = new MockElement();

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('returns constructor', function () {
    expect(typeof DS).to.equal('function');
  });

  it('throws if name does not exist', function () {
    var ds = new DS();

    expect(function () {
      ds.get(fakeName);
    }).to.throw(Error);
  });

  it('throws if definition does not start with name as a string', function () {
    var ds = new DS();

    expect(function () {
      ds.controller(function () { return function () {}; }, fakeName);
    }).to.throw(Error);
  });

  it('throws if definition is missing second argument', function () {
    var ds = new DS();

    expect(function () {
      ds.controller(fakeName);
    }).to.throw(Error);
  });

  it('throws if definition function is not last in array', function () {
    var ds = new DS();

    expect(function () {
      ds.controller(fakeName, ['thing', function () {}, 'thing']);
    }).to.throw(Error);
  });

  it('controller fails get without element', function () {
    var ds = new DS();
    ds.controller(fakeName, function () { return function () {}; });

    expect(function () {
      ds.get(fakeName);
    }).to.throw(Error);
  });

  it('controller fails on missing service', function () {
    var ds = new DS();
    ds.controller(fakeName, [anotherFakeName, function () { return function () {}; }]);

    expect(function () {
      ds.get(fakeName);
    }).to.throw(Error);
  });

  it('controller succeeds with element', function () {
    var ds = new DS();
    ds.controller(fakeName, function () { return function () {}; });

    expect(function () {
      ds.get(fakeName, el);
    }).to.not.throw(Error);
  });

  it('controller creates service lazily', function () {
    var ds = new DS();
    //this would fail if the service is created too early
    ds.controller(fakeName, [anotherFakeName, function () { return function () {}; }]);
    ds.service(anotherFakeName, function () {});

    expect(function () {
      ds.get(fakeName, el);
    }).to.not.throw(Error);
  });

  it('controller binds events to first element in list of arguments only', function () {
    var ds = new DS();

    sandbox.mock(el).expects('addEventListener').once();
    sandbox.mock(anotherEl).expects('addEventListener').never();

    ds.controller(fakeName, function () {
      var constructor = function () {};
      constructor.prototype = {
        events: {
          click: 'someFunctionName'
        },
        someFunctionName: function () {}
      };
      return constructor;
    });
    ds.get(fakeName, 'ytes', el, 8905, anotherEl);

    sandbox.verify();
  });

  it('controller can bind events to selector', function () {
    var ds = new DS();

    sandbox.mock(el).expects('querySelectorAll')
      .withArgs('some selector.of #some[length=*]').once()
      .returns([anotherEl]);
    sandbox.mock(anotherEl).expects('addEventListener')
      .withArgs('click', sinon.match.func).once();


    ds.controller(fakeName, function () {
      var constructor = function () {};
      constructor.prototype = {
        events: {
          'some selector.of #some[length=*] click': 'someFunctionName'
        },
        someFunctionName: function () {}
      };
      return constructor;
    });
    ds.get(fakeName, el);

    sandbox.verify();
  });

  it('getting a controller twice returns two different instances', function () {
    var ds = new DS();
    ds.controller(fakeName, function () { return function () {}; });

    expect(ds.get(fakeName, el)).to.not.equal(ds.get(fakeName, el));
  });

  it('getting a service twice returns the same instance', function () {
    var ds = new DS();
    ds.service(fakeName, function () {});

    expect(ds.get(fakeName, el)).to.equal(ds.get(fakeName, el));
  });

  it('can get values within controllers', function () {
    var ds = new DS(),
      thing = {};
    ds.value(fakeName, thing);
    ds.controller(anotherFakeName, [fakeName, function (f) {
      expect(f).to.equal(thing);
      return function () {};
    }]);

    ds.get(anotherFakeName, el);
  });

  it('can get values within services', function () {
    var ds = new DS(),
      thing = {};
    ds.value(fakeName, thing);
    ds.service(anotherFakeName, [fakeName, function (f) {
      expect(f).to.equal(thing);
    }]);

    ds.get(anotherFakeName);
  });
});