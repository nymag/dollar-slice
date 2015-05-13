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

  it('returns singleton', function () {
    expect(DS).to.deep.equal(require('../.'));
  });

  it('throws if name does not exist', function () {
    expect(function () {
      DS.get(fakeName);
    }).to.throw(Error);
  });

  it('throws if definition does not start with name as a string', function () {
    expect(function () {
      DS.controller(function () { return function () {}; }, fakeName);
    }).to.throw(Error);
  });

  it('throws if definition is missing second argument', function () {
    expect(function () {
      DS.controller(fakeName);
    }).to.throw(Error);
  });

  it('throws if definition function is not last in array', function () {
    expect(function () {
      DS.controller(fakeName, ['thing', function () {}, 'thing']);
    }).to.throw(Error);
  });

  it('controller fails get without element', function () {
    DS.controller(fakeName, function () { return function () {}; });

    expect(function () {
      DS.get(fakeName);
    }).to.throw(Error);
  });

  it('controller fails on missing service', function () {
    DS.controller(fakeName, [anotherFakeName, function () { return function () {}; }]);

    expect(function () {
      DS.get(fakeName);
    }).to.throw(Error);
  });

  it('controller succeeds with element', function () {
    DS.controller(fakeName, function () { return function () {}; });

    expect(function () {
      DS.get(fakeName, el);
    }).to.not.throw(Error);
  });

  it('requires controller if not defined', function () {
    expect(function () {
      DS.get(__dirname + '/testctrl', el);
    }).to.not.throw(Error);
  });

  it('controller creates service lazily', function () {
    //this would fail if the service is created too early
    DS.controller(fakeName, [anotherFakeName, function () { return function () {}; }]);
    DS.service(anotherFakeName, function () {});

    expect(function () {
      DS.get(fakeName, el);
    }).to.not.throw(Error);
  });

  it('controller binds events to first element in list of arguments only', function () {
    sandbox.mock(el).expects('addEventListener').once();
    sandbox.mock(anotherEl).expects('addEventListener').never();

    DS.controller(fakeName, function () {
      var constructor = function () {};
      constructor.prototype = {
        events: {
          click: 'someFunctionName'
        },
        someFunctionName: function () {}
      };
      return constructor;
    });
    DS.get(fakeName, 'ytes', el, 8905, anotherEl);

    sandbox.verify();
  });

  it('controller can bind events to selector', function () {
    sandbox.mock(el).expects('querySelectorAll')
      .withArgs('some selector.of #some[length=*]').once()
      .returns([anotherEl]);
    sandbox.mock(anotherEl).expects('addEventListener')
      .withArgs('click', sinon.match.func).once();


    DS.controller(fakeName, function () {
      var constructor = function () {};
      constructor.prototype = {
        events: {
          'some selector.of #some[length=*] click': 'someFunctionName'
        },
        someFunctionName: function () {}
      };
      return constructor;
    });
    DS.get(fakeName, el);

    sandbox.verify();
  });

  it('getting a controller twice returns two different instances', function () {
    DS.controller(fakeName, function () { return function () {}; });

    expect(DS.get(fakeName, el)).to.not.equal(DS.get(fakeName, el));
  });

  it('getting a service twice returns the same instance', function () {
    DS.service(fakeName, function () {});

    expect(DS.get(fakeName, el)).to.equal(DS.get(fakeName, el));
  });

  it('service can be injected with other services', function () {
    DS.service(fakeName, [anotherFakeName, function () {}]);
    DS.service(anotherFakeName, function () {});

    expect(function () {
      DS.get(fakeName);
    }).to.not.throw(Error);
  });

  it('can get values within controllers', function () {
    var thing = {};
    DS.value(fakeName, thing);
    DS.controller(anotherFakeName, [fakeName, function (f) {
      expect(f).to.equal(thing);
      return function () {};
    }]);

    DS.get(anotherFakeName, el);
  });

  it('can get values within services', function () {
    var thing = {};
    DS.value(fakeName, thing);
    DS.service(anotherFakeName, [fakeName, function (f) {
      expect(f).to.equal(thing);
    }]);

    DS.get(anotherFakeName);
  });
});