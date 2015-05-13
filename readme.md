Dollar Slice
============

[![Build Status](https://travis-ci.org/nymag/dollar-slice.svg)](https://travis-ci.org/nymag/dollar-slice)

🍕 _"Cheap and easy."_

Client-side micro-framework with heavy inspiration from Angular and Backbone.

We use this micro-framework to increase the speed of JavaScript initialization. The familiar syntax and narrow scope reduce the need for onboarding and training. Dollar slice works best when you don't need the data-binding, routing, and complexity of a Single Page App, but you still want your client-side code to be more structured than a bag of jQuery plugins.

Dollar Slice divides client-side code into controllers and services. Controllers control a portion of the page. Services are reusable singletons that controllers can share. Both are deliberately designed to create testable and maintainable code.

## Installation

```
npm install --save dollar-slice
```

You probably have some sort of build process, so just make sure it knows about `/index.js`.

##Table of Contents
* [Basics](#basics)
* [Event Binding](#event-binding)
* [Shared Variables and Functions](#shared-variables-and-functions)
* [Services](#services)
* [Values](#values)
* [Full Example](#full-example)
* [Browserify](#browserify)

##Basics

The syntax of a controller is a simplified version of AngularJS for familiarity. This is the basic outline of a controller:

```js
DS.controller('name', function () {
  return function () {
    // constructor
  };
});
```

Controllers are very lightweight. Instantiating a controller for a list is acceptable, but you could also create a controller for each item in the list and the performance will be comparable to creating that number of objects normally.

To instantiate a controller, use `get`:

```js
var controller = DS.get('name', el);
```

Controllers are always bound to an element on the page, so one of the arguments passed to `get` must be a plain DOM element. Any number of arguments can be passed to `get`, and they will become the parameters of the controller's constructor. For example:

```js
DS.controller('name', function () {
  return function (message, el, answer) {
    // will print: hello there! <body element> 42
    console.log(message, el, answer);
  };
});

var el = document.querySelector('body');
var controller = DS.get('name', 'hello there!', el, 42);
```

It is often useful to save the controller's element, which makes it available to functions in the controller's prototype. Conversely, it's also very useful to _not_ save the element, because DOM elements are very large and saving them in memory is expensive. In any case, this is an example of saving an element that was passed as the first argument.

```js
DS.controller('name', function () {
  var constructor = function (el) {
    this.el = el;
  };
  constructor.prototype = {
    count: function () {
      // 'this' is always bound to this instance of the controller
      var el = this.el;
      return el.children.length;
    }
  };
  return constructor;
});
```

##Event Binding

Controllers have a highly performant shorthand for binding events. Its syntax is the same as BackboneJS for familiarity. It uses native DOM event binding for speed and binds each event's function to the controller so that the meaning of `this` is consistent. All css selectors are valid, and events with no selector apply to the controller's root element.

```js
DS.controller('list', function () {
  var constructor = function (el) {
    this.iam = 'a click example';
  };
  constructor.prototype = {
    events: {
      'scroll': 'onScroll',
      '.item click': 'onItemClick'
    },
    onScroll: function (e) {
      var el = e.target;
      // list slowly disappears as the user scrolls
      el.style.opacity = el.scrollTop / el.clientHeight;
    }
    onItemClick: function (e) {
      // outputs: 'clicked <.item element> and I am a click example'
      console.log('clicked', e.target, 'and I am', this.iam);
    }
  };
  return constructor;
});
```

##Shared Variables and Functions

Controllers can have variables and functions that are shared between each instance, saving memory and keeping code DRY. These shared variables and functions do not have access to `this`.

```js
DS.controller('name', function () {
  var defaultMessage = ' was clicked!'; // shared variable
  
  function logMe(message) { // shared function
    console.log(message);
  }

  // ...
});
```

Shared variables and functions can be referenced from anywhere inside the controller.

```js
DS.controller('list', function () {
  var defaultMessage = ' was clicked!'; // shared variable

  // ...

  var constructor = function () {}
  constructor.prototype = {
    events: {
      'click': 'onClick'
    },
    onClick: function (e) {
      console.log(e.target + defaultMessage);
    }
  };
  return constructor;
});
```

##Services

The syntax of a service is a simplied version of AngularJS:

```js
DS.service('name', function () {
  // singleton constructor

  var items = []; // shared variable

  // public method
  this.getItem = function (index) {
    return items[index];
  };
});
```

Just like AngularJS, using an array as the second parameter defines that controller's dependencies, which can be services or values. This format is very useful because of JavaScript minification, which changes the names of variables in scopes to things like `a`, `b`, `c`, etc, but leaves the strings defining a controller's dependencies alone.

```js
DS.service('myService', function () {
  console.log('service created');
});

DS.controller('myController', ['myService', function (myService) {
  return function (el) {
    console.log('controller created for' + el.tagName);
  };
}]);

DS.get('myController', document.body);

// outputs:
//  service created
//  controller created for BODY
```

Services are only created once, and only when they're a dependency of an instantiated controller. If a controller that uses the service is never requested, then the service will never be created.

```js
DS.service('lonelyService', function () {
  console.log('lonely service created!');
});

DS.controller('myController', ['anotherService', function (anotherService) {
  return function (el) {
    console.log('controller created!');
  };
}]);

DS.get('myController', document.body);

// outputs:
//  controller created!
```

##Values

Values are useful for storing config and providing safe references that can be mocked during testing.

```js
DS.value('$', jQuery);
DS.value('_', lodash);
DS.value('$document', document);
DS.value('config', {'hostname': 'nymag.com', 'env': 'prod'});
```

Values can be injected as well. For example:

```js
DS.controller('list', ['$', '_', 'config', function ($, _, config) {
  return function () {
    $(this.el).find('.items:first').fadeIn();
    console.log('list config:', _.pick(config, 'env'));
  };
}]);
```

##Full Example

Here's what a fully-featured controller looks like. Note the shared variables and functions, event handlers, and dependency injection.

```js
DS.controller('item-controller', ['myService', function (myService) {
  var defaultMessage = ' was clicked!'; // shared variable
  function logMe(message) { // shared function
    console.log(message);
  }

  var constructor = function (el) {
    this.button = el.querySelector('button');
    this.tagName = el.tagName;
    // note: you can also reference prototype methods here, e.g. this.onClick()
  };

  constructor.prototype = {
    events: {
      'click': 'onClick', // fires when the el is clicked
      'button click': 'onButtonClick' // fires when the button inside the el is clicked
    },
    onClick: function () {
      logMe(this.tagName + defaultMessage);
    },
    onButtonClick: function (e) {
      var buttonName = this.button.tagName;
      e.stopPropagation(); // this will stop `onClick` from being called
      logMe(buttonName + ' was clicked, but the click event won\'t propagate!');
      myService.trigger('customevent'); // services can do api calls, handle custom events, and much more
    }
  };
  return constructor; // remember to return the constructor!
}]);
```

##Browserify

When using Browserify, you can pare down Dollar Slice even more. Services and Controllers become simple modules, and dependency injection (and `DS.value()`) is completely unnecessary. Here's what that looks like:

###my-service.js

```js
// require() creates singletons, so services can still share state between controllers
var items = [];

// public method
exports.getItem = function (index) { // use `module.exports` instead of `this`
  return items[index];
};
```

###item-controller.js

```js
module.exports = function () {
  var myService = require('./my-service'), // pull in any modules you need
    _ = require('lodash'); // even use 3rd party modules (that work with browserify)

  var constructor = function (el) {
    var buttonClasses = el.querySelector('button').classList;
    myService.getItem(_.first(buttonClasses)); // use the modules you pulled in
  };
  return constructor;
};
```

###Instantiation

```js
var DS = require('dollar-slice');

// define the controller
DS.controller('item-controller', require('./item-controller'));

// instantiate your controller with an element
DS.get('item-controller', document.querySelector('.item'));
```
