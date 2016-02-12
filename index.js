var Module = (function () {
  'use strict';

  /**
   * Is obj an Element via duck-typing
   * @param {{}} obj
   * @returns {boolean}
   */
  function isElement(obj) {
    return !!(obj && obj.nodeType === 1);
  }

  /**
   * Get the first item in arguments that is a DOM/jQuery element via duck-typing
   * @param args
   * @returns {Element}
   * @throws Error if no element is found
   */
  function getFirstElementArgument(args) {
    var $el, i;
    for (i = 0; i < args.length; i++) {
      //assume first element in arguments is root element
      if (!$el && isElement(args[i])) {
        return args[i]; //do not cast to jq, because we can't assume that it exists
      }
    }
    throw new Error('Must have element to bind controller');
  }

  /**
   * Iterates through all event definitions in object
   * @param {{}} events
   * @param {Element} el
   * @param {function} controller
   */
  function addEvents(events, el, controller) {
    var i, event, eventName, indexOfLastSpace, elList;

    // loop through the defined events
    for (event in events) {
      if (events.hasOwnProperty(event)) {
        indexOfLastSpace = event.lastIndexOf(' ');

        if (indexOfLastSpace === -1) {
          // event is defined on the component el, e.g. 'click'
          el.addEventListener(event, controller[events[event]].bind(controller));
        } else {
          // event is defined on a child el, e.g. 'div a click'
          eventName = event.substring(indexOfLastSpace + 1);
          elList = el.querySelectorAll(event.substring(0, indexOfLastSpace)); // get all child els that match

          // loop through child els (could be just one!) and add event listeners
          for (i = 0; i < elList.length; i++) {
            elList[i].addEventListener(eventName, controller[events[event]].bind(controller));
          }
        }
      }
    }
  }


  /**
   * Create a Service
   *
   * Basically any kind of stand-alone singleton.
   *
   * @param definition
   * @param dependencies
   * @constructor
   */
  function DSService(definition, dependencies) {
    //jshint -W058
    //the 'new' keyword resets the service's context
    var service = new (Function.prototype.bind.apply(definition, [null].concat(dependencies)));
    definition.module.context[definition.refName] = service;
    return service;
  }

  /**
   * Create a Controller
   *
   * Mimics both AngularJS controllers and directives, since we don't need double-binding or scopes
   *
   * @param definition
   * @param dependencies
   * @param instanceArguments
   * @constructor
   */
  function DSController(definition, dependencies, instanceArguments) {
    //jshint -W058
    var el = getFirstElementArgument(instanceArguments),
      constructor = definition.apply(null, dependencies),
      controller = new (Function.prototype.bind.apply(constructor, [null].concat(instanceArguments)));

    //we handle event registration, ala Marionette
    // so event attachment does not need to be unit tested
    if (controller.events) {
      addEvents(controller.events, el, controller);
    }

    return controller;
  }

  /**
   * Define a thing that can be instantiated using a provider strategy
   *
   * NOTE: keep private because it's a reclusive iterator
   *
   * @param {Module} module
   * @param {function} providerStrategy
   * @param {string} name
   * @param {[] || function} definition
   * @returns {function}
   * @private
   */
  function define(module, providerStrategy, name, definition) {
    var dependencies;
    if (typeof name !== 'string') {
      throw new Error('Name must be a string');
    }

    if (typeof definition === 'function') {
      dependencies = [];
    } else {
      dependencies = definition.slice(0, definition.length - 1);
      definition = definition[definition.length - 1];
    }

    if (typeof definition !== 'function') {
      throw new Error('Must define function as last argument or last element of definition array');
    }

    //everything needed to create this thing on demand
    definition.refName = name;
    definition.dependencies = dependencies;
    definition.module = module;
    definition.providerStrategy = providerStrategy;
    return definition;
  }

  /**
   * Create a new thing based solely on definition
   *
   * NOTE: Visitor pattern.  Can jump from module to module, do not reference 'this'.
   * @param definition
   * @returns {*}
   */
  function instantiate(definition) {
    var i,
      constructorArgs = [],
      module = definition.module,
      dependencies = definition.dependencies;

    //get dependencies
    for (i = 0; i < dependencies.length; i++) {
      if (module.context[dependencies[i]]) {
        constructorArgs[i] = module.context[dependencies[i]];
      } else if (module.definitions[dependencies[i]]) {
        constructorArgs[i] = instantiate(module.definitions[dependencies[i]]);
      } else {
        throw new Error(dependencies[i] + ' not defined');
      }
    }

    return definition.providerStrategy(definition, constructorArgs, Array.prototype.slice.call(arguments, 1));
  }

  var constructor = function () {
    this.definitions = {};
    this.context = {};
  };
  constructor.prototype = {

    /**
     * Create a new thing based solely on definition
     *
     * NOTE: Is safe, because instantiate does not and should not reference 'this'.
     * @param definition
     * @returns {*}
     */
    instantiate: instantiate,

    /**
     * Gets or instantiates thing
     * @param name
     * @returns {*}
     */
    get: function (name) {
      if (this.context[name]) {
        return this.context[name];
      }

      if (this.definitions[name] && typeof this.definitions[name] === 'function') {
        return instantiate.apply(this, [this.definitions[name]].concat(Array.prototype.slice.call(arguments, 1)));
      } else if (typeof require !== 'undefined') {
        return instantiate.apply(this, [define(this, DSController, name, require(name))].concat(Array.prototype.slice.call(arguments, 1)));
        // note: this will throw an error if `name` doesn't exist anywhere
      } else {
        // note: this can only be hit when not using browserify
        throw new Error(name + ' is not defined');
      }
    },

    /**
     * Only create if exists in DOM.  Has distinct graphical attachment.  Scope represents container for thing on the
     * page.  Remembers container element.
     * @param name
     * @param definition
     * @returns {Module}
     */
    controller: function (name, definition) {
      this.definitions[name] = define(this, DSController, name, definition);
      return this;
    },

    /**
     * Singleton helper classes and abstractions
     * @param {string} name
     * @param {[] || function} definition
     */
    service: function (name, definition) {
      //definition always becomes a function when defined
      this.definitions[name] = define(this, DSService, name, definition);
      return this;
    },

    /**
     * @param name
     * @param value
     * @returns {Module}
     */
    value: function (name, value) {
      this.context[name] = value;
      return this;
    }
  };
  return constructor;
})();

//at least always one default module
var DS = new Module();
var attach = this;

if (this === undefined) {
  // support for es2015 module strictness (this will be undefined, so explicitly add it to window)
  attach = window;
} // older browsers, commonjs modules, etc will simply use `this`

// internally defined components should start with $, ala Angular convention
DS.value('$window', attach);
DS.value('$document', attach.document);

//explicitly global
attach.DS = DS;

//reliable self reference
DS.value('$module', DS);

// export it for node and browserify
if (typeof exports !== 'undefined') {
  module.exports = DS;
}
