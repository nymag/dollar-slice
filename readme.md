Dollar Slice
============

_"Cheap and easy."_

Client-side micro-framework with heavy inspiration from AngularJS and BackboneJS.

`DS.value('`🍕`', DS);`

We use this micro-framework to increase the speed of JavaScript initialization. It's styled with familiar syntax from Angular and Backbone to reduce onboarding and training, but doesn't concern itself with templating, data-binding, routing, or other features that introduce bloat and complexity. The code is not very large and is well-documented, so its a highly recommended read.

It divides our code into controllers and services. Controllers control a portion of the page. Services are reusable singletons that controllers can share. Both are deliberately designed to create testable and maintainable code.

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

Controllers can have variables and functions that are shared between each instance, saving memory and keeping code DRY. These shared variables and functions do not have access to `this`.

```js
DS.controller('name', function() {
  var defaultMessage = ' was clicked!'; // shared variable
  
  function logMe(message) { // shared function
    console.log(message);
  }

  // ...
});
```

Shared variables and functions can be referenced from anywhere inside the controller.

```js
DS.controller('list', function() {
  var defaultMessage = ' was clicked!'; // shared variable

  // ...

  var constructor = function() {}
  constructor.prototype = {
    events: {
      'click': 'onClick'
    },
    onClick: function(e) {
      console.log(e.target + defaultMessage);
    }
  };
  return constructor;
});
```

##Dependency Injection

The syntax of a service is a simplied version of AngularJS:

```js
DS.service('name', function () {
  // singleton constructor

  var items = []; // shared variable

  // public method
  this.getItem = function(index) {
    return items[index];
  };
});
```

Services are only created once, and only when they're a dependency of an instantiated controller. If a controller that uses the service is never requested, then the service will never be created.

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

A service that isn't a dependency of any controllers will not be created.

```js
DS.service('lonelyService', function() {
  console.log('lonely service created!');
});

DS.controller('myController', ['anotherService', function(anotherService) {
  return function(el) {
    console.log('controller created!');
  };
}]);

DS.get('myController', document.body);

// outputs:
//  controller created!
```

Note the new syntax of the controller. Just like AngularJS, using an array as the second parameter defines that controller's dependencies, which can be services, values, or constants. This format is very useful because of JavaScript minification, which changes the names of variables in scopes to things like a, b, c, etc, but leaves the strings defining a controller's dependencies alone.

Other dependencies can be injected as well. For example:

```js
DS.value('$', jQuery);
DS.value('_', lodash);
DS.value('config', {'hostname': 'nymag.com', 'env': 'prod'});

DS.controller('list', ['$', '_', 'config', function ($, _, config) {
  return function () {
    $(this.el).find('.items:first').fadeIn();
    console.log('list config:', _.pick(config, 'env'));
  };
}]);
```

##Initialization of Controllers

If you're using `DS.controller()` in a systemic way – e.g. for all "components" or "modules" on a page – it's convenient to write a "controller initialization" service. Such a service would loop once through the DOM and call `DS.get('name', el);` for each component/module it found. This can give a huge advantage in speed and prevent waiting for third-party dependencies.

Here's an example of manually kicking off a 'components' service when our _final.min.js_ file is finished loading:

```js
setTimeout(function () {
  DS.get('components');
}, 0);
```

##Full Example

Here's what a fully-featured controller looks like. Note the shared variables and functions, event handlers, and dependency injection.

```js
DS.controller('name', ['myService', function(myService) {
  var defaultMessage = ' was clicked!'; // shared variable
  function logMe(message) { // shared function
    console.log(message);
  }

  // constructor
  var ItemCtrl = function (el) {
    this.button = el.querySelector('button');
    this.tagName = el.tagName;
    // note: you can also reference prototype methods here, e.g. this.onClick()
  };

  ItemCtrl.prototype = {
    events: {
      'click': 'onClick', // fires when the el is clicked
      'button click': 'onButtonClick' // fires when the button inside the el is clicked
    },
    onClick: function() {
      logMe(this.tagName + defaultMessage);
    },
    onButtonClick: function(e) {
      var buttonName = this.button.tagName;
      e.stopPropagation(); // this will stop `onClick` from being called
      logMe(buttonName + ' was clicked, but the click event won\'t propagate!');
      myService.trigger('customevent'); // services can do api calls, handle custom events, and much more
    }
  };
  return ItemCtrl; // remember to return the constructor!
}]);
```
