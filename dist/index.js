'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Stream$1 = _interopDefault(require('stream'));
var http = _interopDefault(require('http'));
var Url = _interopDefault(require('url'));
var https = _interopDefault(require('https'));
var zlib = _interopDefault(require('zlib'));
var crypto = _interopDefault(require('crypto'));
var fs$1 = _interopDefault(require('fs'));
var constants = _interopDefault(require('constants'));
var util$1 = _interopDefault(require('util'));
var assert = _interopDefault(require('assert'));
var path = _interopDefault(require('path'));
var os = _interopDefault(require('os'));
var events = _interopDefault(require('events'));
var querystring = _interopDefault(require('querystring'));
var buffer$2 = _interopDefault(require('buffer'));
var electron = _interopDefault(require('electron'));

// fix for "Readable" isn't a named export issue

const Readable = Stream$1.Readable;
const BUFFER = Symbol('buffer');
const TYPE = Symbol('type');

class Blob {
  constructor() {
    this[TYPE] = '';
    const blobParts = arguments[0];
    const options = arguments[1];
    const buffers = [];
    let size = 0;

    if (blobParts) {
      const a = blobParts;
      const length = Number(a.length);

      for (let i = 0; i < length; i++) {
        const element = a[i];
        let buffer;

        if (element instanceof Buffer) {
          buffer = element;
        } else if (ArrayBuffer.isView(element)) {
          buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
        } else if (element instanceof ArrayBuffer) {
          buffer = Buffer.from(element);
        } else if (element instanceof Blob) {
          buffer = element[BUFFER];
        } else {
          buffer = Buffer.from(typeof element === 'string' ? element : String(element));
        }

        size += buffer.length;
        buffers.push(buffer);
      }
    }

    this[BUFFER] = Buffer.concat(buffers);
    let type = options && options.type !== undefined && String(options.type).toLowerCase();

    if (type && !/[^\u0020-\u007E]/.test(type)) {
      this[TYPE] = type;
    }
  }

  get size() {
    return this[BUFFER].length;
  }

  get type() {
    return this[TYPE];
  }

  text() {
    return Promise.resolve(this[BUFFER].toString());
  }

  arrayBuffer() {
    const buf = this[BUFFER];
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return Promise.resolve(ab);
  }

  stream() {
    const readable = new Readable();

    readable._read = function () {};

    readable.push(this[BUFFER]);
    readable.push(null);
    return readable;
  }

  toString() {
    return '[object Blob]';
  }

  slice() {
    const size = this.size;
    const start = arguments[0];
    const end = arguments[1];
    let relativeStart, relativeEnd;

    if (start === undefined) {
      relativeStart = 0;
    } else if (start < 0) {
      relativeStart = Math.max(size + start, 0);
    } else {
      relativeStart = Math.min(start, size);
    }

    if (end === undefined) {
      relativeEnd = size;
    } else if (end < 0) {
      relativeEnd = Math.max(size + end, 0);
    } else {
      relativeEnd = Math.min(end, size);
    }

    const span = Math.max(relativeEnd - relativeStart, 0);
    const buffer = this[BUFFER];
    const slicedBuffer = buffer.slice(relativeStart, relativeStart + span);
    const blob = new Blob([], {
      type: arguments[2]
    });
    blob[BUFFER] = slicedBuffer;
    return blob;
  }

}

Object.defineProperties(Blob.prototype, {
  size: {
    enumerable: true
  },
  type: {
    enumerable: true
  },
  slice: {
    enumerable: true
  }
});
Object.defineProperty(Blob.prototype, Symbol.toStringTag, {
  value: 'Blob',
  writable: false,
  enumerable: false,
  configurable: true
});
/**
 * fetch-error.js
 *
 * FetchError interface for operational errors
 */

/**
 * Create FetchError instance
 *
 * @param   String      message      Error message for human
 * @param   String      type         Error type for machine
 * @param   String      systemError  For Node.js system error
 * @return  FetchError
 */

function FetchError(message, type, systemError) {
  Error.call(this, message);
  this.message = message;
  this.type = type; // when err.type is `system`, err.code contains system error code

  if (systemError) {
    this.code = this.errno = systemError.code;
  } // hide custom error implementation details from end-users


  Error.captureStackTrace(this, this.constructor);
}

FetchError.prototype = Object.create(Error.prototype);
FetchError.prototype.constructor = FetchError;
FetchError.prototype.name = 'FetchError';
let convert;

try {
  convert = require('encoding').convert;
} catch (e) {}

const INTERNALS = Symbol('Body internals'); // fix an issue where "PassThrough" isn't a named export for node <10

const PassThrough = Stream$1.PassThrough;
/**
 * Body mixin
 *
 * Ref: https://fetch.spec.whatwg.org/#body
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */

function Body(body) {
  var _this = this;

  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$size = _ref.size;

  let size = _ref$size === undefined ? 0 : _ref$size;
  var _ref$timeout = _ref.timeout;
  let timeout = _ref$timeout === undefined ? 0 : _ref$timeout;

  if (body == null) {
    // body is undefined or null
    body = null;
  } else if (isURLSearchParams(body)) {
    // body is a URLSearchParams
    body = Buffer.from(body.toString());
  } else if (isBlob(body)) ;else if (Buffer.isBuffer(body)) ;else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
    // body is ArrayBuffer
    body = Buffer.from(body);
  } else if (ArrayBuffer.isView(body)) {
    // body is ArrayBufferView
    body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  } else if (body instanceof Stream$1) ;else {
    // none of the above
    // coerce to string then buffer
    body = Buffer.from(String(body));
  }

  this[INTERNALS] = {
    body,
    disturbed: false,
    error: null
  };
  this.size = size;
  this.timeout = timeout;

  if (body instanceof Stream$1) {
    body.on('error', function (err) {
      const error = err.name === 'AbortError' ? err : new FetchError(`Invalid response body while trying to fetch ${_this.url}: ${err.message}`, 'system', err);
      _this[INTERNALS].error = error;
    });
  }
}

Body.prototype = {
  get body() {
    return this[INTERNALS].body;
  },

  get bodyUsed() {
    return this[INTERNALS].disturbed;
  },

  /**
   * Decode response as ArrayBuffer
   *
   * @return  Promise
   */
  arrayBuffer() {
    return consumeBody.call(this).then(function (buf) {
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    });
  },

  /**
   * Return raw response as Blob
   *
   * @return Promise
   */
  blob() {
    let ct = this.headers && this.headers.get('content-type') || '';
    return consumeBody.call(this).then(function (buf) {
      return Object.assign( // Prevent copying
      new Blob([], {
        type: ct.toLowerCase()
      }), {
        [BUFFER]: buf
      });
    });
  },

  /**
   * Decode response as json
   *
   * @return  Promise
   */
  json() {
    var _this2 = this;

    return consumeBody.call(this).then(function (buffer) {
      try {
        return JSON.parse(buffer.toString());
      } catch (err) {
        return Body.Promise.reject(new FetchError(`invalid json response body at ${_this2.url} reason: ${err.message}`, 'invalid-json'));
      }
    });
  },

  /**
   * Decode response as text
   *
   * @return  Promise
   */
  text() {
    return consumeBody.call(this).then(function (buffer) {
      return buffer.toString();
    });
  },

  /**
   * Decode response as buffer (non-spec api)
   *
   * @return  Promise
   */
  buffer() {
    return consumeBody.call(this);
  },

  /**
   * Decode response as text, while automatically detecting the encoding and
   * trying to decode to UTF-8 (non-spec api)
   *
   * @return  Promise
   */
  textConverted() {
    var _this3 = this;

    return consumeBody.call(this).then(function (buffer) {
      return convertBody(buffer, _this3.headers);
    });
  }

}; // In browsers, all properties are enumerable.

Object.defineProperties(Body.prototype, {
  body: {
    enumerable: true
  },
  bodyUsed: {
    enumerable: true
  },
  arrayBuffer: {
    enumerable: true
  },
  blob: {
    enumerable: true
  },
  json: {
    enumerable: true
  },
  text: {
    enumerable: true
  }
});

Body.mixIn = function (proto) {
  for (const name of Object.getOwnPropertyNames(Body.prototype)) {
    // istanbul ignore else: future proof
    if (!(name in proto)) {
      const desc = Object.getOwnPropertyDescriptor(Body.prototype, name);
      Object.defineProperty(proto, name, desc);
    }
  }
};
/**
 * Consume and convert an entire Body to a Buffer.
 *
 * Ref: https://fetch.spec.whatwg.org/#concept-body-consume-body
 *
 * @return  Promise
 */


function consumeBody() {
  var _this4 = this;

  if (this[INTERNALS].disturbed) {
    return Body.Promise.reject(new TypeError(`body used already for: ${this.url}`));
  }

  this[INTERNALS].disturbed = true;

  if (this[INTERNALS].error) {
    return Body.Promise.reject(this[INTERNALS].error);
  }

  let body = this.body; // body is null

  if (body === null) {
    return Body.Promise.resolve(Buffer.alloc(0));
  } // body is blob


  if (isBlob(body)) {
    body = body.stream();
  } // body is buffer


  if (Buffer.isBuffer(body)) {
    return Body.Promise.resolve(body);
  } // istanbul ignore if: should never happen


  if (!(body instanceof Stream$1)) {
    return Body.Promise.resolve(Buffer.alloc(0));
  } // body is stream
  // get ready to actually consume the body


  let accum = [];
  let accumBytes = 0;
  let abort = false;
  return new Body.Promise(function (resolve, reject) {
    let resTimeout; // allow timeout on slow response body

    if (_this4.timeout) {
      resTimeout = setTimeout(function () {
        abort = true;
        reject(new FetchError(`Response timeout while trying to fetch ${_this4.url} (over ${_this4.timeout}ms)`, 'body-timeout'));
      }, _this4.timeout);
    } // handle stream errors


    body.on('error', function (err) {
      if (err.name === 'AbortError') {
        // if the request was aborted, reject with this Error
        abort = true;
        reject(err);
      } else {
        // other errors, such as incorrect content-encoding
        reject(new FetchError(`Invalid response body while trying to fetch ${_this4.url}: ${err.message}`, 'system', err));
      }
    });
    body.on('data', function (chunk) {
      if (abort || chunk === null) {
        return;
      }

      if (_this4.size && accumBytes + chunk.length > _this4.size) {
        abort = true;
        reject(new FetchError(`content size at ${_this4.url} over limit: ${_this4.size}`, 'max-size'));
        return;
      }

      accumBytes += chunk.length;
      accum.push(chunk);
    });
    body.on('end', function () {
      if (abort) {
        return;
      }

      clearTimeout(resTimeout);

      try {
        resolve(Buffer.concat(accum, accumBytes));
      } catch (err) {
        // handle streams that have accumulated too much data (issue #414)
        reject(new FetchError(`Could not create Buffer from response body for ${_this4.url}: ${err.message}`, 'system', err));
      }
    });
  });
}
/**
 * Detect buffer encoding and convert to target encoding
 * ref: http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
 *
 * @param   Buffer  buffer    Incoming buffer
 * @param   String  encoding  Target encoding
 * @return  String
 */


function convertBody(buffer, headers) {
  if (typeof convert !== 'function') {
    throw new Error('The package `encoding` must be installed to use the textConverted() function');
  }

  const ct = headers.get('content-type');
  let charset = 'utf-8';
  let res, str; // header

  if (ct) {
    res = /charset=([^;]*)/i.exec(ct);
  } // no charset in content type, peek at response body for at most 1024 bytes


  str = buffer.slice(0, 1024).toString(); // html5

  if (!res && str) {
    res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str);
  } // html4


  if (!res && str) {
    res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(str);

    if (res) {
      res = /charset=(.*)/i.exec(res.pop());
    }
  } // xml


  if (!res && str) {
    res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str);
  } // found charset


  if (res) {
    charset = res.pop(); // prevent decode issues when sites use incorrect encoding
    // ref: https://hsivonen.fi/encoding-menu/

    if (charset === 'gb2312' || charset === 'gbk') {
      charset = 'gb18030';
    }
  } // turn raw buffers into a single utf-8 buffer


  return convert(buffer, 'UTF-8', charset).toString();
}
/**
 * Detect a URLSearchParams object
 * ref: https://github.com/bitinn/node-fetch/issues/296#issuecomment-307598143
 *
 * @param   Object  obj     Object to detect by type or brand
 * @return  String
 */


function isURLSearchParams(obj) {
  // Duck-typing as a necessary condition.
  if (typeof obj !== 'object' || typeof obj.append !== 'function' || typeof obj.delete !== 'function' || typeof obj.get !== 'function' || typeof obj.getAll !== 'function' || typeof obj.has !== 'function' || typeof obj.set !== 'function') {
    return false;
  } // Brand-checking and more duck-typing as optional condition.


  return obj.constructor.name === 'URLSearchParams' || Object.prototype.toString.call(obj) === '[object URLSearchParams]' || typeof obj.sort === 'function';
}
/**
 * Check if `obj` is a W3C `Blob` object (which `File` inherits from)
 * @param  {*} obj
 * @return {boolean}
 */


function isBlob(obj) {
  return typeof obj === 'object' && typeof obj.arrayBuffer === 'function' && typeof obj.type === 'string' && typeof obj.stream === 'function' && typeof obj.constructor === 'function' && typeof obj.constructor.name === 'string' && /^(Blob|File)$/.test(obj.constructor.name) && /^(Blob|File)$/.test(obj[Symbol.toStringTag]);
}
/**
 * Clone body given Res/Req instance
 *
 * @param   Mixed  instance  Response or Request instance
 * @return  Mixed
 */


function clone(instance) {
  let p1, p2;
  let body = instance.body; // don't allow cloning a used body

  if (instance.bodyUsed) {
    throw new Error('cannot clone body after it is used');
  } // check that body is a stream and not form-data object
  // note: we can't clone the form-data object without having it as a dependency


  if (body instanceof Stream$1 && typeof body.getBoundary !== 'function') {
    // tee instance body
    p1 = new PassThrough();
    p2 = new PassThrough();
    body.pipe(p1);
    body.pipe(p2); // set instance body to teed body and return the other teed body

    instance[INTERNALS].body = p1;
    body = p2;
  }

  return body;
}
/**
 * Performs the operation "extract a `Content-Type` value from |object|" as
 * specified in the specification:
 * https://fetch.spec.whatwg.org/#concept-bodyinit-extract
 *
 * This function assumes that instance.body is present.
 *
 * @param   Mixed  instance  Any options.body input
 */


function extractContentType(body) {
  if (body === null) {
    // body is null
    return null;
  } else if (typeof body === 'string') {
    // body is string
    return 'text/plain;charset=UTF-8';
  } else if (isURLSearchParams(body)) {
    // body is a URLSearchParams
    return 'application/x-www-form-urlencoded;charset=UTF-8';
  } else if (isBlob(body)) {
    // body is blob
    return body.type || null;
  } else if (Buffer.isBuffer(body)) {
    // body is buffer
    return null;
  } else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
    // body is ArrayBuffer
    return null;
  } else if (ArrayBuffer.isView(body)) {
    // body is ArrayBufferView
    return null;
  } else if (typeof body.getBoundary === 'function') {
    // detect form data input from form-data module
    return `multipart/form-data;boundary=${body.getBoundary()}`;
  } else if (body instanceof Stream$1) {
    // body is stream
    // can't really do much about this
    return null;
  } else {
    // Body constructor defaults other things to string
    return 'text/plain;charset=UTF-8';
  }
}
/**
 * The Fetch Standard treats this as if "total bytes" is a property on the body.
 * For us, we have to explicitly get it with a function.
 *
 * ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
 *
 * @param   Body    instance   Instance of Body
 * @return  Number?            Number of bytes, or null if not possible
 */


function getTotalBytes(instance) {
  const body = instance.body;

  if (body === null) {
    // body is null
    return 0;
  } else if (isBlob(body)) {
    return body.size;
  } else if (Buffer.isBuffer(body)) {
    // body is buffer
    return body.length;
  } else if (body && typeof body.getLengthSync === 'function') {
    // detect form data input from form-data module
    if (body._lengthRetrievers && body._lengthRetrievers.length == 0 || // 1.x
    body.hasKnownLength && body.hasKnownLength()) {
      // 2.x
      return body.getLengthSync();
    }

    return null;
  } else {
    // body is stream
    return null;
  }
}
/**
 * Write a Body to a Node.js WritableStream (e.g. http.Request) object.
 *
 * @param   Body    instance   Instance of Body
 * @return  Void
 */


function writeToStream(dest, instance) {
  const body = instance.body;

  if (body === null) {
    // body is null
    dest.end();
  } else if (isBlob(body)) {
    body.stream().pipe(dest);
  } else if (Buffer.isBuffer(body)) {
    // body is buffer
    dest.write(body);
    dest.end();
  } else {
    // body is stream
    body.pipe(dest);
  }
} // expose Promise


Body.Promise = global.Promise;
/**
 * headers.js
 *
 * Headers class offers convenient helpers
 */

const invalidTokenRegex = /[^\^_`a-zA-Z\-0-9!#$%&'*+.|~]/;
const invalidHeaderCharRegex = /[^\t\x20-\x7e\x80-\xff]/;

function validateName(name) {
  name = `${name}`;

  if (invalidTokenRegex.test(name) || name === '') {
    throw new TypeError(`${name} is not a legal HTTP header name`);
  }
}

function validateValue(value) {
  value = `${value}`;

  if (invalidHeaderCharRegex.test(value)) {
    throw new TypeError(`${value} is not a legal HTTP header value`);
  }
}
/**
 * Find the key in the map object given a header name.
 *
 * Returns undefined if not found.
 *
 * @param   String  name  Header name
 * @return  String|Undefined
 */


function find(map, name) {
  name = name.toLowerCase();

  for (const key in map) {
    if (key.toLowerCase() === name) {
      return key;
    }
  }

  return undefined;
}

const MAP = Symbol('map');

class Headers {
  /**
   * Headers class
   *
   * @param   Object  headers  Response headers
   * @return  Void
   */
  constructor() {
    let init = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
    this[MAP] = Object.create(null);

    if (init instanceof Headers) {
      const rawHeaders = init.raw();
      const headerNames = Object.keys(rawHeaders);

      for (const headerName of headerNames) {
        for (const value of rawHeaders[headerName]) {
          this.append(headerName, value);
        }
      }

      return;
    } // We don't worry about converting prop to ByteString here as append()
    // will handle it.


    if (init == null) ;else if (typeof init === 'object') {
      const method = init[Symbol.iterator];

      if (method != null) {
        if (typeof method !== 'function') {
          throw new TypeError('Header pairs must be iterable');
        } // sequence<sequence<ByteString>>
        // Note: per spec we have to first exhaust the lists then process them


        const pairs = [];

        for (const pair of init) {
          if (typeof pair !== 'object' || typeof pair[Symbol.iterator] !== 'function') {
            throw new TypeError('Each header pair must be iterable');
          }

          pairs.push(Array.from(pair));
        }

        for (const pair of pairs) {
          if (pair.length !== 2) {
            throw new TypeError('Each header pair must be a name/value tuple');
          }

          this.append(pair[0], pair[1]);
        }
      } else {
        // record<ByteString, ByteString>
        for (const key of Object.keys(init)) {
          const value = init[key];
          this.append(key, value);
        }
      }
    } else {
      throw new TypeError('Provided initializer must be an object');
    }
  }
  /**
   * Return combined header value given name
   *
   * @param   String  name  Header name
   * @return  Mixed
   */


  get(name) {
    name = `${name}`;
    validateName(name);
    const key = find(this[MAP], name);

    if (key === undefined) {
      return null;
    }

    return this[MAP][key].join(', ');
  }
  /**
   * Iterate over all headers
   *
   * @param   Function  callback  Executed for each item with parameters (value, name, thisArg)
   * @param   Boolean   thisArg   `this` context for callback function
   * @return  Void
   */


  forEach(callback) {
    let thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
    let pairs = getHeaders(this);
    let i = 0;

    while (i < pairs.length) {
      var _pairs$i = pairs[i];
      const name = _pairs$i[0],
            value = _pairs$i[1];
      callback.call(thisArg, value, name, this);
      pairs = getHeaders(this);
      i++;
    }
  }
  /**
   * Overwrite header values given name
   *
   * @param   String  name   Header name
   * @param   String  value  Header value
   * @return  Void
   */


  set(name, value) {
    name = `${name}`;
    value = `${value}`;
    validateName(name);
    validateValue(value);
    const key = find(this[MAP], name);
    this[MAP][key !== undefined ? key : name] = [value];
  }
  /**
   * Append a value onto existing header
   *
   * @param   String  name   Header name
   * @param   String  value  Header value
   * @return  Void
   */


  append(name, value) {
    name = `${name}`;
    value = `${value}`;
    validateName(name);
    validateValue(value);
    const key = find(this[MAP], name);

    if (key !== undefined) {
      this[MAP][key].push(value);
    } else {
      this[MAP][name] = [value];
    }
  }
  /**
   * Check for header name existence
   *
   * @param   String   name  Header name
   * @return  Boolean
   */


  has(name) {
    name = `${name}`;
    validateName(name);
    return find(this[MAP], name) !== undefined;
  }
  /**
   * Delete all header values given name
   *
   * @param   String  name  Header name
   * @return  Void
   */


  delete(name) {
    name = `${name}`;
    validateName(name);
    const key = find(this[MAP], name);

    if (key !== undefined) {
      delete this[MAP][key];
    }
  }
  /**
   * Return raw headers (non-spec api)
   *
   * @return  Object
   */


  raw() {
    return this[MAP];
  }
  /**
   * Get an iterator on keys.
   *
   * @return  Iterator
   */


  keys() {
    return createHeadersIterator(this, 'key');
  }
  /**
   * Get an iterator on values.
   *
   * @return  Iterator
   */


  values() {
    return createHeadersIterator(this, 'value');
  }
  /**
   * Get an iterator on entries.
   *
   * This is the default iterator of the Headers object.
   *
   * @return  Iterator
   */


  [Symbol.iterator]() {
    return createHeadersIterator(this, 'key+value');
  }

}

Headers.prototype.entries = Headers.prototype[Symbol.iterator];
Object.defineProperty(Headers.prototype, Symbol.toStringTag, {
  value: 'Headers',
  writable: false,
  enumerable: false,
  configurable: true
});
Object.defineProperties(Headers.prototype, {
  get: {
    enumerable: true
  },
  forEach: {
    enumerable: true
  },
  set: {
    enumerable: true
  },
  append: {
    enumerable: true
  },
  has: {
    enumerable: true
  },
  delete: {
    enumerable: true
  },
  keys: {
    enumerable: true
  },
  values: {
    enumerable: true
  },
  entries: {
    enumerable: true
  }
});

function getHeaders(headers) {
  let kind = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'key+value';
  const keys = Object.keys(headers[MAP]).sort();
  return keys.map(kind === 'key' ? function (k) {
    return k.toLowerCase();
  } : kind === 'value' ? function (k) {
    return headers[MAP][k].join(', ');
  } : function (k) {
    return [k.toLowerCase(), headers[MAP][k].join(', ')];
  });
}

const INTERNAL = Symbol('internal');

function createHeadersIterator(target, kind) {
  const iterator = Object.create(HeadersIteratorPrototype);
  iterator[INTERNAL] = {
    target,
    kind,
    index: 0
  };
  return iterator;
}

const HeadersIteratorPrototype = Object.setPrototypeOf({
  next() {
    // istanbul ignore if
    if (!this || Object.getPrototypeOf(this) !== HeadersIteratorPrototype) {
      throw new TypeError('Value of `this` is not a HeadersIterator');
    }

    var _INTERNAL = this[INTERNAL];
    const target = _INTERNAL.target,
          kind = _INTERNAL.kind,
          index = _INTERNAL.index;
    const values = getHeaders(target, kind);
    const len = values.length;

    if (index >= len) {
      return {
        value: undefined,
        done: true
      };
    }

    this[INTERNAL].index = index + 1;
    return {
      value: values[index],
      done: false
    };
  }

}, Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())));
Object.defineProperty(HeadersIteratorPrototype, Symbol.toStringTag, {
  value: 'HeadersIterator',
  writable: false,
  enumerable: false,
  configurable: true
});
/**
 * Export the Headers object in a form that Node.js can consume.
 *
 * @param   Headers  headers
 * @return  Object
 */

function exportNodeCompatibleHeaders(headers) {
  const obj = Object.assign({
    __proto__: null
  }, headers[MAP]); // http.request() only supports string as Host header. This hack makes
  // specifying custom Host header possible.

  const hostHeaderKey = find(headers[MAP], 'Host');

  if (hostHeaderKey !== undefined) {
    obj[hostHeaderKey] = obj[hostHeaderKey][0];
  }

  return obj;
}
/**
 * Create a Headers object from an object of headers, ignoring those that do
 * not conform to HTTP grammar productions.
 *
 * @param   Object  obj  Object of headers
 * @return  Headers
 */


function createHeadersLenient(obj) {
  const headers = new Headers();

  for (const name of Object.keys(obj)) {
    if (invalidTokenRegex.test(name)) {
      continue;
    }

    if (Array.isArray(obj[name])) {
      for (const val of obj[name]) {
        if (invalidHeaderCharRegex.test(val)) {
          continue;
        }

        if (headers[MAP][name] === undefined) {
          headers[MAP][name] = [val];
        } else {
          headers[MAP][name].push(val);
        }
      }
    } else if (!invalidHeaderCharRegex.test(obj[name])) {
      headers[MAP][name] = [obj[name]];
    }
  }

  return headers;
}

const INTERNALS$1 = Symbol('Response internals'); // fix an issue where "STATUS_CODES" aren't a named export for node <10

const STATUS_CODES = http.STATUS_CODES;
/**
 * Response class
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */

class Response {
  constructor() {
    let body = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    let opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    Body.call(this, body, opts);
    const status = opts.status || 200;
    const headers = new Headers(opts.headers);

    if (body != null && !headers.has('Content-Type')) {
      const contentType = extractContentType(body);

      if (contentType) {
        headers.append('Content-Type', contentType);
      }
    }

    this[INTERNALS$1] = {
      url: opts.url,
      status,
      statusText: opts.statusText || STATUS_CODES[status],
      headers,
      counter: opts.counter
    };
  }

  get url() {
    return this[INTERNALS$1].url || '';
  }

  get status() {
    return this[INTERNALS$1].status;
  }
  /**
   * Convenience property representing if the request ended normally
   */


  get ok() {
    return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
  }

  get redirected() {
    return this[INTERNALS$1].counter > 0;
  }

  get statusText() {
    return this[INTERNALS$1].statusText;
  }

  get headers() {
    return this[INTERNALS$1].headers;
  }
  /**
   * Clone this response
   *
   * @return  Response
   */


  clone() {
    return new Response(clone(this), {
      url: this.url,
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      ok: this.ok,
      redirected: this.redirected
    });
  }

}

Body.mixIn(Response.prototype);
Object.defineProperties(Response.prototype, {
  url: {
    enumerable: true
  },
  status: {
    enumerable: true
  },
  ok: {
    enumerable: true
  },
  redirected: {
    enumerable: true
  },
  statusText: {
    enumerable: true
  },
  headers: {
    enumerable: true
  },
  clone: {
    enumerable: true
  }
});
Object.defineProperty(Response.prototype, Symbol.toStringTag, {
  value: 'Response',
  writable: false,
  enumerable: false,
  configurable: true
});
const INTERNALS$2 = Symbol('Request internals'); // fix an issue where "format", "parse" aren't a named export for node <10

const parse_url = Url.parse;
const format_url = Url.format;
const streamDestructionSupported = 'destroy' in Stream$1.Readable.prototype;
/**
 * Check if a value is an instance of Request.
 *
 * @param   Mixed   input
 * @return  Boolean
 */

function isRequest(input) {
  return typeof input === 'object' && typeof input[INTERNALS$2] === 'object';
}

function isAbortSignal(signal) {
  const proto = signal && typeof signal === 'object' && Object.getPrototypeOf(signal);
  return !!(proto && proto.constructor.name === 'AbortSignal');
}
/**
 * Request class
 *
 * @param   Mixed   input  Url or Request instance
 * @param   Object  init   Custom options
 * @return  Void
 */


class Request {
  constructor(input) {
    let init = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let parsedURL; // normalize input

    if (!isRequest(input)) {
      if (input && input.href) {
        // in order to support Node.js' Url objects; though WHATWG's URL objects
        // will fall into this branch also (since their `toString()` will return
        // `href` property anyway)
        parsedURL = parse_url(input.href);
      } else {
        // coerce input to a string before attempting to parse
        parsedURL = parse_url(`${input}`);
      }

      input = {};
    } else {
      parsedURL = parse_url(input.url);
    }

    let method = init.method || input.method || 'GET';
    method = method.toUpperCase();

    if ((init.body != null || isRequest(input) && input.body !== null) && (method === 'GET' || method === 'HEAD')) {
      throw new TypeError('Request with GET/HEAD method cannot have body');
    }

    let inputBody = init.body != null ? init.body : isRequest(input) && input.body !== null ? clone(input) : null;
    Body.call(this, inputBody, {
      timeout: init.timeout || input.timeout || 0,
      size: init.size || input.size || 0
    });
    const headers = new Headers(init.headers || input.headers || {});

    if (inputBody != null && !headers.has('Content-Type')) {
      const contentType = extractContentType(inputBody);

      if (contentType) {
        headers.append('Content-Type', contentType);
      }
    }

    let signal = isRequest(input) ? input.signal : null;
    if ('signal' in init) signal = init.signal;

    if (signal != null && !isAbortSignal(signal)) {
      throw new TypeError('Expected signal to be an instanceof AbortSignal');
    }

    this[INTERNALS$2] = {
      method,
      redirect: init.redirect || input.redirect || 'follow',
      headers,
      parsedURL,
      signal
    }; // node-fetch-only options

    this.follow = init.follow !== undefined ? init.follow : input.follow !== undefined ? input.follow : 20;
    this.compress = init.compress !== undefined ? init.compress : input.compress !== undefined ? input.compress : true;
    this.counter = init.counter || input.counter || 0;
    this.agent = init.agent || input.agent;
  }

  get method() {
    return this[INTERNALS$2].method;
  }

  get url() {
    return format_url(this[INTERNALS$2].parsedURL);
  }

  get headers() {
    return this[INTERNALS$2].headers;
  }

  get redirect() {
    return this[INTERNALS$2].redirect;
  }

  get signal() {
    return this[INTERNALS$2].signal;
  }
  /**
   * Clone this request
   *
   * @return  Request
   */


  clone() {
    return new Request(this);
  }

}

Body.mixIn(Request.prototype);
Object.defineProperty(Request.prototype, Symbol.toStringTag, {
  value: 'Request',
  writable: false,
  enumerable: false,
  configurable: true
});
Object.defineProperties(Request.prototype, {
  method: {
    enumerable: true
  },
  url: {
    enumerable: true
  },
  headers: {
    enumerable: true
  },
  redirect: {
    enumerable: true
  },
  clone: {
    enumerable: true
  },
  signal: {
    enumerable: true
  }
});
/**
 * Convert a Request to Node.js http request options.
 *
 * @param   Request  A Request instance
 * @return  Object   The options object to be passed to http.request
 */

function getNodeRequestOptions(request) {
  const parsedURL = request[INTERNALS$2].parsedURL;
  const headers = new Headers(request[INTERNALS$2].headers); // fetch step 1.3

  if (!headers.has('Accept')) {
    headers.set('Accept', '*/*');
  } // Basic fetch


  if (!parsedURL.protocol || !parsedURL.hostname) {
    throw new TypeError('Only absolute URLs are supported');
  }

  if (!/^https?:$/.test(parsedURL.protocol)) {
    throw new TypeError('Only HTTP(S) protocols are supported');
  }

  if (request.signal && request.body instanceof Stream$1.Readable && !streamDestructionSupported) {
    throw new Error('Cancellation of streamed requests with AbortSignal is not supported in node < 8');
  } // HTTP-network-or-cache fetch steps 2.4-2.7


  let contentLengthValue = null;

  if (request.body == null && /^(POST|PUT)$/i.test(request.method)) {
    contentLengthValue = '0';
  }

  if (request.body != null) {
    const totalBytes = getTotalBytes(request);

    if (typeof totalBytes === 'number') {
      contentLengthValue = String(totalBytes);
    }
  }

  if (contentLengthValue) {
    headers.set('Content-Length', contentLengthValue);
  } // HTTP-network-or-cache fetch step 2.11


  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)');
  } // HTTP-network-or-cache fetch step 2.15


  if (request.compress && !headers.has('Accept-Encoding')) {
    headers.set('Accept-Encoding', 'gzip,deflate');
  }

  let agent = request.agent;

  if (typeof agent === 'function') {
    agent = agent(parsedURL);
  }

  if (!headers.has('Connection') && !agent) {
    headers.set('Connection', 'close');
  } // HTTP-network fetch step 4.2
  // chunked encoding is handled by Node.js


  return Object.assign({}, parsedURL, {
    method: request.method,
    headers: exportNodeCompatibleHeaders(headers),
    agent
  });
}
/**
 * abort-error.js
 *
 * AbortError interface for cancelled requests
 */

/**
 * Create AbortError instance
 *
 * @param   String      message      Error message for human
 * @return  AbortError
 */


function AbortError(message) {
  Error.call(this, message);
  this.type = 'aborted';
  this.message = message; // hide custom error implementation details from end-users

  Error.captureStackTrace(this, this.constructor);
}

AbortError.prototype = Object.create(Error.prototype);
AbortError.prototype.constructor = AbortError;
AbortError.prototype.name = 'AbortError'; // fix an issue where "PassThrough", "resolve" aren't a named export for node <10

const PassThrough$1 = Stream$1.PassThrough;
const resolve_url = Url.resolve;
/**
 * Fetch function
 *
 * @param   Mixed    url   Absolute url or Request instance
 * @param   Object   opts  Fetch options
 * @return  Promise
 */

function fetch(url, opts) {
  // allow custom promise
  if (!fetch.Promise) {
    throw new Error('native promise missing, set fetch.Promise to your favorite alternative');
  }

  Body.Promise = fetch.Promise; // wrap http.request into fetch

  return new fetch.Promise(function (resolve, reject) {
    // build request object
    const request = new Request(url, opts);
    const options = getNodeRequestOptions(request);
    const send = (options.protocol === 'https:' ? https : http).request;
    const signal = request.signal;
    let response = null;

    const abort = function abort() {
      let error = new AbortError('The user aborted a request.');
      reject(error);

      if (request.body && request.body instanceof Stream$1.Readable) {
        request.body.destroy(error);
      }

      if (!response || !response.body) return;
      response.body.emit('error', error);
    };

    if (signal && signal.aborted) {
      abort();
      return;
    }

    const abortAndFinalize = function abortAndFinalize() {
      abort();
      finalize();
    }; // send request


    const req = send(options);
    let reqTimeout;

    if (signal) {
      signal.addEventListener('abort', abortAndFinalize);
    }

    function finalize() {
      req.abort();
      if (signal) signal.removeEventListener('abort', abortAndFinalize);
      clearTimeout(reqTimeout);
    }

    if (request.timeout) {
      req.once('socket', function (socket) {
        reqTimeout = setTimeout(function () {
          reject(new FetchError(`network timeout at: ${request.url}`, 'request-timeout'));
          finalize();
        }, request.timeout);
      });
    }

    req.on('error', function (err) {
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
      finalize();
    });
    req.on('response', function (res) {
      clearTimeout(reqTimeout);
      const headers = createHeadersLenient(res.headers); // HTTP fetch step 5

      if (fetch.isRedirect(res.statusCode)) {
        // HTTP fetch step 5.2
        const location = headers.get('Location'); // HTTP fetch step 5.3

        const locationURL = location === null ? null : resolve_url(request.url, location); // HTTP fetch step 5.5

        switch (request.redirect) {
          case 'error':
            reject(new FetchError(`redirect mode is set to error: ${request.url}`, 'no-redirect'));
            finalize();
            return;

          case 'manual':
            // node-fetch-specific step: make manual redirect a bit easier to use by setting the Location header value to the resolved URL.
            if (locationURL !== null) {
              // handle corrupted header
              try {
                headers.set('Location', locationURL);
              } catch (err) {
                // istanbul ignore next: nodejs server prevent invalid response headers, we can't test this through normal request
                reject(err);
              }
            }

            break;

          case 'follow':
            // HTTP-redirect fetch step 2
            if (locationURL === null) {
              break;
            } // HTTP-redirect fetch step 5


            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'));
              finalize();
              return;
            } // HTTP-redirect fetch step 6 (counter increment)
            // Create a new Request object.


            const requestOpts = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              timeout: request.timeout
            }; // HTTP-redirect fetch step 9

            if (res.statusCode !== 303 && request.body && getTotalBytes(request) === null) {
              reject(new FetchError('Cannot follow redirect with body being a readable stream', 'unsupported-redirect'));
              finalize();
              return;
            } // HTTP-redirect fetch step 11


            if (res.statusCode === 303 || (res.statusCode === 301 || res.statusCode === 302) && request.method === 'POST') {
              requestOpts.method = 'GET';
              requestOpts.body = undefined;
              requestOpts.headers.delete('content-length');
            } // HTTP-redirect fetch step 15


            resolve(fetch(new Request(locationURL, requestOpts)));
            finalize();
            return;
        }
      } // prepare response


      res.once('end', function () {
        if (signal) signal.removeEventListener('abort', abortAndFinalize);
      });
      let body = res.pipe(new PassThrough$1());
      const response_options = {
        url: request.url,
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: headers,
        size: request.size,
        timeout: request.timeout,
        counter: request.counter
      }; // HTTP-network fetch step 12.1.1.3

      const codings = headers.get('Content-Encoding'); // HTTP-network fetch step 12.1.1.4: handle content codings
      // in following scenarios we ignore compression support
      // 1. compression support is disabled
      // 2. HEAD request
      // 3. no Content-Encoding header
      // 4. no content response (204)
      // 5. content not modified response (304)

      if (!request.compress || request.method === 'HEAD' || codings === null || res.statusCode === 204 || res.statusCode === 304) {
        response = new Response(body, response_options);
        resolve(response);
        return;
      } // For Node v6+
      // Be less strict when decoding compressed responses, since sometimes
      // servers send slightly invalid responses that are still accepted
      // by common browsers.
      // Always using Z_SYNC_FLUSH is what cURL does.


      const zlibOptions = {
        flush: zlib.Z_SYNC_FLUSH,
        finishFlush: zlib.Z_SYNC_FLUSH
      }; // for gzip

      if (codings == 'gzip' || codings == 'x-gzip') {
        body = body.pipe(zlib.createGunzip(zlibOptions));
        response = new Response(body, response_options);
        resolve(response);
        return;
      } // for deflate


      if (codings == 'deflate' || codings == 'x-deflate') {
        // handle the infamous raw deflate response from old servers
        // a hack for old IIS and Apache servers
        const raw = res.pipe(new PassThrough$1());
        raw.once('data', function (chunk) {
          // see http://stackoverflow.com/questions/37519828
          if ((chunk[0] & 0x0F) === 0x08) {
            body = body.pipe(zlib.createInflate());
          } else {
            body = body.pipe(zlib.createInflateRaw());
          }

          response = new Response(body, response_options);
          resolve(response);
        });
        return;
      } // for br


      if (codings == 'br' && typeof zlib.createBrotliDecompress === 'function') {
        body = body.pipe(zlib.createBrotliDecompress());
        response = new Response(body, response_options);
        resolve(response);
        return;
      } // otherwise, use response as-is


      response = new Response(body, response_options);
      resolve(response);
    });
    writeToStream(req, request);
  });
}
/**
 * Redirect code matching
 *
 * @param   Number   code  Status code
 * @return  Boolean
 */


fetch.isRedirect = function (code) {
  return code === 301 || code === 302 || code === 303 || code === 307 || code === 308;
}; // expose Promise


fetch.Promise = global.Promise;

var lib = /*#__PURE__*/Object.freeze({
	'default': fetch,
	Headers: Headers,
	Request: Request,
	Response: Response,
	FetchError: FetchError
});

function isObject(element) {
  if (!element) return false;
  if (typeof element !== 'object') return false;
  if (element instanceof Array) return false;
  return true;
}

function flattenArray(array) {
  return [].concat(...array);
}

function isArray(prop) {
  if (!prop) return false;
  return prop.constructor === Array;
}

var helpers = {
  isObject,
  flattenArray,
  isArray
};

// Unique ID creation requires a high quality random # generator.  In node.js
// this is pretty straight-forward - we use the crypto API.


var rng = function nodeRNG() {
  return crypto.randomBytes(16);
};

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];

for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex; // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4

  return [bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]]].join('');
}

var bytesToUuid_1 = bytesToUuid;

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html


var _nodeId;

var _clockseq; // Previous uuid creation time


var _lastMSecs = 0;
var _lastNSecs = 0; // See https://github.com/broofa/node-uuid for API details

function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];
  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189

  if (node == null || clockseq == null) {
    var seedBytes = rng();

    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
    }

    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime(); // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock

  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

  var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval


  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  } // Per 4.2.1.2 Throw error if too many uuids are requested


  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

  msecs += 12219292800000; // `time_low`

  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff; // `time_mid`

  var tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff; // `time_high_and_version`

  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

  b[i++] = clockseq & 0xff; // `node`

  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid_1(b);
}

var v1_1 = v1;

const {
  isObject: isObject$1,
  flattenArray: flattenArray$1,
  isArray: isArray$1
} = helpers;



function getEntityNodeLinks(entities, nodeData) {
  const links = {};
  entities.forEach(entity => {
    const {
      name
    } = entity;
    const linkName = name + '___NODE';

    if (links[linkName]) {
      links[linkName] = isArray$1(links[linkName]) ? [...links[linkName], entity.id] : [links[linkName], entity.id]; // check if node-content is an array.
      // if so, make the link also an array, to avoid conflicts,
      // when you have node-content-arrays with just one element
    } else if (isArray$1(nodeData[name])) {
      links[linkName] = [entity.id];
    } else {
      links[linkName] = entity.id;
    }
  });
  return links;
}

function getChildNodeKeys(data, schemas) {
  if (!data) return [];
  return Object.keys(data).filter(key => {
    if (isObject$1(data[key])) return true;

    if (isArray$1(data[key]) && schemas[key]) {
      return true;
    }

    return false;
  });
}

function getDataWithoutChildEntities(data, childNodeKeys) {
  const newData = { ...data
  };
  childNodeKeys.forEach(key => {
    delete newData[key];
  });
  return newData;
}

function buildEntity({
  name,
  data,
  schemas,
  createNodeId
}) {
  const childNodeKeys = getChildNodeKeys(data, schemas);
  const childEntities = flattenArray$1(childNodeKeys.map(key => createNodeEntities({
    name: key,
    data: data[key],
    schemas,
    createNodeId
  })));
  const dataWithoutChildEntities = getDataWithoutChildEntities(data, childNodeKeys);
  const entityNodeLinks = getEntityNodeLinks(childEntities, data);
  return [{
    id: createNodeId(name + v1_1()),
    name,
    data: dataWithoutChildEntities,
    links: entityNodeLinks,
    childEntities
  }];
}

function normalizeData(name, data, schemas) {
  const schema = schemas[name];

  if (!Object.keys(data).length && !schema) {
    return {
      dummy: true
    };
  }

  if (!schema) {
    console.log(`Object '${name}': Better provide a schema!`);
  }

  return data;
}

function createNodeEntities({
  name,
  data,
  createNodeId,
  schemas
}) {
  if (isArray$1(data)) {
    const entitiesArray = data.map(d => buildEntity({
      name,
      data: normalizeData(name, d, schemas),
      schemas,
      createNodeId
    }));
    return flattenArray$1(entitiesArray);
  }

  if (isObject$1(data)) {
    return buildEntity({
      name,
      data: normalizeData(name, data, schemas),
      schemas,
      createNodeId
    });
  }

  return [];
}

var createNodeEntities_1 = createNodeEntities;

function isRestricted(key) {
  const restrictedKeys = ['id', 'children', 'parent', 'fields', 'internal'];

  if (restrictedKeys.includes(key)) {
    console.log(`The key "${key}" is restricted in GraphQl!`);
    return `${key}__normalized`;
  }

  return key;
}

var normalizeKeys = function checkRestricted(data) {
  const dataNormalized = {};
  Object.keys(data).forEach(key => {
    dataNormalized[isRestricted(key)] = data[key];
  });
  return dataNormalized;
};

function removeChildEntities(ent) {
  const {
    childEntities,
    ...rest
  } = ent;
  return rest;
}

function flattenEntities(entities, flat) {
  let flatEntities = flat || [];
  entities.forEach(ent => {
    flatEntities = [...flatEntities, removeChildEntities(ent)];

    if (ent.childEntities) {
      flatEntities = flattenEntities(ent.childEntities, flatEntities);
    }
  });
  return flatEntities;
}

var flattenEntities_1 = flattenEntities;

function assign() {
  const args = [].slice.call(arguments).filter(i => i);
  const dest = args.shift();
  args.forEach(src => {
    Object.keys(src).forEach(key => {
      dest[key] = src[key];
    });
  });
  return dest;
}

var assign_1 = assign;

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

function getCjsExportFromNamespace (n) {
	return n && n['default'] || n;
}

var fromCallback = function (fn) {
  return Object.defineProperty(function () {
    if (typeof arguments[arguments.length - 1] === 'function') fn.apply(this, arguments);else {
      return new Promise((resolve, reject) => {
        arguments[arguments.length] = (err, res) => {
          if (err) return reject(err);
          resolve(res);
        };

        arguments.length++;
        fn.apply(this, arguments);
      });
    }
  }, 'name', {
    value: fn.name
  });
};

var fromPromise = function (fn) {
  return Object.defineProperty(function () {
    const cb = arguments[arguments.length - 1];
    if (typeof cb !== 'function') return fn.apply(this, arguments);else fn.apply(this, arguments).then(r => cb(null, r), cb);
  }, 'name', {
    value: fn.name
  });
};

var universalify = {
	fromCallback: fromCallback,
	fromPromise: fromPromise
};

var origCwd = process.cwd;
var cwd = null;
var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;

process.cwd = function () {
  if (!cwd) cwd = origCwd.call(process);
  return cwd;
};

try {
  process.cwd();
} catch (er) {}

var chdir = process.chdir;

process.chdir = function (d) {
  cwd = null;
  chdir.call(process, d);
};

var polyfills = patch;

function patch(fs) {
  // (re-)implement some things that are known busted or missing.
  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs);
  } // lutimes implementation, or no-op


  if (!fs.lutimes) {
    patchLutimes(fs);
  } // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.


  fs.chown = chownFix(fs.chown);
  fs.fchown = chownFix(fs.fchown);
  fs.lchown = chownFix(fs.lchown);
  fs.chmod = chmodFix(fs.chmod);
  fs.fchmod = chmodFix(fs.fchmod);
  fs.lchmod = chmodFix(fs.lchmod);
  fs.chownSync = chownFixSync(fs.chownSync);
  fs.fchownSync = chownFixSync(fs.fchownSync);
  fs.lchownSync = chownFixSync(fs.lchownSync);
  fs.chmodSync = chmodFixSync(fs.chmodSync);
  fs.fchmodSync = chmodFixSync(fs.fchmodSync);
  fs.lchmodSync = chmodFixSync(fs.lchmodSync);
  fs.stat = statFix(fs.stat);
  fs.fstat = statFix(fs.fstat);
  fs.lstat = statFix(fs.lstat);
  fs.statSync = statFixSync(fs.statSync);
  fs.fstatSync = statFixSync(fs.fstatSync);
  fs.lstatSync = statFixSync(fs.lstatSync); // if lchmod/lchown do not exist, then make them no-ops

  if (!fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      if (cb) process.nextTick(cb);
    };

    fs.lchmodSync = function () {};
  }

  if (!fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      if (cb) process.nextTick(cb);
    };

    fs.lchownSync = function () {};
  } // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.
  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.


  if (platform === "win32") {
    fs.rename = function (fs$rename) {
      return function (from, to, cb) {
        var start = Date.now();
        var backoff = 0;
        fs$rename(from, to, function CB(er) {
          if (er && (er.code === "EACCES" || er.code === "EPERM") && Date.now() - start < 60000) {
            setTimeout(function () {
              fs.stat(to, function (stater, st) {
                if (stater && stater.code === "ENOENT") fs$rename(from, to, CB);else cb(er);
              });
            }, backoff);
            if (backoff < 100) backoff += 10;
            return;
          }

          if (cb) cb(er);
        });
      };
    }(fs.rename);
  } // if read() returns EAGAIN, then just try it again.


  fs.read = function (fs$read) {
    return function (fd, buffer, offset, length, position, callback_) {
      var callback;

      if (callback_ && typeof callback_ === 'function') {
        var eagCounter = 0;

        callback = function (er, _, __) {
          if (er && er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter++;
            return fs$read.call(fs, fd, buffer, offset, length, position, callback);
          }

          callback_.apply(this, arguments);
        };
      }

      return fs$read.call(fs, fd, buffer, offset, length, position, callback);
    };
  }(fs.read);

  fs.readSync = function (fs$readSync) {
    return function (fd, buffer, offset, length, position) {
      var eagCounter = 0;

      while (true) {
        try {
          return fs$readSync.call(fs, fd, buffer, offset, length, position);
        } catch (er) {
          if (er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter++;
            continue;
          }

          throw er;
        }
      }
    };
  }(fs.readSync);

  function patchLchmod(fs) {
    fs.lchmod = function (path, mode, callback) {
      fs.open(path, constants.O_WRONLY | constants.O_SYMLINK, mode, function (err, fd) {
        if (err) {
          if (callback) callback(err);
          return;
        } // prefer to return the chmod error, if one occurs,
        // but still try to close, and report closing errors if they occur.


        fs.fchmod(fd, mode, function (err) {
          fs.close(fd, function (err2) {
            if (callback) callback(err || err2);
          });
        });
      });
    };

    fs.lchmodSync = function (path, mode) {
      var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode); // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.

      var threw = true;
      var ret;

      try {
        ret = fs.fchmodSync(fd, mode);
        threw = false;
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd);
          } catch (er) {}
        } else {
          fs.closeSync(fd);
        }
      }

      return ret;
    };
  }

  function patchLutimes(fs) {
    if (constants.hasOwnProperty("O_SYMLINK")) {
      fs.lutimes = function (path, at, mt, cb) {
        fs.open(path, constants.O_SYMLINK, function (er, fd) {
          if (er) {
            if (cb) cb(er);
            return;
          }

          fs.futimes(fd, at, mt, function (er) {
            fs.close(fd, function (er2) {
              if (cb) cb(er || er2);
            });
          });
        });
      };

      fs.lutimesSync = function (path, at, mt) {
        var fd = fs.openSync(path, constants.O_SYMLINK);
        var ret;
        var threw = true;

        try {
          ret = fs.futimesSync(fd, at, mt);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs.closeSync(fd);
            } catch (er) {}
          } else {
            fs.closeSync(fd);
          }
        }

        return ret;
      };
    } else {
      fs.lutimes = function (_a, _b, _c, cb) {
        if (cb) process.nextTick(cb);
      };

      fs.lutimesSync = function () {};
    }
  }

  function chmodFix(orig) {
    if (!orig) return orig;
    return function (target, mode, cb) {
      return orig.call(fs, target, mode, function (er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      });
    };
  }

  function chmodFixSync(orig) {
    if (!orig) return orig;
    return function (target, mode) {
      try {
        return orig.call(fs, target, mode);
      } catch (er) {
        if (!chownErOk(er)) throw er;
      }
    };
  }

  function chownFix(orig) {
    if (!orig) return orig;
    return function (target, uid, gid, cb) {
      return orig.call(fs, target, uid, gid, function (er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      });
    };
  }

  function chownFixSync(orig) {
    if (!orig) return orig;
    return function (target, uid, gid) {
      try {
        return orig.call(fs, target, uid, gid);
      } catch (er) {
        if (!chownErOk(er)) throw er;
      }
    };
  }

  function statFix(orig) {
    if (!orig) return orig; // Older versions of Node erroneously returned signed integers for
    // uid + gid.

    return function (target, options, cb) {
      if (typeof options === 'function') {
        cb = options;
        options = null;
      }

      function callback(er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 0x100000000;
          if (stats.gid < 0) stats.gid += 0x100000000;
        }

        if (cb) cb.apply(this, arguments);
      }

      return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
    };
  }

  function statFixSync(orig) {
    if (!orig) return orig; // Older versions of Node erroneously returned signed integers for
    // uid + gid.

    return function (target, options) {
      var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
      if (stats.uid < 0) stats.uid += 0x100000000;
      if (stats.gid < 0) stats.gid += 0x100000000;
      return stats;
    };
  } // ENOSYS means that the fs doesn't support the op. Just ignore
  // that, because it doesn't matter.
  //
  // if there's no getuid, or if getuid() is something other
  // than 0, and the error is EINVAL or EPERM, then just ignore
  // it.
  //
  // This specific case is a silent failure in cp, install, tar,
  // and most other unix tools that manage permissions.
  //
  // When running as root, or if other types of errors are
  // encountered, then it's strict.


  function chownErOk(er) {
    if (!er) return true;
    if (er.code === "ENOSYS") return true;
    var nonroot = !process.getuid || process.getuid() !== 0;

    if (nonroot) {
      if (er.code === "EINVAL" || er.code === "EPERM") return true;
    }

    return false;
  }
}

var Stream = Stream$1.Stream;

var legacyStreams = legacy;

function legacy(fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  };

  function ReadStream(path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);
    Stream.call(this);
    var self = this;
    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;
    this.flags = 'r';
    this.mode = 438;
    /*=0666*/

    this.bufferSize = 64 * 1024;
    options = options || {}; // Mixin options into this

    var keys = Object.keys(options);

    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }

      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function () {
        self._read();
      });
      return;
    }

    fs.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);

      self._read();
    });
  }

  function WriteStream(path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);
    Stream.call(this);
    this.path = path;
    this.fd = null;
    this.writable = true;
    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438;
    /*=0666*/

    this.bytesWritten = 0;
    options = options || {}; // Mixin options into this

    var keys = Object.keys(options);

    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }

      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs.open;

      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);

      this.flush();
    }
  }
}

var clone_1 = clone$1;

function clone$1(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Object) var copy = {
    __proto__: obj.__proto__
  };else var copy = Object.create(null);
  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
  });
  return copy;
}

var gracefulFs = createCommonjsModule(function (module) {
var queue = [];



function noop() {}

var debug = noop;
if (util$1.debuglog) debug = util$1.debuglog('gfs4');else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) debug = function () {
  var m = util$1.format.apply(util$1, arguments);
  m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ');
  console.error(m);
};

if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
  process.on('exit', function () {
    debug(queue);

    assert.equal(queue.length, 0);
  });
}

module.exports = patch(clone_1(fs$1));

if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs$1.__patched) {
  module.exports = patch(fs$1);
  fs$1.__patched = true;
} // Always patch fs.close/closeSync, because we want to
// retry() whenever a close happens *anywhere* in the program.
// This is essential when multiple graceful-fs instances are
// in play at the same time.


module.exports.close = function (fs$close) {
  return function (fd, cb) {
    return fs$close.call(fs$1, fd, function (err) {
      if (!err) retry();
      if (typeof cb === 'function') cb.apply(this, arguments);
    });
  };
}(fs$1.close);

module.exports.closeSync = function (fs$closeSync) {
  return function (fd) {
    // Note that graceful-fs also retries when fs.closeSync() fails.
    // Looks like a bug to me, although it's probably a harmless one.
    var rval = fs$closeSync.apply(fs$1, arguments);
    retry();
    return rval;
  };
}(fs$1.closeSync); // Only patch fs once, otherwise we'll run into a memory leak if
// graceful-fs is loaded multiple times, such as in test environments that
// reset the loaded modules between tests.
// We look for the string `graceful-fs` from the comment above. This
// way we are not adding any extra properties and it will detect if older
// versions of graceful-fs are installed.


if (!/\bgraceful-fs\b/.test(fs$1.closeSync.toString())) {
  fs$1.closeSync = module.exports.closeSync;
  fs$1.close = module.exports.close;
}

function patch(fs) {
  // Everything that references the open() function needs to be in here
  polyfills(fs);
  fs.gracefulify = patch;
  fs.FileReadStream = ReadStream; // Legacy name.

  fs.FileWriteStream = WriteStream; // Legacy name.

  fs.createReadStream = createReadStream;
  fs.createWriteStream = createWriteStream;
  var fs$readFile = fs.readFile;
  fs.readFile = readFile;

  function readFile(path, options, cb) {
    if (typeof options === 'function') cb = options, options = null;
    return go$readFile(path, options, cb);

    function go$readFile(path, options, cb) {
      return fs$readFile(path, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$readFile, [path, options, cb]]);else {
          if (typeof cb === 'function') cb.apply(this, arguments);
          retry();
        }
      });
    }
  }

  var fs$writeFile = fs.writeFile;
  fs.writeFile = writeFile;

  function writeFile(path, data, options, cb) {
    if (typeof options === 'function') cb = options, options = null;
    return go$writeFile(path, data, options, cb);

    function go$writeFile(path, data, options, cb) {
      return fs$writeFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$writeFile, [path, data, options, cb]]);else {
          if (typeof cb === 'function') cb.apply(this, arguments);
          retry();
        }
      });
    }
  }

  var fs$appendFile = fs.appendFile;
  if (fs$appendFile) fs.appendFile = appendFile;

  function appendFile(path, data, options, cb) {
    if (typeof options === 'function') cb = options, options = null;
    return go$appendFile(path, data, options, cb);

    function go$appendFile(path, data, options, cb) {
      return fs$appendFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$appendFile, [path, data, options, cb]]);else {
          if (typeof cb === 'function') cb.apply(this, arguments);
          retry();
        }
      });
    }
  }

  var fs$readdir = fs.readdir;
  fs.readdir = readdir;

  function readdir(path, options, cb) {
    var args = [path];

    if (typeof options !== 'function') {
      args.push(options);
    } else {
      cb = options;
    }

    args.push(go$readdir$cb);
    return go$readdir(args);

    function go$readdir$cb(err, files) {
      if (files && files.sort) files.sort();
      if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$readdir, [args]]);else {
        if (typeof cb === 'function') cb.apply(this, arguments);
        retry();
      }
    }
  }

  function go$readdir(args) {
    return fs$readdir.apply(fs, args);
  }

  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacyStreams(fs);
    ReadStream = legStreams.ReadStream;
    WriteStream = legStreams.WriteStream;
  }

  var fs$ReadStream = fs.ReadStream;

  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype);
    ReadStream.prototype.open = ReadStream$open;
  }

  var fs$WriteStream = fs.WriteStream;

  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype);
    WriteStream.prototype.open = WriteStream$open;
  }

  fs.ReadStream = ReadStream;
  fs.WriteStream = WriteStream;

  function ReadStream(path, options) {
    if (this instanceof ReadStream) return fs$ReadStream.apply(this, arguments), this;else return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
  }

  function ReadStream$open() {
    var that = this;
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose) that.destroy();
        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
        that.read();
      }
    });
  }

  function WriteStream(path, options) {
    if (this instanceof WriteStream) return fs$WriteStream.apply(this, arguments), this;else return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
  }

  function WriteStream$open() {
    var that = this;
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy();
        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
      }
    });
  }

  function createReadStream(path, options) {
    return new ReadStream(path, options);
  }

  function createWriteStream(path, options) {
    return new WriteStream(path, options);
  }

  var fs$open = fs.open;
  fs.open = open;

  function open(path, flags, mode, cb) {
    if (typeof mode === 'function') cb = mode, mode = null;
    return go$open(path, flags, mode, cb);

    function go$open(path, flags, mode, cb) {
      return fs$open(path, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$open, [path, flags, mode, cb]]);else {
          if (typeof cb === 'function') cb.apply(this, arguments);
          retry();
        }
      });
    }
  }

  return fs;
}

function enqueue(elem) {
  debug('ENQUEUE', elem[0].name, elem[1]);
  queue.push(elem);
}

function retry() {
  var elem = queue.shift();

  if (elem) {
    debug('RETRY', elem[0].name, elem[1]);
    elem[0].apply(null, elem[1]);
  }
}
});
var gracefulFs_1 = gracefulFs.close;
var gracefulFs_2 = gracefulFs.closeSync;

var fs_1 = createCommonjsModule(function (module, exports) {
// This is adapted from https://github.com/normalize/mz
// Copyright (c) 2014-2016 Jonathan Ong me@jongleberry.com and Contributors
const u = universalify.fromCallback;



const api = ['access', 'appendFile', 'chmod', 'chown', 'close', 'copyFile', 'fchmod', 'fchown', 'fdatasync', 'fstat', 'fsync', 'ftruncate', 'futimes', 'lchown', 'link', 'lstat', 'mkdir', 'mkdtemp', 'open', 'readFile', 'readdir', 'readlink', 'realpath', 'rename', 'rmdir', 'stat', 'symlink', 'truncate', 'unlink', 'utimes', 'writeFile'].filter(key => {
  // Some commands are not available on some systems. Ex:
  // fs.copyFile was added in Node.js v8.5.0
  // fs.mkdtemp was added in Node.js v5.10.0
  // fs.lchown is not available on at least some Linux
  return typeof gracefulFs[key] === 'function';
}); // Export all keys:

Object.keys(gracefulFs).forEach(key => {
  exports[key] = gracefulFs[key];
}); // Universalify async methods:

api.forEach(method => {
  exports[method] = u(gracefulFs[method]);
}); // We differ from mz/fs in that we still ship the old, broken, fs.exists()
// since we are a drop-in replacement for the native module

exports.exists = function (filename, callback) {
  if (typeof callback === 'function') {
    return gracefulFs.exists(filename, callback);
  }

  return new Promise(resolve => {
    return gracefulFs.exists(filename, resolve);
  });
}; // fs.read() & fs.write need special treatment due to multiple callback args


exports.read = function (fd, buffer, offset, length, position, callback) {
  if (typeof callback === 'function') {
    return gracefulFs.read(fd, buffer, offset, length, position, callback);
  }

  return new Promise((resolve, reject) => {
    gracefulFs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
      if (err) return reject(err);
      resolve({
        bytesRead,
        buffer
      });
    });
  });
}; // Function signature can be
// fs.write(fd, buffer[, offset[, length[, position]]], callback)
// OR
// fs.write(fd, string[, position[, encoding]], callback)
// so we need to handle both cases


exports.write = function (fd, buffer, a, b, c, callback) {
  if (typeof arguments[arguments.length - 1] === 'function') {
    return gracefulFs.write(fd, buffer, a, b, c, callback);
  } // Check for old, depricated fs.write(fd, string[, position[, encoding]], callback)


  if (typeof buffer === 'string') {
    return new Promise((resolve, reject) => {
      gracefulFs.write(fd, buffer, a, b, (err, bytesWritten, buffer) => {
        if (err) return reject(err);
        resolve({
          bytesWritten,
          buffer
        });
      });
    });
  }

  return new Promise((resolve, reject) => {
    gracefulFs.write(fd, buffer, a, b, c, (err, bytesWritten, buffer) => {
      if (err) return reject(err);
      resolve({
        bytesWritten,
        buffer
      });
    });
  });
};
});
var fs_2 = fs_1.exists;
var fs_3 = fs_1.read;
var fs_4 = fs_1.write;

// get drive on windows


function getRootPath(p) {
  p = path.normalize(path.resolve(p)).split(path.sep);
  if (p.length > 0) return p[0];
  return null;
} // http://stackoverflow.com/a/62888/10333 contains more accurate
// TODO: expand to include the rest


const INVALID_PATH_CHARS = /[<>:"|?*]/;

function invalidWin32Path(p) {
  const rp = getRootPath(p);
  p = p.replace(rp, '');
  return INVALID_PATH_CHARS.test(p);
}

var win32 = {
  getRootPath,
  invalidWin32Path
};

const invalidWin32Path$1 = win32.invalidWin32Path;

const o777 = parseInt('0777', 8);

function mkdirs(p, opts, callback, made) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  } else if (!opts || typeof opts !== 'object') {
    opts = {
      mode: opts
    };
  }

  if (process.platform === 'win32' && invalidWin32Path$1(p)) {
    const errInval = new Error(p + ' contains invalid WIN32 path characters.');
    errInval.code = 'EINVAL';
    return callback(errInval);
  }

  let mode = opts.mode;
  const xfs = opts.fs || gracefulFs;

  if (mode === undefined) {
    mode = o777 & ~process.umask();
  }

  if (!made) made = null;

  callback = callback || function () {};

  p = path.resolve(p);
  xfs.mkdir(p, mode, er => {
    if (!er) {
      made = made || p;
      return callback(null, made);
    }

    switch (er.code) {
      case 'ENOENT':
        if (path.dirname(p) === p) return callback(er);
        mkdirs(path.dirname(p), opts, (er, made) => {
          if (er) callback(er, made);else mkdirs(p, opts, callback, made);
        });
        break;
      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.

      default:
        xfs.stat(p, (er2, stat) => {
          // if the stat fails, then that's super weird.
          // let the original error be the failure reason.
          if (er2 || !stat.isDirectory()) callback(er, made);else callback(null, made);
        });
        break;
    }
  });
}

var mkdirs_1 = mkdirs;

const invalidWin32Path$2 = win32.invalidWin32Path;

const o777$1 = parseInt('0777', 8);

function mkdirsSync(p, opts, made) {
  if (!opts || typeof opts !== 'object') {
    opts = {
      mode: opts
    };
  }

  let mode = opts.mode;
  const xfs = opts.fs || gracefulFs;

  if (process.platform === 'win32' && invalidWin32Path$2(p)) {
    const errInval = new Error(p + ' contains invalid WIN32 path characters.');
    errInval.code = 'EINVAL';
    throw errInval;
  }

  if (mode === undefined) {
    mode = o777$1 & ~process.umask();
  }

  if (!made) made = null;
  p = path.resolve(p);

  try {
    xfs.mkdirSync(p, mode);
    made = made || p;
  } catch (err0) {
    switch (err0.code) {
      case 'ENOENT':
        if (path.dirname(p) === p) throw err0;
        made = mkdirsSync(path.dirname(p), opts, made);
        mkdirsSync(p, opts, made);
        break;
      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.

      default:
        let stat;

        try {
          stat = xfs.statSync(p);
        } catch (err1) {
          throw err0;
        }

        if (!stat.isDirectory()) throw err0;
        break;
    }
  }

  return made;
}

var mkdirsSync_1 = mkdirsSync;

const u = universalify.fromCallback;

const mkdirs$1 = u(mkdirs_1);



var mkdirs_1$1 = {
  mkdirs: mkdirs$1,
  mkdirsSync: mkdirsSync_1,
  // alias
  mkdirp: mkdirs$1,
  mkdirpSync: mkdirsSync_1,
  ensureDir: mkdirs$1,
  ensureDirSync: mkdirsSync_1
};

const u$1 = universalify.fromPromise;



function pathExists(path) {
  return fs_1.access(path).then(() => true).catch(() => false);
}

var pathExists_1 = {
  pathExists: u$1(pathExists),
  pathExistsSync: fs_1.existsSync
};

// HFS, ext{2,3}, FAT do not, Node.js v0.10 does not


function hasMillisResSync() {
  let tmpfile = path.join('millis-test-sync' + Date.now().toString() + Math.random().toString().slice(2));
  tmpfile = path.join(os.tmpdir(), tmpfile); // 550 millis past UNIX epoch

  const d = new Date(1435410243862);
  gracefulFs.writeFileSync(tmpfile, 'https://github.com/jprichardson/node-fs-extra/pull/141');
  const fd = gracefulFs.openSync(tmpfile, 'r+');
  gracefulFs.futimesSync(fd, d, d);
  gracefulFs.closeSync(fd);
  return gracefulFs.statSync(tmpfile).mtime > 1435410243000;
}

function hasMillisRes(callback) {
  let tmpfile = path.join('millis-test' + Date.now().toString() + Math.random().toString().slice(2));
  tmpfile = path.join(os.tmpdir(), tmpfile); // 550 millis past UNIX epoch

  const d = new Date(1435410243862);
  gracefulFs.writeFile(tmpfile, 'https://github.com/jprichardson/node-fs-extra/pull/141', err => {
    if (err) return callback(err);
    gracefulFs.open(tmpfile, 'r+', (err, fd) => {
      if (err) return callback(err);
      gracefulFs.futimes(fd, d, d, err => {
        if (err) return callback(err);
        gracefulFs.close(fd, err => {
          if (err) return callback(err);
          gracefulFs.stat(tmpfile, (err, stats) => {
            if (err) return callback(err);
            callback(null, stats.mtime > 1435410243000);
          });
        });
      });
    });
  });
}

function timeRemoveMillis(timestamp) {
  if (typeof timestamp === 'number') {
    return Math.floor(timestamp / 1000) * 1000;
  } else if (timestamp instanceof Date) {
    return new Date(Math.floor(timestamp.getTime() / 1000) * 1000);
  } else {
    throw new Error('fs-extra: timeRemoveMillis() unknown parameter type');
  }
}

function utimesMillis(path, atime, mtime, callback) {
  // if (!HAS_MILLIS_RES) return fs.utimes(path, atime, mtime, callback)
  gracefulFs.open(path, 'r+', (err, fd) => {
    if (err) return callback(err);
    gracefulFs.futimes(fd, atime, mtime, futimesErr => {
      gracefulFs.close(fd, closeErr => {
        if (callback) callback(futimesErr || closeErr);
      });
    });
  });
}

function utimesMillisSync(path, atime, mtime) {
  const fd = gracefulFs.openSync(path, 'r+');
  gracefulFs.futimesSync(fd, atime, mtime);
  return gracefulFs.closeSync(fd);
}

var utimes = {
  hasMillisRes,
  hasMillisResSync,
  timeRemoveMillis,
  utimesMillis,
  utimesMillisSync
};

const mkdirp = mkdirs_1$1.mkdirs;

const pathExists$1 = pathExists_1.pathExists;

const utimes$1 = utimes.utimesMillis;

const notExist = Symbol('notExist');
const existsReg = Symbol('existsReg');

function copy(src, dest, opts, cb) {
  if (typeof opts === 'function' && !cb) {
    cb = opts;
    opts = {};
  } else if (typeof opts === 'function') {
    opts = {
      filter: opts
    };
  }

  cb = cb || function () {};

  opts = opts || {};
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true; // default to true for now

  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber; // overwrite falls back to clobber
  // Warn about using preserveTimestamps on 32-bit node

  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n
    see https://github.com/jprichardson/node-fs-extra/issues/269`);
  }

  src = path.resolve(src);
  dest = path.resolve(dest); // don't allow src and dest to be the same

  if (src === dest) return cb(new Error('Source and destination must not be the same.'));
  if (opts.filter) return handleFilter(checkParentDir, src, dest, opts, cb);
  return checkParentDir(src, dest, opts, cb);
}

function checkParentDir(src, dest, opts, cb) {
  const destParent = path.dirname(dest);
  pathExists$1(destParent, (err, dirExists) => {
    if (err) return cb(err);
    if (dirExists) return startCopy(src, dest, opts, cb);
    mkdirp(destParent, err => {
      if (err) return cb(err);
      return startCopy(src, dest, opts, cb);
    });
  });
}

function startCopy(src, dest, opts, cb) {
  if (opts.filter) return handleFilter(getStats, src, dest, opts, cb);
  return getStats(src, dest, opts, cb);
}

function handleFilter(onInclude, src, dest, opts, cb) {
  Promise.resolve(opts.filter(src, dest)).then(include => {
    if (include) return onInclude(src, dest, opts, cb);
    return cb();
  }, error => cb(error));
}

function getStats(src, dest, opts, cb) {
  const stat = opts.dereference ? gracefulFs.stat : gracefulFs.lstat;
  stat(src, (err, st) => {
    if (err) return cb(err);
    if (st.isDirectory()) return onDir(st, src, dest, opts, cb);else if (st.isFile() || st.isCharacterDevice() || st.isBlockDevice()) return onFile(st, src, dest, opts, cb);else if (st.isSymbolicLink()) return onLink(src, dest, opts, cb);
  });
}

function onFile(srcStat, src, dest, opts, cb) {
  checkDest(dest, (err, resolvedPath) => {
    if (err) return cb(err);

    if (resolvedPath === notExist) {
      return copyFile(srcStat, src, dest, opts, cb);
    } else if (resolvedPath === existsReg) {
      return mayCopyFile(srcStat, src, dest, opts, cb);
    } else {
      if (src === resolvedPath) return cb();
      return mayCopyFile(srcStat, src, dest, opts, cb);
    }
  });
}

function mayCopyFile(srcStat, src, dest, opts, cb) {
  if (opts.overwrite) {
    gracefulFs.unlink(dest, err => {
      if (err) return cb(err);
      return copyFile(srcStat, src, dest, opts, cb);
    });
  } else if (opts.errorOnExist) {
    return cb(new Error(`'${dest}' already exists`));
  } else return cb();
}

function copyFile(srcStat, src, dest, opts, cb) {
  if (typeof gracefulFs.copyFile === 'function') {
    return gracefulFs.copyFile(src, dest, err => {
      if (err) return cb(err);
      return setDestModeAndTimestamps(srcStat, dest, opts, cb);
    });
  }

  return copyFileFallback(srcStat, src, dest, opts, cb);
}

function copyFileFallback(srcStat, src, dest, opts, cb) {
  const rs = gracefulFs.createReadStream(src);
  rs.on('error', err => cb(err)).once('open', () => {
    const ws = gracefulFs.createWriteStream(dest, {
      mode: srcStat.mode
    });
    ws.on('error', err => cb(err)).on('open', () => rs.pipe(ws)).once('close', () => setDestModeAndTimestamps(srcStat, dest, opts, cb));
  });
}

function setDestModeAndTimestamps(srcStat, dest, opts, cb) {
  gracefulFs.chmod(dest, srcStat.mode, err => {
    if (err) return cb(err);

    if (opts.preserveTimestamps) {
      return utimes$1(dest, srcStat.atime, srcStat.mtime, cb);
    }

    return cb();
  });
}

function onDir(srcStat, src, dest, opts, cb) {
  checkDest(dest, (err, resolvedPath) => {
    if (err) return cb(err);

    if (resolvedPath === notExist) {
      if (isSrcSubdir(src, dest)) {
        return cb(new Error(`Cannot copy '${src}' to a subdirectory of itself, '${dest}'.`));
      }

      return mkDirAndCopy(srcStat, src, dest, opts, cb);
    } else if (resolvedPath === existsReg) {
      if (isSrcSubdir(src, dest)) {
        return cb(new Error(`Cannot copy '${src}' to a subdirectory of itself, '${dest}'.`));
      }

      return mayCopyDir(src, dest, opts, cb);
    } else {
      if (src === resolvedPath) return cb();
      return copyDir(src, dest, opts, cb);
    }
  });
}

function mayCopyDir(src, dest, opts, cb) {
  gracefulFs.stat(dest, (err, st) => {
    if (err) return cb(err);

    if (!st.isDirectory()) {
      return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`));
    }

    return copyDir(src, dest, opts, cb);
  });
}

function mkDirAndCopy(srcStat, src, dest, opts, cb) {
  gracefulFs.mkdir(dest, srcStat.mode, err => {
    if (err) return cb(err);
    gracefulFs.chmod(dest, srcStat.mode, err => {
      if (err) return cb(err);
      return copyDir(src, dest, opts, cb);
    });
  });
}

function copyDir(src, dest, opts, cb) {
  gracefulFs.readdir(src, (err, items) => {
    if (err) return cb(err);
    return copyDirItems(items, src, dest, opts, cb);
  });
}

function copyDirItems(items, src, dest, opts, cb) {
  const item = items.pop();
  if (!item) return cb();
  startCopy(path.join(src, item), path.join(dest, item), opts, err => {
    if (err) return cb(err);
    return copyDirItems(items, src, dest, opts, cb);
  });
}

function onLink(src, dest, opts, cb) {
  gracefulFs.readlink(src, (err, resolvedSrcPath) => {
    if (err) return cb(err);

    if (opts.dereference) {
      resolvedSrcPath = path.resolve(process.cwd(), resolvedSrcPath);
    }

    checkDest(dest, (err, resolvedDestPath) => {
      if (err) return cb(err);

      if (resolvedDestPath === notExist || resolvedDestPath === existsReg) {
        // if dest already exists, fs throws error anyway,
        // so no need to guard against it here.
        return gracefulFs.symlink(resolvedSrcPath, dest, cb);
      } else {
        if (opts.dereference) {
          resolvedDestPath = path.resolve(process.cwd(), resolvedDestPath);
        }

        if (resolvedDestPath === resolvedSrcPath) return cb(); // prevent copy if src is a subdir of dest since unlinking
        // dest in this case would result in removing src contents
        // and therefore a broken symlink would be created.

        gracefulFs.stat(dest, (err, st) => {
          if (err) return cb(err);

          if (st.isDirectory() && isSrcSubdir(resolvedDestPath, resolvedSrcPath)) {
            return cb(new Error(`Cannot overwrite '${resolvedDestPath}' with '${resolvedSrcPath}'.`));
          }

          return copyLink(resolvedSrcPath, dest, cb);
        });
      }
    });
  });
}

function copyLink(resolvedSrcPath, dest, cb) {
  gracefulFs.unlink(dest, err => {
    if (err) return cb(err);
    return gracefulFs.symlink(resolvedSrcPath, dest, cb);
  });
} // check if dest exists and/or is a symlink


function checkDest(dest, cb) {
  gracefulFs.readlink(dest, (err, resolvedPath) => {
    if (err) {
      if (err.code === 'ENOENT') return cb(null, notExist); // dest exists and is a regular file or directory, Windows may throw UNKNOWN error.

      if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return cb(null, existsReg);
      return cb(err);
    }

    return cb(null, resolvedPath); // dest exists and is a symlink
  });
} // return true if dest is a subdir of src, otherwise false.
// extract dest base dir and check if that is the same as src basename


function isSrcSubdir(src, dest) {
  const baseDir = dest.split(path.dirname(src) + path.sep)[1];

  if (baseDir) {
    const destBasename = baseDir.split(path.sep)[0];

    if (destBasename) {
      return src !== dest && dest.indexOf(src) > -1 && destBasename === path.basename(src);
    }

    return false;
  }

  return false;
}

var copy_1 = copy;

const u$2 = universalify.fromCallback;

var copy$1 = {
  copy: u$2(copy_1)
};

/* eslint-disable node/no-deprecated-api */
var buffer = function (size) {
  if (typeof Buffer.allocUnsafe === 'function') {
    try {
      return Buffer.allocUnsafe(size);
    } catch (e) {
      return new Buffer(size);
    }
  }

  return new Buffer(size);
};

const mkdirpSync = mkdirs_1$1.mkdirsSync;

const utimesSync = utimes.utimesMillisSync;

const notExist$1 = Symbol('notExist');
const existsReg$1 = Symbol('existsReg');

function copySync(src, dest, opts) {
  if (typeof opts === 'function') {
    opts = {
      filter: opts
    };
  }

  opts = opts || {};
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true; // default to true for now

  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber; // overwrite falls back to clobber
  // Warn about using preserveTimestamps on 32-bit node

  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n
    see https://github.com/jprichardson/node-fs-extra/issues/269`);
  }

  src = path.resolve(src);
  dest = path.resolve(dest); // don't allow src and dest to be the same

  if (src === dest) throw new Error('Source and destination must not be the same.');
  if (opts.filter && !opts.filter(src, dest)) return;
  const destParent = path.dirname(dest);
  if (!gracefulFs.existsSync(destParent)) mkdirpSync(destParent);
  return startCopy$1(src, dest, opts);
}

function startCopy$1(src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return;
  return getStats$1(src, dest, opts);
}

function getStats$1(src, dest, opts) {
  const statSync = opts.dereference ? gracefulFs.statSync : gracefulFs.lstatSync;
  const st = statSync(src);
  if (st.isDirectory()) return onDir$1(st, src, dest, opts);else if (st.isFile() || st.isCharacterDevice() || st.isBlockDevice()) return onFile$1(st, src, dest, opts);else if (st.isSymbolicLink()) return onLink$1(src, dest, opts);
}

function onFile$1(srcStat, src, dest, opts) {
  const resolvedPath = checkDest$1(dest);

  if (resolvedPath === notExist$1) {
    return copyFile$1(srcStat, src, dest, opts);
  } else if (resolvedPath === existsReg$1) {
    return mayCopyFile$1(srcStat, src, dest, opts);
  } else {
    if (src === resolvedPath) return;
    return mayCopyFile$1(srcStat, src, dest, opts);
  }
}

function mayCopyFile$1(srcStat, src, dest, opts) {
  if (opts.overwrite) {
    gracefulFs.unlinkSync(dest);
    return copyFile$1(srcStat, src, dest, opts);
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`);
  }
}

function copyFile$1(srcStat, src, dest, opts) {
  if (typeof gracefulFs.copyFileSync === 'function') {
    gracefulFs.copyFileSync(src, dest);
    gracefulFs.chmodSync(dest, srcStat.mode);

    if (opts.preserveTimestamps) {
      return utimesSync(dest, srcStat.atime, srcStat.mtime);
    }

    return;
  }

  return copyFileFallback$1(srcStat, src, dest, opts);
}

function copyFileFallback$1(srcStat, src, dest, opts) {
  const BUF_LENGTH = 64 * 1024;

  const _buff = buffer(BUF_LENGTH);

  const fdr = gracefulFs.openSync(src, 'r');
  const fdw = gracefulFs.openSync(dest, 'w', srcStat.mode);
  let bytesRead = 1;
  let pos = 0;

  while (bytesRead > 0) {
    bytesRead = gracefulFs.readSync(fdr, _buff, 0, BUF_LENGTH, pos);
    gracefulFs.writeSync(fdw, _buff, 0, bytesRead);
    pos += bytesRead;
  }

  if (opts.preserveTimestamps) gracefulFs.futimesSync(fdw, srcStat.atime, srcStat.mtime);
  gracefulFs.closeSync(fdr);
  gracefulFs.closeSync(fdw);
}

function onDir$1(srcStat, src, dest, opts) {
  const resolvedPath = checkDest$1(dest);

  if (resolvedPath === notExist$1) {
    if (isSrcSubdir$1(src, dest)) {
      throw new Error(`Cannot copy '${src}' to a subdirectory of itself, '${dest}'.`);
    }

    return mkDirAndCopy$1(srcStat, src, dest, opts);
  } else if (resolvedPath === existsReg$1) {
    if (isSrcSubdir$1(src, dest)) {
      throw new Error(`Cannot copy '${src}' to a subdirectory of itself, '${dest}'.`);
    }

    return mayCopyDir$1(src, dest, opts);
  } else {
    if (src === resolvedPath) return;
    return copyDir$1(src, dest, opts);
  }
}

function mayCopyDir$1(src, dest, opts) {
  if (!gracefulFs.statSync(dest).isDirectory()) {
    throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
  }

  return copyDir$1(src, dest, opts);
}

function mkDirAndCopy$1(srcStat, src, dest, opts) {
  gracefulFs.mkdirSync(dest, srcStat.mode);
  gracefulFs.chmodSync(dest, srcStat.mode);
  return copyDir$1(src, dest, opts);
}

function copyDir$1(src, dest, opts) {
  gracefulFs.readdirSync(src).forEach(item => {
    startCopy$1(path.join(src, item), path.join(dest, item), opts);
  });
}

function onLink$1(src, dest, opts) {
  let resolvedSrcPath = gracefulFs.readlinkSync(src);

  if (opts.dereference) {
    resolvedSrcPath = path.resolve(process.cwd(), resolvedSrcPath);
  }

  let resolvedDestPath = checkDest$1(dest);

  if (resolvedDestPath === notExist$1 || resolvedDestPath === existsReg$1) {
    // if dest already exists, fs throws error anyway,
    // so no need to guard against it here.
    return gracefulFs.symlinkSync(resolvedSrcPath, dest);
  } else {
    if (opts.dereference) {
      resolvedDestPath = path.resolve(process.cwd(), resolvedDestPath);
    }

    if (resolvedDestPath === resolvedSrcPath) return; // prevent copy if src is a subdir of dest since unlinking
    // dest in this case would result in removing src contents
    // and therefore a broken symlink would be created.

    if (gracefulFs.statSync(dest).isDirectory() && isSrcSubdir$1(resolvedDestPath, resolvedSrcPath)) {
      throw new Error(`Cannot overwrite '${resolvedDestPath}' with '${resolvedSrcPath}'.`);
    }

    return copyLink$1(resolvedSrcPath, dest);
  }
}

function copyLink$1(resolvedSrcPath, dest) {
  gracefulFs.unlinkSync(dest);
  return gracefulFs.symlinkSync(resolvedSrcPath, dest);
} // check if dest exists and/or is a symlink


function checkDest$1(dest) {
  let resolvedPath;

  try {
    resolvedPath = gracefulFs.readlinkSync(dest);
  } catch (err) {
    if (err.code === 'ENOENT') return notExist$1; // dest exists and is a regular file or directory, Windows may throw UNKNOWN error

    if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return existsReg$1;
    throw err;
  }

  return resolvedPath; // dest exists and is a symlink
} // return true if dest is a subdir of src, otherwise false.
// extract dest base dir and check if that is the same as src basename


function isSrcSubdir$1(src, dest) {
  const baseDir = dest.split(path.dirname(src) + path.sep)[1];

  if (baseDir) {
    const destBasename = baseDir.split(path.sep)[0];

    if (destBasename) {
      return src !== dest && dest.indexOf(src) > -1 && destBasename === path.basename(src);
    }

    return false;
  }

  return false;
}

var copySync_1 = copySync;

var copySync$1 = {
  copySync: copySync_1
};

const isWindows = process.platform === 'win32';

function defaults(options) {
  const methods = ['unlink', 'chmod', 'stat', 'lstat', 'rmdir', 'readdir'];
  methods.forEach(m => {
    options[m] = options[m] || gracefulFs[m];
    m = m + 'Sync';
    options[m] = options[m] || gracefulFs[m];
  });
  options.maxBusyTries = options.maxBusyTries || 3;
}

function rimraf(p, options, cb) {
  let busyTries = 0;

  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  assert(p, 'rimraf: missing path');
  assert.equal(typeof p, 'string', 'rimraf: path should be a string');
  assert.equal(typeof cb, 'function', 'rimraf: callback function required');
  assert(options, 'rimraf: invalid options argument provided');
  assert.equal(typeof options, 'object', 'rimraf: options should be object');
  defaults(options);
  rimraf_(p, options, function CB(er) {
    if (er) {
      if ((er.code === 'EBUSY' || er.code === 'ENOTEMPTY' || er.code === 'EPERM') && busyTries < options.maxBusyTries) {
        busyTries++;
        let time = busyTries * 100; // try again, with the same exact callback as this one.

        return setTimeout(() => rimraf_(p, options, CB), time);
      } // already gone


      if (er.code === 'ENOENT') er = null;
    }

    cb(er);
  });
} // Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.


function rimraf_(p, options, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function'); // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.

  options.lstat(p, (er, st) => {
    if (er && er.code === 'ENOENT') {
      return cb(null);
    } // Windows can EPERM on stat.  Life is suffering.


    if (er && er.code === 'EPERM' && isWindows) {
      return fixWinEPERM(p, options, er, cb);
    }

    if (st && st.isDirectory()) {
      return rmdir(p, options, er, cb);
    }

    options.unlink(p, er => {
      if (er) {
        if (er.code === 'ENOENT') {
          return cb(null);
        }

        if (er.code === 'EPERM') {
          return isWindows ? fixWinEPERM(p, options, er, cb) : rmdir(p, options, er, cb);
        }

        if (er.code === 'EISDIR') {
          return rmdir(p, options, er, cb);
        }
      }

      return cb(er);
    });
  });
}

function fixWinEPERM(p, options, er, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function');

  if (er) {
    assert(er instanceof Error);
  }

  options.chmod(p, 0o666, er2 => {
    if (er2) {
      cb(er2.code === 'ENOENT' ? null : er);
    } else {
      options.stat(p, (er3, stats) => {
        if (er3) {
          cb(er3.code === 'ENOENT' ? null : er);
        } else if (stats.isDirectory()) {
          rmdir(p, options, er, cb);
        } else {
          options.unlink(p, cb);
        }
      });
    }
  });
}

function fixWinEPERMSync(p, options, er) {
  let stats;
  assert(p);
  assert(options);

  if (er) {
    assert(er instanceof Error);
  }

  try {
    options.chmodSync(p, 0o666);
  } catch (er2) {
    if (er2.code === 'ENOENT') {
      return;
    } else {
      throw er;
    }
  }

  try {
    stats = options.statSync(p);
  } catch (er3) {
    if (er3.code === 'ENOENT') {
      return;
    } else {
      throw er;
    }
  }

  if (stats.isDirectory()) {
    rmdirSync(p, options, er);
  } else {
    options.unlinkSync(p);
  }
}

function rmdir(p, options, originalEr, cb) {
  assert(p);
  assert(options);

  if (originalEr) {
    assert(originalEr instanceof Error);
  }

  assert(typeof cb === 'function'); // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.

  options.rmdir(p, er => {
    if (er && (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM')) {
      rmkids(p, options, cb);
    } else if (er && er.code === 'ENOTDIR') {
      cb(originalEr);
    } else {
      cb(er);
    }
  });
}

function rmkids(p, options, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function');
  options.readdir(p, (er, files) => {
    if (er) return cb(er);
    let n = files.length;
    let errState;
    if (n === 0) return options.rmdir(p, cb);
    files.forEach(f => {
      rimraf(path.join(p, f), options, er => {
        if (errState) {
          return;
        }

        if (er) return cb(errState = er);

        if (--n === 0) {
          options.rmdir(p, cb);
        }
      });
    });
  });
} // this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.


function rimrafSync(p, options) {
  let st;
  options = options || {};
  defaults(options);
  assert(p, 'rimraf: missing path');
  assert.equal(typeof p, 'string', 'rimraf: path should be a string');
  assert(options, 'rimraf: missing options');
  assert.equal(typeof options, 'object', 'rimraf: options should be object');

  try {
    st = options.lstatSync(p);
  } catch (er) {
    if (er.code === 'ENOENT') {
      return;
    } // Windows can EPERM on stat.  Life is suffering.


    if (er.code === 'EPERM' && isWindows) {
      fixWinEPERMSync(p, options, er);
    }
  }

  try {
    // sunos lets the root user unlink directories, which is... weird.
    if (st && st.isDirectory()) {
      rmdirSync(p, options, null);
    } else {
      options.unlinkSync(p);
    }
  } catch (er) {
    if (er.code === 'ENOENT') {
      return;
    } else if (er.code === 'EPERM') {
      return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);
    } else if (er.code !== 'EISDIR') {
      throw er;
    }

    rmdirSync(p, options, er);
  }
}

function rmdirSync(p, options, originalEr) {
  assert(p);
  assert(options);

  if (originalEr) {
    assert(originalEr instanceof Error);
  }

  try {
    options.rmdirSync(p);
  } catch (er) {
    if (er.code === 'ENOTDIR') {
      throw originalEr;
    } else if (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM') {
      rmkidsSync(p, options);
    } else if (er.code !== 'ENOENT') {
      throw er;
    }
  }
}

function rmkidsSync(p, options) {
  assert(p);
  assert(options);
  options.readdirSync(p).forEach(f => rimrafSync(path.join(p, f), options)); // We only end up here once we got ENOTEMPTY at least once, and
  // at this point, we are guaranteed to have removed all the kids.
  // So, we know that it won't be ENOENT or ENOTDIR or anything else.
  // try really hard to delete stuff on windows, because it has a
  // PROFOUNDLY annoying habit of not closing handles promptly when
  // files are deleted, resulting in spurious ENOTEMPTY errors.

  const retries = isWindows ? 100 : 1;
  let i = 0;

  do {
    let threw = true;

    try {
      const ret = options.rmdirSync(p, options);
      threw = false;
      return ret;
    } finally {
      if (++i < retries && threw) continue; // eslint-disable-line
    }
  } while (true);
}

var rimraf_1 = rimraf;
rimraf.sync = rimrafSync;

const u$3 = universalify.fromCallback;



var remove = {
  remove: u$3(rimraf_1),
  removeSync: rimraf_1.sync
};

var _fs;

try {
  _fs = gracefulFs;
} catch (_) {
  _fs = fs$1;
}

function readFile(file, options, callback) {
  if (callback == null) {
    callback = options;
    options = {};
  }

  if (typeof options === 'string') {
    options = {
      encoding: options
    };
  }

  options = options || {};
  var fs = options.fs || _fs;
  var shouldThrow = true;

  if ('throws' in options) {
    shouldThrow = options.throws;
  }

  fs.readFile(file, options, function (err, data) {
    if (err) return callback(err);
    data = stripBom(data);
    var obj;

    try {
      obj = JSON.parse(data, options ? options.reviver : null);
    } catch (err2) {
      if (shouldThrow) {
        err2.message = file + ': ' + err2.message;
        return callback(err2);
      } else {
        return callback(null, null);
      }
    }

    callback(null, obj);
  });
}

function readFileSync(file, options) {
  options = options || {};

  if (typeof options === 'string') {
    options = {
      encoding: options
    };
  }

  var fs = options.fs || _fs;
  var shouldThrow = true;

  if ('throws' in options) {
    shouldThrow = options.throws;
  }

  try {
    var content = fs.readFileSync(file, options);
    content = stripBom(content);
    return JSON.parse(content, options.reviver);
  } catch (err) {
    if (shouldThrow) {
      err.message = file + ': ' + err.message;
      throw err;
    } else {
      return null;
    }
  }
}

function stringify(obj, options) {
  var spaces;
  var EOL = '\n';

  if (typeof options === 'object' && options !== null) {
    if (options.spaces) {
      spaces = options.spaces;
    }

    if (options.EOL) {
      EOL = options.EOL;
    }
  }

  var str = JSON.stringify(obj, options ? options.replacer : null, spaces);
  return str.replace(/\n/g, EOL) + EOL;
}

function writeFile(file, obj, options, callback) {
  if (callback == null) {
    callback = options;
    options = {};
  }

  options = options || {};
  var fs = options.fs || _fs;
  var str = '';

  try {
    str = stringify(obj, options);
  } catch (err) {
    // Need to return whether a callback was passed or not
    if (callback) callback(err, null);
    return;
  }

  fs.writeFile(file, str, options, callback);
}

function writeFileSync(file, obj, options) {
  options = options || {};
  var fs = options.fs || _fs;
  var str = stringify(obj, options); // not sure if fs.writeFileSync returns anything, but just in case

  return fs.writeFileSync(file, str, options);
}

function stripBom(content) {
  // we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
  if (Buffer.isBuffer(content)) content = content.toString('utf8');
  content = content.replace(/^\uFEFF/, '');
  return content;
}

var jsonfile = {
  readFile: readFile,
  readFileSync: readFileSync,
  writeFile: writeFile,
  writeFileSync: writeFileSync
};
var jsonfile_1 = jsonfile;

const u$4 = universalify.fromCallback;



var jsonfile$1 = {
  // jsonfile exports
  readJson: u$4(jsonfile_1.readFile),
  readJsonSync: jsonfile_1.readFileSync,
  writeJson: u$4(jsonfile_1.writeFile),
  writeJsonSync: jsonfile_1.writeFileSync
};

const pathExists$2 = pathExists_1.pathExists;



function outputJson(file, data, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const dir = path.dirname(file);
  pathExists$2(dir, (err, itDoes) => {
    if (err) return callback(err);
    if (itDoes) return jsonfile$1.writeJson(file, data, options, callback);
    mkdirs_1$1.mkdirs(dir, err => {
      if (err) return callback(err);
      jsonfile$1.writeJson(file, data, options, callback);
    });
  });
}

var outputJson_1 = outputJson;

function outputJsonSync(file, data, options) {
  const dir = path.dirname(file);

  if (!gracefulFs.existsSync(dir)) {
    mkdirs_1$1.mkdirsSync(dir);
  }

  jsonfile$1.writeJsonSync(file, data, options);
}

var outputJsonSync_1 = outputJsonSync;

const u$5 = universalify.fromCallback;



jsonfile$1.outputJson = u$5(outputJson_1);
jsonfile$1.outputJsonSync = outputJsonSync_1; // aliases

jsonfile$1.outputJSON = jsonfile$1.outputJson;
jsonfile$1.outputJSONSync = jsonfile$1.outputJsonSync;
jsonfile$1.writeJSON = jsonfile$1.writeJson;
jsonfile$1.writeJSONSync = jsonfile$1.writeJsonSync;
jsonfile$1.readJSON = jsonfile$1.readJson;
jsonfile$1.readJSONSync = jsonfile$1.readJsonSync;
var json = jsonfile$1;

// licensed under the BSD license: see
// https://github.com/andrewrk/node-mv/blob/master/package.json
// this needs a cleanup

const u$6 = universalify.fromCallback;







const remove$1 = remove.remove;

const mkdirp$1 = mkdirs_1$1.mkdirs;

function move(src, dest, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const overwrite = options.overwrite || options.clobber || false;
  isSrcSubdir$2(src, dest, (err, itIs) => {
    if (err) return callback(err);
    if (itIs) return callback(new Error(`Cannot move '${src}' to a subdirectory of itself, '${dest}'.`));
    mkdirp$1(path.dirname(dest), err => {
      if (err) return callback(err);
      doRename();
    });
  });

  function doRename() {
    if (path.resolve(src) === path.resolve(dest)) {
      gracefulFs.access(src, callback);
    } else if (overwrite) {
      gracefulFs.rename(src, dest, err => {
        if (!err) return callback();

        if (err.code === 'ENOTEMPTY' || err.code === 'EEXIST') {
          remove$1(dest, err => {
            if (err) return callback(err);
            options.overwrite = false; // just overwriteed it, no need to do it again

            move(src, dest, options, callback);
          });
          return;
        } // weird Windows shit


        if (err.code === 'EPERM') {
          setTimeout(() => {
            remove$1(dest, err => {
              if (err) return callback(err);
              options.overwrite = false;
              move(src, dest, options, callback);
            });
          }, 200);
          return;
        }

        if (err.code !== 'EXDEV') return callback(err);
        moveAcrossDevice(src, dest, overwrite, callback);
      });
    } else {
      gracefulFs.link(src, dest, err => {
        if (err) {
          if (err.code === 'EXDEV' || err.code === 'EISDIR' || err.code === 'EPERM' || err.code === 'ENOTSUP') {
            return moveAcrossDevice(src, dest, overwrite, callback);
          }

          return callback(err);
        }

        return gracefulFs.unlink(src, callback);
      });
    }
  }
}

function moveAcrossDevice(src, dest, overwrite, callback) {
  gracefulFs.stat(src, (err, stat) => {
    if (err) return callback(err);

    if (stat.isDirectory()) {
      moveDirAcrossDevice(src, dest, overwrite, callback);
    } else {
      moveFileAcrossDevice(src, dest, overwrite, callback);
    }
  });
}

function moveFileAcrossDevice(src, dest, overwrite, callback) {
  const flags = overwrite ? 'w' : 'wx';
  const ins = gracefulFs.createReadStream(src);
  const outs = gracefulFs.createWriteStream(dest, {
    flags
  });
  ins.on('error', err => {
    ins.destroy();
    outs.destroy();
    outs.removeListener('close', onClose); // may want to create a directory but `out` line above
    // creates an empty file for us: See #108
    // don't care about error here

    gracefulFs.unlink(dest, () => {
      // note: `err` here is from the input stream errror
      if (err.code === 'EISDIR' || err.code === 'EPERM') {
        moveDirAcrossDevice(src, dest, overwrite, callback);
      } else {
        callback(err);
      }
    });
  });
  outs.on('error', err => {
    ins.destroy();
    outs.destroy();
    outs.removeListener('close', onClose);
    callback(err);
  });
  outs.once('close', onClose);
  ins.pipe(outs);

  function onClose() {
    gracefulFs.unlink(src, callback);
  }
}

function moveDirAcrossDevice(src, dest, overwrite, callback) {
  const options = {
    overwrite: false
  };

  if (overwrite) {
    remove$1(dest, err => {
      if (err) return callback(err);
      startCopy();
    });
  } else {
    startCopy();
  }

  function startCopy() {
    copy_1(src, dest, options, err => {
      if (err) return callback(err);
      remove$1(src, callback);
    });
  }
} // return true if dest is a subdir of src, otherwise false.
// extract dest base dir and check if that is the same as src basename


function isSrcSubdir$2(src, dest, cb) {
  gracefulFs.stat(src, (err, st) => {
    if (err) return cb(err);

    if (st.isDirectory()) {
      const baseDir = dest.split(path.dirname(src) + path.sep)[1];

      if (baseDir) {
        const destBasename = baseDir.split(path.sep)[0];
        if (destBasename) return cb(null, src !== dest && dest.indexOf(src) > -1 && destBasename === path.basename(src));
        return cb(null, false);
      }

      return cb(null, false);
    }

    return cb(null, false);
  });
}

var move_1 = {
  move: u$6(move)
};

const copySync$2 = copySync$1.copySync;

const removeSync = remove.removeSync;

const mkdirpSync$1 = mkdirs_1$1.mkdirsSync;



function moveSync(src, dest, options) {
  options = options || {};
  const overwrite = options.overwrite || options.clobber || false;
  src = path.resolve(src);
  dest = path.resolve(dest);
  if (src === dest) return gracefulFs.accessSync(src);
  if (isSrcSubdir$3(src, dest)) throw new Error(`Cannot move '${src}' into itself '${dest}'.`);
  mkdirpSync$1(path.dirname(dest));
  tryRenameSync();

  function tryRenameSync() {
    if (overwrite) {
      try {
        return gracefulFs.renameSync(src, dest);
      } catch (err) {
        if (err.code === 'ENOTEMPTY' || err.code === 'EEXIST' || err.code === 'EPERM') {
          removeSync(dest);
          options.overwrite = false; // just overwriteed it, no need to do it again

          return moveSync(src, dest, options);
        }

        if (err.code !== 'EXDEV') throw err;
        return moveSyncAcrossDevice(src, dest, overwrite);
      }
    } else {
      try {
        gracefulFs.linkSync(src, dest);
        return gracefulFs.unlinkSync(src);
      } catch (err) {
        if (err.code === 'EXDEV' || err.code === 'EISDIR' || err.code === 'EPERM' || err.code === 'ENOTSUP') {
          return moveSyncAcrossDevice(src, dest, overwrite);
        }

        throw err;
      }
    }
  }
}

function moveSyncAcrossDevice(src, dest, overwrite) {
  const stat = gracefulFs.statSync(src);

  if (stat.isDirectory()) {
    return moveDirSyncAcrossDevice(src, dest, overwrite);
  } else {
    return moveFileSyncAcrossDevice(src, dest, overwrite);
  }
}

function moveFileSyncAcrossDevice(src, dest, overwrite) {
  const BUF_LENGTH = 64 * 1024;

  const _buff = buffer(BUF_LENGTH);

  const flags = overwrite ? 'w' : 'wx';
  const fdr = gracefulFs.openSync(src, 'r');
  const stat = gracefulFs.fstatSync(fdr);
  const fdw = gracefulFs.openSync(dest, flags, stat.mode);
  let bytesRead = 1;
  let pos = 0;

  while (bytesRead > 0) {
    bytesRead = gracefulFs.readSync(fdr, _buff, 0, BUF_LENGTH, pos);
    gracefulFs.writeSync(fdw, _buff, 0, bytesRead);
    pos += bytesRead;
  }

  gracefulFs.closeSync(fdr);
  gracefulFs.closeSync(fdw);
  return gracefulFs.unlinkSync(src);
}

function moveDirSyncAcrossDevice(src, dest, overwrite) {
  const options = {
    overwrite: false
  };

  if (overwrite) {
    removeSync(dest);
    tryCopySync();
  } else {
    tryCopySync();
  }

  function tryCopySync() {
    copySync$2(src, dest, options);
    return removeSync(src);
  }
} // return true if dest is a subdir of src, otherwise false.
// extract dest base dir and check if that is the same as src basename


function isSrcSubdir$3(src, dest) {
  try {
    return gracefulFs.statSync(src).isDirectory() && src !== dest && dest.indexOf(src) > -1 && dest.split(path.dirname(src) + path.sep)[1].split(path.sep)[0] === path.basename(src);
  } catch (e) {
    return false;
  }
}

var moveSync_1 = {
  moveSync
};

const u$7 = universalify.fromCallback;









const emptyDir = u$7(function emptyDir(dir, callback) {
  callback = callback || function () {};

  fs$1.readdir(dir, (err, items) => {
    if (err) return mkdirs_1$1.mkdirs(dir, callback);
    items = items.map(item => path.join(dir, item));
    deleteItem();

    function deleteItem() {
      const item = items.pop();
      if (!item) return callback();
      remove.remove(item, err => {
        if (err) return callback(err);
        deleteItem();
      });
    }
  });
});

function emptyDirSync(dir) {
  let items;

  try {
    items = fs$1.readdirSync(dir);
  } catch (err) {
    return mkdirs_1$1.mkdirsSync(dir);
  }

  items.forEach(item => {
    item = path.join(dir, item);
    remove.removeSync(item);
  });
}

var empty = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
};

const u$8 = universalify.fromCallback;







const pathExists$3 = pathExists_1.pathExists;

function createFile(file, callback) {
  function makeFile() {
    gracefulFs.writeFile(file, '', err => {
      if (err) return callback(err);
      callback();
    });
  }

  gracefulFs.stat(file, (err, stats) => {
    // eslint-disable-line handle-callback-err
    if (!err && stats.isFile()) return callback();
    const dir = path.dirname(file);
    pathExists$3(dir, (err, dirExists) => {
      if (err) return callback(err);
      if (dirExists) return makeFile();
      mkdirs_1$1.mkdirs(dir, err => {
        if (err) return callback(err);
        makeFile();
      });
    });
  });
}

function createFileSync(file) {
  let stats;

  try {
    stats = gracefulFs.statSync(file);
  } catch (e) {}

  if (stats && stats.isFile()) return;
  const dir = path.dirname(file);

  if (!gracefulFs.existsSync(dir)) {
    mkdirs_1$1.mkdirsSync(dir);
  }

  gracefulFs.writeFileSync(file, '');
}

var file = {
  createFile: u$8(createFile),
  createFileSync
};

const u$9 = universalify.fromCallback;







const pathExists$4 = pathExists_1.pathExists;

function createLink(srcpath, dstpath, callback) {
  function makeLink(srcpath, dstpath) {
    gracefulFs.link(srcpath, dstpath, err => {
      if (err) return callback(err);
      callback(null);
    });
  }

  pathExists$4(dstpath, (err, destinationExists) => {
    if (err) return callback(err);
    if (destinationExists) return callback(null);
    gracefulFs.lstat(srcpath, (err, stat) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureLink');
        return callback(err);
      }

      const dir = path.dirname(dstpath);
      pathExists$4(dir, (err, dirExists) => {
        if (err) return callback(err);
        if (dirExists) return makeLink(srcpath, dstpath);
        mkdirs_1$1.mkdirs(dir, err => {
          if (err) return callback(err);
          makeLink(srcpath, dstpath);
        });
      });
    });
  });
}

function createLinkSync(srcpath, dstpath, callback) {
  const destinationExists = gracefulFs.existsSync(dstpath);
  if (destinationExists) return undefined;

  try {
    gracefulFs.lstatSync(srcpath);
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink');
    throw err;
  }

  const dir = path.dirname(dstpath);
  const dirExists = gracefulFs.existsSync(dir);
  if (dirExists) return gracefulFs.linkSync(srcpath, dstpath);
  mkdirs_1$1.mkdirsSync(dir);
  return gracefulFs.linkSync(srcpath, dstpath);
}

var link = {
  createLink: u$9(createLink),
  createLinkSync
};

const pathExists$5 = pathExists_1.pathExists;
/**
 * Function that returns two types of paths, one relative to symlink, and one
 * relative to the current working directory. Checks if path is absolute or
 * relative. If the path is relative, this function checks if the path is
 * relative to symlink or relative to current working directory. This is an
 * initiative to find a smarter `srcpath` to supply when building symlinks.
 * This allows you to determine which path to use out of one of three possible
 * types of source paths. The first is an absolute path. This is detected by
 * `path.isAbsolute()`. When an absolute path is provided, it is checked to
 * see if it exists. If it does it's used, if not an error is returned
 * (callback)/ thrown (sync). The other two options for `srcpath` are a
 * relative url. By default Node's `fs.symlink` works by creating a symlink
 * using `dstpath` and expects the `srcpath` to be relative to the newly
 * created symlink. If you provide a `srcpath` that does not exist on the file
 * system it results in a broken symlink. To minimize this, the function
 * checks to see if the 'relative to symlink' source file exists, and if it
 * does it will use it. If it does not, it checks if there's a file that
 * exists that is relative to the current working directory, if does its used.
 * This preserves the expectations of the original fs.symlink spec and adds
 * the ability to pass in `relative to current working direcotry` paths.
 */


function symlinkPaths(srcpath, dstpath, callback) {
  if (path.isAbsolute(srcpath)) {
    return gracefulFs.lstat(srcpath, (err, stat) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureSymlink');
        return callback(err);
      }

      return callback(null, {
        'toCwd': srcpath,
        'toDst': srcpath
      });
    });
  } else {
    const dstdir = path.dirname(dstpath);
    const relativeToDst = path.join(dstdir, srcpath);
    return pathExists$5(relativeToDst, (err, exists) => {
      if (err) return callback(err);

      if (exists) {
        return callback(null, {
          'toCwd': relativeToDst,
          'toDst': srcpath
        });
      } else {
        return gracefulFs.lstat(srcpath, (err, stat) => {
          if (err) {
            err.message = err.message.replace('lstat', 'ensureSymlink');
            return callback(err);
          }

          return callback(null, {
            'toCwd': srcpath,
            'toDst': path.relative(dstdir, srcpath)
          });
        });
      }
    });
  }
}

function symlinkPathsSync(srcpath, dstpath) {
  let exists;

  if (path.isAbsolute(srcpath)) {
    exists = gracefulFs.existsSync(srcpath);
    if (!exists) throw new Error('absolute srcpath does not exist');
    return {
      'toCwd': srcpath,
      'toDst': srcpath
    };
  } else {
    const dstdir = path.dirname(dstpath);
    const relativeToDst = path.join(dstdir, srcpath);
    exists = gracefulFs.existsSync(relativeToDst);

    if (exists) {
      return {
        'toCwd': relativeToDst,
        'toDst': srcpath
      };
    } else {
      exists = gracefulFs.existsSync(srcpath);
      if (!exists) throw new Error('relative srcpath does not exist');
      return {
        'toCwd': srcpath,
        'toDst': path.relative(dstdir, srcpath)
      };
    }
  }
}

var symlinkPaths_1 = {
  symlinkPaths,
  symlinkPathsSync
};

function symlinkType(srcpath, type, callback) {
  callback = typeof type === 'function' ? type : callback;
  type = typeof type === 'function' ? false : type;
  if (type) return callback(null, type);
  gracefulFs.lstat(srcpath, (err, stats) => {
    if (err) return callback(null, 'file');
    type = stats && stats.isDirectory() ? 'dir' : 'file';
    callback(null, type);
  });
}

function symlinkTypeSync(srcpath, type) {
  let stats;
  if (type) return type;

  try {
    stats = gracefulFs.lstatSync(srcpath);
  } catch (e) {
    return 'file';
  }

  return stats && stats.isDirectory() ? 'dir' : 'file';
}

var symlinkType_1 = {
  symlinkType,
  symlinkTypeSync
};

const u$a = universalify.fromCallback;







const mkdirs$2 = mkdirs_1$1.mkdirs;
const mkdirsSync$1 = mkdirs_1$1.mkdirsSync;



const symlinkPaths$1 = symlinkPaths_1.symlinkPaths;
const symlinkPathsSync$1 = symlinkPaths_1.symlinkPathsSync;



const symlinkType$1 = symlinkType_1.symlinkType;
const symlinkTypeSync$1 = symlinkType_1.symlinkTypeSync;

const pathExists$6 = pathExists_1.pathExists;

function createSymlink(srcpath, dstpath, type, callback) {
  callback = typeof type === 'function' ? type : callback;
  type = typeof type === 'function' ? false : type;
  pathExists$6(dstpath, (err, destinationExists) => {
    if (err) return callback(err);
    if (destinationExists) return callback(null);
    symlinkPaths$1(srcpath, dstpath, (err, relative) => {
      if (err) return callback(err);
      srcpath = relative.toDst;
      symlinkType$1(relative.toCwd, type, (err, type) => {
        if (err) return callback(err);
        const dir = path.dirname(dstpath);
        pathExists$6(dir, (err, dirExists) => {
          if (err) return callback(err);
          if (dirExists) return gracefulFs.symlink(srcpath, dstpath, type, callback);
          mkdirs$2(dir, err => {
            if (err) return callback(err);
            gracefulFs.symlink(srcpath, dstpath, type, callback);
          });
        });
      });
    });
  });
}

function createSymlinkSync(srcpath, dstpath, type, callback) {
  type = typeof type === 'function' ? false : type;
  const destinationExists = gracefulFs.existsSync(dstpath);
  if (destinationExists) return undefined;
  const relative = symlinkPathsSync$1(srcpath, dstpath);
  srcpath = relative.toDst;
  type = symlinkTypeSync$1(relative.toCwd, type);
  const dir = path.dirname(dstpath);
  const exists = gracefulFs.existsSync(dir);
  if (exists) return gracefulFs.symlinkSync(srcpath, dstpath, type);
  mkdirsSync$1(dir);
  return gracefulFs.symlinkSync(srcpath, dstpath, type);
}

var symlink = {
  createSymlink: u$a(createSymlink),
  createSymlinkSync
};

var ensure = {
  // file
  createFile: file.createFile,
  createFileSync: file.createFileSync,
  ensureFile: file.createFile,
  ensureFileSync: file.createFileSync,
  // link
  createLink: link.createLink,
  createLinkSync: link.createLinkSync,
  ensureLink: link.createLink,
  ensureLinkSync: link.createLinkSync,
  // symlink
  createSymlink: symlink.createSymlink,
  createSymlinkSync: symlink.createSymlinkSync,
  ensureSymlink: symlink.createSymlink,
  ensureSymlinkSync: symlink.createSymlinkSync
};

const u$b = universalify.fromCallback;







const pathExists$7 = pathExists_1.pathExists;

function outputFile(file, data, encoding, callback) {
  if (typeof encoding === 'function') {
    callback = encoding;
    encoding = 'utf8';
  }

  const dir = path.dirname(file);
  pathExists$7(dir, (err, itDoes) => {
    if (err) return callback(err);
    if (itDoes) return gracefulFs.writeFile(file, data, encoding, callback);
    mkdirs_1$1.mkdirs(dir, err => {
      if (err) return callback(err);
      gracefulFs.writeFile(file, data, encoding, callback);
    });
  });
}

function outputFileSync(file, data, encoding) {
  const dir = path.dirname(file);

  if (gracefulFs.existsSync(dir)) {
    return gracefulFs.writeFileSync.apply(gracefulFs, arguments);
  }

  mkdirs_1$1.mkdirsSync(dir);
  gracefulFs.writeFileSync.apply(gracefulFs, arguments);
}

var output = {
  outputFile: u$b(outputFile),
  outputFileSync
};

const fs = {}; // Export graceful-fs:

assign_1(fs, fs_1); // Export extra methods:

assign_1(fs, copy$1);
assign_1(fs, copySync$1);
assign_1(fs, mkdirs_1$1);
assign_1(fs, remove);
assign_1(fs, json);
assign_1(fs, move_1);
assign_1(fs, moveSync_1);
assign_1(fs, empty);
assign_1(fs, ensure);
assign_1(fs, output);
assign_1(fs, pathExists_1);
var lib$1 = fs;

var nodeProgress = createCommonjsModule(function (module, exports) {
/*!
 * node-progress
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Expose `ProgressBar`.
 */
exports = module.exports = ProgressBar;
/**
 * Initialize a `ProgressBar` with the given `fmt` string and `options` or
 * `total`.
 *
 * Options:
 *
 *   - `curr` current completed index
 *   - `total` total number of ticks to complete
 *   - `width` the displayed width of the progress bar defaulting to total
 *   - `stream` the output stream defaulting to stderr
 *   - `head` head character defaulting to complete character
 *   - `complete` completion character defaulting to "="
 *   - `incomplete` incomplete character defaulting to "-"
 *   - `renderThrottle` minimum time between updates in milliseconds defaulting to 16
 *   - `callback` optional function to call when the progress bar completes
 *   - `clear` will clear the progress bar upon termination
 *
 * Tokens:
 *
 *   - `:bar` the progress bar itself
 *   - `:current` current tick number
 *   - `:total` total ticks
 *   - `:elapsed` time elapsed in seconds
 *   - `:percent` completion percentage
 *   - `:eta` eta in seconds
 *   - `:rate` rate of ticks per second
 *
 * @param {string} fmt
 * @param {object|number} options or total
 * @api public
 */

function ProgressBar(fmt, options) {
  this.stream = options.stream || process.stderr;

  if (typeof options == 'number') {
    var total = options;
    options = {};
    options.total = total;
  } else {
    options = options || {};
    if ('string' != typeof fmt) throw new Error('format required');
    if ('number' != typeof options.total) throw new Error('total required');
  }

  this.fmt = fmt;
  this.curr = options.curr || 0;
  this.total = options.total;
  this.width = options.width || this.total;
  this.clear = options.clear;
  this.chars = {
    complete: options.complete || '=',
    incomplete: options.incomplete || '-',
    head: options.head || options.complete || '='
  };
  this.renderThrottle = options.renderThrottle !== 0 ? options.renderThrottle || 16 : 0;
  this.lastRender = -Infinity;

  this.callback = options.callback || function () {};

  this.tokens = {};
  this.lastDraw = '';
}
/**
 * "tick" the progress bar with optional `len` and optional `tokens`.
 *
 * @param {number|object} len or tokens
 * @param {object} tokens
 * @api public
 */


ProgressBar.prototype.tick = function (len, tokens) {
  if (len !== 0) len = len || 1; // swap tokens

  if ('object' == typeof len) tokens = len, len = 1;
  if (tokens) this.tokens = tokens; // start time for eta

  if (0 == this.curr) this.start = new Date();
  this.curr += len; // try to render

  this.render(); // progress complete

  if (this.curr >= this.total) {
    this.render(undefined, true);
    this.complete = true;
    this.terminate();
    this.callback(this);
    return;
  }
};
/**
 * Method to render the progress bar with optional `tokens` to place in the
 * progress bar's `fmt` field.
 *
 * @param {object} tokens
 * @api public
 */


ProgressBar.prototype.render = function (tokens, force) {
  force = force !== undefined ? force : false;
  if (tokens) this.tokens = tokens;
  if (!this.stream.isTTY) return;
  var now = Date.now();
  var delta = now - this.lastRender;

  if (!force && delta < this.renderThrottle) {
    return;
  } else {
    this.lastRender = now;
  }

  var ratio = this.curr / this.total;
  ratio = Math.min(Math.max(ratio, 0), 1);
  var percent = Math.floor(ratio * 100);
  var incomplete, complete, completeLength;
  var elapsed = new Date() - this.start;
  var eta = percent == 100 ? 0 : elapsed * (this.total / this.curr - 1);
  var rate = this.curr / (elapsed / 1000);
  /* populate the bar template with percentages and timestamps */

  var str = this.fmt.replace(':current', this.curr).replace(':total', this.total).replace(':elapsed', isNaN(elapsed) ? '0.0' : (elapsed / 1000).toFixed(1)).replace(':eta', isNaN(eta) || !isFinite(eta) ? '0.0' : (eta / 1000).toFixed(1)).replace(':percent', percent.toFixed(0) + '%').replace(':rate', Math.round(rate));
  /* compute the available space (non-zero) for the bar */

  var availableSpace = Math.max(0, this.stream.columns - str.replace(':bar', '').length);

  if (availableSpace && process.platform === 'win32') {
    availableSpace = availableSpace - 1;
  }

  var width = Math.min(this.width, availableSpace);
  /* TODO: the following assumes the user has one ':bar' token */

  completeLength = Math.round(width * ratio);
  complete = Array(Math.max(0, completeLength + 1)).join(this.chars.complete);
  incomplete = Array(Math.max(0, width - completeLength + 1)).join(this.chars.incomplete);
  /* add head to the complete string */

  if (completeLength > 0) complete = complete.slice(0, -1) + this.chars.head;
  /* fill in the actual progress bar */

  str = str.replace(':bar', complete + incomplete);
  /* replace the extra tokens */

  if (this.tokens) for (var key in this.tokens) str = str.replace(':' + key, this.tokens[key]);

  if (this.lastDraw !== str) {
    this.stream.cursorTo(0);
    this.stream.write(str);
    this.stream.clearLine(1);
    this.lastDraw = str;
  }
};
/**
 * "update" the progress bar to represent an exact percentage.
 * The ratio (between 0 and 1) specified will be multiplied by `total` and
 * floored, representing the closest available "tick." For example, if a
 * progress bar has a length of 3 and `update(0.5)` is called, the progress
 * will be set to 1.
 *
 * A ratio of 0.5 will attempt to set the progress to halfway.
 *
 * @param {number} ratio The ratio (between 0 and 1 inclusive) to set the
 *   overall completion to.
 * @api public
 */


ProgressBar.prototype.update = function (ratio, tokens) {
  var goal = Math.floor(ratio * this.total);
  var delta = goal - this.curr;
  this.tick(delta, tokens);
};
/**
 * "interrupt" the progress bar and write a message above it.
 * @param {string} message The message to write.
 * @api public
 */


ProgressBar.prototype.interrupt = function (message) {
  // clear the current line
  this.stream.clearLine(); // move the cursor to the start of the line

  this.stream.cursorTo(0); // write the message text

  this.stream.write(message); // terminate the line after writing the message

  this.stream.write('\n'); // re-display the progress bar with its lastDraw

  this.stream.write(this.lastDraw);
};
/**
 * Terminates a progress bar.
 *
 * @api public
 */


ProgressBar.prototype.terminate = function () {
  if (this.clear) {
    if (this.stream.clearLine) {
      this.stream.clearLine();
      this.stream.cursorTo(0);
    }
  } else {
    this.stream.write('\n');
  }
};
});

var progress = nodeProgress;

var utils = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.getRemoteFileExtension = getRemoteFileExtension;
exports.getRemoteFileName = getRemoteFileName;
exports.createProgress = createProgress;
exports.slash = slash;
exports.createFilePath = createFilePath;






/**
 * getParsedPath
 * --
 * Parses remote url to a path object
 *
 *
 * @param  {String}          url
 * @return {Object}          path
 */


function getParsedPath(url) {
  return path.parse(Url.parse(url).pathname);
}
/**
 * getRemoteFileExtension
 * --
 * Parses remote url to retrieve remote file extension
 *
 *
 * @param  {String}          url
 * @return {String}          extension
 */


function getRemoteFileExtension(url) {
  return getParsedPath(url).ext;
}
/**
 * getRemoteFileName
 * --
 * Parses remote url to retrieve remote file name
 *
 *
 * @param  {String}          url
 * @return {String}          filename
 */


function getRemoteFileName(url) {
  return getParsedPath(url).name;
} // TODO remove in V3


function createProgress(message, reporter) {
  if (reporter && reporter.createProgress) {
    return reporter.createProgress(message);
  }

  const bar = new progress(` [:bar] :current/:total :elapsed s :percent ${message}`, {
    total: 0,
    width: 30,
    clear: true
  });
  return {
    start() {},

    tick() {
      bar.tick();
    },

    done() {},

    set total(value) {
      bar.total = value;
    }

  };
}
/**
 * slash
 * --
 * Convert Windows backslash paths to slash paths: foo\\bar ➔ foo/bar
 *
 *
 * @param  {String}          path
 * @return {String}          slashed path
 */


function slash(path) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path);

  if (isExtendedLengthPath) {
    return path;
  }

  return path.replace(/\\/g, `/`);
}
/**
 * createFilePath
 * --
 *
 * @param  {String} directory
 * @param  {String} filename
 * @param  {String} url
 * @return {String}
 */


function createFilePath(directory, filename, ext) {
  return path.join(directory, `${filename}${ext}`);
}
});

unwrapExports(utils);
var utils_1 = utils.getRemoteFileExtension;
var utils_2 = utils.getRemoteFileName;
var utils_3 = utils.createProgress;
var utils_4 = utils.slash;
var utils_5 = utils.createFilePath;

const {
  slash
} = utils;

function findFileNode({
  node,
  getNode
}) {
  // Find the file node.
  let fileNode = node;
  let whileCount = 0;

  while (fileNode.internal.type !== `File` && fileNode.parent && getNode(fileNode.parent) !== undefined && whileCount < 101) {
    fileNode = getNode(fileNode.parent);
    whileCount += 1;

    if (whileCount > 100) {
      console.log(`It looks like you have a node that's set its parent as itself`, fileNode);
    }
  }

  return fileNode;
}

var createFilePath = ({
  node,
  getNode,
  basePath = `src/pages`,
  trailingSlash = true
}) => {
  // Find the File node
  const fileNode = findFileNode({
    node,
    getNode
  });
  if (!fileNode) return undefined;
  const relativePath = path.posix.relative(slash(basePath), slash(fileNode.relativePath));
  const {
    dir = ``,
    name
  } = path.parse(relativePath);
  const parsedName = name === `index` ? `` : name;
  return path.posix.join(`/`, dir, parsedName, trailingSlash ? `/` : ``);
};

function DuplexWrapper(options, writable, readable) {
  if (typeof readable === "undefined") {
    readable = writable;
    writable = options;
    options = null;
  }

  Stream$1.Duplex.call(this, options);

  if (typeof readable.read !== "function") {
    readable = new Stream$1.Readable(options).wrap(readable);
  }

  this._writable = writable;
  this._readable = readable;
  this._waiting = false;
  var self = this;
  writable.once("finish", function () {
    self.end();
  });
  this.once("finish", function () {
    writable.end();
  });
  readable.on("readable", function () {
    if (self._waiting) {
      self._waiting = false;

      self._read();
    }
  });
  readable.once("end", function () {
    self.push(null);
  });

  if (!options || typeof options.bubbleErrors === "undefined" || options.bubbleErrors) {
    writable.on("error", function (err) {
      self.emit("error", err);
    });
    readable.on("error", function (err) {
      self.emit("error", err);
    });
  }
}

DuplexWrapper.prototype = Object.create(Stream$1.Duplex.prototype, {
  constructor: {
    value: DuplexWrapper
  }
});

DuplexWrapper.prototype._write = function _write(input, encoding, done) {
  this._writable.write(input, encoding, done);
};

DuplexWrapper.prototype._read = function _read() {
  var buf;
  var reads = 0;

  while ((buf = this._readable.read()) !== null) {
    this.push(buf);
    reads++;
  }

  if (reads === 0) {
    this._waiting = true;
  }
};

var duplexer3 = function duplex2(options, writable, readable) {
  return new DuplexWrapper(options, writable, readable);
};

var DuplexWrapper_1 = DuplexWrapper;
duplexer3.DuplexWrapper = DuplexWrapper_1;

var isStream_1 = createCommonjsModule(function (module) {

var isStream = module.exports = function (stream) {
  return stream !== null && typeof stream === 'object' && typeof stream.pipe === 'function';
};

isStream.writable = function (stream) {
  return isStream(stream) && stream.writable !== false && typeof stream._write === 'function' && typeof stream._writableState === 'object';
};

isStream.readable = function (stream) {
  return isStream(stream) && stream.readable !== false && typeof stream._read === 'function' && typeof stream._readableState === 'object';
};

isStream.duplex = function (stream) {
  return isStream.writable(stream) && isStream.readable(stream);
};

isStream.transform = function (stream) {
  return isStream.duplex(stream) && typeof stream._transform === 'function' && typeof stream._transformState === 'object';
};
});

const PassThrough$2 = Stream$1.PassThrough;

var bufferStream = opts => {
  opts = Object.assign({}, opts);
  const array = opts.array;
  let encoding = opts.encoding;
  const buffer = encoding === 'buffer';
  let objectMode = false;

  if (array) {
    objectMode = !(encoding || buffer);
  } else {
    encoding = encoding || 'utf8';
  }

  if (buffer) {
    encoding = null;
  }

  let len = 0;
  const ret = [];
  const stream = new PassThrough$2({
    objectMode
  });

  if (encoding) {
    stream.setEncoding(encoding);
  }

  stream.on('data', chunk => {
    ret.push(chunk);

    if (objectMode) {
      len = ret.length;
    } else {
      len += chunk.length;
    }
  });

  stream.getBufferedValue = () => {
    if (array) {
      return ret;
    }

    return buffer ? Buffer.concat(ret, len) : ret.join('');
  };

  stream.getBufferedLength = () => len;

  return stream;
};

function getStream(inputStream, opts) {
  if (!inputStream) {
    return Promise.reject(new Error('Expected a stream'));
  }

  opts = Object.assign({
    maxBuffer: Infinity
  }, opts);
  const maxBuffer = opts.maxBuffer;
  let stream;
  let clean;
  const p = new Promise((resolve, reject) => {
    const error = err => {
      if (err) {
        // null check
        err.bufferedData = stream.getBufferedValue();
      }

      reject(err);
    };

    stream = bufferStream(opts);
    inputStream.once('error', error);
    inputStream.pipe(stream);
    stream.on('data', () => {
      if (stream.getBufferedLength() > maxBuffer) {
        reject(new Error('maxBuffer exceeded'));
      }
    });
    stream.once('error', error);
    stream.on('end', resolve);

    clean = () => {
      // some streams doesn't implement the `stream.Readable` interface correctly
      if (inputStream.unpipe) {
        inputStream.unpipe(stream);
      }
    };
  });
  p.then(clean, clean);
  return p.then(() => stream.getBufferedValue());
}

var getStream_1 = getStream;

var buffer$1 = (stream, opts) => getStream(stream, Object.assign({}, opts, {
  encoding: 'buffer'
}));

var array = (stream, opts) => getStream(stream, Object.assign({}, opts, {
  array: true
}));
getStream_1.buffer = buffer$1;
getStream_1.array = array;

var timedOut = function (req, time) {
  if (req.timeoutTimer) {
    return req;
  }

  var delays = isNaN(time) ? time : {
    socket: time,
    connect: time
  };
  var host = req._headers ? ' to ' + req._headers.host : '';

  if (delays.connect !== undefined) {
    req.timeoutTimer = setTimeout(function timeoutHandler() {
      req.abort();
      var e = new Error('Connection timed out on request' + host);
      e.code = 'ETIMEDOUT';
      req.emit('error', e);
    }, delays.connect);
  } // Clear the connection timeout timer once a socket is assigned to the
  // request and is connected.


  req.on('socket', function assign(socket) {
    // Socket may come from Agent pool and may be already connected.
    if (!(socket.connecting || socket._connecting)) {
      connect();
      return;
    }

    socket.once('connect', connect);
  });

  function clear() {
    if (req.timeoutTimer) {
      clearTimeout(req.timeoutTimer);
      req.timeoutTimer = null;
    }
  }

  function connect() {
    clear();

    if (delays.socket !== undefined) {
      // Abort the request if there is no activity on the socket for more
      // than `delays.socket` milliseconds.
      req.setTimeout(delays.socket, function socketTimeoutHandler() {
        req.abort();
        var e = new Error('Socket timed out on request' + host);
        e.code = 'ESOCKETTIMEDOUT';
        req.emit('error', e);
      });
    }
  }

  return req.on('error', clear);
};

var prependHttp = function (url) {
  if (typeof url !== 'string') {
    throw new TypeError('Expected a string, got ' + typeof url);
  }

  url = url.trim();

  if (/^\.*\/|^(?!localhost)\w+:/.test(url)) {
    return url;
  }

  return url.replace(/^(?!(?:\w+:)?\/\/)/, 'http://');
};

var urlParseLax = function (x) {
  var withProtocol = prependHttp(x);
  var parsed = Url.parse(withProtocol);

  if (withProtocol !== x) {
    parsed.protocol = null;
  }

  return parsed;
};

function urlToOptions(url) {
  var options = {
    protocol: url.protocol,
    hostname: url.hostname,
    hash: url.hash,
    search: url.search,
    pathname: url.pathname,
    path: `${url.pathname}${url.search}`,
    href: url.href
  };

  if (url.port !== '') {
    options.port = Number(url.port);
  }

  if (url.username || url.password) {
    options.auth = `${url.username}:${url.password}`;
  }

  return options;
}

var urlToOptions_1 = urlToOptions;

var lowercaseKeys = function (obj) {
  var ret = {};
  var keys = Object.keys(Object(obj));

  for (var i = 0; i < keys.length; i++) {
    ret[keys[i].toLowerCase()] = obj[keys[i]];
  }

  return ret;
};

// even if they would move up the prototype chain
// https://nodejs.org/api/http.html#http_class_http_incomingmessage

const knownProps = ['destroy', 'setTimeout', 'socket', 'headers', 'trailers', 'rawHeaders', 'statusCode', 'httpVersion', 'httpVersionMinor', 'httpVersionMajor', 'rawTrailers', 'statusMessage'];

var mimicResponse = (fromStream, toStream) => {
  const fromProps = new Set(Object.keys(fromStream).concat(knownProps));

  for (const prop of fromProps) {
    // Don't overwrite existing properties
    if (prop in toStream) {
      continue;
    }

    toStream[prop] = typeof fromStream[prop] === 'function' ? fromStream[prop].bind(fromStream) : fromStream[prop];
  }
};

const PassThrough$3 = Stream$1.PassThrough;





var decompressResponse = response => {
  // TODO: Use Array#includes when targeting Node.js 6
  if (['gzip', 'deflate'].indexOf(response.headers['content-encoding']) === -1) {
    return response;
  }

  const unzip = zlib.createUnzip();
  const stream = new PassThrough$3();
  mimicResponse(response, stream);
  unzip.on('error', err => {
    if (err.code === 'Z_BUF_ERROR') {
      stream.end();
      return;
    }

    stream.emit('error', err);
  });
  response.pipe(unzip).pipe(stream);
  return stream;
};

var WHITELIST = ['ETIMEDOUT', 'ECONNRESET', 'EADDRINUSE', 'ESOCKETTIMEDOUT', 'ECONNREFUSED', 'EPIPE'];
var BLACKLIST = ['ENOTFOUND', 'ENETUNREACH', // SSL errors from https://github.com/nodejs/node/blob/ed3d8b13ee9a705d89f9e0397d9e96519e7e47ac/src/node_crypto.cc#L1950
'UNABLE_TO_GET_ISSUER_CERT', 'UNABLE_TO_GET_CRL', 'UNABLE_TO_DECRYPT_CERT_SIGNATURE', 'UNABLE_TO_DECRYPT_CRL_SIGNATURE', 'UNABLE_TO_DECODE_ISSUER_PUBLIC_KEY', 'CERT_SIGNATURE_FAILURE', 'CRL_SIGNATURE_FAILURE', 'CERT_NOT_YET_VALID', 'CERT_HAS_EXPIRED', 'CRL_NOT_YET_VALID', 'CRL_HAS_EXPIRED', 'ERROR_IN_CERT_NOT_BEFORE_FIELD', 'ERROR_IN_CERT_NOT_AFTER_FIELD', 'ERROR_IN_CRL_LAST_UPDATE_FIELD', 'ERROR_IN_CRL_NEXT_UPDATE_FIELD', 'OUT_OF_MEM', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_CHAIN_TOO_LONG', 'CERT_REVOKED', 'INVALID_CA', 'PATH_LENGTH_EXCEEDED', 'INVALID_PURPOSE', 'CERT_UNTRUSTED', 'CERT_REJECTED'];

var isRetryAllowed = function (err) {
  if (!err || !err.code) {
    return true;
  }

  if (WHITELIST.indexOf(err.code) !== -1) {
    return true;
  }

  if (BLACKLIST.indexOf(err.code) !== -1) {
    return false;
  }

  return true;
};

var safeBuffer = createCommonjsModule(function (module, exports) {
/* eslint-disable node/no-deprecated-api */


var Buffer = buffer$2.Buffer; // alternative to using Object.keys for old browsers

function copyProps(src, dst) {
  for (var key in src) {
    dst[key] = src[key];
  }
}

if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer$2;
} else {
  // Copy properties from require('buffer')
  copyProps(buffer$2, exports);
  exports.Buffer = SafeBuffer;
}

function SafeBuffer(arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length);
}

SafeBuffer.prototype = Object.create(Buffer.prototype); // Copy static methods from Buffer

copyProps(Buffer, SafeBuffer);

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number');
  }

  return Buffer(arg, encodingOrOffset, length);
};

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number');
  }

  var buf = Buffer(size);

  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding);
    } else {
      buf.fill(fill);
    }
  } else {
    buf.fill(0);
  }

  return buf;
};

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number');
  }

  return Buffer(size);
};

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number');
  }

  return buffer$2.SlowBuffer(size);
};
});
var safeBuffer_1 = safeBuffer.Buffer;

/**
 * @file Tests if ES6 Symbol is supported.
 * @version 1.4.2
 * @author Xotic750 <Xotic750@gmail.com>
 * @copyright  Xotic750
 * @license {@link <https://opensource.org/licenses/MIT> MIT}
 * @module has-symbol-support-x
 */
/**
 * Indicates if `Symbol`exists and creates the correct type.
 * `true`, if it exists and creates the correct type, otherwise `false`.
 *
 * @type boolean
 */

var hasSymbolSupportX = typeof Symbol === 'function' && typeof Symbol('') === 'symbol';

/**
 * Indicates if `Symbol.toStringTag`exists and is the correct type.
 * `true`, if it exists and is the correct type, otherwise `false`.
 *
 * @type boolean
 */

var hasToStringTagX = hasSymbolSupportX && typeof Symbol.toStringTag === 'symbol';

var isObject$2 = function isObject(x) {
  return typeof x === "object" && x !== null;
};

const toString = Object.prototype.toString;
const urlClass = "[object URL]";
const hash = "hash";
const host = "host";
const hostname = "hostname";
const href = "href";
const password = "password";
const pathname = "pathname";
const port = "port";
const protocol = "protocol";
const search = "search";
const username = "username";

const isURL = (url, supportIncomplete
/*=false*/
) => {
  if (!isObject$2(url)) return false; // Native implementation in older browsers

  if (!hasToStringTagX && toString.call(url) === urlClass) return true;
  if (!(href in url)) return false;
  if (!(protocol in url)) return false;
  if (!(username in url)) return false;
  if (!(password in url)) return false;
  if (!(hostname in url)) return false;
  if (!(port in url)) return false;
  if (!(host in url)) return false;
  if (!(pathname in url)) return false;
  if (!(search in url)) return false;
  if (!(hash in url)) return false;

  if (supportIncomplete !== true) {
    if (!isObject$2(url.searchParams)) return false; // TODO :: write a separate isURLSearchParams ?
  }

  return true;
};

isURL.lenient = url => {
  return isURL(url, true);
};

var isurl = isURL;

var toString$1 = Object.prototype.toString;

var isPlainObj = function (x) {
  var prototype;
  return toString$1.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
};

class CancelError extends Error {
  constructor() {
    super('Promise was canceled');
    this.name = 'CancelError';
  }

}

class PCancelable {
  static fn(fn) {
    return function () {
      const args = [].slice.apply(arguments);
      return new PCancelable((onCancel, resolve, reject) => {
        args.unshift(onCancel);
        fn.apply(null, args).then(resolve, reject);
      });
    };
  }

  constructor(executor) {
    this._pending = true;
    this._canceled = false;
    this._promise = new Promise((resolve, reject) => {
      this._reject = reject;
      return executor(fn => {
        this._cancel = fn;
      }, val => {
        this._pending = false;
        resolve(val);
      }, err => {
        this._pending = false;
        reject(err);
      });
    });
  }

  then() {
    return this._promise.then.apply(this._promise, arguments);
  }

  catch() {
    return this._promise.catch.apply(this._promise, arguments);
  }

  cancel() {
    if (!this._pending || this._canceled) {
      return;
    }

    if (typeof this._cancel === 'function') {
      try {
        this._cancel();
      } catch (err) {
        this._reject(err);
      }
    }

    this._canceled = true;

    this._reject(new CancelError());
  }

  get canceled() {
    return this._canceled;
  }

}

Object.setPrototypeOf(PCancelable.prototype, Promise.prototype);
var pCancelable = PCancelable;
var CancelError_1 = CancelError;
pCancelable.CancelError = CancelError_1;

var pFinally = (promise, onFinally) => {
  onFinally = onFinally || (() => {});

  return promise.then(val => new Promise(resolve => {
    resolve(onFinally());
  }).then(() => val), err => new Promise(resolve => {
    resolve(onFinally());
  }).then(() => {
    throw err;
  }));
};

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }

}

var pTimeout = (promise, ms, fallback) => new Promise((resolve, reject) => {
  if (typeof ms !== 'number' || ms < 0) {
    throw new TypeError('Expected `ms` to be a positive number');
  }

  const timer = setTimeout(() => {
    if (typeof fallback === 'function') {
      resolve(fallback());
      return;
    }

    const message = typeof fallback === 'string' ? fallback : `Promise timed out after ${ms} milliseconds`;
    const err = fallback instanceof Error ? fallback : new TimeoutError(message);
    reject(err);
  }, ms);
  pFinally(promise.then(resolve, reject), () => {
    clearTimeout(timer);
  });
});

var TimeoutError_1 = TimeoutError;
pTimeout.TimeoutError = TimeoutError_1;

var name = "got";
var version = "7.1.0";
var description = "Simplified HTTP requests";
var license = "MIT";
var repository = "sindresorhus/got";
var maintainers = [
	{
		name: "Sindre Sorhus",
		email: "sindresorhus@gmail.com",
		url: "sindresorhus.com"
	},
	{
		name: "Vsevolod Strukchinsky",
		email: "floatdrop@gmail.com",
		url: "github.com/floatdrop"
	},
	{
		name: "Alexander Tesfamichael",
		email: "alex.tesfamichael@gmail.com",
		url: "alextes.me"
	}
];
var engines = {
	node: ">=4"
};
var scripts = {
	test: "xo && nyc ava",
	coveralls: "nyc report --reporter=text-lcov | coveralls"
};
var files = [
	"index.js"
];
var keywords = [
	"http",
	"https",
	"get",
	"got",
	"url",
	"uri",
	"request",
	"util",
	"utility",
	"simple",
	"curl",
	"wget",
	"fetch",
	"net",
	"network",
	"electron"
];
var dependencies = {
	"decompress-response": "^3.2.0",
	duplexer3: "^0.1.4",
	"get-stream": "^3.0.0",
	"is-plain-obj": "^1.1.0",
	"is-retry-allowed": "^1.0.0",
	"is-stream": "^1.0.0",
	isurl: "^1.0.0-alpha5",
	"lowercase-keys": "^1.0.0",
	"p-cancelable": "^0.3.0",
	"p-timeout": "^1.1.1",
	"safe-buffer": "^5.0.1",
	"timed-out": "^4.0.0",
	"url-parse-lax": "^1.0.0",
	"url-to-options": "^1.0.1"
};
var devDependencies = {
	ava: "^0.20.0",
	coveralls: "^2.11.4",
	"form-data": "^2.1.1",
	"get-port": "^3.0.0",
	"into-stream": "^3.0.0",
	nyc: "^11.0.2",
	pem: "^1.4.4",
	pify: "^3.0.0",
	tempfile: "^2.0.0",
	tempy: "^0.1.0",
	"universal-url": "^1.0.0-alpha",
	xo: "^0.18.0"
};
var ava = {
	concurrency: 4
};
var browser = {
	"decompress-response": false
};
var _package = {
	name: name,
	version: version,
	description: description,
	license: license,
	repository: repository,
	maintainers: maintainers,
	engines: engines,
	scripts: scripts,
	files: files,
	keywords: keywords,
	dependencies: dependencies,
	devDependencies: devDependencies,
	ava: ava,
	browser: browser
};

var _package$1 = /*#__PURE__*/Object.freeze({
	name: name,
	version: version,
	description: description,
	license: license,
	repository: repository,
	maintainers: maintainers,
	engines: engines,
	scripts: scripts,
	files: files,
	keywords: keywords,
	dependencies: dependencies,
	devDependencies: devDependencies,
	ava: ava,
	browser: browser,
	'default': _package
});

var pkg = getCjsExportFromNamespace(_package$1);

const PassThrough$4 = Stream$1.PassThrough;























const Buffer$1 = safeBuffer.Buffer;











const getMethodRedirectCodes = new Set([300, 301, 302, 303, 304, 305, 307, 308]);
const allMethodRedirectCodes = new Set([300, 303, 307, 308]);

function requestAsEventEmitter(opts) {
  opts = opts || {};
  const ee = new events();
  const requestUrl = opts.href || Url.resolve(Url.format(opts), opts.path);
  const redirects = [];
  let retryCount = 0;
  let redirectUrl;

  const get = opts => {
    if (opts.protocol !== 'http:' && opts.protocol !== 'https:') {
      ee.emit('error', new got.UnsupportedProtocolError(opts));
      return;
    }

    let fn = opts.protocol === 'https:' ? https : http;

    if (opts.useElectronNet && process.versions.electron) {
      const electron$1 = electron;

      fn = electron$1.net || electron$1.remote.net;
    }

    const req = fn.request(opts, res => {
      const statusCode = res.statusCode;
      res.url = redirectUrl || requestUrl;
      res.requestUrl = requestUrl;
      const followRedirect = opts.followRedirect && 'location' in res.headers;
      const redirectGet = followRedirect && getMethodRedirectCodes.has(statusCode);
      const redirectAll = followRedirect && allMethodRedirectCodes.has(statusCode);

      if (redirectAll || redirectGet && (opts.method === 'GET' || opts.method === 'HEAD')) {
        res.resume();

        if (statusCode === 303) {
          // Server responded with "see other", indicating that the resource exists at another location,
          // and the client should request it from that location via GET or HEAD.
          opts.method = 'GET';
        }

        if (redirects.length >= 10) {
          ee.emit('error', new got.MaxRedirectsError(statusCode, redirects, opts), null, res);
          return;
        }

        const bufferString = Buffer$1.from(res.headers.location, 'binary').toString();
        redirectUrl = Url.resolve(Url.format(opts), bufferString);
        redirects.push(redirectUrl);
        const redirectOpts = Object.assign({}, opts, Url.parse(redirectUrl));
        ee.emit('redirect', res, redirectOpts);
        get(redirectOpts);
        return;
      }

      setImmediate(() => {
        const response = opts.decompress === true && typeof decompressResponse === 'function' && req.method !== 'HEAD' ? decompressResponse(res) : res;

        if (!opts.decompress && ['gzip', 'deflate'].indexOf(res.headers['content-encoding']) !== -1) {
          opts.encoding = null;
        }

        response.redirectUrls = redirects;
        ee.emit('response', response);
      });
    });
    req.once('error', err => {
      const backoff = opts.retries(++retryCount, err);

      if (backoff) {
        setTimeout(get, backoff, opts);
        return;
      }

      ee.emit('error', new got.RequestError(err, opts));
    });

    if (opts.gotTimeout) {
      timedOut(req, opts.gotTimeout);
    }

    setImmediate(() => {
      ee.emit('request', req);
    });
  };

  setImmediate(() => {
    get(opts);
  });
  return ee;
}

function asPromise(opts) {
  const timeoutFn = requestPromise => opts.gotTimeout && opts.gotTimeout.request ? pTimeout(requestPromise, opts.gotTimeout.request, new got.RequestError({
    message: 'Request timed out',
    code: 'ETIMEDOUT'
  }, opts)) : requestPromise;

  return timeoutFn(new pCancelable((onCancel, resolve, reject) => {
    const ee = requestAsEventEmitter(opts);
    let cancelOnRequest = false;
    onCancel(() => {
      cancelOnRequest = true;
    });
    ee.on('request', req => {
      if (cancelOnRequest) {
        req.abort();
      }

      onCancel(() => {
        req.abort();
      });

      if (isStream_1(opts.body)) {
        opts.body.pipe(req);
        opts.body = undefined;
        return;
      }

      req.end(opts.body);
    });
    ee.on('response', res => {
      const stream = opts.encoding === null ? getStream_1.buffer(res) : getStream_1(res, opts);
      stream.catch(err => reject(new got.ReadError(err, opts))).then(data => {
        const statusCode = res.statusCode;
        const limitStatusCode = opts.followRedirect ? 299 : 399;
        res.body = data;

        if (opts.json && res.body) {
          try {
            res.body = JSON.parse(res.body);
          } catch (e) {
            if (statusCode >= 200 && statusCode < 300) {
              throw new got.ParseError(e, statusCode, opts, data);
            }
          }
        }

        if (statusCode !== 304 && (statusCode < 200 || statusCode > limitStatusCode)) {
          throw new got.HTTPError(statusCode, res.headers, opts);
        }

        resolve(res);
      }).catch(err => {
        Object.defineProperty(err, 'response', {
          value: res
        });
        reject(err);
      });
    });
    ee.on('error', reject);
  }));
}

function asStream(opts) {
  const input = new PassThrough$4();
  const output = new PassThrough$4();
  const proxy = duplexer3(input, output);
  let timeout;

  if (opts.gotTimeout && opts.gotTimeout.request) {
    timeout = setTimeout(() => {
      proxy.emit('error', new got.RequestError({
        message: 'Request timed out',
        code: 'ETIMEDOUT'
      }, opts));
    }, opts.gotTimeout.request);
  }

  if (opts.json) {
    throw new Error('got can not be used as stream when options.json is used');
  }

  if (opts.body) {
    proxy.write = () => {
      throw new Error('got\'s stream is not writable when options.body is used');
    };
  }

  const ee = requestAsEventEmitter(opts);
  ee.on('request', req => {
    proxy.emit('request', req);

    if (isStream_1(opts.body)) {
      opts.body.pipe(req);
      return;
    }

    if (opts.body) {
      req.end(opts.body);
      return;
    }

    if (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH') {
      input.pipe(req);
      return;
    }

    req.end();
  });
  ee.on('response', res => {
    clearTimeout(timeout);
    const statusCode = res.statusCode;
    res.pipe(output);

    if (statusCode !== 304 && (statusCode < 200 || statusCode > 299)) {
      proxy.emit('error', new got.HTTPError(statusCode, res.headers, opts), null, res);
      return;
    }

    proxy.emit('response', res);
  });
  ee.on('redirect', proxy.emit.bind(proxy, 'redirect'));
  ee.on('error', proxy.emit.bind(proxy, 'error'));
  return proxy;
}

function normalizeArguments(url, opts) {
  if (typeof url !== 'string' && typeof url !== 'object') {
    throw new TypeError(`Parameter \`url\` must be a string or object, not ${typeof url}`);
  } else if (typeof url === 'string') {
    url = url.replace(/^unix:/, 'http://$&');
    url = urlParseLax(url);
  } else if (isurl.lenient(url)) {
    url = urlToOptions_1(url);
  }

  if (url.auth) {
    throw new Error('Basic authentication must be done with auth option');
  }

  opts = Object.assign({
    path: '',
    retries: 2,
    decompress: true,
    useElectronNet: true
  }, url, {
    protocol: url.protocol || 'http:' // Override both null/undefined with default protocol

  }, opts);
  opts.headers = Object.assign({
    'user-agent': `${pkg.name}/${pkg.version} (https://github.com/sindresorhus/got)`,
    'accept-encoding': 'gzip,deflate'
  }, lowercaseKeys(opts.headers));
  const query = opts.query;

  if (query) {
    if (typeof query !== 'string') {
      opts.query = querystring.stringify(query);
    }

    opts.path = `${opts.path.split('?')[0]}?${opts.query}`;
    delete opts.query;
  }

  if (opts.json && opts.headers.accept === undefined) {
    opts.headers.accept = 'application/json';
  }

  const body = opts.body;

  if (body !== null && body !== undefined) {
    const headers = opts.headers;

    if (!isStream_1(body) && typeof body !== 'string' && !Buffer$1.isBuffer(body) && !(opts.form || opts.json)) {
      throw new TypeError('options.body must be a ReadableStream, string, Buffer or plain Object');
    }

    const canBodyBeStringified = isPlainObj(body) || Array.isArray(body);

    if ((opts.form || opts.json) && !canBodyBeStringified) {
      throw new TypeError('options.body must be a plain Object or Array when options.form or options.json is used');
    }

    if (isStream_1(body) && typeof body.getBoundary === 'function') {
      // Special case for https://github.com/form-data/form-data
      headers['content-type'] = headers['content-type'] || `multipart/form-data; boundary=${body.getBoundary()}`;
    } else if (opts.form && canBodyBeStringified) {
      headers['content-type'] = headers['content-type'] || 'application/x-www-form-urlencoded';
      opts.body = querystring.stringify(body);
    } else if (opts.json && canBodyBeStringified) {
      headers['content-type'] = headers['content-type'] || 'application/json';
      opts.body = JSON.stringify(body);
    }

    if (headers['content-length'] === undefined && headers['transfer-encoding'] === undefined && !isStream_1(body)) {
      const length = typeof opts.body === 'string' ? Buffer$1.byteLength(opts.body) : opts.body.length;
      headers['content-length'] = length;
    }

    opts.method = (opts.method || 'POST').toUpperCase();
  } else {
    opts.method = (opts.method || 'GET').toUpperCase();
  }

  if (opts.hostname === 'unix') {
    const matches = /(.+?):(.+)/.exec(opts.path);

    if (matches) {
      opts.socketPath = matches[1];
      opts.path = matches[2];
      opts.host = null;
    }
  }

  if (typeof opts.retries !== 'function') {
    const retries = opts.retries;

    opts.retries = (iter, err) => {
      if (iter > retries || !isRetryAllowed(err)) {
        return 0;
      }

      const noise = Math.random() * 100;
      return (1 << iter) * 1000 + noise;
    };
  }

  if (opts.followRedirect === undefined) {
    opts.followRedirect = true;
  }

  if (opts.timeout) {
    if (typeof opts.timeout === 'number') {
      opts.gotTimeout = {
        request: opts.timeout
      };
    } else {
      opts.gotTimeout = opts.timeout;
    }

    delete opts.timeout;
  }

  return opts;
}

function got(url, opts) {
  try {
    return asPromise(normalizeArguments(url, opts));
  } catch (err) {
    return Promise.reject(err);
  }
}

got.stream = (url, opts) => asStream(normalizeArguments(url, opts));

const methods = ['get', 'post', 'put', 'patch', 'head', 'delete'];

for (const method of methods) {
  got[method] = (url, opts) => got(url, Object.assign({}, opts, {
    method
  }));

  got.stream[method] = (url, opts) => got.stream(url, Object.assign({}, opts, {
    method
  }));
}

class StdError extends Error {
  constructor(message, error, opts) {
    super(message);
    this.name = 'StdError';

    if (error.code !== undefined) {
      this.code = error.code;
    }

    Object.assign(this, {
      host: opts.host,
      hostname: opts.hostname,
      method: opts.method,
      path: opts.path,
      protocol: opts.protocol,
      url: opts.href
    });
  }

}

got.RequestError = class extends StdError {
  constructor(error, opts) {
    super(error.message, error, opts);
    this.name = 'RequestError';
  }

};
got.ReadError = class extends StdError {
  constructor(error, opts) {
    super(error.message, error, opts);
    this.name = 'ReadError';
  }

};
got.ParseError = class extends StdError {
  constructor(error, statusCode, opts, data) {
    super(`${error.message} in "${Url.format(opts)}": \n${data.slice(0, 77)}...`, error, opts);
    this.name = 'ParseError';
    this.statusCode = statusCode;
    this.statusMessage = http.STATUS_CODES[this.statusCode];
  }

};
got.HTTPError = class extends StdError {
  constructor(statusCode, headers, opts) {
    const statusMessage = http.STATUS_CODES[statusCode];
    super(`Response code ${statusCode} (${statusMessage})`, {}, opts);
    this.name = 'HTTPError';
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
    this.headers = headers;
  }

};
got.MaxRedirectsError = class extends StdError {
  constructor(statusCode, redirectUrls, opts) {
    super('Redirected 10 times. Aborting.', {}, opts);
    this.name = 'MaxRedirectsError';
    this.statusCode = statusCode;
    this.statusMessage = http.STATUS_CODES[this.statusCode];
    this.redirectUrls = redirectUrls;
  }

};
got.UnsupportedProtocolError = class extends StdError {
  constructor(opts) {
    super(`Unsupported protocol "${opts.protocol}"`, {}, opts);
    this.name = 'UnsupportedProtocolError';
  }

};
var got_1 = got;

/**
 * createContentDigest() Encrypts an input using md5 hash of hexadecimal digest.
 *
 * @param {Object|String|Array} input - The input to encrypt
 *
 * @return {String} - The content digest
 */


const createContentDigest = input => {
  const content = typeof input !== `string` ? JSON.stringify(input) : input;
  return crypto.createHash(`md5`).update(content).digest(`hex`);
};

var createContentDigest_1 = createContentDigest;

var createContentDigest$1 = createContentDigest_1;

var utils$1 = {
	createContentDigest: createContentDigest$1
};

var createContentDigest$2 = input => {
  try {
    const {
      createContentDigest
    } = utils$1;

    return createContentDigest(input);
  } catch (e) {
    const content = typeof input !== `string` ? JSON.stringify(input) : input;
    return crypto.createHash(`md5`).update(content).digest(`hex`);
  }
};

var fallback = {
	createContentDigest: createContentDigest$2
};

var validUrl = createCommonjsModule(function (module) {
(function (module) {

  module.exports.is_uri = is_iri;
  module.exports.is_http_uri = is_http_iri;
  module.exports.is_https_uri = is_https_iri;
  module.exports.is_web_uri = is_web_iri; // Create aliases

  module.exports.isUri = is_iri;
  module.exports.isHttpUri = is_http_iri;
  module.exports.isHttpsUri = is_https_iri;
  module.exports.isWebUri = is_web_iri; // private function
  // internal URI spitter method - direct from RFC 3986

  var splitUri = function (uri) {
    var splitted = uri.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);
    return splitted;
  };

  function is_iri(value) {
    if (!value) {
      return;
    } // check for illegal characters


    if (/[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(value)) return; // check for hex escapes that aren't complete

    if (/%[^0-9a-f]/i.test(value)) return;
    if (/%[0-9a-f](:?[^0-9a-f]|$)/i.test(value)) return;
    var splitted = [];
    var scheme = '';
    var authority = '';
    var path = '';
    var query = '';
    var fragment = '';
    var out = ''; // from RFC 3986

    splitted = splitUri(value);
    scheme = splitted[1];
    authority = splitted[2];
    path = splitted[3];
    query = splitted[4];
    fragment = splitted[5]; // scheme and path are required, though the path can be empty

    if (!(scheme && scheme.length && path.length >= 0)) return; // if authority is present, the path must be empty or begin with a /

    if (authority && authority.length) {
      if (!(path.length === 0 || /^\//.test(path))) return;
    } else {
      // if authority is not present, the path must not start with //
      if (/^\/\//.test(path)) return;
    } // scheme must begin with a letter, then consist of letters, digits, +, ., or -


    if (!/^[a-z][a-z0-9\+\-\.]*$/.test(scheme.toLowerCase())) return; // re-assemble the URL per section 5.3 in RFC 3986

    out += scheme + ':';

    if (authority && authority.length) {
      out += '//' + authority;
    }

    out += path;

    if (query && query.length) {
      out += '?' + query;
    }

    if (fragment && fragment.length) {
      out += '#' + fragment;
    }

    return out;
  }

  function is_http_iri(value, allowHttps) {
    if (!is_iri(value)) {
      return;
    }

    var splitted = [];
    var scheme = '';
    var authority = '';
    var path = '';
    var port = '';
    var query = '';
    var fragment = '';
    var out = ''; // from RFC 3986

    splitted = splitUri(value);
    scheme = splitted[1];
    authority = splitted[2];
    path = splitted[3];
    query = splitted[4];
    fragment = splitted[5];
    if (!scheme) return;

    if (allowHttps) {
      if (scheme.toLowerCase() != 'https') return;
    } else {
      if (scheme.toLowerCase() != 'http') return;
    } // fully-qualified URIs must have an authority section that is
    // a valid host


    if (!authority) {
      return;
    } // enable port component


    if (/:(\d+)$/.test(authority)) {
      port = authority.match(/:(\d+)$/)[0];
      authority = authority.replace(/:\d+$/, '');
    }

    out += scheme + ':';
    out += '//' + authority;

    if (port) {
      out += port;
    }

    out += path;

    if (query && query.length) {
      out += '?' + query;
    }

    if (fragment && fragment.length) {
      out += '#' + fragment;
    }

    return out;
  }

  function is_https_iri(value) {
    return is_http_iri(value, true);
  }

  function is_web_iri(value) {
    return is_http_iri(value) || is_https_iri(value);
  }
})(module);
});

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof options == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }

  options = options || {};
  var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid_1(rnds);
}

var v4_1 = v4;

var uuid = v4_1;
uuid.v1 = v1_1;
uuid.v4 = v4_1;
var uuid_1 = uuid;

var nodeEta = Eta;

function Eta(count, options) {
  this.count = count;
  var optionsNumberFormatter = options && options.numberFormatter;
  this.numberFormatter = typeof optionsNumberFormatter == 'function' ? optionsNumberFormatter : formatNumber;

  if (options && options.autoStart || options === true) {
    this.start();
  }
}

Eta.prototype.start = function () {
  this.done = 0;
  this.startedAt = new Date();
};

Eta.prototype.iterate = function (anything) {
  this.done++;

  if (anything) {
    this.last = util$1.format.apply(this, arguments);
  }
};

Eta.prototype.format = function () {
  var layout = util$1.format.apply(this, arguments);
  var elapsed = (new Date() - this.startedAt) / 1000;
  var rate = this.done / elapsed;
  var estimated = this.count / rate;
  var progress = this.done / this.count;
  var eta = estimated - elapsed;
  var etah = secondsToStr(eta);
  var fields = {
    elapsed: elapsed,
    rate: rate,
    estimated: estimated,
    progress: progress,
    eta: eta,
    etah: etah,
    last: this.last
  };
  return layout.replace(/{{\S+?}}/g, function (match) {
    var key = match.slice(2, match.length - 2);
    var value = fields[key] || '';
    return typeof value == 'number' ? value.toPrecision(4) : value;
  });
};

function secondsToStr(seconds) {
  return millisecondsToStr(seconds * 1000);
} // http://stackoverflow.com/a/8212878


function millisecondsToStr(milliseconds) {
  // TIP: to find current time in milliseconds, use:
  // var  current_time_milliseconds = new Date().getTime();
  function numberEnding(number) {
    return number > 1 ? 's' : '';
  }

  var temp = Math.floor(milliseconds / 1000);
  var years = Math.floor(temp / 31536000);

  if (years) {
    return years + ' year' + numberEnding(years);
  } //TODO: Months! Maybe weeks? 


  var days = Math.floor((temp %= 31536000) / 86400);

  if (days) {
    return days + ' day' + numberEnding(days);
  }

  var hours = Math.floor((temp %= 86400) / 3600);

  if (hours) {
    return hours + ' hour' + numberEnding(hours);
  }

  var minutes = Math.floor((temp %= 3600) / 60);

  if (minutes) {
    return minutes + ' minute' + numberEnding(minutes);
  }

  var seconds = temp % 60;

  if (seconds) {
    return seconds + ' second' + numberEnding(seconds);
  }

  return 'less than a second'; //'just now' //or other string you like;
}

function formatNumber(it) {
  return it.toPrecision(4);
}

var EE = events.EventEmitter;



function Ticket(opts) {
  this.isAccepted = false;
  this.isQueued = false;
  this.isStarted = false;
  this.isFailed = false;
  this.isFinished = false;
  this.result = null;
  this.status = 'created';
  this.eta = new nodeEta();
}

util$1.inherits(Ticket, EE);

Ticket.prototype.accept = function () {
  this.status = 'accepted';
  this.isAccepted = true;
  this.emit('accepted');
};

Ticket.prototype.queued = function () {
  this.status = 'queued';
  this.isQueued = true;
  this.emit('queued');
};

Ticket.prototype.unqueued = function () {
  this.status = 'accepted';
  this.isQueued = false;
  this.emit('unqueued');
};

Ticket.prototype.started = function () {
  this.eta.count = 1;
  this.eta.start();
  this.isStarted = true;
  this.status = 'in-progress';
  this.emit('started');
};

Ticket.prototype.failed = function (msg) {
  this.isFailed = true;
  this.isFinished = true;
  this.status = 'failed';
  this.emit('failed', msg);
};

Ticket.prototype.finish = function (result) {
  this.eta.done = this.eta.count;
  this.isFinished = true;
  this.status = 'finished';
  this.result = result;
  this.emit('finish', this.result);
};

Ticket.prototype.stopped = function () {
  this.eta = new nodeEta();
  this.isFinished = false;
  this.isStarted = false;
  this.status = 'queued';
  this.result = null;
  this.emit('stopped');
};

Ticket.prototype.progress = function (progress) {
  this.eta.done = progress.complete;
  this.eta.count = progress.total;
  this.emit('progress', {
    complete: this.eta.done,
    total: this.eta.count,
    pct: this.eta.done / this.eta.count * 100,
    eta: this.eta.format('{{etah}}'),
    message: progress.message
  });
};

var ticket = Ticket;

var EE$1 = events.EventEmitter;



function Worker(opts) {
  this.fn = opts.fn;
  this.batch = opts.batch;
  this.single = opts.single;
  this.active = false;
  this.cancelled = false;
  this.failTaskOnProcessException = opts.failTaskOnProcessException;
}

util$1.inherits(Worker, EE$1);

Worker.prototype.setup = function () {
  var self = this; // Internal

  self._taskIds = Object.keys(self.batch);
  self._process = {};
  self._waiting = {};
  self._eta = new nodeEta(); // Task counts

  self.counts = {
    finished: 0,
    failed: 0,
    completed: 0,
    total: self._taskIds.length
  }; // Progress

  self.status = 'ready';
  self.progress = {
    tasks: {},
    complete: 0,
    total: self._taskIds.length,
    eta: ''
  }; // Setup

  self._taskIds.forEach(function (taskId, id) {
    self._waiting[id] = true;
    self.progress.tasks[id] = {
      pct: 0,
      complete: 0,
      total: 1
    };
  });
};

Worker.prototype.start = function () {
  var self = this;
  if (self.active) return;
  self.setup();
  self._eta.count = self.progress.total;

  self._eta.start();

  self.active = true;
  self.status = 'in-progress';

  var tasks = self._taskIds.map(function (taskId) {
    return self.batch[taskId];
  });

  if (self.single) {
    tasks = tasks[0];
  }

  try {
    self._process = self.fn.call(self, tasks, function (err, result) {
      if (!self.active) return;

      if (err) {
        self.failedBatch(err);
      } else {
        self.finishBatch(result);
      }
    });
  } catch (err) {
    if (self.failTaskOnProcessException) {
      self.failedBatch(err);
    } else {
      throw new Error(err);
    }
  }

  self._process = self._process || {};
};

Worker.prototype.end = function () {
  if (!this.active) return;
  this.status = 'finished';
  this.active = false;
  this.emit('end');
};

Worker.prototype.resume = function () {
  if (typeof this._process.resume === 'function') {
    this._process.resume();
  }

  this.status = 'in-progress';
};

Worker.prototype.pause = function () {
  if (typeof this._process.pause === 'function') {
    this._process.pause();
  }

  this.status = 'paused';
};

Worker.prototype.cancel = function () {
  this.cancelled = true;

  if (typeof this._process.cancel === 'function') {
    this._process.cancel();
  }

  if (typeof this._process.abort === 'function') {
    this._process.abort();
  }

  this.failedBatch('cancelled');
};

Worker.prototype.failedBatch = function (msg) {
  var self = this;
  if (!self.active) return;
  Object.keys(self._waiting).forEach(function (id) {
    if (!self._waiting[id]) return;
    self.failedTask(id, msg);
  });
  self.emit('failed', msg);
  self.end();
};

Worker.prototype.failedTask = function (id, msg) {
  var self = this;
  if (!self.active) return;

  if (self._waiting[id]) {
    self._waiting[id] = false;
    self.counts.failed++;
    self.counts.completed++;
    self.emit('task_failed', id, msg);
  }
};

Worker.prototype.finishBatch = function (result) {
  var self = this;
  if (!self.active) return;
  Object.keys(self._waiting).forEach(function (id) {
    if (!self._waiting[id]) return;
    self.finishTask(id, result);
  });
  self.emit('finish', result);
  self.end();
};

Worker.prototype.finishTask = function (id, result) {
  var self = this;
  if (!self.active) return;

  if (self._waiting[id]) {
    self._waiting[id] = false;
    self.counts.finished++;
    self.counts.completed++;
    self.emit('task_finish', id, result);
  }
};

Worker.prototype.progressBatch = function (complete, total, msg) {
  var self = this;
  if (!self.active) return;
  Object.keys(self._waiting).forEach(function (id) {
    if (!self._waiting[id]) return;
    self.progressTask(id, complete, total, msg);
  });
  self.progress.complete = 0;

  self._taskIds.forEach(function (taskId, id) {
    self.progress.complete += self.progress.tasks[id].pct;
  });

  self._eta.done = self.progress.complete;
  self.progress.eta = self._eta.format('{{etah}}');
  self.progress.message = msg || '';
  self.emit('progress', self.progress);
};

Worker.prototype.progressTask = function (id, complete, total, msg) {
  var self = this;
  if (!self.active) return;

  if (self._waiting[id]) {
    self.progress.tasks[id].complete = complete;
    self.progress.tasks[id].total = self.progress.tasks[id].total || total;
    self.progress.tasks[id].message = self.progress.tasks[id].message || msg;
    self.progress.tasks[id].pct = Math.max(0, Math.min(1, complete / total));
    self.emit('task_progress', id, self.progress.tasks[id]);
  }
};

var worker = Worker;

function Tickets() {
  this.tickets = [];
}

Tickets.prototype._apply = function (fn, args) {
  this.tickets.forEach(function (ticket) {
    ticket[fn].apply(ticket, args);
  });
};

Tickets.prototype.push = function (ticket$1) {
  var self = this;

  if (ticket$1 instanceof Tickets) {
    return ticket$1.tickets.forEach(function (ticket) {
      self.push(ticket);
    });
  }

  if (ticket$1 instanceof ticket) {
    if (self.tickets.indexOf(ticket$1) === -1) {
      self.tickets.push(ticket$1);
    }
  }
};

Object.keys(ticket.prototype).forEach(function (method) {
  Tickets.prototype[method] = function () {
    this._apply(method, arguments);
  };
});
var tickets = Tickets;

var EE$2 = events.EventEmitter;







function Queue(process, opts) {
  var self = this;
  opts = opts || {};

  if (typeof process === 'object') {
    opts = process || {};
  }

  if (typeof process === 'function') {
    opts.process = process;
  }

  if (!opts.process) {
    throw new Error("Queue has no process function.");
  }

  opts = opts || {};

  self.process = opts.process || function (task, cb) {
    cb(null, {});
  };

  self.filter = opts.filter || function (input, cb) {
    cb(null, input);
  };

  self.merge = opts.merge || function (oldTask, newTask, cb) {
    cb(null, newTask);
  };

  self.precondition = opts.precondition || function (cb) {
    cb(null, true);
  };

  self.setImmediate = opts.setImmediate || setImmediate;
  self.id = opts.id || 'id';
  self.priority = opts.priority || null;
  self.cancelIfRunning = opts.cancelIfRunning === undefined ? false : !!opts.cancelIfRunning;
  self.autoResume = opts.autoResume === undefined ? true : !!opts.autoResume;
  self.failTaskOnProcessException = opts.failTaskOnProcessException === undefined ? true : !!opts.failTaskOnProcessException;
  self.filo = opts.filo || false;
  self.batchSize = opts.batchSize || 1;
  self.batchDelay = opts.batchDelay || 0;
  self.batchDelayTimeout = opts.batchDelayTimeout || Infinity;
  self.afterProcessDelay = opts.afterProcessDelay || 0;
  self.concurrent = opts.concurrent || 1;
  self.maxTimeout = opts.maxTimeout || Infinity;
  self.maxRetries = opts.maxRetries || 0;
  self.retryDelay = opts.retryDelay || 0;
  self.storeMaxRetries = opts.storeMaxRetries || Infinity;
  self.storeRetryTimeout = opts.storeRetryTimeout || 1000;
  self.preconditionRetryTimeout = opts.preconditionRetryTimeout || 1000; // Statuses

  self._queuedPeak = 0;
  self._queuedTime = {};
  self._processedTotalElapsed = 0;
  self._processedAverage = 0;
  self._processedTotal = 0;
  self._failedTotal = 0;
  self.length = 0;
  self._stopped = false;
  self._saturated = false;
  self._preconditionRetryTimeoutId = null;
  self._batchTimeoutId = null;
  self._batchDelayTimeoutId = null;
  self._connected = false;
  self._storeRetries = 0; // Locks

  self._hasMore = false;
  self._isWriting = false;
  self._writeQueue = [];
  self._writing = {};
  self._tasksWaitingForConnect = [];
  self._calledDrain = true;
  self._calledEmpty = true;
  self._fetching = 0;
  self._running = 0; // Active running tasks

  self._retries = {}; // Map of taskId => retries

  self._workers = {}; // Map of taskId => active job

  self._tickets = {}; // Map of taskId => tickets
  // Initialize Storage

  self.use(opts.store || 'memory');

  if (!self._store) {
    throw new Error('Queue cannot continue without a valid store.');
  }
}

util$1.inherits(Queue, EE$2);

Queue.prototype.destroy = function (cb) {
  cb = cb || function () {};

  var self = this; // Statuses

  self._hasMore = false;
  self._isWriting = false;
  self._writeQueue = [];
  self._writing = {};
  self._tasksWaitingForConnect = []; // Clear internals

  self._tickets = {};
  self._workers = {};
  self._fetching = 0;
  self._running = {};
  self._retries = {};
  self._calledEmpty = true;
  self._calledDrain = true;
  self._connected = false;
  self.pause();

  if (typeof self._store.close === 'function') {
    self._store.close(cb);
  } else {
    cb();
  }
};

Queue.prototype.resetStats = function () {
  this._queuedPeak = 0;
  this._processedTotalElapsed = 0;
  this._processedAverage = 0;
  this._processedTotal = 0;
  this._failedTotal = 0;
};

Queue.prototype.getStats = function () {
  var successRate = this._processedTotal === 0 ? 0 : 1 - this._failedTotal / this._processedTotal;
  return {
    successRate: successRate,
    peak: this._queuedPeak,
    average: this._processedAverage,
    total: this._processedTotal
  };
};

Queue.prototype.use = function (store, opts) {
  var self = this;

  var loadStore = function (store) {
    var Store;

    try {
      Store = commonjsRequire('better-queue-' + store);
    } catch (e) {
      throw new Error('Attempting to require better-queue-' + store + ', but failed.\nPlease ensure you have this store installed via npm install --save better-queue-' + store);
    }

    return Store;
  };

  if (typeof store === 'string') {
    var Store = loadStore(store);
    self._store = new Store(opts);
  } else if (typeof store === 'object' && typeof store.type === 'string') {
    var Store = loadStore(store.type);
    self._store = new Store(store);
  } else if (typeof store === 'object' && store.putTask && store.getTask && (self.filo && store.takeLastN || !self.filo && store.takeFirstN)) {
    self._store = store;
  } else {
    throw new Error('unknown_store');
  }

  self._connected = false;
  self._tasksWaitingForConnect = [];

  self._connectToStore();
};

Queue.prototype._connectToStore = function () {
  var self = this;
  if (self._connected) return;

  if (self._storeRetries >= self.storeMaxRetries) {
    return self.emit('error', new Error('failed_connect_to_store'));
  }

  self._storeRetries++;

  self._store.connect(function (err, len) {
    if (err) return setTimeout(function () {
      self._connectToStore();
    }, self.storeRetryTimeout);
    if (len === undefined || len === null) throw new Error("store_not_returning_length");
    self.length = parseInt(len);
    if (isNaN(self.length)) throw new Error("length_is_not_a_number");
    if (self.length) self._calledDrain = false;
    self._connected = true;
    self._storeRetries = 0;

    self._store.getRunningTasks(function (err, running) {
      if (!self._stopped && self.autoResume) {
        Object.keys(running).forEach(function (lockId) {
          self._running++;

          self._startBatch(running[lockId], {}, lockId);
        });
        self.resume();
      }

      for (var i = 0; i < self._tasksWaitingForConnect.length; i++) {
        self.push(self._tasksWaitingForConnect[i].input, self._tasksWaitingForConnect[i].ticket);
      }
    });
  });
};

Queue.prototype.resume = function () {
  var self = this;
  self._stopped = false;

  self._getWorkers().forEach(function (worker) {
    if (typeof worker.resume === 'function') {
      worker.resume();
    }
  });

  setTimeout(function () {
    self._processNextAfterTimeout();
  }, 0);
};

Queue.prototype.pause = function () {
  this._stopped = true;

  this._getWorkers().forEach(function (worker) {
    if (typeof worker.pause === 'function') {
      worker.pause();
    }
  });
};

Queue.prototype.cancel = function (taskId, cb) {
  cb = cb || function () {};

  var self = this;
  var worker = self._workers[taskId];

  if (worker) {
    worker.cancel();
  }

  self._store.deleteTask(taskId, cb);
};

Queue.prototype.push = function (input, cb) {
  var self = this;
  var ticket$1 = new ticket();

  if (cb instanceof ticket) {
    ticket$1 = cb;
  } else if (cb) {
    ticket$1.on('finish', function (result) {
      cb(null, result);
    }).on('failed', function (err) {
      cb(err);
    });
  }

  if (!self._connected) {
    self._tasksWaitingForConnect.push({
      input: input,
      ticket: ticket$1
    });

    return ticket$1;
  }

  self.filter(input, function (err, task) {
    if (err || task === undefined || task === false || task === null) {
      return ticket$1.failed('input_rejected');
    }

    var acceptTask = function (taskId) {
      setTimeout(function () {
        self._queueTask(taskId, task, ticket$1);
      }, 0);
    };

    if (typeof self.id === 'function') {
      self.id(task, function (err, id) {
        if (err) return ticket$1.failed('id_error');
        acceptTask(id);
      });
    } else if (typeof self.id === 'string' && typeof task === 'object') {
      acceptTask(task[self.id]);
    } else {
      acceptTask();
    }
  });
  return ticket$1;
};

Queue.prototype._getWorkers = function () {
  var self = this;
  var workers = [];
  Object.keys(self._workers).forEach(function (taskId) {
    var worker = self._workers[taskId];

    if (worker && workers.indexOf(worker) === -1) {
      workers.push(worker);
    }
  });
  return workers;
};

Queue.prototype._writeNextTask = function () {
  var self = this;
  if (self._isWriting) return;
  if (!self._writeQueue.length) return;
  self._isWriting = true;

  var taskId = self._writeQueue.shift();

  var finishedWrite = function () {
    self._isWriting = false;
    self.setImmediate(function () {
      self._writeNextTask();
    });
  };

  if (!self._writing[taskId]) {
    delete self._writing[taskId];
    return finishedWrite();
  }

  var task = self._writing[taskId].task;
  var priority = self._writing[taskId].priority;
  var isNew = self._writing[taskId].isNew;
  var writeId = self._writing[taskId].id;
  var tickets = self._writing[taskId].tickets;

  self._store.putTask(taskId, task, priority, function (err) {
    // Check if task has changed since put
    if (self._writing[taskId] && self._writing[taskId].id !== writeId) {
      self._writeQueue.unshift(taskId);

      return finishedWrite();
    }

    delete self._writing[taskId]; // If something else has written to taskId, then wait.

    if (err) {
      tickets.failed('failed_to_put_task');
      return finishedWrite();
    } // Task is in the queue -- update stats


    if (isNew) {
      self.length++;

      if (self._queuedPeak < self.length) {
        self._queuedPeak = self.length;
      }

      self._queuedTime[taskId] = new Date().getTime();
    } // Notify the ticket


    if (self._tickets[taskId]) {
      self._tickets[taskId].push(tickets);
    } else {
      self._tickets[taskId] = tickets;
    }

    self.emit('task_queued', taskId, task);
    tickets.queued(); // If it's a new task, make sure to call drain after.

    if (isNew) {
      self._calledDrain = false;
      self._calledEmpty = false;
    } // If already fetching, mark that there are additions to the queue


    if (self._fetching > 0) {
      self._hasMore = true;
    } // Clear batchDelayTimeout


    if (self.batchDelayTimeout < Infinity) {
      if (self._batchDelayTimeoutId) clearTimeout(self._batchDelayTimeoutId);
      self._batchDelayTimeoutId = setTimeout(function () {
        self._batchDelayTimeoutId = null;
        if (self._batchTimeoutId) clearTimeout(self._batchTimeoutId);
        self._batchTimeoutId = null;

        self._processNextIfAllowed();
      }, self.batchDelayTimeout);
    } // Finish writing


    finishedWrite();

    self._processNextAfterTimeout();
  });
};

Queue.prototype._queueTask = function (taskId, newTask, ticket$1) {
  var self = this;
  var emptyTicket = new ticket();
  ticket$1 = ticket$1 || emptyTicket;
  var isUUID = false;

  if (!taskId) {
    taskId = uuid_1.v4();
    isUUID = true;
  }

  var priority;
  var oldTask = null;
  var isNew = true;

  var putTask = function () {
    if (!self._connected) return; // Save ticket

    var tickets$1 = self._writing[taskId] && self._writing[taskId].tickets || new tickets();

    if (ticket$1 !== emptyTicket) {
      tickets$1.push(ticket$1);
    } // Add to queue


    var alreadyQueued = !!self._writing[taskId];
    self._writing[taskId] = {
      id: uuid_1.v4(),
      isNew: isNew,
      task: newTask,
      priority: priority,
      tickets: tickets$1
    };

    if (!alreadyQueued) {
      self._writeQueue.push(taskId);
    }

    self._writeNextTask();
  };

  var updateTask = function () {
    ticket$1.accept();
    self.emit('task_accepted', taskId, newTask);
    if (!self.priority) return putTask();
    self.priority(newTask, function (err, p) {
      if (err) return ticket$1.failed('failed_to_prioritize');
      priority = p;
      putTask();
    });
  };

  var mergeTask = function () {
    if (!oldTask) return updateTask();
    self.merge(oldTask, newTask, function (err, mergedTask) {
      if (err) return ticket$1.failed('failed_task_merge');
      if (mergedTask === undefined) return;
      newTask = mergedTask;
      updateTask();
    });
  };

  if (isUUID) {
    return updateTask();
  }

  var worker = self._workers[taskId];

  if (self.cancelIfRunning && worker) {
    worker.cancel();
  } // Check if task is writing


  if (self._writing[taskId]) {
    oldTask = self._writing[taskId].task;
    return mergeTask();
  } // Check store for task


  self._store.getTask(taskId, function (err, savedTask) {
    if (err) return ticket$1.failed('failed_to_get'); // Check if it's already in the store

    if (savedTask !== undefined) {
      isNew = false;
    } // Check if task is writing


    if (self._writing[taskId]) {
      oldTask = self._writing[taskId].task;
      return mergeTask();
    } // No task before


    if (savedTask === undefined) {
      return updateTask();
    }

    oldTask = savedTask;
    mergeTask();
  });
};

Queue.prototype._emptied = function () {
  if (this._calledEmpty) return;
  this._calledEmpty = true;
  this.emit('empty');
};

Queue.prototype._drained = function () {
  if (this._calledDrain) return;
  this._calledDrain = true;
  this.emit('drain');
};

Queue.prototype._getNextBatch = function (cb) {
  this._store[this.filo ? 'takeLastN' : 'takeFirstN'](this.batchSize, cb);
};

Queue.prototype._processNextAfterTimeout = function () {
  var self = this;

  if (self.length >= self.batchSize) {
    if (self._batchTimeoutId) {
      clearTimeout(self._batchTimeoutId);
      self._batchTimeoutId = null;
    }

    self.setImmediate(function () {
      self._processNextIfAllowed();
    });
  } else if (!self._batchTimeoutId && self.batchDelay < Infinity) {
    self._batchTimeoutId = setTimeout(function () {
      self._batchTimeoutId = null;

      self._processNextIfAllowed();
    }, self.batchDelay);
  }
};

Queue.prototype._processNextIfAllowed = function () {
  var self = this;
  if (!self._connected) return;
  if (self._stopped) return;
  self._saturated = self._running + self._fetching >= self.concurrent;
  if (self._saturated) return;

  if (!self.length) {
    if (!self._hasMore) {
      self._emptied();

      if (!self._running) {
        self._drained();
      }
    }

    return;
  }

  self.precondition(function (err, pass) {
    if (err || !pass) {
      if (!self._preconditionRetryTimeoutId && self.preconditionRetryTimeout) {
        self._preconditionRetryTimeoutId = setTimeout(function () {
          self._preconditionRetryTimeoutId = null;

          self._processNextIfAllowed();
        }, self.preconditionRetryTimeout);
      }
    } else {
      self._processNext();
    }
  });
};

Queue.prototype._processNext = function () {
  var self = this; // FIXME: There may still be things writing

  self._hasMore = false;
  self._fetching++;

  self._getNextBatch(function (err, lockId) {
    self._fetching--;
    if (err || lockId === undefined) return;

    self._store.getLock(lockId, function (err, batch) {
      if (err || !batch) return;
      var batchSize = Object.keys(batch).length;
      var isEmpty = batchSize === 0;

      if (self.length < batchSize) {
        self.length = batchSize;
      }

      if (!self._hasMore && isEmpty) {
        self._emptied();

        if (!self._running) {
          self._drained();
        }

        return;
      } // The write queue wasn't empty on fetch, so we should fetch more.


      if (self._hasMore && isEmpty) {
        return self._processNextAfterTimeout();
      }

      var tickets = {};
      Object.keys(batch).forEach(function (taskId) {
        var ticket = self._tickets[taskId];

        if (ticket) {
          ticket.started();
          tickets[taskId] = ticket;
          delete self._tickets[taskId];
        }
      }); // Acquire lock on process

      self._running++;

      self._startBatch(batch, tickets, lockId);

      if (self.concurrent - self._running > 1) {
        // Continue processing until saturated
        self._processNextIfAllowed();
      }
    });
  });
};

Queue.prototype._startBatch = function (batch, tickets, lockId) {
  var self = this;
  var taskIds = Object.keys(batch);
  var timeout = null;
  var worker$1 = new worker({
    fn: self.process,
    batch: batch,
    single: self.batchSize === 1,
    failTaskOnProcessException: self.failTaskOnProcessException
  });

  var updateStatsForEndedTask = function (taskId) {
    self._processedTotal++;
    var stats = {};
    if (!self._queuedTime[taskId]) return stats;

    var elapsed = new Date().getTime() - self._queuedTime[taskId];

    delete self._queuedTime[taskId];

    if (elapsed > 0) {
      stats.elapsed = elapsed;
      self._processedTotalElapsed += elapsed;
      self._processedAverage = self._processedTotalElapsed / self._processedTotal;
    }

    return stats;
  };

  if (self.maxTimeout < Infinity) {
    timeout = setTimeout(function () {
      worker$1.failedBatch('task_timeout');
    }, self.maxTimeout);
  }

  worker$1.on('task_failed', function (id, msg) {
    var taskId = taskIds[id];
    self._retries[taskId] = self._retries[taskId] || 0;
    self._retries[taskId]++;

    if (worker$1.cancelled || self._retries[taskId] >= self.maxRetries) {
      var stats = updateStatsForEndedTask(taskId);

      if (tickets[taskId]) {
        // Mark as a failure
        tickets[taskId].failed(msg);
        delete tickets[taskId];
      }

      self._failedTotal++;
      self.emit('task_failed', taskId, msg, stats);
    } else {
      if (self.retryDelay) {
        // Pop back onto queue and retry
        setTimeout(function () {
          self.emit('task_retry', taskId, self._retries[taskId]);

          self._queueTask(taskId, batch[taskId], tickets[taskId]);
        }, self.retryDelay);
      } else {
        self.setImmediate(function () {
          self.emit('task_retry', taskId, self._retries[taskId]);

          self._queueTask(taskId, batch[taskId], tickets[taskId]);
        });
      }
    }
  });
  worker$1.on('task_finish', function (id, result) {
    var taskId = taskIds[id];
    var stats = updateStatsForEndedTask(taskId);

    if (tickets[taskId]) {
      tickets[taskId].finish(result);
      delete tickets[taskId];
    }

    self.emit('task_finish', taskId, result, stats);
  });
  worker$1.on('task_progress', function (id, progress) {
    var taskId = taskIds[id];

    if (tickets[taskId]) {
      tickets[taskId].progress(progress);
      delete tickets[taskId];
    }

    self.emit('task_progress', taskId, progress);
  });
  worker$1.on('progress', function (progress) {
    self.emit('batch_progress', progress);
  });
  worker$1.on('finish', function (result) {
    self.emit('batch_finish', result);
  });
  worker$1.on('failed', function (err) {
    self.emit('batch_failed', err);
  });
  worker$1.on('end', function () {
    self.length -= Object.keys(batch).length;

    if (timeout) {
      clearTimeout(timeout);
    }

    var finishAndGetNext = function () {
      if (!self._connected) return;

      self._store.releaseLock(lockId, function (err) {
        if (err) {
          // If we cannot release the lock then retry
          return setTimeout(function () {
            finishAndGetNext();
          }, 1);
        }

        self._running--;
        taskIds.forEach(function (taskId) {
          if (self._workers[taskId] && !self._workers[taskId].active) {
            delete self._workers[taskId];
          }
        });

        self._processNextAfterTimeout();
      });
    };

    if (self.afterProcessDelay) {
      setTimeout(function () {
        finishAndGetNext();
      }, self.afterProcessDelay);
    } else {
      self.setImmediate(function () {
        finishAndGetNext();
      });
    }
  });
  taskIds.forEach(function (taskId) {
    self._workers[taskId] = worker$1;
  });

  try {
    worker$1.start();
    taskIds.forEach(function (taskId) {
      self.emit('task_started', taskId, batch[taskId]);
    });
  } catch (e) {
    self.emit('error', e);
  }
};

var queue = Queue;

const processFn = (fn, options) => function (...args) {
  const P = options.promiseModule;
  return new P((resolve, reject) => {
    if (options.multiArgs) {
      args.push((...result) => {
        if (options.errorFirst) {
          if (result[0]) {
            reject(result);
          } else {
            result.shift();
            resolve(result);
          }
        } else {
          resolve(result);
        }
      });
    } else if (options.errorFirst) {
      args.push((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    } else {
      args.push(resolve);
    }

    fn.apply(this, args);
  });
};

var pify = (input, options) => {
  options = Object.assign({
    exclude: [/.+(Sync|Stream)$/],
    errorFirst: true,
    promiseModule: Promise
  }, options);
  const objType = typeof input;

  if (!(input !== null && (objType === 'object' || objType === 'function'))) {
    throw new TypeError(`Expected \`input\` to be a \`Function\` or \`Object\`, got \`${input === null ? 'null' : objType}\``);
  }

  const filter = key => {
    const match = pattern => typeof pattern === 'string' ? key === pattern : pattern.test(key);

    return options.include ? options.include.some(match) : !options.exclude.some(match);
  };

  let ret;

  if (objType === 'function') {
    ret = function (...args) {
      return options.excludeMain ? input(...args) : processFn(input, options).apply(this, args);
    };
  } else {
    ret = Object.create(Object.getPrototypeOf(input));
  }

  for (const key in input) {
    // eslint-disable-line guard-for-in
    const property = input[key];
    ret[key] = typeof property === 'function' && filter(key) ? processFn(property, options) : property;
  }

  return ret;
};

const pTry = (fn, ...arguments_) => new Promise(resolve => {
  resolve(fn(...arguments_));
});

var pTry_1 = pTry; // TODO: remove this in the next major version

var default_1 = pTry;
pTry_1.default = default_1;

const fsP = pify(fs$1);

var withOpenFile = (...args) => {
  const callback = args.pop();
  return fsP.open(...args).then(fd => pFinally(pTry_1(callback, fd), _ => fsP.close(fd)));
};

var sync = (...args) => {
  const callback = args.pop();
  const fd = fs$1.openSync(...args);

  try {
    return callback(fd);
  } finally {
    fs$1.closeSync(fd);
  }
};
withOpenFile.sync = sync;

const fsReadP = pify(fs$1.read, {
  multiArgs: true
});

const readChunk = (filePath, startPosition, length) => {
  const buffer = Buffer.alloc(length);
  return withOpenFile(filePath, 'r', fileDescriptor => fsReadP(fileDescriptor, buffer, 0, length, startPosition)).then(([bytesRead, buffer]) => {
    if (bytesRead < length) {
      buffer = buffer.slice(0, bytesRead);
    }

    return buffer;
  });
};

var readChunk_1 = readChunk; // TODO: Remove this for the next major release

var default_1$1 = readChunk;

var sync$1 = (filePath, startPosition, length) => {
  let buffer = Buffer.alloc(length);
  const bytesRead = withOpenFile.sync(filePath, 'r', fileDescriptor => fs$1.readSync(fileDescriptor, buffer, 0, length, startPosition));

  if (bytesRead < length) {
    buffer = buffer.slice(0, bytesRead);
  }

  return buffer;
};
readChunk_1.default = default_1$1;
readChunk_1.sync = sync$1;

var fileType_1 = createCommonjsModule(function (module) {

const toBytes = s => [...s].map(c => c.charCodeAt(0));

const xpiZipFilename = toBytes('META-INF/mozilla.rsa');
const oxmlContentTypes = toBytes('[Content_Types].xml');
const oxmlRels = toBytes('_rels/.rels');

function readUInt64LE(buf, offset = 0) {
  let n = buf[offset];
  let mul = 1;
  let i = 0;

  while (++i < 8) {
    mul *= 0x100;
    n += buf[offset + i] * mul;
  }

  return n;
}

const fileType = input => {
  if (!(input instanceof Uint8Array || input instanceof ArrayBuffer || Buffer.isBuffer(input))) {
    throw new TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`Buffer\` or \`ArrayBuffer\`, got \`${typeof input}\``);
  }

  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (!(buf && buf.length > 1)) {
    return null;
  }

  const check = (header, options) => {
    options = Object.assign({
      offset: 0
    }, options);

    for (let i = 0; i < header.length; i++) {
      // If a bitmask is set
      if (options.mask) {
        // If header doesn't equal `buf` with bits masked off
        if (header[i] !== (options.mask[i] & buf[i + options.offset])) {
          return false;
        }
      } else if (header[i] !== buf[i + options.offset]) {
        return false;
      }
    }

    return true;
  };

  const checkString = (header, options) => check(toBytes(header), options);

  if (check([0xFF, 0xD8, 0xFF])) {
    return {
      ext: 'jpg',
      mime: 'image/jpeg'
    };
  }

  if (check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return {
      ext: 'png',
      mime: 'image/png'
    };
  }

  if (check([0x47, 0x49, 0x46])) {
    return {
      ext: 'gif',
      mime: 'image/gif'
    };
  }

  if (check([0x57, 0x45, 0x42, 0x50], {
    offset: 8
  })) {
    return {
      ext: 'webp',
      mime: 'image/webp'
    };
  }

  if (check([0x46, 0x4C, 0x49, 0x46])) {
    return {
      ext: 'flif',
      mime: 'image/flif'
    };
  } // Needs to be before `tif` check


  if ((check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) && check([0x43, 0x52], {
    offset: 8
  })) {
    return {
      ext: 'cr2',
      mime: 'image/x-canon-cr2'
    };
  }

  if (check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) {
    return {
      ext: 'tif',
      mime: 'image/tiff'
    };
  }

  if (check([0x42, 0x4D])) {
    return {
      ext: 'bmp',
      mime: 'image/bmp'
    };
  }

  if (check([0x49, 0x49, 0xBC])) {
    return {
      ext: 'jxr',
      mime: 'image/vnd.ms-photo'
    };
  }

  if (check([0x38, 0x42, 0x50, 0x53])) {
    return {
      ext: 'psd',
      mime: 'image/vnd.adobe.photoshop'
    };
  } // Zip-based file formats
  // Need to be before the `zip` check


  if (check([0x50, 0x4B, 0x3, 0x4])) {
    if (check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], {
      offset: 30
    })) {
      return {
        ext: 'epub',
        mime: 'application/epub+zip'
      };
    } // Assumes signed `.xpi` from addons.mozilla.org


    if (check(xpiZipFilename, {
      offset: 30
    })) {
      return {
        ext: 'xpi',
        mime: 'application/x-xpinstall'
      };
    }

    if (checkString('mimetypeapplication/vnd.oasis.opendocument.text', {
      offset: 30
    })) {
      return {
        ext: 'odt',
        mime: 'application/vnd.oasis.opendocument.text'
      };
    }

    if (checkString('mimetypeapplication/vnd.oasis.opendocument.spreadsheet', {
      offset: 30
    })) {
      return {
        ext: 'ods',
        mime: 'application/vnd.oasis.opendocument.spreadsheet'
      };
    }

    if (checkString('mimetypeapplication/vnd.oasis.opendocument.presentation', {
      offset: 30
    })) {
      return {
        ext: 'odp',
        mime: 'application/vnd.oasis.opendocument.presentation'
      };
    } // The docx, xlsx and pptx file types extend the Office Open XML file format:
    // https://en.wikipedia.org/wiki/Office_Open_XML_file_formats
    // We look for:
    // - one entry named '[Content_Types].xml' or '_rels/.rels',
    // - one entry indicating specific type of file.
    // MS Office, OpenOffice and LibreOffice may put the parts in different order, so the check should not rely on it.


    const findNextZipHeaderIndex = (arr, startAt = 0) => arr.findIndex((el, i, arr) => i >= startAt && arr[i] === 0x50 && arr[i + 1] === 0x4B && arr[i + 2] === 0x3 && arr[i + 3] === 0x4);

    let zipHeaderIndex = 0; // The first zip header was already found at index 0

    let oxmlFound = false;
    let type = null;

    do {
      const offset = zipHeaderIndex + 30;

      if (!oxmlFound) {
        oxmlFound = check(oxmlContentTypes, {
          offset
        }) || check(oxmlRels, {
          offset
        });
      }

      if (!type) {
        if (checkString('word/', {
          offset
        })) {
          type = {
            ext: 'docx',
            mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          };
        } else if (checkString('ppt/', {
          offset
        })) {
          type = {
            ext: 'pptx',
            mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          };
        } else if (checkString('xl/', {
          offset
        })) {
          type = {
            ext: 'xlsx',
            mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          };
        }
      }

      if (oxmlFound && type) {
        return type;
      }

      zipHeaderIndex = findNextZipHeaderIndex(buf, offset);
    } while (zipHeaderIndex >= 0); // No more zip parts available in the buffer, but maybe we are almost certain about the type?


    if (type) {
      return type;
    }
  }

  if (check([0x50, 0x4B]) && (buf[2] === 0x3 || buf[2] === 0x5 || buf[2] === 0x7) && (buf[3] === 0x4 || buf[3] === 0x6 || buf[3] === 0x8)) {
    return {
      ext: 'zip',
      mime: 'application/zip'
    };
  }

  if (check([0x75, 0x73, 0x74, 0x61, 0x72], {
    offset: 257
  })) {
    return {
      ext: 'tar',
      mime: 'application/x-tar'
    };
  }

  if (check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7]) && (buf[6] === 0x0 || buf[6] === 0x1)) {
    return {
      ext: 'rar',
      mime: 'application/x-rar-compressed'
    };
  }

  if (check([0x1F, 0x8B, 0x8])) {
    return {
      ext: 'gz',
      mime: 'application/gzip'
    };
  }

  if (check([0x42, 0x5A, 0x68])) {
    return {
      ext: 'bz2',
      mime: 'application/x-bzip2'
    };
  }

  if (check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
    return {
      ext: '7z',
      mime: 'application/x-7z-compressed'
    };
  }

  if (check([0x78, 0x01])) {
    return {
      ext: 'dmg',
      mime: 'application/x-apple-diskimage'
    };
  }

  if (check([0x33, 0x67, 0x70, 0x35]) || // 3gp5
  check([0x0, 0x0, 0x0]) && check([0x66, 0x74, 0x79, 0x70], {
    offset: 4
  }) && (check([0x6D, 0x70, 0x34, 0x31], {
    offset: 8
  }) || // MP41
  check([0x6D, 0x70, 0x34, 0x32], {
    offset: 8
  }) || // MP42
  check([0x69, 0x73, 0x6F, 0x6D], {
    offset: 8
  }) || // ISOM
  check([0x69, 0x73, 0x6F, 0x32], {
    offset: 8
  }) || // ISO2
  check([0x6D, 0x6D, 0x70, 0x34], {
    offset: 8
  }) || // MMP4
  check([0x4D, 0x34, 0x56], {
    offset: 8
  }) || // M4V
  check([0x64, 0x61, 0x73, 0x68], {
    offset: 8
  }) // DASH
  )) {
    return {
      ext: 'mp4',
      mime: 'video/mp4'
    };
  }

  if (check([0x4D, 0x54, 0x68, 0x64])) {
    return {
      ext: 'mid',
      mime: 'audio/midi'
    };
  } // https://github.com/threatstack/libmagic/blob/master/magic/Magdir/matroska


  if (check([0x1A, 0x45, 0xDF, 0xA3])) {
    const sliced = buf.subarray(4, 4 + 4096);
    const idPos = sliced.findIndex((el, i, arr) => arr[i] === 0x42 && arr[i + 1] === 0x82);

    if (idPos !== -1) {
      const docTypePos = idPos + 3;

      const findDocType = type => [...type].every((c, i) => sliced[docTypePos + i] === c.charCodeAt(0));

      if (findDocType('matroska')) {
        return {
          ext: 'mkv',
          mime: 'video/x-matroska'
        };
      }

      if (findDocType('webm')) {
        return {
          ext: 'webm',
          mime: 'video/webm'
        };
      }
    }
  }

  if (check([0x0, 0x0, 0x0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]) || check([0x66, 0x72, 0x65, 0x65], {
    offset: 4
  }) || // Type: `free`
  check([0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20], {
    offset: 4
  }) || check([0x6D, 0x64, 0x61, 0x74], {
    offset: 4
  }) || // MJPEG
  check([0x6D, 0x6F, 0x6F, 0x76], {
    offset: 4
  }) || // Type: `moov`
  check([0x77, 0x69, 0x64, 0x65], {
    offset: 4
  })) {
    return {
      ext: 'mov',
      mime: 'video/quicktime'
    };
  } // RIFF file format which might be AVI, WAV, QCP, etc


  if (check([0x52, 0x49, 0x46, 0x46])) {
    if (check([0x41, 0x56, 0x49], {
      offset: 8
    })) {
      return {
        ext: 'avi',
        mime: 'video/vnd.avi'
      };
    }

    if (check([0x57, 0x41, 0x56, 0x45], {
      offset: 8
    })) {
      return {
        ext: 'wav',
        mime: 'audio/vnd.wave'
      };
    } // QLCM, QCP file


    if (check([0x51, 0x4C, 0x43, 0x4D], {
      offset: 8
    })) {
      return {
        ext: 'qcp',
        mime: 'audio/qcelp'
      };
    }
  } // ASF_Header_Object first 80 bytes


  if (check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
    // Search for header should be in first 1KB of file.
    let offset = 30;

    do {
      const objectSize = readUInt64LE(buf, offset + 16);

      if (check([0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65], {
        offset
      })) {
        // Sync on Stream-Properties-Object (B7DC0791-A9B7-11CF-8EE6-00C00C205365)
        if (check([0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B], {
          offset: offset + 24
        })) {
          // Found audio:
          return {
            ext: 'wma',
            mime: 'audio/x-ms-wma'
          };
        }

        if (check([0xC0, 0xEF, 0x19, 0xBC, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B], {
          offset: offset + 24
        })) {
          // Found video:
          return {
            ext: 'wmv',
            mime: 'video/x-ms-asf'
          };
        }

        break;
      }

      offset += objectSize;
    } while (offset + 24 <= buf.length); // Default to ASF generic extension


    return {
      ext: 'asf',
      mime: 'application/vnd.ms-asf'
    };
  }

  if (check([0x0, 0x0, 0x1, 0xBA]) || check([0x0, 0x0, 0x1, 0xB3])) {
    return {
      ext: 'mpg',
      mime: 'video/mpeg'
    };
  }

  if (check([0x66, 0x74, 0x79, 0x70, 0x33, 0x67], {
    offset: 4
  })) {
    return {
      ext: '3gp',
      mime: 'video/3gpp'
    };
  } // Check for MPEG header at different starting offsets


  for (let start = 0; start < 2 && start < buf.length - 16; start++) {
    if (check([0x49, 0x44, 0x33], {
      offset: start
    }) || // ID3 header
    check([0xFF, 0xE2], {
      offset: start,
      mask: [0xFF, 0xE2]
    }) // MPEG 1 or 2 Layer 3 header
    ) {
        return {
          ext: 'mp3',
          mime: 'audio/mpeg'
        };
      }

    if (check([0xFF, 0xE4], {
      offset: start,
      mask: [0xFF, 0xE4]
    }) // MPEG 1 or 2 Layer 2 header
    ) {
        return {
          ext: 'mp2',
          mime: 'audio/mpeg'
        };
      }

    if (check([0xFF, 0xF8], {
      offset: start,
      mask: [0xFF, 0xFC]
    }) // MPEG 2 layer 0 using ADTS
    ) {
        return {
          ext: 'mp2',
          mime: 'audio/mpeg'
        };
      }

    if (check([0xFF, 0xF0], {
      offset: start,
      mask: [0xFF, 0xFC]
    }) // MPEG 4 layer 0 using ADTS
    ) {
        return {
          ext: 'mp4',
          mime: 'audio/mpeg'
        };
      }
  }

  if (check([0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], {
    offset: 4
  })) {
    return {
      // MPEG-4 layer 3 (audio)
      ext: 'm4a',
      mime: 'audio/mp4' // RFC 4337

    };
  } // Needs to be before `ogg` check


  if (check([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], {
    offset: 28
  })) {
    return {
      ext: 'opus',
      mime: 'audio/opus'
    };
  } // If 'OggS' in first  bytes, then OGG container


  if (check([0x4F, 0x67, 0x67, 0x53])) {
    // This is a OGG container
    // If ' theora' in header.
    if (check([0x80, 0x74, 0x68, 0x65, 0x6F, 0x72, 0x61], {
      offset: 28
    })) {
      return {
        ext: 'ogv',
        mime: 'video/ogg'
      };
    } // If '\x01video' in header.


    if (check([0x01, 0x76, 0x69, 0x64, 0x65, 0x6F, 0x00], {
      offset: 28
    })) {
      return {
        ext: 'ogm',
        mime: 'video/ogg'
      };
    } // If ' FLAC' in header  https://xiph.org/flac/faq.html


    if (check([0x7F, 0x46, 0x4C, 0x41, 0x43], {
      offset: 28
    })) {
      return {
        ext: 'oga',
        mime: 'audio/ogg'
      };
    } // 'Speex  ' in header https://en.wikipedia.org/wiki/Speex


    if (check([0x53, 0x70, 0x65, 0x65, 0x78, 0x20, 0x20], {
      offset: 28
    })) {
      return {
        ext: 'spx',
        mime: 'audio/ogg'
      };
    } // If '\x01vorbis' in header


    if (check([0x01, 0x76, 0x6F, 0x72, 0x62, 0x69, 0x73], {
      offset: 28
    })) {
      return {
        ext: 'ogg',
        mime: 'audio/ogg'
      };
    } // Default OGG container https://www.iana.org/assignments/media-types/application/ogg


    return {
      ext: 'ogx',
      mime: 'application/ogg'
    };
  }

  if (check([0x66, 0x4C, 0x61, 0x43])) {
    return {
      ext: 'flac',
      mime: 'audio/x-flac'
    };
  }

  if (check([0x4D, 0x41, 0x43, 0x20])) {
    // 'MAC '
    return {
      ext: 'ape',
      mime: 'audio/ape'
    };
  }

  if (check([0x77, 0x76, 0x70, 0x6B])) {
    // 'wvpk'
    return {
      ext: 'wv',
      mime: 'audio/wavpack'
    };
  }

  if (check([0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A])) {
    return {
      ext: 'amr',
      mime: 'audio/amr'
    };
  }

  if (check([0x25, 0x50, 0x44, 0x46])) {
    return {
      ext: 'pdf',
      mime: 'application/pdf'
    };
  }

  if (check([0x4D, 0x5A])) {
    return {
      ext: 'exe',
      mime: 'application/x-msdownload'
    };
  }

  if ((buf[0] === 0x43 || buf[0] === 0x46) && check([0x57, 0x53], {
    offset: 1
  })) {
    return {
      ext: 'swf',
      mime: 'application/x-shockwave-flash'
    };
  }

  if (check([0x7B, 0x5C, 0x72, 0x74, 0x66])) {
    return {
      ext: 'rtf',
      mime: 'application/rtf'
    };
  }

  if (check([0x00, 0x61, 0x73, 0x6D])) {
    return {
      ext: 'wasm',
      mime: 'application/wasm'
    };
  }

  if (check([0x77, 0x4F, 0x46, 0x46]) && (check([0x00, 0x01, 0x00, 0x00], {
    offset: 4
  }) || check([0x4F, 0x54, 0x54, 0x4F], {
    offset: 4
  }))) {
    return {
      ext: 'woff',
      mime: 'font/woff'
    };
  }

  if (check([0x77, 0x4F, 0x46, 0x32]) && (check([0x00, 0x01, 0x00, 0x00], {
    offset: 4
  }) || check([0x4F, 0x54, 0x54, 0x4F], {
    offset: 4
  }))) {
    return {
      ext: 'woff2',
      mime: 'font/woff2'
    };
  }

  if (check([0x4C, 0x50], {
    offset: 34
  }) && (check([0x00, 0x00, 0x01], {
    offset: 8
  }) || check([0x01, 0x00, 0x02], {
    offset: 8
  }) || check([0x02, 0x00, 0x02], {
    offset: 8
  }))) {
    return {
      ext: 'eot',
      mime: 'application/vnd.ms-fontobject'
    };
  }

  if (check([0x00, 0x01, 0x00, 0x00, 0x00])) {
    return {
      ext: 'ttf',
      mime: 'font/ttf'
    };
  }

  if (check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
    return {
      ext: 'otf',
      mime: 'font/otf'
    };
  }

  if (check([0x00, 0x00, 0x01, 0x00])) {
    return {
      ext: 'ico',
      mime: 'image/x-icon'
    };
  }

  if (check([0x00, 0x00, 0x02, 0x00])) {
    return {
      ext: 'cur',
      mime: 'image/x-icon'
    };
  }

  if (check([0x46, 0x4C, 0x56, 0x01])) {
    return {
      ext: 'flv',
      mime: 'video/x-flv'
    };
  }

  if (check([0x25, 0x21])) {
    return {
      ext: 'ps',
      mime: 'application/postscript'
    };
  }

  if (check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
    return {
      ext: 'xz',
      mime: 'application/x-xz'
    };
  }

  if (check([0x53, 0x51, 0x4C, 0x69])) {
    return {
      ext: 'sqlite',
      mime: 'application/x-sqlite3'
    };
  }

  if (check([0x4E, 0x45, 0x53, 0x1A])) {
    return {
      ext: 'nes',
      mime: 'application/x-nintendo-nes-rom'
    };
  }

  if (check([0x43, 0x72, 0x32, 0x34])) {
    return {
      ext: 'crx',
      mime: 'application/x-google-chrome-extension'
    };
  }

  if (check([0x4D, 0x53, 0x43, 0x46]) || check([0x49, 0x53, 0x63, 0x28])) {
    return {
      ext: 'cab',
      mime: 'application/vnd.ms-cab-compressed'
    };
  } // Needs to be before `ar` check


  if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E, 0x0A, 0x64, 0x65, 0x62, 0x69, 0x61, 0x6E, 0x2D, 0x62, 0x69, 0x6E, 0x61, 0x72, 0x79])) {
    return {
      ext: 'deb',
      mime: 'application/x-deb'
    };
  }

  if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E])) {
    return {
      ext: 'ar',
      mime: 'application/x-unix-archive'
    };
  }

  if (check([0xED, 0xAB, 0xEE, 0xDB])) {
    return {
      ext: 'rpm',
      mime: 'application/x-rpm'
    };
  }

  if (check([0x1F, 0xA0]) || check([0x1F, 0x9D])) {
    return {
      ext: 'Z',
      mime: 'application/x-compress'
    };
  }

  if (check([0x4C, 0x5A, 0x49, 0x50])) {
    return {
      ext: 'lz',
      mime: 'application/x-lzip'
    };
  }

  if (check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
    return {
      ext: 'msi',
      mime: 'application/x-msi'
    };
  }

  if (check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
    return {
      ext: 'mxf',
      mime: 'application/mxf'
    };
  }

  if (check([0x47], {
    offset: 4
  }) && (check([0x47], {
    offset: 192
  }) || check([0x47], {
    offset: 196
  }))) {
    return {
      ext: 'mts',
      mime: 'video/mp2t'
    };
  }

  if (check([0x42, 0x4C, 0x45, 0x4E, 0x44, 0x45, 0x52])) {
    return {
      ext: 'blend',
      mime: 'application/x-blender'
    };
  }

  if (check([0x42, 0x50, 0x47, 0xFB])) {
    return {
      ext: 'bpg',
      mime: 'image/bpg'
    };
  }

  if (check([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20, 0x0D, 0x0A, 0x87, 0x0A])) {
    // JPEG-2000 family
    if (check([0x6A, 0x70, 0x32, 0x20], {
      offset: 20
    })) {
      return {
        ext: 'jp2',
        mime: 'image/jp2'
      };
    }

    if (check([0x6A, 0x70, 0x78, 0x20], {
      offset: 20
    })) {
      return {
        ext: 'jpx',
        mime: 'image/jpx'
      };
    }

    if (check([0x6A, 0x70, 0x6D, 0x20], {
      offset: 20
    })) {
      return {
        ext: 'jpm',
        mime: 'image/jpm'
      };
    }

    if (check([0x6D, 0x6A, 0x70, 0x32], {
      offset: 20
    })) {
      return {
        ext: 'mj2',
        mime: 'image/mj2'
      };
    }
  }

  if (check([0x46, 0x4F, 0x52, 0x4D])) {
    return {
      ext: 'aif',
      mime: 'audio/aiff'
    };
  }

  if (checkString('<?xml ')) {
    return {
      ext: 'xml',
      mime: 'application/xml'
    };
  }

  if (check([0x42, 0x4F, 0x4F, 0x4B, 0x4D, 0x4F, 0x42, 0x49], {
    offset: 60
  })) {
    return {
      ext: 'mobi',
      mime: 'application/x-mobipocket-ebook'
    };
  } // File Type Box (https://en.wikipedia.org/wiki/ISO_base_media_file_format)


  if (check([0x66, 0x74, 0x79, 0x70], {
    offset: 4
  })) {
    if (check([0x6D, 0x69, 0x66, 0x31], {
      offset: 8
    })) {
      return {
        ext: 'heic',
        mime: 'image/heif'
      };
    }

    if (check([0x6D, 0x73, 0x66, 0x31], {
      offset: 8
    })) {
      return {
        ext: 'heic',
        mime: 'image/heif-sequence'
      };
    }

    if (check([0x68, 0x65, 0x69, 0x63], {
      offset: 8
    }) || check([0x68, 0x65, 0x69, 0x78], {
      offset: 8
    })) {
      return {
        ext: 'heic',
        mime: 'image/heic'
      };
    }

    if (check([0x68, 0x65, 0x76, 0x63], {
      offset: 8
    }) || check([0x68, 0x65, 0x76, 0x78], {
      offset: 8
    })) {
      return {
        ext: 'heic',
        mime: 'image/heic-sequence'
      };
    }
  }

  if (check([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return {
      ext: 'ktx',
      mime: 'image/ktx'
    };
  }

  if (check([0x44, 0x49, 0x43, 0x4D], {
    offset: 128
  })) {
    return {
      ext: 'dcm',
      mime: 'application/dicom'
    };
  } // Musepack, SV7


  if (check([0x4D, 0x50, 0x2B])) {
    return {
      ext: 'mpc',
      mime: 'audio/x-musepack'
    };
  } // Musepack, SV8


  if (check([0x4D, 0x50, 0x43, 0x4B])) {
    return {
      ext: 'mpc',
      mime: 'audio/x-musepack'
    };
  }

  if (check([0x42, 0x45, 0x47, 0x49, 0x4E, 0x3A])) {
    return {
      ext: 'ics',
      mime: 'text/calendar'
    };
  }

  if (check([0x67, 0x6C, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00])) {
    return {
      ext: 'glb',
      mime: 'model/gltf-binary'
    };
  }

  if (check([0xD4, 0xC3, 0xB2, 0xA1]) || check([0xA1, 0xB2, 0xC3, 0xD4])) {
    return {
      ext: 'pcap',
      mime: 'application/vnd.tcpdump.pcap'
    };
  }

  return null;
};

module.exports = fileType; // TODO: Remove this for the next major release

module.exports.default = fileType;
Object.defineProperty(fileType, 'minimumBytes', {
  value: 4100
});

module.exports.stream = readableStream => new Promise((resolve, reject) => {
  // Using `eval` to work around issues when bundling with Webpack
  const stream = eval('require')('stream'); // eslint-disable-line no-eval

  readableStream.once('readable', () => {
    const pass = new stream.PassThrough();
    const chunk = readableStream.read(module.exports.minimumBytes) || readableStream.read();

    try {
      pass.fileType = fileType(chunk);
    } catch (error) {
      reject(error);
    }

    readableStream.unshift(chunk);

    if (stream.pipeline) {
      resolve(stream.pipeline(readableStream, pass, () => {}));
    } else {
      resolve(readableStream.pipe(pass));
    }
  });
});
});
var fileType_2 = fileType_1.stream;

/**
 * @param typeMap [Object] Map of MIME type -> Array[extensions]
 * @param ...
 */

function Mime() {
  this._types = Object.create(null);
  this._extensions = Object.create(null);

  for (var i = 0; i < arguments.length; i++) {
    this.define(arguments[i]);
  }

  this.define = this.define.bind(this);
  this.getType = this.getType.bind(this);
  this.getExtension = this.getExtension.bind(this);
}
/**
 * Define mimetype -> extension mappings.  Each key is a mime-type that maps
 * to an array of extensions associated with the type.  The first extension is
 * used as the default extension for the type.
 *
 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
 *
 * If a type declares an extension that has already been defined, an error will
 * be thrown.  To suppress this error and force the extension to be associated
 * with the new type, pass `force`=true.  Alternatively, you may prefix the
 * extension with "*" to map the type to extension, without mapping the
 * extension to the type.
 *
 * e.g. mime.define({'audio/wav', ['wav']}, {'audio/x-wav', ['*wav']});
 *
 *
 * @param map (Object) type definitions
 * @param force (Boolean) if true, force overriding of existing definitions
 */


Mime.prototype.define = function (typeMap, force) {
  for (var type in typeMap) {
    var extensions = typeMap[type].map(function (t) {
      return t.toLowerCase();
    });
    type = type.toLowerCase();

    for (var i = 0; i < extensions.length; i++) {
      var ext = extensions[i]; // '*' prefix = not the preferred type for this extension.  So fixup the
      // extension, and skip it.

      if (ext[0] == '*') {
        continue;
      }

      if (!force && ext in this._types) {
        throw new Error('Attempt to change mapping for "' + ext + '" extension from "' + this._types[ext] + '" to "' + type + '". Pass `force=true` to allow this, otherwise remove "' + ext + '" from the list of extensions for "' + type + '".');
      }

      this._types[ext] = type;
    } // Use first extension as default


    if (force || !this._extensions[type]) {
      var ext = extensions[0];
      this._extensions[type] = ext[0] != '*' ? ext : ext.substr(1);
    }
  }
};
/**
 * Lookup a mime type based on extension
 */


Mime.prototype.getType = function (path) {
  path = String(path);
  var last = path.replace(/^.*[/\\]/, '').toLowerCase();
  var ext = last.replace(/^.*\./, '').toLowerCase();
  var hasPath = last.length < path.length;
  var hasDot = ext.length < last.length - 1;
  return (hasDot || !hasPath) && this._types[ext] || null;
};
/**
 * Return file extension associated with a mime type
 */


Mime.prototype.getExtension = function (type) {
  type = /^\s*([^;\s]*)/.test(type) && RegExp.$1;
  return type && this._extensions[type.toLowerCase()] || null;
};

var Mime_1 = Mime;

var standard = {
  "application/andrew-inset": ["ez"],
  "application/applixware": ["aw"],
  "application/atom+xml": ["atom"],
  "application/atomcat+xml": ["atomcat"],
  "application/atomsvc+xml": ["atomsvc"],
  "application/bdoc": ["bdoc"],
  "application/ccxml+xml": ["ccxml"],
  "application/cdmi-capability": ["cdmia"],
  "application/cdmi-container": ["cdmic"],
  "application/cdmi-domain": ["cdmid"],
  "application/cdmi-object": ["cdmio"],
  "application/cdmi-queue": ["cdmiq"],
  "application/cu-seeme": ["cu"],
  "application/dash+xml": ["mpd"],
  "application/davmount+xml": ["davmount"],
  "application/docbook+xml": ["dbk"],
  "application/dssc+der": ["dssc"],
  "application/dssc+xml": ["xdssc"],
  "application/ecmascript": ["ecma", "es"],
  "application/emma+xml": ["emma"],
  "application/epub+zip": ["epub"],
  "application/exi": ["exi"],
  "application/font-tdpfr": ["pfr"],
  "application/geo+json": ["geojson"],
  "application/gml+xml": ["gml"],
  "application/gpx+xml": ["gpx"],
  "application/gxf": ["gxf"],
  "application/gzip": ["gz"],
  "application/hjson": ["hjson"],
  "application/hyperstudio": ["stk"],
  "application/inkml+xml": ["ink", "inkml"],
  "application/ipfix": ["ipfix"],
  "application/java-archive": ["jar", "war", "ear"],
  "application/java-serialized-object": ["ser"],
  "application/java-vm": ["class"],
  "application/javascript": ["js", "mjs"],
  "application/json": ["json", "map"],
  "application/json5": ["json5"],
  "application/jsonml+json": ["jsonml"],
  "application/ld+json": ["jsonld"],
  "application/lost+xml": ["lostxml"],
  "application/mac-binhex40": ["hqx"],
  "application/mac-compactpro": ["cpt"],
  "application/mads+xml": ["mads"],
  "application/manifest+json": ["webmanifest"],
  "application/marc": ["mrc"],
  "application/marcxml+xml": ["mrcx"],
  "application/mathematica": ["ma", "nb", "mb"],
  "application/mathml+xml": ["mathml"],
  "application/mbox": ["mbox"],
  "application/mediaservercontrol+xml": ["mscml"],
  "application/metalink+xml": ["metalink"],
  "application/metalink4+xml": ["meta4"],
  "application/mets+xml": ["mets"],
  "application/mods+xml": ["mods"],
  "application/mp21": ["m21", "mp21"],
  "application/mp4": ["mp4s", "m4p"],
  "application/msword": ["doc", "dot"],
  "application/mxf": ["mxf"],
  "application/n-quads": ["nq"],
  "application/n-triples": ["nt"],
  "application/octet-stream": ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"],
  "application/oda": ["oda"],
  "application/oebps-package+xml": ["opf"],
  "application/ogg": ["ogx"],
  "application/omdoc+xml": ["omdoc"],
  "application/onenote": ["onetoc", "onetoc2", "onetmp", "onepkg"],
  "application/oxps": ["oxps"],
  "application/patch-ops-error+xml": ["xer"],
  "application/pdf": ["pdf"],
  "application/pgp-encrypted": ["pgp"],
  "application/pgp-signature": ["asc", "sig"],
  "application/pics-rules": ["prf"],
  "application/pkcs10": ["p10"],
  "application/pkcs7-mime": ["p7m", "p7c"],
  "application/pkcs7-signature": ["p7s"],
  "application/pkcs8": ["p8"],
  "application/pkix-attr-cert": ["ac"],
  "application/pkix-cert": ["cer"],
  "application/pkix-crl": ["crl"],
  "application/pkix-pkipath": ["pkipath"],
  "application/pkixcmp": ["pki"],
  "application/pls+xml": ["pls"],
  "application/postscript": ["ai", "eps", "ps"],
  "application/pskc+xml": ["pskcxml"],
  "application/raml+yaml": ["raml"],
  "application/rdf+xml": ["rdf", "owl"],
  "application/reginfo+xml": ["rif"],
  "application/relax-ng-compact-syntax": ["rnc"],
  "application/resource-lists+xml": ["rl"],
  "application/resource-lists-diff+xml": ["rld"],
  "application/rls-services+xml": ["rs"],
  "application/rpki-ghostbusters": ["gbr"],
  "application/rpki-manifest": ["mft"],
  "application/rpki-roa": ["roa"],
  "application/rsd+xml": ["rsd"],
  "application/rss+xml": ["rss"],
  "application/rtf": ["rtf"],
  "application/sbml+xml": ["sbml"],
  "application/scvp-cv-request": ["scq"],
  "application/scvp-cv-response": ["scs"],
  "application/scvp-vp-request": ["spq"],
  "application/scvp-vp-response": ["spp"],
  "application/sdp": ["sdp"],
  "application/set-payment-initiation": ["setpay"],
  "application/set-registration-initiation": ["setreg"],
  "application/shf+xml": ["shf"],
  "application/sieve": ["siv", "sieve"],
  "application/smil+xml": ["smi", "smil"],
  "application/sparql-query": ["rq"],
  "application/sparql-results+xml": ["srx"],
  "application/srgs": ["gram"],
  "application/srgs+xml": ["grxml"],
  "application/sru+xml": ["sru"],
  "application/ssdl+xml": ["ssdl"],
  "application/ssml+xml": ["ssml"],
  "application/tei+xml": ["tei", "teicorpus"],
  "application/thraud+xml": ["tfi"],
  "application/timestamped-data": ["tsd"],
  "application/voicexml+xml": ["vxml"],
  "application/wasm": ["wasm"],
  "application/widget": ["wgt"],
  "application/winhlp": ["hlp"],
  "application/wsdl+xml": ["wsdl"],
  "application/wspolicy+xml": ["wspolicy"],
  "application/xaml+xml": ["xaml"],
  "application/xcap-diff+xml": ["xdf"],
  "application/xenc+xml": ["xenc"],
  "application/xhtml+xml": ["xhtml", "xht"],
  "application/xml": ["xml", "xsl", "xsd", "rng"],
  "application/xml-dtd": ["dtd"],
  "application/xop+xml": ["xop"],
  "application/xproc+xml": ["xpl"],
  "application/xslt+xml": ["xslt"],
  "application/xspf+xml": ["xspf"],
  "application/xv+xml": ["mxml", "xhvml", "xvml", "xvm"],
  "application/yang": ["yang"],
  "application/yin+xml": ["yin"],
  "application/zip": ["zip"],
  "audio/3gpp": ["*3gpp"],
  "audio/adpcm": ["adp"],
  "audio/basic": ["au", "snd"],
  "audio/midi": ["mid", "midi", "kar", "rmi"],
  "audio/mp3": ["*mp3"],
  "audio/mp4": ["m4a", "mp4a"],
  "audio/mpeg": ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"],
  "audio/ogg": ["oga", "ogg", "spx"],
  "audio/s3m": ["s3m"],
  "audio/silk": ["sil"],
  "audio/wav": ["wav"],
  "audio/wave": ["*wav"],
  "audio/webm": ["weba"],
  "audio/xm": ["xm"],
  "font/collection": ["ttc"],
  "font/otf": ["otf"],
  "font/ttf": ["ttf"],
  "font/woff": ["woff"],
  "font/woff2": ["woff2"],
  "image/aces": ["exr"],
  "image/apng": ["apng"],
  "image/bmp": ["bmp"],
  "image/cgm": ["cgm"],
  "image/dicom-rle": ["drle"],
  "image/emf": ["emf"],
  "image/fits": ["fits"],
  "image/g3fax": ["g3"],
  "image/gif": ["gif"],
  "image/heic": ["heic"],
  "image/heic-sequence": ["heics"],
  "image/heif": ["heif"],
  "image/heif-sequence": ["heifs"],
  "image/ief": ["ief"],
  "image/jls": ["jls"],
  "image/jp2": ["jp2", "jpg2"],
  "image/jpeg": ["jpeg", "jpg", "jpe"],
  "image/jpm": ["jpm"],
  "image/jpx": ["jpx", "jpf"],
  "image/jxr": ["jxr"],
  "image/ktx": ["ktx"],
  "image/png": ["png"],
  "image/sgi": ["sgi"],
  "image/svg+xml": ["svg", "svgz"],
  "image/t38": ["t38"],
  "image/tiff": ["tif", "tiff"],
  "image/tiff-fx": ["tfx"],
  "image/webp": ["webp"],
  "image/wmf": ["wmf"],
  "message/disposition-notification": ["disposition-notification"],
  "message/global": ["u8msg"],
  "message/global-delivery-status": ["u8dsn"],
  "message/global-disposition-notification": ["u8mdn"],
  "message/global-headers": ["u8hdr"],
  "message/rfc822": ["eml", "mime"],
  "model/3mf": ["3mf"],
  "model/gltf+json": ["gltf"],
  "model/gltf-binary": ["glb"],
  "model/iges": ["igs", "iges"],
  "model/mesh": ["msh", "mesh", "silo"],
  "model/stl": ["stl"],
  "model/vrml": ["wrl", "vrml"],
  "model/x3d+binary": ["*x3db", "x3dbz"],
  "model/x3d+fastinfoset": ["x3db"],
  "model/x3d+vrml": ["*x3dv", "x3dvz"],
  "model/x3d+xml": ["x3d", "x3dz"],
  "model/x3d-vrml": ["x3dv"],
  "text/cache-manifest": ["appcache", "manifest"],
  "text/calendar": ["ics", "ifb"],
  "text/coffeescript": ["coffee", "litcoffee"],
  "text/css": ["css"],
  "text/csv": ["csv"],
  "text/html": ["html", "htm", "shtml"],
  "text/jade": ["jade"],
  "text/jsx": ["jsx"],
  "text/less": ["less"],
  "text/markdown": ["markdown", "md"],
  "text/mathml": ["mml"],
  "text/mdx": ["mdx"],
  "text/n3": ["n3"],
  "text/plain": ["txt", "text", "conf", "def", "list", "log", "in", "ini"],
  "text/richtext": ["rtx"],
  "text/rtf": ["*rtf"],
  "text/sgml": ["sgml", "sgm"],
  "text/shex": ["shex"],
  "text/slim": ["slim", "slm"],
  "text/stylus": ["stylus", "styl"],
  "text/tab-separated-values": ["tsv"],
  "text/troff": ["t", "tr", "roff", "man", "me", "ms"],
  "text/turtle": ["ttl"],
  "text/uri-list": ["uri", "uris", "urls"],
  "text/vcard": ["vcard"],
  "text/vtt": ["vtt"],
  "text/xml": ["*xml"],
  "text/yaml": ["yaml", "yml"],
  "video/3gpp": ["3gp", "3gpp"],
  "video/3gpp2": ["3g2"],
  "video/h261": ["h261"],
  "video/h263": ["h263"],
  "video/h264": ["h264"],
  "video/jpeg": ["jpgv"],
  "video/jpm": ["*jpm", "jpgm"],
  "video/mj2": ["mj2", "mjp2"],
  "video/mp2t": ["ts"],
  "video/mp4": ["mp4", "mp4v", "mpg4"],
  "video/mpeg": ["mpeg", "mpg", "mpe", "m1v", "m2v"],
  "video/ogg": ["ogv"],
  "video/quicktime": ["qt", "mov"],
  "video/webm": ["webm"]
};

var other = {
  "application/prs.cww": ["cww"],
  "application/vnd.3gpp.pic-bw-large": ["plb"],
  "application/vnd.3gpp.pic-bw-small": ["psb"],
  "application/vnd.3gpp.pic-bw-var": ["pvb"],
  "application/vnd.3gpp2.tcap": ["tcap"],
  "application/vnd.3m.post-it-notes": ["pwn"],
  "application/vnd.accpac.simply.aso": ["aso"],
  "application/vnd.accpac.simply.imp": ["imp"],
  "application/vnd.acucobol": ["acu"],
  "application/vnd.acucorp": ["atc", "acutc"],
  "application/vnd.adobe.air-application-installer-package+zip": ["air"],
  "application/vnd.adobe.formscentral.fcdt": ["fcdt"],
  "application/vnd.adobe.fxp": ["fxp", "fxpl"],
  "application/vnd.adobe.xdp+xml": ["xdp"],
  "application/vnd.adobe.xfdf": ["xfdf"],
  "application/vnd.ahead.space": ["ahead"],
  "application/vnd.airzip.filesecure.azf": ["azf"],
  "application/vnd.airzip.filesecure.azs": ["azs"],
  "application/vnd.amazon.ebook": ["azw"],
  "application/vnd.americandynamics.acc": ["acc"],
  "application/vnd.amiga.ami": ["ami"],
  "application/vnd.android.package-archive": ["apk"],
  "application/vnd.anser-web-certificate-issue-initiation": ["cii"],
  "application/vnd.anser-web-funds-transfer-initiation": ["fti"],
  "application/vnd.antix.game-component": ["atx"],
  "application/vnd.apple.installer+xml": ["mpkg"],
  "application/vnd.apple.keynote": ["keynote"],
  "application/vnd.apple.mpegurl": ["m3u8"],
  "application/vnd.apple.numbers": ["numbers"],
  "application/vnd.apple.pages": ["pages"],
  "application/vnd.apple.pkpass": ["pkpass"],
  "application/vnd.aristanetworks.swi": ["swi"],
  "application/vnd.astraea-software.iota": ["iota"],
  "application/vnd.audiograph": ["aep"],
  "application/vnd.blueice.multipass": ["mpm"],
  "application/vnd.bmi": ["bmi"],
  "application/vnd.businessobjects": ["rep"],
  "application/vnd.chemdraw+xml": ["cdxml"],
  "application/vnd.chipnuts.karaoke-mmd": ["mmd"],
  "application/vnd.cinderella": ["cdy"],
  "application/vnd.citationstyles.style+xml": ["csl"],
  "application/vnd.claymore": ["cla"],
  "application/vnd.cloanto.rp9": ["rp9"],
  "application/vnd.clonk.c4group": ["c4g", "c4d", "c4f", "c4p", "c4u"],
  "application/vnd.cluetrust.cartomobile-config": ["c11amc"],
  "application/vnd.cluetrust.cartomobile-config-pkg": ["c11amz"],
  "application/vnd.commonspace": ["csp"],
  "application/vnd.contact.cmsg": ["cdbcmsg"],
  "application/vnd.cosmocaller": ["cmc"],
  "application/vnd.crick.clicker": ["clkx"],
  "application/vnd.crick.clicker.keyboard": ["clkk"],
  "application/vnd.crick.clicker.palette": ["clkp"],
  "application/vnd.crick.clicker.template": ["clkt"],
  "application/vnd.crick.clicker.wordbank": ["clkw"],
  "application/vnd.criticaltools.wbs+xml": ["wbs"],
  "application/vnd.ctc-posml": ["pml"],
  "application/vnd.cups-ppd": ["ppd"],
  "application/vnd.curl.car": ["car"],
  "application/vnd.curl.pcurl": ["pcurl"],
  "application/vnd.dart": ["dart"],
  "application/vnd.data-vision.rdz": ["rdz"],
  "application/vnd.dece.data": ["uvf", "uvvf", "uvd", "uvvd"],
  "application/vnd.dece.ttml+xml": ["uvt", "uvvt"],
  "application/vnd.dece.unspecified": ["uvx", "uvvx"],
  "application/vnd.dece.zip": ["uvz", "uvvz"],
  "application/vnd.denovo.fcselayout-link": ["fe_launch"],
  "application/vnd.dna": ["dna"],
  "application/vnd.dolby.mlp": ["mlp"],
  "application/vnd.dpgraph": ["dpg"],
  "application/vnd.dreamfactory": ["dfac"],
  "application/vnd.ds-keypoint": ["kpxx"],
  "application/vnd.dvb.ait": ["ait"],
  "application/vnd.dvb.service": ["svc"],
  "application/vnd.dynageo": ["geo"],
  "application/vnd.ecowin.chart": ["mag"],
  "application/vnd.enliven": ["nml"],
  "application/vnd.epson.esf": ["esf"],
  "application/vnd.epson.msf": ["msf"],
  "application/vnd.epson.quickanime": ["qam"],
  "application/vnd.epson.salt": ["slt"],
  "application/vnd.epson.ssf": ["ssf"],
  "application/vnd.eszigno3+xml": ["es3", "et3"],
  "application/vnd.ezpix-album": ["ez2"],
  "application/vnd.ezpix-package": ["ez3"],
  "application/vnd.fdf": ["fdf"],
  "application/vnd.fdsn.mseed": ["mseed"],
  "application/vnd.fdsn.seed": ["seed", "dataless"],
  "application/vnd.flographit": ["gph"],
  "application/vnd.fluxtime.clip": ["ftc"],
  "application/vnd.framemaker": ["fm", "frame", "maker", "book"],
  "application/vnd.frogans.fnc": ["fnc"],
  "application/vnd.frogans.ltf": ["ltf"],
  "application/vnd.fsc.weblaunch": ["fsc"],
  "application/vnd.fujitsu.oasys": ["oas"],
  "application/vnd.fujitsu.oasys2": ["oa2"],
  "application/vnd.fujitsu.oasys3": ["oa3"],
  "application/vnd.fujitsu.oasysgp": ["fg5"],
  "application/vnd.fujitsu.oasysprs": ["bh2"],
  "application/vnd.fujixerox.ddd": ["ddd"],
  "application/vnd.fujixerox.docuworks": ["xdw"],
  "application/vnd.fujixerox.docuworks.binder": ["xbd"],
  "application/vnd.fuzzysheet": ["fzs"],
  "application/vnd.genomatix.tuxedo": ["txd"],
  "application/vnd.geogebra.file": ["ggb"],
  "application/vnd.geogebra.tool": ["ggt"],
  "application/vnd.geometry-explorer": ["gex", "gre"],
  "application/vnd.geonext": ["gxt"],
  "application/vnd.geoplan": ["g2w"],
  "application/vnd.geospace": ["g3w"],
  "application/vnd.gmx": ["gmx"],
  "application/vnd.google-apps.document": ["gdoc"],
  "application/vnd.google-apps.presentation": ["gslides"],
  "application/vnd.google-apps.spreadsheet": ["gsheet"],
  "application/vnd.google-earth.kml+xml": ["kml"],
  "application/vnd.google-earth.kmz": ["kmz"],
  "application/vnd.grafeq": ["gqf", "gqs"],
  "application/vnd.groove-account": ["gac"],
  "application/vnd.groove-help": ["ghf"],
  "application/vnd.groove-identity-message": ["gim"],
  "application/vnd.groove-injector": ["grv"],
  "application/vnd.groove-tool-message": ["gtm"],
  "application/vnd.groove-tool-template": ["tpl"],
  "application/vnd.groove-vcard": ["vcg"],
  "application/vnd.hal+xml": ["hal"],
  "application/vnd.handheld-entertainment+xml": ["zmm"],
  "application/vnd.hbci": ["hbci"],
  "application/vnd.hhe.lesson-player": ["les"],
  "application/vnd.hp-hpgl": ["hpgl"],
  "application/vnd.hp-hpid": ["hpid"],
  "application/vnd.hp-hps": ["hps"],
  "application/vnd.hp-jlyt": ["jlt"],
  "application/vnd.hp-pcl": ["pcl"],
  "application/vnd.hp-pclxl": ["pclxl"],
  "application/vnd.hydrostatix.sof-data": ["sfd-hdstx"],
  "application/vnd.ibm.minipay": ["mpy"],
  "application/vnd.ibm.modcap": ["afp", "listafp", "list3820"],
  "application/vnd.ibm.rights-management": ["irm"],
  "application/vnd.ibm.secure-container": ["sc"],
  "application/vnd.iccprofile": ["icc", "icm"],
  "application/vnd.igloader": ["igl"],
  "application/vnd.immervision-ivp": ["ivp"],
  "application/vnd.immervision-ivu": ["ivu"],
  "application/vnd.insors.igm": ["igm"],
  "application/vnd.intercon.formnet": ["xpw", "xpx"],
  "application/vnd.intergeo": ["i2g"],
  "application/vnd.intu.qbo": ["qbo"],
  "application/vnd.intu.qfx": ["qfx"],
  "application/vnd.ipunplugged.rcprofile": ["rcprofile"],
  "application/vnd.irepository.package+xml": ["irp"],
  "application/vnd.is-xpr": ["xpr"],
  "application/vnd.isac.fcs": ["fcs"],
  "application/vnd.jam": ["jam"],
  "application/vnd.jcp.javame.midlet-rms": ["rms"],
  "application/vnd.jisp": ["jisp"],
  "application/vnd.joost.joda-archive": ["joda"],
  "application/vnd.kahootz": ["ktz", "ktr"],
  "application/vnd.kde.karbon": ["karbon"],
  "application/vnd.kde.kchart": ["chrt"],
  "application/vnd.kde.kformula": ["kfo"],
  "application/vnd.kde.kivio": ["flw"],
  "application/vnd.kde.kontour": ["kon"],
  "application/vnd.kde.kpresenter": ["kpr", "kpt"],
  "application/vnd.kde.kspread": ["ksp"],
  "application/vnd.kde.kword": ["kwd", "kwt"],
  "application/vnd.kenameaapp": ["htke"],
  "application/vnd.kidspiration": ["kia"],
  "application/vnd.kinar": ["kne", "knp"],
  "application/vnd.koan": ["skp", "skd", "skt", "skm"],
  "application/vnd.kodak-descriptor": ["sse"],
  "application/vnd.las.las+xml": ["lasxml"],
  "application/vnd.llamagraphics.life-balance.desktop": ["lbd"],
  "application/vnd.llamagraphics.life-balance.exchange+xml": ["lbe"],
  "application/vnd.lotus-1-2-3": ["123"],
  "application/vnd.lotus-approach": ["apr"],
  "application/vnd.lotus-freelance": ["pre"],
  "application/vnd.lotus-notes": ["nsf"],
  "application/vnd.lotus-organizer": ["org"],
  "application/vnd.lotus-screencam": ["scm"],
  "application/vnd.lotus-wordpro": ["lwp"],
  "application/vnd.macports.portpkg": ["portpkg"],
  "application/vnd.mcd": ["mcd"],
  "application/vnd.medcalcdata": ["mc1"],
  "application/vnd.mediastation.cdkey": ["cdkey"],
  "application/vnd.mfer": ["mwf"],
  "application/vnd.mfmp": ["mfm"],
  "application/vnd.micrografx.flo": ["flo"],
  "application/vnd.micrografx.igx": ["igx"],
  "application/vnd.mif": ["mif"],
  "application/vnd.mobius.daf": ["daf"],
  "application/vnd.mobius.dis": ["dis"],
  "application/vnd.mobius.mbk": ["mbk"],
  "application/vnd.mobius.mqy": ["mqy"],
  "application/vnd.mobius.msl": ["msl"],
  "application/vnd.mobius.plc": ["plc"],
  "application/vnd.mobius.txf": ["txf"],
  "application/vnd.mophun.application": ["mpn"],
  "application/vnd.mophun.certificate": ["mpc"],
  "application/vnd.mozilla.xul+xml": ["xul"],
  "application/vnd.ms-artgalry": ["cil"],
  "application/vnd.ms-cab-compressed": ["cab"],
  "application/vnd.ms-excel": ["xls", "xlm", "xla", "xlc", "xlt", "xlw"],
  "application/vnd.ms-excel.addin.macroenabled.12": ["xlam"],
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": ["xlsb"],
  "application/vnd.ms-excel.sheet.macroenabled.12": ["xlsm"],
  "application/vnd.ms-excel.template.macroenabled.12": ["xltm"],
  "application/vnd.ms-fontobject": ["eot"],
  "application/vnd.ms-htmlhelp": ["chm"],
  "application/vnd.ms-ims": ["ims"],
  "application/vnd.ms-lrm": ["lrm"],
  "application/vnd.ms-officetheme": ["thmx"],
  "application/vnd.ms-outlook": ["msg"],
  "application/vnd.ms-pki.seccat": ["cat"],
  "application/vnd.ms-pki.stl": ["*stl"],
  "application/vnd.ms-powerpoint": ["ppt", "pps", "pot"],
  "application/vnd.ms-powerpoint.addin.macroenabled.12": ["ppam"],
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": ["pptm"],
  "application/vnd.ms-powerpoint.slide.macroenabled.12": ["sldm"],
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": ["ppsm"],
  "application/vnd.ms-powerpoint.template.macroenabled.12": ["potm"],
  "application/vnd.ms-project": ["mpp", "mpt"],
  "application/vnd.ms-word.document.macroenabled.12": ["docm"],
  "application/vnd.ms-word.template.macroenabled.12": ["dotm"],
  "application/vnd.ms-works": ["wps", "wks", "wcm", "wdb"],
  "application/vnd.ms-wpl": ["wpl"],
  "application/vnd.ms-xpsdocument": ["xps"],
  "application/vnd.mseq": ["mseq"],
  "application/vnd.musician": ["mus"],
  "application/vnd.muvee.style": ["msty"],
  "application/vnd.mynfc": ["taglet"],
  "application/vnd.neurolanguage.nlu": ["nlu"],
  "application/vnd.nitf": ["ntf", "nitf"],
  "application/vnd.noblenet-directory": ["nnd"],
  "application/vnd.noblenet-sealer": ["nns"],
  "application/vnd.noblenet-web": ["nnw"],
  "application/vnd.nokia.n-gage.data": ["ngdat"],
  "application/vnd.nokia.n-gage.symbian.install": ["n-gage"],
  "application/vnd.nokia.radio-preset": ["rpst"],
  "application/vnd.nokia.radio-presets": ["rpss"],
  "application/vnd.novadigm.edm": ["edm"],
  "application/vnd.novadigm.edx": ["edx"],
  "application/vnd.novadigm.ext": ["ext"],
  "application/vnd.oasis.opendocument.chart": ["odc"],
  "application/vnd.oasis.opendocument.chart-template": ["otc"],
  "application/vnd.oasis.opendocument.database": ["odb"],
  "application/vnd.oasis.opendocument.formula": ["odf"],
  "application/vnd.oasis.opendocument.formula-template": ["odft"],
  "application/vnd.oasis.opendocument.graphics": ["odg"],
  "application/vnd.oasis.opendocument.graphics-template": ["otg"],
  "application/vnd.oasis.opendocument.image": ["odi"],
  "application/vnd.oasis.opendocument.image-template": ["oti"],
  "application/vnd.oasis.opendocument.presentation": ["odp"],
  "application/vnd.oasis.opendocument.presentation-template": ["otp"],
  "application/vnd.oasis.opendocument.spreadsheet": ["ods"],
  "application/vnd.oasis.opendocument.spreadsheet-template": ["ots"],
  "application/vnd.oasis.opendocument.text": ["odt"],
  "application/vnd.oasis.opendocument.text-master": ["odm"],
  "application/vnd.oasis.opendocument.text-template": ["ott"],
  "application/vnd.oasis.opendocument.text-web": ["oth"],
  "application/vnd.olpc-sugar": ["xo"],
  "application/vnd.oma.dd2+xml": ["dd2"],
  "application/vnd.openofficeorg.extension": ["oxt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.openxmlformats-officedocument.presentationml.slide": ["sldx"],
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": ["ppsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.template": ["potx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": ["xltx"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": ["dotx"],
  "application/vnd.osgeo.mapguide.package": ["mgp"],
  "application/vnd.osgi.dp": ["dp"],
  "application/vnd.osgi.subsystem": ["esa"],
  "application/vnd.palm": ["pdb", "pqa", "oprc"],
  "application/vnd.pawaafile": ["paw"],
  "application/vnd.pg.format": ["str"],
  "application/vnd.pg.osasli": ["ei6"],
  "application/vnd.picsel": ["efif"],
  "application/vnd.pmi.widget": ["wg"],
  "application/vnd.pocketlearn": ["plf"],
  "application/vnd.powerbuilder6": ["pbd"],
  "application/vnd.previewsystems.box": ["box"],
  "application/vnd.proteus.magazine": ["mgz"],
  "application/vnd.publishare-delta-tree": ["qps"],
  "application/vnd.pvi.ptid1": ["ptid"],
  "application/vnd.quark.quarkxpress": ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"],
  "application/vnd.realvnc.bed": ["bed"],
  "application/vnd.recordare.musicxml": ["mxl"],
  "application/vnd.recordare.musicxml+xml": ["musicxml"],
  "application/vnd.rig.cryptonote": ["cryptonote"],
  "application/vnd.rim.cod": ["cod"],
  "application/vnd.rn-realmedia": ["rm"],
  "application/vnd.rn-realmedia-vbr": ["rmvb"],
  "application/vnd.route66.link66+xml": ["link66"],
  "application/vnd.sailingtracker.track": ["st"],
  "application/vnd.seemail": ["see"],
  "application/vnd.sema": ["sema"],
  "application/vnd.semd": ["semd"],
  "application/vnd.semf": ["semf"],
  "application/vnd.shana.informed.formdata": ["ifm"],
  "application/vnd.shana.informed.formtemplate": ["itp"],
  "application/vnd.shana.informed.interchange": ["iif"],
  "application/vnd.shana.informed.package": ["ipk"],
  "application/vnd.simtech-mindmapper": ["twd", "twds"],
  "application/vnd.smaf": ["mmf"],
  "application/vnd.smart.teacher": ["teacher"],
  "application/vnd.solent.sdkm+xml": ["sdkm", "sdkd"],
  "application/vnd.spotfire.dxp": ["dxp"],
  "application/vnd.spotfire.sfs": ["sfs"],
  "application/vnd.stardivision.calc": ["sdc"],
  "application/vnd.stardivision.draw": ["sda"],
  "application/vnd.stardivision.impress": ["sdd"],
  "application/vnd.stardivision.math": ["smf"],
  "application/vnd.stardivision.writer": ["sdw", "vor"],
  "application/vnd.stardivision.writer-global": ["sgl"],
  "application/vnd.stepmania.package": ["smzip"],
  "application/vnd.stepmania.stepchart": ["sm"],
  "application/vnd.sun.wadl+xml": ["wadl"],
  "application/vnd.sun.xml.calc": ["sxc"],
  "application/vnd.sun.xml.calc.template": ["stc"],
  "application/vnd.sun.xml.draw": ["sxd"],
  "application/vnd.sun.xml.draw.template": ["std"],
  "application/vnd.sun.xml.impress": ["sxi"],
  "application/vnd.sun.xml.impress.template": ["sti"],
  "application/vnd.sun.xml.math": ["sxm"],
  "application/vnd.sun.xml.writer": ["sxw"],
  "application/vnd.sun.xml.writer.global": ["sxg"],
  "application/vnd.sun.xml.writer.template": ["stw"],
  "application/vnd.sus-calendar": ["sus", "susp"],
  "application/vnd.svd": ["svd"],
  "application/vnd.symbian.install": ["sis", "sisx"],
  "application/vnd.syncml+xml": ["xsm"],
  "application/vnd.syncml.dm+wbxml": ["bdm"],
  "application/vnd.syncml.dm+xml": ["xdm"],
  "application/vnd.tao.intent-module-archive": ["tao"],
  "application/vnd.tcpdump.pcap": ["pcap", "cap", "dmp"],
  "application/vnd.tmobile-livetv": ["tmo"],
  "application/vnd.trid.tpt": ["tpt"],
  "application/vnd.triscape.mxs": ["mxs"],
  "application/vnd.trueapp": ["tra"],
  "application/vnd.ufdl": ["ufd", "ufdl"],
  "application/vnd.uiq.theme": ["utz"],
  "application/vnd.umajin": ["umj"],
  "application/vnd.unity": ["unityweb"],
  "application/vnd.uoml+xml": ["uoml"],
  "application/vnd.vcx": ["vcx"],
  "application/vnd.visio": ["vsd", "vst", "vss", "vsw"],
  "application/vnd.visionary": ["vis"],
  "application/vnd.vsf": ["vsf"],
  "application/vnd.wap.wbxml": ["wbxml"],
  "application/vnd.wap.wmlc": ["wmlc"],
  "application/vnd.wap.wmlscriptc": ["wmlsc"],
  "application/vnd.webturbo": ["wtb"],
  "application/vnd.wolfram.player": ["nbp"],
  "application/vnd.wordperfect": ["wpd"],
  "application/vnd.wqd": ["wqd"],
  "application/vnd.wt.stf": ["stf"],
  "application/vnd.xara": ["xar"],
  "application/vnd.xfdl": ["xfdl"],
  "application/vnd.yamaha.hv-dic": ["hvd"],
  "application/vnd.yamaha.hv-script": ["hvs"],
  "application/vnd.yamaha.hv-voice": ["hvp"],
  "application/vnd.yamaha.openscoreformat": ["osf"],
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": ["osfpvg"],
  "application/vnd.yamaha.smaf-audio": ["saf"],
  "application/vnd.yamaha.smaf-phrase": ["spf"],
  "application/vnd.yellowriver-custom-menu": ["cmp"],
  "application/vnd.zul": ["zir", "zirz"],
  "application/vnd.zzazz.deck+xml": ["zaz"],
  "application/x-7z-compressed": ["7z"],
  "application/x-abiword": ["abw"],
  "application/x-ace-compressed": ["ace"],
  "application/x-apple-diskimage": ["*dmg"],
  "application/x-arj": ["arj"],
  "application/x-authorware-bin": ["aab", "x32", "u32", "vox"],
  "application/x-authorware-map": ["aam"],
  "application/x-authorware-seg": ["aas"],
  "application/x-bcpio": ["bcpio"],
  "application/x-bdoc": ["*bdoc"],
  "application/x-bittorrent": ["torrent"],
  "application/x-blorb": ["blb", "blorb"],
  "application/x-bzip": ["bz"],
  "application/x-bzip2": ["bz2", "boz"],
  "application/x-cbr": ["cbr", "cba", "cbt", "cbz", "cb7"],
  "application/x-cdlink": ["vcd"],
  "application/x-cfs-compressed": ["cfs"],
  "application/x-chat": ["chat"],
  "application/x-chess-pgn": ["pgn"],
  "application/x-chrome-extension": ["crx"],
  "application/x-cocoa": ["cco"],
  "application/x-conference": ["nsc"],
  "application/x-cpio": ["cpio"],
  "application/x-csh": ["csh"],
  "application/x-debian-package": ["*deb", "udeb"],
  "application/x-dgc-compressed": ["dgc"],
  "application/x-director": ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"],
  "application/x-doom": ["wad"],
  "application/x-dtbncx+xml": ["ncx"],
  "application/x-dtbook+xml": ["dtb"],
  "application/x-dtbresource+xml": ["res"],
  "application/x-dvi": ["dvi"],
  "application/x-envoy": ["evy"],
  "application/x-eva": ["eva"],
  "application/x-font-bdf": ["bdf"],
  "application/x-font-ghostscript": ["gsf"],
  "application/x-font-linux-psf": ["psf"],
  "application/x-font-pcf": ["pcf"],
  "application/x-font-snf": ["snf"],
  "application/x-font-type1": ["pfa", "pfb", "pfm", "afm"],
  "application/x-freearc": ["arc"],
  "application/x-futuresplash": ["spl"],
  "application/x-gca-compressed": ["gca"],
  "application/x-glulx": ["ulx"],
  "application/x-gnumeric": ["gnumeric"],
  "application/x-gramps-xml": ["gramps"],
  "application/x-gtar": ["gtar"],
  "application/x-hdf": ["hdf"],
  "application/x-httpd-php": ["php"],
  "application/x-install-instructions": ["install"],
  "application/x-iso9660-image": ["*iso"],
  "application/x-java-archive-diff": ["jardiff"],
  "application/x-java-jnlp-file": ["jnlp"],
  "application/x-latex": ["latex"],
  "application/x-lua-bytecode": ["luac"],
  "application/x-lzh-compressed": ["lzh", "lha"],
  "application/x-makeself": ["run"],
  "application/x-mie": ["mie"],
  "application/x-mobipocket-ebook": ["prc", "mobi"],
  "application/x-ms-application": ["application"],
  "application/x-ms-shortcut": ["lnk"],
  "application/x-ms-wmd": ["wmd"],
  "application/x-ms-wmz": ["wmz"],
  "application/x-ms-xbap": ["xbap"],
  "application/x-msaccess": ["mdb"],
  "application/x-msbinder": ["obd"],
  "application/x-mscardfile": ["crd"],
  "application/x-msclip": ["clp"],
  "application/x-msdos-program": ["*exe"],
  "application/x-msdownload": ["*exe", "*dll", "com", "bat", "*msi"],
  "application/x-msmediaview": ["mvb", "m13", "m14"],
  "application/x-msmetafile": ["*wmf", "*wmz", "*emf", "emz"],
  "application/x-msmoney": ["mny"],
  "application/x-mspublisher": ["pub"],
  "application/x-msschedule": ["scd"],
  "application/x-msterminal": ["trm"],
  "application/x-mswrite": ["wri"],
  "application/x-netcdf": ["nc", "cdf"],
  "application/x-ns-proxy-autoconfig": ["pac"],
  "application/x-nzb": ["nzb"],
  "application/x-perl": ["pl", "pm"],
  "application/x-pilot": ["*prc", "*pdb"],
  "application/x-pkcs12": ["p12", "pfx"],
  "application/x-pkcs7-certificates": ["p7b", "spc"],
  "application/x-pkcs7-certreqresp": ["p7r"],
  "application/x-rar-compressed": ["rar"],
  "application/x-redhat-package-manager": ["rpm"],
  "application/x-research-info-systems": ["ris"],
  "application/x-sea": ["sea"],
  "application/x-sh": ["sh"],
  "application/x-shar": ["shar"],
  "application/x-shockwave-flash": ["swf"],
  "application/x-silverlight-app": ["xap"],
  "application/x-sql": ["sql"],
  "application/x-stuffit": ["sit"],
  "application/x-stuffitx": ["sitx"],
  "application/x-subrip": ["srt"],
  "application/x-sv4cpio": ["sv4cpio"],
  "application/x-sv4crc": ["sv4crc"],
  "application/x-t3vm-image": ["t3"],
  "application/x-tads": ["gam"],
  "application/x-tar": ["tar"],
  "application/x-tcl": ["tcl", "tk"],
  "application/x-tex": ["tex"],
  "application/x-tex-tfm": ["tfm"],
  "application/x-texinfo": ["texinfo", "texi"],
  "application/x-tgif": ["obj"],
  "application/x-ustar": ["ustar"],
  "application/x-virtualbox-hdd": ["hdd"],
  "application/x-virtualbox-ova": ["ova"],
  "application/x-virtualbox-ovf": ["ovf"],
  "application/x-virtualbox-vbox": ["vbox"],
  "application/x-virtualbox-vbox-extpack": ["vbox-extpack"],
  "application/x-virtualbox-vdi": ["vdi"],
  "application/x-virtualbox-vhd": ["vhd"],
  "application/x-virtualbox-vmdk": ["vmdk"],
  "application/x-wais-source": ["src"],
  "application/x-web-app-manifest+json": ["webapp"],
  "application/x-x509-ca-cert": ["der", "crt", "pem"],
  "application/x-xfig": ["fig"],
  "application/x-xliff+xml": ["xlf"],
  "application/x-xpinstall": ["xpi"],
  "application/x-xz": ["xz"],
  "application/x-zmachine": ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"],
  "audio/vnd.dece.audio": ["uva", "uvva"],
  "audio/vnd.digital-winds": ["eol"],
  "audio/vnd.dra": ["dra"],
  "audio/vnd.dts": ["dts"],
  "audio/vnd.dts.hd": ["dtshd"],
  "audio/vnd.lucent.voice": ["lvp"],
  "audio/vnd.ms-playready.media.pya": ["pya"],
  "audio/vnd.nuera.ecelp4800": ["ecelp4800"],
  "audio/vnd.nuera.ecelp7470": ["ecelp7470"],
  "audio/vnd.nuera.ecelp9600": ["ecelp9600"],
  "audio/vnd.rip": ["rip"],
  "audio/x-aac": ["aac"],
  "audio/x-aiff": ["aif", "aiff", "aifc"],
  "audio/x-caf": ["caf"],
  "audio/x-flac": ["flac"],
  "audio/x-m4a": ["*m4a"],
  "audio/x-matroska": ["mka"],
  "audio/x-mpegurl": ["m3u"],
  "audio/x-ms-wax": ["wax"],
  "audio/x-ms-wma": ["wma"],
  "audio/x-pn-realaudio": ["ram", "ra"],
  "audio/x-pn-realaudio-plugin": ["rmp"],
  "audio/x-realaudio": ["*ra"],
  "audio/x-wav": ["*wav"],
  "chemical/x-cdx": ["cdx"],
  "chemical/x-cif": ["cif"],
  "chemical/x-cmdf": ["cmdf"],
  "chemical/x-cml": ["cml"],
  "chemical/x-csml": ["csml"],
  "chemical/x-xyz": ["xyz"],
  "image/prs.btif": ["btif"],
  "image/prs.pti": ["pti"],
  "image/vnd.adobe.photoshop": ["psd"],
  "image/vnd.airzip.accelerator.azv": ["azv"],
  "image/vnd.dece.graphic": ["uvi", "uvvi", "uvg", "uvvg"],
  "image/vnd.djvu": ["djvu", "djv"],
  "image/vnd.dvb.subtitle": ["*sub"],
  "image/vnd.dwg": ["dwg"],
  "image/vnd.dxf": ["dxf"],
  "image/vnd.fastbidsheet": ["fbs"],
  "image/vnd.fpx": ["fpx"],
  "image/vnd.fst": ["fst"],
  "image/vnd.fujixerox.edmics-mmr": ["mmr"],
  "image/vnd.fujixerox.edmics-rlc": ["rlc"],
  "image/vnd.microsoft.icon": ["ico"],
  "image/vnd.ms-modi": ["mdi"],
  "image/vnd.ms-photo": ["wdp"],
  "image/vnd.net-fpx": ["npx"],
  "image/vnd.tencent.tap": ["tap"],
  "image/vnd.valve.source.texture": ["vtf"],
  "image/vnd.wap.wbmp": ["wbmp"],
  "image/vnd.xiff": ["xif"],
  "image/vnd.zbrush.pcx": ["pcx"],
  "image/x-3ds": ["3ds"],
  "image/x-cmu-raster": ["ras"],
  "image/x-cmx": ["cmx"],
  "image/x-freehand": ["fh", "fhc", "fh4", "fh5", "fh7"],
  "image/x-icon": ["*ico"],
  "image/x-jng": ["jng"],
  "image/x-mrsid-image": ["sid"],
  "image/x-ms-bmp": ["*bmp"],
  "image/x-pcx": ["*pcx"],
  "image/x-pict": ["pic", "pct"],
  "image/x-portable-anymap": ["pnm"],
  "image/x-portable-bitmap": ["pbm"],
  "image/x-portable-graymap": ["pgm"],
  "image/x-portable-pixmap": ["ppm"],
  "image/x-rgb": ["rgb"],
  "image/x-tga": ["tga"],
  "image/x-xbitmap": ["xbm"],
  "image/x-xpixmap": ["xpm"],
  "image/x-xwindowdump": ["xwd"],
  "message/vnd.wfa.wsc": ["wsc"],
  "model/vnd.collada+xml": ["dae"],
  "model/vnd.dwf": ["dwf"],
  "model/vnd.gdl": ["gdl"],
  "model/vnd.gtw": ["gtw"],
  "model/vnd.mts": ["mts"],
  "model/vnd.opengex": ["ogex"],
  "model/vnd.parasolid.transmit.binary": ["x_b"],
  "model/vnd.parasolid.transmit.text": ["x_t"],
  "model/vnd.usdz+zip": ["usdz"],
  "model/vnd.valve.source.compiled-map": ["bsp"],
  "model/vnd.vtu": ["vtu"],
  "text/prs.lines.tag": ["dsc"],
  "text/vnd.curl": ["curl"],
  "text/vnd.curl.dcurl": ["dcurl"],
  "text/vnd.curl.mcurl": ["mcurl"],
  "text/vnd.curl.scurl": ["scurl"],
  "text/vnd.dvb.subtitle": ["sub"],
  "text/vnd.fly": ["fly"],
  "text/vnd.fmi.flexstor": ["flx"],
  "text/vnd.graphviz": ["gv"],
  "text/vnd.in3d.3dml": ["3dml"],
  "text/vnd.in3d.spot": ["spot"],
  "text/vnd.sun.j2me.app-descriptor": ["jad"],
  "text/vnd.wap.wml": ["wml"],
  "text/vnd.wap.wmlscript": ["wmls"],
  "text/x-asm": ["s", "asm"],
  "text/x-c": ["c", "cc", "cxx", "cpp", "h", "hh", "dic"],
  "text/x-component": ["htc"],
  "text/x-fortran": ["f", "for", "f77", "f90"],
  "text/x-handlebars-template": ["hbs"],
  "text/x-java-source": ["java"],
  "text/x-lua": ["lua"],
  "text/x-markdown": ["mkd"],
  "text/x-nfo": ["nfo"],
  "text/x-opml": ["opml"],
  "text/x-org": ["*org"],
  "text/x-pascal": ["p", "pas"],
  "text/x-processing": ["pde"],
  "text/x-sass": ["sass"],
  "text/x-scss": ["scss"],
  "text/x-setext": ["etx"],
  "text/x-sfv": ["sfv"],
  "text/x-suse-ymp": ["ymp"],
  "text/x-uuencode": ["uu"],
  "text/x-vcalendar": ["vcs"],
  "text/x-vcard": ["vcf"],
  "video/vnd.dece.hd": ["uvh", "uvvh"],
  "video/vnd.dece.mobile": ["uvm", "uvvm"],
  "video/vnd.dece.pd": ["uvp", "uvvp"],
  "video/vnd.dece.sd": ["uvs", "uvvs"],
  "video/vnd.dece.video": ["uvv", "uvvv"],
  "video/vnd.dvb.file": ["dvb"],
  "video/vnd.fvt": ["fvt"],
  "video/vnd.mpegurl": ["mxu", "m4u"],
  "video/vnd.ms-playready.media.pyv": ["pyv"],
  "video/vnd.uvvu.mp4": ["uvu", "uvvu"],
  "video/vnd.vivo": ["viv"],
  "video/x-f4v": ["f4v"],
  "video/x-fli": ["fli"],
  "video/x-flv": ["flv"],
  "video/x-m4v": ["m4v"],
  "video/x-matroska": ["mkv", "mk3d", "mks"],
  "video/x-mng": ["mng"],
  "video/x-ms-asf": ["asf", "asx"],
  "video/x-ms-vob": ["vob"],
  "video/x-ms-wm": ["wm"],
  "video/x-ms-wmv": ["wmv"],
  "video/x-ms-wmx": ["wmx"],
  "video/x-ms-wvx": ["wvx"],
  "video/x-msvideo": ["avi"],
  "video/x-sgi-movie": ["movie"],
  "video/x-smv": ["smv"],
  "x-conference/x-cooltalk": ["ice"]
};

var mime = new Mime_1(standard, other);

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

var prettyBytes = num => {
  if (!Number.isFinite(num)) {
    throw new TypeError(`Expected a finite number, got ${typeof num}: ${num}`);
  }

  const neg = num < 0;

  if (neg) {
    num = -num;
  }

  if (num < 1) {
    return (neg ? '-' : '') + num + ' B';
  }

  const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), UNITS.length - 1);
  const numStr = Number((num / Math.pow(1000, exponent)).toPrecision(3));
  const unit = UNITS[exponent];
  return (neg ? '-' : '') + numStr + ' ' + unit;
};

var es5 = createCommonjsModule(function (module) {
var isES5 = function () {

  return this === undefined;
}();

if (isES5) {
  module.exports = {
    freeze: Object.freeze,
    defineProperty: Object.defineProperty,
    getDescriptor: Object.getOwnPropertyDescriptor,
    keys: Object.keys,
    names: Object.getOwnPropertyNames,
    getPrototypeOf: Object.getPrototypeOf,
    isArray: Array.isArray,
    isES5: isES5,
    propertyIsWritable: function (obj, prop) {
      var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      return !!(!descriptor || descriptor.writable || descriptor.set);
    }
  };
} else {
  var has = {}.hasOwnProperty;
  var str = {}.toString;
  var proto = {}.constructor.prototype;

  var ObjectKeys = function (o) {
    var ret = [];

    for (var key in o) {
      if (has.call(o, key)) {
        ret.push(key);
      }
    }

    return ret;
  };

  var ObjectGetDescriptor = function (o, key) {
    return {
      value: o[key]
    };
  };

  var ObjectDefineProperty = function (o, key, desc) {
    o[key] = desc.value;
    return o;
  };

  var ObjectFreeze = function (obj) {
    return obj;
  };

  var ObjectGetPrototypeOf = function (obj) {
    try {
      return Object(obj).constructor.prototype;
    } catch (e) {
      return proto;
    }
  };

  var ArrayIsArray = function (obj) {
    try {
      return str.call(obj) === "[object Array]";
    } catch (e) {
      return false;
    }
  };

  module.exports = {
    isArray: ArrayIsArray,
    keys: ObjectKeys,
    names: ObjectKeys,
    defineProperty: ObjectDefineProperty,
    getDescriptor: ObjectGetDescriptor,
    freeze: ObjectFreeze,
    getPrototypeOf: ObjectGetPrototypeOf,
    isES5: isES5,
    propertyIsWritable: function () {
      return true;
    }
  };
}
});
var es5_1 = es5.freeze;
var es5_2 = es5.defineProperty;
var es5_3 = es5.getDescriptor;
var es5_4 = es5.keys;
var es5_5 = es5.names;
var es5_6 = es5.getPrototypeOf;
var es5_7 = es5.isArray;
var es5_8 = es5.isES5;
var es5_9 = es5.propertyIsWritable;

var canEvaluate = typeof navigator == "undefined";
var errorObj = {
  e: {}
};
var tryCatchTarget;
var globalObject = typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof commonjsGlobal !== "undefined" ? commonjsGlobal : commonjsGlobal !== undefined ? commonjsGlobal : null;

function tryCatcher() {
  try {
    var target = tryCatchTarget;
    tryCatchTarget = null;
    return target.apply(this, arguments);
  } catch (e) {
    errorObj.e = e;
    return errorObj;
  }
}

function tryCatch(fn) {
  tryCatchTarget = fn;
  return tryCatcher;
}

var inherits = function (Child, Parent) {
  var hasProp = {}.hasOwnProperty;

  function T() {
    this.constructor = Child;
    this.constructor$ = Parent;

    for (var propertyName in Parent.prototype) {
      if (hasProp.call(Parent.prototype, propertyName) && propertyName.charAt(propertyName.length - 1) !== "$") {
        this[propertyName + "$"] = Parent.prototype[propertyName];
      }
    }
  }

  T.prototype = Parent.prototype;
  Child.prototype = new T();
  return Child.prototype;
};

function isPrimitive(val) {
  return val == null || val === true || val === false || typeof val === "string" || typeof val === "number";
}

function isObject$3(value) {
  return typeof value === "function" || typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
  if (!isPrimitive(maybeError)) return maybeError;
  return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
  var len = target.length;
  var ret = new Array(len + 1);
  var i;

  for (i = 0; i < len; ++i) {
    ret[i] = target[i];
  }

  ret[i] = appendee;
  return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
  if (es5.isES5) {
    var desc = Object.getOwnPropertyDescriptor(obj, key);

    if (desc != null) {
      return desc.get == null && desc.set == null ? desc.value : defaultValue;
    }
  } else {
    return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
  }
}

function notEnumerableProp(obj, name, value) {
  if (isPrimitive(obj)) return obj;
  var descriptor = {
    value: value,
    configurable: true,
    enumerable: false,
    writable: true
  };
  es5.defineProperty(obj, name, descriptor);
  return obj;
}

function thrower(r) {
  throw r;
}

var inheritedDataKeys = function () {
  var excludedPrototypes = [Array.prototype, Object.prototype, Function.prototype];

  var isExcludedProto = function (val) {
    for (var i = 0; i < excludedPrototypes.length; ++i) {
      if (excludedPrototypes[i] === val) {
        return true;
      }
    }

    return false;
  };

  if (es5.isES5) {
    var getKeys = Object.getOwnPropertyNames;
    return function (obj) {
      var ret = [];
      var visitedKeys = Object.create(null);

      while (obj != null && !isExcludedProto(obj)) {
        var keys;

        try {
          keys = getKeys(obj);
        } catch (e) {
          return ret;
        }

        for (var i = 0; i < keys.length; ++i) {
          var key = keys[i];
          if (visitedKeys[key]) continue;
          visitedKeys[key] = true;
          var desc = Object.getOwnPropertyDescriptor(obj, key);

          if (desc != null && desc.get == null && desc.set == null) {
            ret.push(key);
          }
        }

        obj = es5.getPrototypeOf(obj);
      }

      return ret;
    };
  } else {
    var hasProp = {}.hasOwnProperty;
    return function (obj) {
      if (isExcludedProto(obj)) return [];
      var ret = [];
      /*jshint forin:false */

      enumeration: for (var key in obj) {
        if (hasProp.call(obj, key)) {
          ret.push(key);
        } else {
          for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (hasProp.call(excludedPrototypes[i], key)) {
              continue enumeration;
            }
          }

          ret.push(key);
        }
      }

      return ret;
    };
  }
}();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;

function isClass(fn) {
  try {
    if (typeof fn === "function") {
      var keys = es5.names(fn.prototype);
      var hasMethods = es5.isES5 && keys.length > 1;
      var hasMethodsOtherThanConstructor = keys.length > 0 && !(keys.length === 1 && keys[0] === "constructor");
      var hasThisAssignmentAndStaticMethods = thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

      if (hasMethods || hasMethodsOtherThanConstructor || hasThisAssignmentAndStaticMethods) {
        return true;
      }
    }

    return false;
  } catch (e) {
    return false;
  }
}

function toFastProperties(obj) {
  return obj;
  eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;

function isIdentifier(str) {
  return rident.test(str);
}

function filledRange(count, prefix, suffix) {
  var ret = new Array(count);

  for (var i = 0; i < count; ++i) {
    ret[i] = prefix + i + suffix;
  }

  return ret;
}

function safeToString(obj) {
  try {
    return obj + "";
  } catch (e) {
    return "[no string representation]";
  }
}

function isError(obj) {
  return obj instanceof Error || obj !== null && typeof obj === "object" && typeof obj.message === "string" && typeof obj.name === "string";
}

function markAsOriginatingFromRejection(e) {
  try {
    notEnumerableProp(e, "isOperational", true);
  } catch (ignore) {}
}

function originatesFromRejection(e) {
  if (e == null) return false;
  return e instanceof Error["__BluebirdErrorTypes__"].OperationalError || e["isOperational"] === true;
}

function canAttachTrace(obj) {
  return isError(obj) && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = function () {
  if (!("stack" in new Error())) {
    return function (value) {
      if (canAttachTrace(value)) return value;

      try {
        throw new Error(safeToString(value));
      } catch (err) {
        return err;
      }
    };
  } else {
    return function (value) {
      if (canAttachTrace(value)) return value;
      return new Error(safeToString(value));
    };
  }
}();

function classString(obj) {
  return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
  var keys = es5.names(from);

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];

    if (filter(key)) {
      try {
        es5.defineProperty(to, key, es5.getDescriptor(from, key));
      } catch (ignore) {}
    }
  }
}

var asArray = function (v) {
  if (es5.isArray(v)) {
    return v;
  }

  return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
  var ArrayFrom = typeof Array.from === "function" ? function (v) {
    return Array.from(v);
  } : function (v) {
    var ret = [];
    var it = v[Symbol.iterator]();
    var itResult;

    while (!(itResult = it.next()).done) {
      ret.push(itResult.value);
    }

    return ret;
  };

  asArray = function (v) {
    if (es5.isArray(v)) {
      return v;
    } else if (v != null && typeof v[Symbol.iterator] === "function") {
      return ArrayFrom(v);
    }

    return null;
  };
}

var isNode = typeof process !== "undefined" && classString(process).toLowerCase() === "[object process]";
var hasEnvVariables = typeof process !== "undefined" && typeof process.env !== "undefined";

function env(key) {
  return hasEnvVariables ? process.env[key] : undefined;
}

function getNativePromise() {
  if (typeof Promise === "function") {
    try {
      var promise = new Promise(function () {});

      if ({}.toString.call(promise) === "[object Promise]") {
        return Promise;
      }
    } catch (e) {}
  }
}

function domainBind(self, cb) {
  return self.bind(cb);
}

var ret = {
  isClass: isClass,
  isIdentifier: isIdentifier,
  inheritedDataKeys: inheritedDataKeys,
  getDataPropertyOrDefault: getDataPropertyOrDefault,
  thrower: thrower,
  isArray: es5.isArray,
  asArray: asArray,
  notEnumerableProp: notEnumerableProp,
  isPrimitive: isPrimitive,
  isObject: isObject$3,
  isError: isError,
  canEvaluate: canEvaluate,
  errorObj: errorObj,
  tryCatch: tryCatch,
  inherits: inherits,
  withAppended: withAppended,
  maybeWrapAsError: maybeWrapAsError,
  toFastProperties: toFastProperties,
  filledRange: filledRange,
  toString: safeToString,
  canAttachTrace: canAttachTrace,
  ensureErrorObject: ensureErrorObject,
  originatesFromRejection: originatesFromRejection,
  markAsOriginatingFromRejection: markAsOriginatingFromRejection,
  classString: classString,
  copyDescriptors: copyDescriptors,
  hasDevTools: typeof chrome !== "undefined" && chrome && typeof chrome.loadTimes === "function",
  isNode: isNode,
  hasEnvVariables: hasEnvVariables,
  env: env,
  global: globalObject,
  getNativePromise: getNativePromise,
  domainBind: domainBind
};

ret.isRecentNode = ret.isNode && function () {
  var version;

  if (process.versions && process.versions.node) {
    version = process.versions.node.split(".").map(Number);
  } else if (process.version) {
    version = process.version.split(".").map(Number);
  }

  return version[0] === 0 && version[1] > 10 || version[0] > 0;
}();

if (ret.isNode) ret.toFastProperties(process);

try {
  throw new Error();
} catch (e) {
  ret.lastLineError = e;
}

var util = ret;

var schedule;

var noAsyncScheduler = function () {
  throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};

var NativePromise = util.getNativePromise();

if (util.isNode && typeof MutationObserver === "undefined") {
  var GlobalSetImmediate = commonjsGlobal.setImmediate;
  var ProcessNextTick = process.nextTick;
  schedule = util.isRecentNode ? function (fn) {
    GlobalSetImmediate.call(commonjsGlobal, fn);
  } : function (fn) {
    ProcessNextTick.call(process, fn);
  };
} else if (typeof NativePromise === "function" && typeof NativePromise.resolve === "function") {
  var nativePromise = NativePromise.resolve();

  schedule = function (fn) {
    nativePromise.then(fn);
  };
} else if (typeof MutationObserver !== "undefined" && !(typeof window !== "undefined" && window.navigator && (window.navigator.standalone || window.cordova)) && "classList" in document.documentElement) {
  schedule = function () {
    var div = document.createElement("div");
    var opts = {
      attributes: true
    };
    var toggleScheduled = false;
    var div2 = document.createElement("div");
    var o2 = new MutationObserver(function () {
      div.classList.toggle("foo");
      toggleScheduled = false;
    });
    o2.observe(div2, opts);

    var scheduleToggle = function () {
      if (toggleScheduled) return;
      toggleScheduled = true;
      div2.classList.toggle("foo");
    };

    return function schedule(fn) {
      var o = new MutationObserver(function () {
        o.disconnect();
        fn();
      });
      o.observe(div, opts);
      scheduleToggle();
    };
  }();
} else if (typeof setImmediate !== "undefined") {
  schedule = function (fn) {
    setImmediate(fn);
  };
} else if (typeof setTimeout !== "undefined") {
  schedule = function (fn) {
    setTimeout(fn, 0);
  };
} else {
  schedule = noAsyncScheduler;
}

var schedule_1 = schedule;

function arrayMove(src, srcIndex, dst, dstIndex, len) {
  for (var j = 0; j < len; ++j) {
    dst[j + dstIndex] = src[j + srcIndex];
    src[j + srcIndex] = void 0;
  }
}

function Queue$1(capacity) {
  this._capacity = capacity;
  this._length = 0;
  this._front = 0;
}

Queue$1.prototype._willBeOverCapacity = function (size) {
  return this._capacity < size;
};

Queue$1.prototype._pushOne = function (arg) {
  var length = this.length();

  this._checkCapacity(length + 1);

  var i = this._front + length & this._capacity - 1;
  this[i] = arg;
  this._length = length + 1;
};

Queue$1.prototype.push = function (fn, receiver, arg) {
  var length = this.length() + 3;

  if (this._willBeOverCapacity(length)) {
    this._pushOne(fn);

    this._pushOne(receiver);

    this._pushOne(arg);

    return;
  }

  var j = this._front + length - 3;

  this._checkCapacity(length);

  var wrapMask = this._capacity - 1;
  this[j + 0 & wrapMask] = fn;
  this[j + 1 & wrapMask] = receiver;
  this[j + 2 & wrapMask] = arg;
  this._length = length;
};

Queue$1.prototype.shift = function () {
  var front = this._front,
      ret = this[front];
  this[front] = undefined;
  this._front = front + 1 & this._capacity - 1;
  this._length--;
  return ret;
};

Queue$1.prototype.length = function () {
  return this._length;
};

Queue$1.prototype._checkCapacity = function (size) {
  if (this._capacity < size) {
    this._resizeTo(this._capacity << 1);
  }
};

Queue$1.prototype._resizeTo = function (capacity) {
  var oldCapacity = this._capacity;
  this._capacity = capacity;
  var front = this._front;
  var length = this._length;
  var moveItemsCount = front + length & oldCapacity - 1;
  arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

var queue$1 = Queue$1;

var firstLineError;

try {
  throw new Error();
} catch (e) {
  firstLineError = e;
}







function Async() {
  this._customScheduler = false;
  this._isTickUsed = false;
  this._lateQueue = new queue$1(16);
  this._normalQueue = new queue$1(16);
  this._haveDrainedQueues = false;
  this._trampolineEnabled = true;
  var self = this;

  this.drainQueues = function () {
    self._drainQueues();
  };

  this._schedule = schedule_1;
}

Async.prototype.setScheduler = function (fn) {
  var prev = this._schedule;
  this._schedule = fn;
  this._customScheduler = true;
  return prev;
};

Async.prototype.hasCustomScheduler = function () {
  return this._customScheduler;
};

Async.prototype.enableTrampoline = function () {
  this._trampolineEnabled = true;
};

Async.prototype.disableTrampolineIfNecessary = function () {
  if (util.hasDevTools) {
    this._trampolineEnabled = false;
  }
};

Async.prototype.haveItemsQueued = function () {
  return this._isTickUsed || this._haveDrainedQueues;
};

Async.prototype.fatalError = function (e, isNode) {
  if (isNode) {
    process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e) + "\n");
    process.exit(2);
  } else {
    this.throwLater(e);
  }
};

Async.prototype.throwLater = function (fn, arg) {
  if (arguments.length === 1) {
    arg = fn;

    fn = function () {
      throw arg;
    };
  }

  if (typeof setTimeout !== "undefined") {
    setTimeout(function () {
      fn(arg);
    }, 0);
  } else try {
    this._schedule(function () {
      fn(arg);
    });
  } catch (e) {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
  }
};

function AsyncInvokeLater(fn, receiver, arg) {
  this._lateQueue.push(fn, receiver, arg);

  this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
  this._normalQueue.push(fn, receiver, arg);

  this._queueTick();
}

function AsyncSettlePromises(promise) {
  this._normalQueue._pushOne(promise);

  this._queueTick();
}

if (!util.hasDevTools) {
  Async.prototype.invokeLater = AsyncInvokeLater;
  Async.prototype.invoke = AsyncInvoke;
  Async.prototype.settlePromises = AsyncSettlePromises;
} else {
  Async.prototype.invokeLater = function (fn, receiver, arg) {
    if (this._trampolineEnabled) {
      AsyncInvokeLater.call(this, fn, receiver, arg);
    } else {
      this._schedule(function () {
        setTimeout(function () {
          fn.call(receiver, arg);
        }, 100);
      });
    }
  };

  Async.prototype.invoke = function (fn, receiver, arg) {
    if (this._trampolineEnabled) {
      AsyncInvoke.call(this, fn, receiver, arg);
    } else {
      this._schedule(function () {
        fn.call(receiver, arg);
      });
    }
  };

  Async.prototype.settlePromises = function (promise) {
    if (this._trampolineEnabled) {
      AsyncSettlePromises.call(this, promise);
    } else {
      this._schedule(function () {
        promise._settlePromises();
      });
    }
  };
}

function _drainQueue(queue) {
  while (queue.length() > 0) {
    _drainQueueStep(queue);
  }
}

function _drainQueueStep(queue) {
  var fn = queue.shift();

  if (typeof fn !== "function") {
    fn._settlePromises();
  } else {
    var receiver = queue.shift();
    var arg = queue.shift();
    fn.call(receiver, arg);
  }
}

Async.prototype._drainQueues = function () {
  _drainQueue(this._normalQueue);

  this._reset();

  this._haveDrainedQueues = true;

  _drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
  if (!this._isTickUsed) {
    this._isTickUsed = true;

    this._schedule(this.drainQueues);
  }
};

Async.prototype._reset = function () {
  this._isTickUsed = false;
};

var async = Async;
var firstLineError_1 = firstLineError;
async.firstLineError = firstLineError_1;

var Objectfreeze = es5.freeze;



var inherits$1 = util.inherits;
var notEnumerableProp$1 = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
  function SubError(message) {
    if (!(this instanceof SubError)) return new SubError(message);
    notEnumerableProp$1(this, "message", typeof message === "string" ? message : defaultMessage);
    notEnumerableProp$1(this, "name", nameProperty);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      Error.call(this);
    }
  }

  inherits$1(SubError, Error);
  return SubError;
}

var _TypeError, _RangeError;

var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError$1 = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");

try {
  _TypeError = TypeError;
  _RangeError = RangeError;
} catch (e) {
  _TypeError = subError("TypeError", "type error");
  _RangeError = subError("RangeError", "range error");
}

var methods$1 = ("join pop push shift unshift slice filter forEach some " + "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i$1 = 0; i$1 < methods$1.length; ++i$1) {
  if (typeof Array.prototype[methods$1[i$1]] === "function") {
    AggregateError.prototype[methods$1[i$1]] = Array.prototype[methods$1[i$1]];
  }
}

es5.defineProperty(AggregateError.prototype, "length", {
  value: 0,
  configurable: false,
  writable: true,
  enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;

AggregateError.prototype.toString = function () {
  var indent = Array(level * 4 + 1).join(" ");
  var ret = "\n" + indent + "AggregateError of:" + "\n";
  level++;
  indent = Array(level * 4 + 1).join(" ");

  for (var i = 0; i < this.length; ++i) {
    var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
    var lines = str.split("\n");

    for (var j = 0; j < lines.length; ++j) {
      lines[j] = indent + lines[j];
    }

    str = lines.join("\n");
    ret += str + "\n";
  }

  level--;
  return ret;
};

function OperationalError(message) {
  if (!(this instanceof OperationalError)) return new OperationalError(message);
  notEnumerableProp$1(this, "name", "OperationalError");
  notEnumerableProp$1(this, "message", message);
  this.cause = message;
  this["isOperational"] = true;

  if (message instanceof Error) {
    notEnumerableProp$1(this, "message", message.message);
    notEnumerableProp$1(this, "stack", message.stack);
  } else if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  }
}

inherits$1(OperationalError, Error);
var errorTypes = Error["__BluebirdErrorTypes__"];

if (!errorTypes) {
  errorTypes = Objectfreeze({
    CancellationError: CancellationError,
    TimeoutError: TimeoutError$1,
    OperationalError: OperationalError,
    RejectionError: OperationalError,
    AggregateError: AggregateError
  });
  es5.defineProperty(Error, "__BluebirdErrorTypes__", {
    value: errorTypes,
    writable: false,
    enumerable: false,
    configurable: false
  });
}

var errors = {
  Error: Error,
  TypeError: _TypeError,
  RangeError: _RangeError,
  CancellationError: errorTypes.CancellationError,
  OperationalError: errorTypes.OperationalError,
  TimeoutError: errorTypes.TimeoutError,
  AggregateError: errorTypes.AggregateError,
  Warning: Warning
};

var thenables = function (Promise, INTERNAL) {
  var util$1 = util;

  var errorObj = util$1.errorObj;
  var isObject = util$1.isObject;

  function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
      if (obj instanceof Promise) return obj;
      var then = getThen(obj);

      if (then === errorObj) {
        if (context) context._pushContext();
        var ret = Promise.reject(then.e);
        if (context) context._popContext();
        return ret;
      } else if (typeof then === "function") {
        if (isAnyBluebirdPromise(obj)) {
          var ret = new Promise(INTERNAL);

          obj._then(ret._fulfill, ret._reject, undefined, ret, null);

          return ret;
        }

        return doThenable(obj, then, context);
      }
    }

    return obj;
  }

  function doGetThen(obj) {
    return obj.then;
  }

  function getThen(obj) {
    try {
      return doGetThen(obj);
    } catch (e) {
      errorObj.e = e;
      return errorObj;
    }
  }

  var hasProp = {}.hasOwnProperty;

  function isAnyBluebirdPromise(obj) {
    try {
      return hasProp.call(obj, "_promise0");
    } catch (e) {
      return false;
    }
  }

  function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();

    promise._captureStackTrace();

    if (context) context._popContext();
    var synchronous = true;
    var result = util$1.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
      promise._rejectCallback(result.e, true, true);

      promise = null;
    }

    function resolve(value) {
      if (!promise) return;

      promise._resolveCallback(value);

      promise = null;
    }

    function reject(reason) {
      if (!promise) return;

      promise._rejectCallback(reason, synchronous, true);

      promise = null;
    }

    return ret;
  }

  return tryConvertToPromise;
};

var promise_array = function (Promise, INTERNAL, tryConvertToPromise, apiRejection, Proxyable) {
  var util$1 = util;

  function toResolutionValue(val) {
    switch (val) {
      case -2:
        return [];

      case -3:
        return {};

      case -6:
        return new Map();
    }
  }

  function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);

    if (values instanceof Promise) {
      promise._propagateFrom(values, 3);
    }

    promise._setOnCancel(this);

    this._values = values;
    this._length = 0;
    this._totalResolved = 0;

    this._init(undefined, -2);
  }

  util$1.inherits(PromiseArray, Proxyable);

  PromiseArray.prototype.length = function () {
    return this._length;
  };

  PromiseArray.prototype.promise = function () {
    return this._promise;
  };

  PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);

    if (values instanceof Promise) {
      values = values._target();
      var bitField = values._bitField;
      this._values = values;

      if ((bitField & 50397184) === 0) {
        this._promise._setAsyncGuaranteed();

        return values._then(init, this._reject, undefined, this, resolveValueIfEmpty);
      } else if ((bitField & 33554432) !== 0) {
        values = values._value();
      } else if ((bitField & 16777216) !== 0) {
        return this._reject(values._reason());
      } else {
        return this._cancel();
      }
    }

    values = util$1.asArray(values);

    if (values === null) {
      var err = apiRejection("expecting an array or an iterable object but got " + util$1.classString(values)).reason();

      this._promise._rejectCallback(err, false);

      return;
    }

    if (values.length === 0) {
      if (resolveValueIfEmpty === -5) {
        this._resolveEmptyArray();
      } else {
        this._resolve(toResolutionValue(resolveValueIfEmpty));
      }

      return;
    }

    this._iterate(values);
  };

  PromiseArray.prototype._iterate = function (values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;

    for (var i = 0; i < len; ++i) {
      var maybePromise = tryConvertToPromise(values[i], result);

      if (maybePromise instanceof Promise) {
        maybePromise = maybePromise._target();
        bitField = maybePromise._bitField;
      } else {
        bitField = null;
      }

      if (isResolved) {
        if (bitField !== null) {
          maybePromise.suppressUnhandledRejections();
        }
      } else if (bitField !== null) {
        if ((bitField & 50397184) === 0) {
          maybePromise._proxy(this, i);

          this._values[i] = maybePromise;
        } else if ((bitField & 33554432) !== 0) {
          isResolved = this._promiseFulfilled(maybePromise._value(), i);
        } else if ((bitField & 16777216) !== 0) {
          isResolved = this._promiseRejected(maybePromise._reason(), i);
        } else {
          isResolved = this._promiseCancelled(i);
        }
      } else {
        isResolved = this._promiseFulfilled(maybePromise, i);
      }
    }

    if (!isResolved) result._setAsyncGuaranteed();
  };

  PromiseArray.prototype._isResolved = function () {
    return this._values === null;
  };

  PromiseArray.prototype._resolve = function (value) {
    this._values = null;

    this._promise._fulfill(value);
  };

  PromiseArray.prototype._cancel = function () {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;

    this._promise._cancel();
  };

  PromiseArray.prototype._reject = function (reason) {
    this._values = null;

    this._promise._rejectCallback(reason, false);
  };

  PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;

    if (totalResolved >= this._length) {
      this._resolve(this._values);

      return true;
    }

    return false;
  };

  PromiseArray.prototype._promiseCancelled = function () {
    this._cancel();

    return true;
  };

  PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;

    this._reject(reason);

    return true;
  };

  PromiseArray.prototype._resultCancelled = function () {
    if (this._isResolved()) return;
    var values = this._values;

    this._cancel();

    if (values instanceof Promise) {
      values.cancel();
    } else {
      for (var i = 0; i < values.length; ++i) {
        if (values[i] instanceof Promise) {
          values[i].cancel();
        }
      }
    }
  };

  PromiseArray.prototype.shouldCopyValues = function () {
    return true;
  };

  PromiseArray.prototype.getActualLength = function (len) {
    return len;
  };

  return PromiseArray;
};

var context = function (Promise) {
  var longStackTraces = false;
  var contextStack = [];

  Promise.prototype._promiseCreated = function () {};

  Promise.prototype._pushContext = function () {};

  Promise.prototype._popContext = function () {
    return null;
  };

  Promise._peekContext = Promise.prototype._peekContext = function () {};

  function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
  }

  Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
      this._trace._promiseCreated = null;
      contextStack.push(this._trace);
    }
  };

  Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
      var trace = contextStack.pop();
      var ret = trace._promiseCreated;
      trace._promiseCreated = null;
      return ret;
    }

    return null;
  };

  function createContext() {
    if (longStackTraces) return new Context();
  }

  function peekContext() {
    var lastIndex = contextStack.length - 1;

    if (lastIndex >= 0) {
      return contextStack[lastIndex];
    }

    return undefined;
  }

  Context.CapturedTrace = null;
  Context.create = createContext;

  Context.deactivateLongStackTraces = function () {};

  Context.activateLongStackTraces = function () {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;

    Context.deactivateLongStackTraces = function () {
      Promise.prototype._pushContext = Promise_pushContext;
      Promise.prototype._popContext = Promise_popContext;
      Promise._peekContext = Promise_PeekContext;
      Promise.prototype._peekContext = Promise_peekContext;
      Promise.prototype._promiseCreated = Promise_promiseCreated;
      longStackTraces = false;
    };

    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;

    Promise.prototype._promiseCreated = function () {
      var ctx = this._peekContext();

      if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
  };

  return Context;
};

var debuggability = function (Promise, Context) {
  var getDomain = Promise._getDomain;
  var async = Promise._async;

  var Warning = errors.Warning;

  var util$1 = util;

  var es5$1 = es5;

  var canAttachTrace = util$1.canAttachTrace;
  var unhandledRejectionHandled;
  var possiblyUnhandledRejection;
  var bluebirdFramePattern = /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
  var nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
  var parseLinePattern = /[\/<\(](.+?):(\d+):(\d+)\)?\s*$/;
  var stackFramePattern = null;
  var formatStack = null;
  var indentStackFrames = false;
  var printWarning;
  var debugging = !!(util$1.env("BLUEBIRD_DEBUG") != 0 && ( util$1.env("BLUEBIRD_DEBUG") || util$1.env("NODE_ENV") === "development"));
  var warnings = !!(util$1.env("BLUEBIRD_WARNINGS") != 0 && (debugging || util$1.env("BLUEBIRD_WARNINGS")));
  var longStackTraces = !!(util$1.env("BLUEBIRD_LONG_STACK_TRACES") != 0 && (debugging || util$1.env("BLUEBIRD_LONG_STACK_TRACES")));
  var wForgottenReturn = util$1.env("BLUEBIRD_W_FORGOTTEN_RETURN") != 0 && (warnings || !!util$1.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

  Promise.prototype.suppressUnhandledRejections = function () {
    var target = this._target();

    target._bitField = target._bitField & ~1048576 | 524288;
  };

  Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;

    this._setRejectionIsUnhandled();

    var self = this;
    setTimeout(function () {
      self._notifyUnhandledRejection();
    }, 1);
  };

  Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled", unhandledRejectionHandled, undefined, this);
  };

  Promise.prototype._setReturnedNonUndefined = function () {
    this._bitField = this._bitField | 268435456;
  };

  Promise.prototype._returnedNonUndefined = function () {
    return (this._bitField & 268435456) !== 0;
  };

  Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
      var reason = this._settledValue();

      this._setUnhandledRejectionIsNotified();

      fireRejectionEvent("unhandledRejection", possiblyUnhandledRejection, reason, this);
    }
  };

  Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
  };

  Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & ~262144;
  };

  Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
  };

  Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
  };

  Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & ~1048576;

    if (this._isUnhandledRejectionNotified()) {
      this._unsetUnhandledRejectionIsNotified();

      this._notifyUnhandledRejectionIsHandled();
    }
  };

  Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
  };

  Promise.prototype._warn = function (message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
  };

  Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection = typeof fn === "function" ? domain === null ? fn : util$1.domainBind(domain, fn) : undefined;
  };

  Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled = typeof fn === "function" ? domain === null ? fn : util$1.domainBind(domain, fn) : undefined;
  };

  var disableLongStackTraces = function () {};

  Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
      throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    if (!config.longStackTraces && longStackTracesIsSupported()) {
      var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
      var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
      var Promise_dereferenceTrace = Promise.prototype._dereferenceTrace;
      config.longStackTraces = true;

      disableLongStackTraces = function () {
        if (async.haveItemsQueued() && !config.longStackTraces) {
          throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
        }

        Promise.prototype._captureStackTrace = Promise_captureStackTrace;
        Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
        Promise.prototype._dereferenceTrace = Promise_dereferenceTrace;
        Context.deactivateLongStackTraces();
        async.enableTrampoline();
        config.longStackTraces = false;
      };

      Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
      Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
      Promise.prototype._dereferenceTrace = longStackTracesDereferenceTrace;
      Context.activateLongStackTraces();
      async.disableTrampolineIfNecessary();
    }
  };

  Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
  };

  var fireDomEvent = function () {
    try {
      if (typeof CustomEvent === "function") {
        var event = new CustomEvent("CustomEvent");
        util$1.global.dispatchEvent(event);
        return function (name, event) {
          var eventData = {
            detail: event,
            cancelable: true
          };
          es5$1.defineProperty(eventData, "promise", {
            value: event.promise
          });
          es5$1.defineProperty(eventData, "reason", {
            value: event.reason
          });
          var domEvent = new CustomEvent(name.toLowerCase(), eventData);
          return !util$1.global.dispatchEvent(domEvent);
        };
      } else if (typeof Event === "function") {
        var event = new Event("CustomEvent");
        util$1.global.dispatchEvent(event);
        return function (name, event) {
          var domEvent = new Event(name.toLowerCase(), {
            cancelable: true
          });
          domEvent.detail = event;
          es5$1.defineProperty(domEvent, "promise", {
            value: event.promise
          });
          es5$1.defineProperty(domEvent, "reason", {
            value: event.reason
          });
          return !util$1.global.dispatchEvent(domEvent);
        };
      } else {
        var event = document.createEvent("CustomEvent");
        event.initCustomEvent("testingtheevent", false, true, {});
        util$1.global.dispatchEvent(event);
        return function (name, event) {
          var domEvent = document.createEvent("CustomEvent");
          domEvent.initCustomEvent(name.toLowerCase(), false, true, event);
          return !util$1.global.dispatchEvent(domEvent);
        };
      }
    } catch (e) {}

    return function () {
      return false;
    };
  }();

  var fireGlobalEvent = function () {
    if (util$1.isNode) {
      return function () {
        return process.emit.apply(process, arguments);
      };
    } else {
      if (!util$1.global) {
        return function () {
          return false;
        };
      }

      return function (name) {
        var methodName = "on" + name.toLowerCase();
        var method = util$1.global[methodName];
        if (!method) return false;
        method.apply(util$1.global, [].slice.call(arguments, 1));
        return true;
      };
    }
  }();

  function generatePromiseLifecycleEventObject(name, promise) {
    return {
      promise: promise
    };
  }

  var eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function (name, promise, child) {
      return {
        promise: promise,
        child: child
      };
    },
    warning: function (name, warning) {
      return {
        warning: warning
      };
    },
    unhandledRejection: function (name, reason, promise) {
      return {
        reason: reason,
        promise: promise
      };
    },
    rejectionHandled: generatePromiseLifecycleEventObject
  };

  var activeFireEvent = function (name) {
    var globalEventFired = false;

    try {
      globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
      async.throwLater(e);
      globalEventFired = true;
    }

    var domEventFired = false;

    try {
      domEventFired = fireDomEvent(name, eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
      async.throwLater(e);
      domEventFired = true;
    }

    return domEventFired || globalEventFired;
  };

  Promise.config = function (opts) {
    opts = Object(opts);

    if ("longStackTraces" in opts) {
      if (opts.longStackTraces) {
        Promise.longStackTraces();
      } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
        disableLongStackTraces();
      }
    }

    if ("warnings" in opts) {
      var warningsOption = opts.warnings;
      config.warnings = !!warningsOption;
      wForgottenReturn = config.warnings;

      if (util$1.isObject(warningsOption)) {
        if ("wForgottenReturn" in warningsOption) {
          wForgottenReturn = !!warningsOption.wForgottenReturn;
        }
      }
    }

    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
      if (async.haveItemsQueued()) {
        throw new Error("cannot enable cancellation after promises are in use");
      }

      Promise.prototype._clearCancellationData = cancellationClearCancellationData;
      Promise.prototype._propagateFrom = cancellationPropagateFrom;
      Promise.prototype._onCancel = cancellationOnCancel;
      Promise.prototype._setOnCancel = cancellationSetOnCancel;
      Promise.prototype._attachCancellationCallback = cancellationAttachCancellationCallback;
      Promise.prototype._execute = cancellationExecute;
      propagateFromFunction = cancellationPropagateFrom;
      config.cancellation = true;
    }

    if ("monitoring" in opts) {
      if (opts.monitoring && !config.monitoring) {
        config.monitoring = true;
        Promise.prototype._fireEvent = activeFireEvent;
      } else if (!opts.monitoring && config.monitoring) {
        config.monitoring = false;
        Promise.prototype._fireEvent = defaultFireEvent;
      }
    }

    return Promise;
  };

  function defaultFireEvent() {
    return false;
  }

  Promise.prototype._fireEvent = defaultFireEvent;

  Promise.prototype._execute = function (executor, resolve, reject) {
    try {
      executor(resolve, reject);
    } catch (e) {
      return e;
    }
  };

  Promise.prototype._onCancel = function () {};

  Promise.prototype._setOnCancel = function (handler) {
  };

  Promise.prototype._attachCancellationCallback = function (onCancel) {
  };

  Promise.prototype._captureStackTrace = function () {};

  Promise.prototype._attachExtraTrace = function () {};

  Promise.prototype._dereferenceTrace = function () {};

  Promise.prototype._clearCancellationData = function () {};

  Promise.prototype._propagateFrom = function (parent, flags) {
  };

  function cancellationExecute(executor, resolve, reject) {
    var promise = this;

    try {
      executor(resolve, reject, function (onCancel) {
        if (typeof onCancel !== "function") {
          throw new TypeError("onCancel must be a function, got: " + util$1.toString(onCancel));
        }

        promise._attachCancellationCallback(onCancel);
      });
    } catch (e) {
      return e;
    }
  }

  function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;

    var previousOnCancel = this._onCancel();

    if (previousOnCancel !== undefined) {
      if (util$1.isArray(previousOnCancel)) {
        previousOnCancel.push(onCancel);
      } else {
        this._setOnCancel([previousOnCancel, onCancel]);
      }
    } else {
      this._setOnCancel(onCancel);
    }
  }

  function cancellationOnCancel() {
    return this._onCancelField;
  }

  function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
  }

  function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
  }

  function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
      this._cancellationParent = parent;
      var branchesRemainingToCancel = parent._branchesRemainingToCancel;

      if (branchesRemainingToCancel === undefined) {
        branchesRemainingToCancel = 0;
      }

      parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }

    if ((flags & 2) !== 0 && parent._isBound()) {
      this._setBoundTo(parent._boundTo);
    }
  }

  function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
      this._setBoundTo(parent._boundTo);
    }
  }

  var propagateFromFunction = bindingPropagateFrom;

  function boundValueFunction() {
    var ret = this._boundTo;

    if (ret !== undefined) {
      if (ret instanceof Promise) {
        if (ret.isFulfilled()) {
          return ret.value();
        } else {
          return undefined;
        }
      }
    }

    return ret;
  }

  function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
  }

  function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
      var trace = this._trace;

      if (trace !== undefined) {
        if (ignoreSelf) trace = trace._parent;
      }

      if (trace !== undefined) {
        trace.attachExtraTrace(error);
      } else if (!error.__stackCleaned__) {
        var parsed = parseStackAndMessage(error);
        util$1.notEnumerableProp(error, "stack", parsed.message + "\n" + parsed.stack.join("\n"));
        util$1.notEnumerableProp(error, "__stackCleaned__", true);
      }
    }
  }

  function longStackTracesDereferenceTrace() {
    this._trace = undefined;
  }

  function checkForgottenReturns(returnValue, promiseCreated, name, promise, parent) {
    if (returnValue === undefined && promiseCreated !== null && wForgottenReturn) {
      if (parent !== undefined && parent._returnedNonUndefined()) return;
      if ((promise._bitField & 65535) === 0) return;
      if (name) name = name + " ";
      var handlerLine = "";
      var creatorLine = "";

      if (promiseCreated._trace) {
        var traceLines = promiseCreated._trace.stack.split("\n");

        var stack = cleanStack(traceLines);

        for (var i = stack.length - 1; i >= 0; --i) {
          var line = stack[i];

          if (!nodeFramePattern.test(line)) {
            var lineMatches = line.match(parseLinePattern);

            if (lineMatches) {
              handlerLine = "at " + lineMatches[1] + ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
            }

            break;
          }
        }

        if (stack.length > 0) {
          var firstUserLine = stack[0];

          for (var i = 0; i < traceLines.length; ++i) {
            if (traceLines[i] === firstUserLine) {
              if (i > 0) {
                creatorLine = "\n" + traceLines[i - 1];
              }

              break;
            }
          }
        }
      }

      var msg = "a promise was created in a " + name + "handler " + handlerLine + "but was not returned from it, " + "see http://goo.gl/rRqMUw" + creatorLine;

      promise._warn(msg, true, promiseCreated);
    }
  }

  function deprecated(name, replacement) {
    var message = name + " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
  }

  function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;

    if (shouldUseOwnTrace) {
      promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
      ctx.attachExtraTrace(warning);
    } else {
      var parsed = parseStackAndMessage(warning);
      warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }

    if (!activeFireEvent("warning", warning)) {
      formatAndLogError(warning, "", true);
    }
  }

  function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
      stacks[i].push("From previous event:");
      stacks[i] = stacks[i].join("\n");
    }

    if (i < stacks.length) {
      stacks[i] = stacks[i].join("\n");
    }

    return message + "\n" + stacks.join("\n");
  }

  function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
      if (stacks[i].length === 0 || i + 1 < stacks.length && stacks[i][0] === stacks[i + 1][0]) {
        stacks.splice(i, 1);
        i--;
      }
    }
  }

  function removeCommonRoots(stacks) {
    var current = stacks[0];

    for (var i = 1; i < stacks.length; ++i) {
      var prev = stacks[i];
      var currentLastIndex = current.length - 1;
      var currentLastLine = current[currentLastIndex];
      var commonRootMeetPoint = -1;

      for (var j = prev.length - 1; j >= 0; --j) {
        if (prev[j] === currentLastLine) {
          commonRootMeetPoint = j;
          break;
        }
      }

      for (var j = commonRootMeetPoint; j >= 0; --j) {
        var line = prev[j];

        if (current[currentLastIndex] === line) {
          current.pop();
          currentLastIndex--;
        } else {
          break;
        }
      }

      current = prev;
    }
  }

  function cleanStack(stack) {
    var ret = [];

    for (var i = 0; i < stack.length; ++i) {
      var line = stack[i];
      var isTraceLine = "    (No stack trace)" === line || stackFramePattern.test(line);
      var isInternalFrame = isTraceLine && shouldIgnore(line);

      if (isTraceLine && !isInternalFrame) {
        if (indentStackFrames && line.charAt(0) !== " ") {
          line = "    " + line;
        }

        ret.push(line);
      }
    }

    return ret;
  }

  function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");

    for (var i = 0; i < stack.length; ++i) {
      var line = stack[i];

      if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
        break;
      }
    }

    if (i > 0 && error.name != "SyntaxError") {
      stack = stack.slice(i);
    }

    return stack;
  }

  function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0 ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
      message: message,
      stack: error.name == "SyntaxError" ? stack : cleanStack(stack)
    };
  }

  function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
      var message;

      if (util$1.isObject(error)) {
        var stack = error.stack;
        message = title + formatStack(stack, error);
      } else {
        message = title + String(error);
      }

      if (typeof printWarning === "function") {
        printWarning(message, isSoft);
      } else if (typeof console.log === "function" || typeof console.log === "object") {
        console.log(message);
      }
    }
  }

  function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;

    try {
      if (typeof localHandler === "function") {
        localEventFired = true;

        if (name === "rejectionHandled") {
          localHandler(promise);
        } else {
          localHandler(reason, promise);
        }
      }
    } catch (e) {
      async.throwLater(e);
    }

    if (name === "unhandledRejection") {
      if (!activeFireEvent(name, reason, promise) && !localEventFired) {
        formatAndLogError(reason, "Unhandled rejection ");
      }
    } else {
      activeFireEvent(name, promise);
    }
  }

  function formatNonError(obj) {
    var str;

    if (typeof obj === "function") {
      str = "[function " + (obj.name || "anonymous") + "]";
    } else {
      str = obj && typeof obj.toString === "function" ? obj.toString() : util$1.toString(obj);
      var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;

      if (ruselessToString.test(str)) {
        try {
          var newStr = JSON.stringify(obj);
          str = newStr;
        } catch (e) {}
      }

      if (str.length === 0) {
        str = "(empty array)";
      }
    }

    return "(<" + snip(str) + ">, no stack trace)";
  }

  function snip(str) {
    var maxChars = 41;

    if (str.length < maxChars) {
      return str;
    }

    return str.substr(0, maxChars - 3) + "...";
  }

  function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
  }

  var shouldIgnore = function () {
    return false;
  };

  var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;

  function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);

    if (matches) {
      return {
        fileName: matches[1],
        line: parseInt(matches[2], 10)
      };
    }
  }

  function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = (firstLineError.stack || "").split("\n");
    var lastStackLines = (lastLineError.stack || "").split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;

    for (var i = 0; i < firstStackLines.length; ++i) {
      var result = parseLineInfo(firstStackLines[i]);

      if (result) {
        firstFileName = result.fileName;
        firstIndex = result.line;
        break;
      }
    }

    for (var i = 0; i < lastStackLines.length; ++i) {
      var result = parseLineInfo(lastStackLines[i]);

      if (result) {
        lastFileName = result.fileName;
        lastIndex = result.line;
        break;
      }
    }

    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName || firstFileName !== lastFileName || firstIndex >= lastIndex) {
      return;
    }

    shouldIgnore = function (line) {
      if (bluebirdFramePattern.test(line)) return true;
      var info = parseLineInfo(line);

      if (info) {
        if (info.fileName === firstFileName && firstIndex <= info.line && info.line <= lastIndex) {
          return true;
        }
      }

      return false;
    };
  }

  function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
  }

  util$1.inherits(CapturedTrace, Error);
  Context.CapturedTrace = CapturedTrace;

  CapturedTrace.prototype.uncycle = function () {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
      nodes.push(node);
      node = node._parent;
    }

    length = this._length = i;

    for (var i = length - 1; i >= 0; --i) {
      var stack = nodes[i].stack;

      if (stackToIndex[stack] === undefined) {
        stackToIndex[stack] = i;
      }
    }

    for (var i = 0; i < length; ++i) {
      var currentStack = nodes[i].stack;
      var index = stackToIndex[currentStack];

      if (index !== undefined && index !== i) {
        if (index > 0) {
          nodes[index - 1]._parent = undefined;
          nodes[index - 1]._length = 1;
        }

        nodes[i]._parent = undefined;
        nodes[i]._length = 1;
        var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

        if (index < length - 1) {
          cycleEdgeNode._parent = nodes[index + 1];

          cycleEdgeNode._parent.uncycle();

          cycleEdgeNode._length = cycleEdgeNode._parent._length + 1;
        } else {
          cycleEdgeNode._parent = undefined;
          cycleEdgeNode._length = 1;
        }

        var currentChildLength = cycleEdgeNode._length + 1;

        for (var j = i - 2; j >= 0; --j) {
          nodes[j]._length = currentChildLength;
          currentChildLength++;
        }

        return;
      }
    }
  };

  CapturedTrace.prototype.attachExtraTrace = function (error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];
    var trace = this;

    while (trace !== undefined) {
      stacks.push(cleanStack(trace.stack.split("\n")));
      trace = trace._parent;
    }

    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util$1.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util$1.notEnumerableProp(error, "__stackCleaned__", true);
  };

  var captureStackTrace = function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;

    var v8stackFormatter = function (stack, error) {
      if (typeof stack === "string") return stack;

      if (error.name !== undefined && error.message !== undefined) {
        return error.toString();
      }

      return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" && typeof Error.captureStackTrace === "function") {
      Error.stackTraceLimit += 6;
      stackFramePattern = v8stackFramePattern;
      formatStack = v8stackFormatter;
      var captureStackTrace = Error.captureStackTrace;

      shouldIgnore = function (line) {
        return bluebirdFramePattern.test(line);
      };

      return function (receiver, ignoreUntil) {
        Error.stackTraceLimit += 6;
        captureStackTrace(receiver, ignoreUntil);
        Error.stackTraceLimit -= 6;
      };
    }

    var err = new Error();

    if (typeof err.stack === "string" && err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
      stackFramePattern = /@/;
      formatStack = v8stackFormatter;
      indentStackFrames = true;
      return function captureStackTrace(o) {
        o.stack = new Error().stack;
      };
    }

    var hasStackAfterThrow;

    try {
      throw new Error();
    } catch (e) {
      hasStackAfterThrow = "stack" in e;
    }

    if (!("stack" in err) && hasStackAfterThrow && typeof Error.stackTraceLimit === "number") {
      stackFramePattern = v8stackFramePattern;
      formatStack = v8stackFormatter;
      return function captureStackTrace(o) {
        Error.stackTraceLimit += 6;

        try {
          throw new Error();
        } catch (e) {
          o.stack = e.stack;
        }

        Error.stackTraceLimit -= 6;
      };
    }

    formatStack = function (stack, error) {
      if (typeof stack === "string") return stack;

      if ((typeof error === "object" || typeof error === "function") && error.name !== undefined && error.message !== undefined) {
        return error.toString();
      }

      return formatNonError(error);
    };

    return null;
  }();

  if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
      console.warn(message);
    };

    if (util$1.isNode && process.stderr.isTTY) {
      printWarning = function (message, isSoft) {
        var color = isSoft ? "\u001b[33m" : "\u001b[31m";
        console.warn(color + message + "\u001b[0m\n");
      };
    } else if (!util$1.isNode && typeof new Error().stack === "string") {
      printWarning = function (message, isSoft) {
        console.warn("%c" + message, isSoft ? "color: darkorange" : "color: red");
      };
    }
  }

  var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false
  };
  if (longStackTraces) Promise.longStackTraces();
  return {
    longStackTraces: function () {
      return config.longStackTraces;
    },
    warnings: function () {
      return config.warnings;
    },
    cancellation: function () {
      return config.cancellation;
    },
    monitoring: function () {
      return config.monitoring;
    },
    propagateFromFunction: function () {
      return propagateFromFunction;
    },
    boundValueFunction: function () {
      return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace,
    fireDomEvent: fireDomEvent,
    fireGlobalEvent: fireGlobalEvent
  };
};

var catch_filter = function (NEXT_FILTER) {
  var util$1 = util;

  var getKeys = es5.keys;

  var tryCatch = util$1.tryCatch;
  var errorObj = util$1.errorObj;

  function catchFilter(instances, cb, promise) {
    return function (e) {
      var boundTo = promise._boundValue();

      predicateLoop: for (var i = 0; i < instances.length; ++i) {
        var item = instances[i];

        if (item === Error || item != null && item.prototype instanceof Error) {
          if (e instanceof item) {
            return tryCatch(cb).call(boundTo, e);
          }
        } else if (typeof item === "function") {
          var matchesPredicate = tryCatch(item).call(boundTo, e);

          if (matchesPredicate === errorObj) {
            return matchesPredicate;
          } else if (matchesPredicate) {
            return tryCatch(cb).call(boundTo, e);
          }
        } else if (util$1.isObject(e)) {
          var keys = getKeys(item);

          for (var j = 0; j < keys.length; ++j) {
            var key = keys[j];

            if (item[key] != e[key]) {
              continue predicateLoop;
            }
          }

          return tryCatch(cb).call(boundTo, e);
        }
      }

      return NEXT_FILTER;
    };
  }

  return catchFilter;
};

var _finally = function (Promise, tryConvertToPromise, NEXT_FILTER) {
  var util$1 = util;

  var CancellationError = Promise.CancellationError;
  var errorObj = util$1.errorObj;

  var catchFilter = catch_filter(NEXT_FILTER);

  function PassThroughHandlerContext(promise, type, handler) {
    this.promise = promise;
    this.type = type;
    this.handler = handler;
    this.called = false;
    this.cancelPromise = null;
  }

  PassThroughHandlerContext.prototype.isFinallyHandler = function () {
    return this.type === 0;
  };

  function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
  }

  FinallyHandlerCancelReaction.prototype._resultCancelled = function () {
    checkCancel(this.finallyHandler);
  };

  function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
      if (arguments.length > 1) {
        ctx.cancelPromise._reject(reason);
      } else {
        ctx.cancelPromise._cancel();
      }

      ctx.cancelPromise = null;
      return true;
    }

    return false;
  }

  function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
  }

  function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
  }

  function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
      this.called = true;
      var ret = this.isFinallyHandler() ? handler.call(promise._boundValue()) : handler.call(promise._boundValue(), reasonOrValue);

      if (ret === NEXT_FILTER) {
        return ret;
      } else if (ret !== undefined) {
        promise._setReturnedNonUndefined();

        var maybePromise = tryConvertToPromise(ret, promise);

        if (maybePromise instanceof Promise) {
          if (this.cancelPromise != null) {
            if (maybePromise._isCancelled()) {
              var reason = new CancellationError("late cancellation observer");

              promise._attachExtraTrace(reason);

              errorObj.e = reason;
              return errorObj;
            } else if (maybePromise.isPending()) {
              maybePromise._attachCancellationCallback(new FinallyHandlerCancelReaction(this));
            }
          }

          return maybePromise._then(succeed, fail, undefined, this, undefined);
        }
      }
    }

    if (promise.isRejected()) {
      checkCancel(this);
      errorObj.e = reasonOrValue;
      return errorObj;
    } else {
      checkCancel(this);
      return reasonOrValue;
    }
  }

  Promise.prototype._passThrough = function (handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success, fail, undefined, new PassThroughHandlerContext(this, type, handler), undefined);
  };

  Promise.prototype.lastly = Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler, 0, finallyHandler, finallyHandler);
  };

  Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
  };

  Promise.prototype.tapCatch = function (handlerOrPredicate) {
    var len = arguments.length;

    if (len === 1) {
      return this._passThrough(handlerOrPredicate, 1, undefined, finallyHandler);
    } else {
      var catchInstances = new Array(len - 1),
          j = 0,
          i;

      for (i = 0; i < len - 1; ++i) {
        var item = arguments[i];

        if (util$1.isObject(item)) {
          catchInstances[j++] = item;
        } else {
          return Promise.reject(new TypeError("tapCatch statement predicate: " + "expecting an object but got " + util$1.classString(item)));
        }
      }

      catchInstances.length = j;
      var handler = arguments[i];
      return this._passThrough(catchFilter(catchInstances, handler, this), 1, undefined, finallyHandler);
    }
  };

  return PassThroughHandlerContext;
};

var maybeWrapAsError$1 = util.maybeWrapAsError;



var OperationalError$1 = errors.OperationalError;



function isUntypedError(obj) {
  return obj instanceof Error && es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;

function wrapAsOperationalError(obj) {
  var ret;

  if (isUntypedError(obj)) {
    ret = new OperationalError$1(obj);
    ret.name = obj.name;
    ret.message = obj.message;
    ret.stack = obj.stack;
    var keys = es5.keys(obj);

    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i];

      if (!rErrorKey.test(key)) {
        ret[key] = obj[key];
      }
    }

    return ret;
  }

  util.markAsOriginatingFromRejection(obj);
  return obj;
}

function nodebackForPromise(promise, multiArgs) {
  return function (err, value) {
    if (promise === null) return;

    if (err) {
      var wrapped = wrapAsOperationalError(maybeWrapAsError$1(err));

      promise._attachExtraTrace(wrapped);

      promise._reject(wrapped);
    } else if (!multiArgs) {
      promise._fulfill(value);
    } else {
      var $_len = arguments.length;
      var args = new Array(Math.max($_len - 1, 0));

      for (var $_i = 1; $_i < $_len; ++$_i) {
        args[$_i - 1] = arguments[$_i];
      }

      promise._fulfill(args);
    }

    promise = null;
  };
}

var nodeback = nodebackForPromise;

var method = function (Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
  var util$1 = util;

  var tryCatch = util$1.tryCatch;

  Promise.method = function (fn) {
    if (typeof fn !== "function") {
      throw new Promise.TypeError("expecting a function but got " + util$1.classString(fn));
    }

    return function () {
      var ret = new Promise(INTERNAL);

      ret._captureStackTrace();

      ret._pushContext();

      var value = tryCatch(fn).apply(this, arguments);

      var promiseCreated = ret._popContext();

      debug.checkForgottenReturns(value, promiseCreated, "Promise.method", ret);

      ret._resolveFromSyncValue(value);

      return ret;
    };
  };

  Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
      return apiRejection("expecting a function but got " + util$1.classString(fn));
    }

    var ret = new Promise(INTERNAL);

    ret._captureStackTrace();

    ret._pushContext();

    var value;

    if (arguments.length > 1) {
      debug.deprecated("calling Promise.try with more than 1 argument");
      var arg = arguments[1];
      var ctx = arguments[2];
      value = util$1.isArray(arg) ? tryCatch(fn).apply(ctx, arg) : tryCatch(fn).call(ctx, arg);
    } else {
      value = tryCatch(fn)();
    }

    var promiseCreated = ret._popContext();

    debug.checkForgottenReturns(value, promiseCreated, "Promise.try", ret);

    ret._resolveFromSyncValue(value);

    return ret;
  };

  Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util$1.errorObj) {
      this._rejectCallback(value.e, false);
    } else {
      this._resolveCallback(value, true);
    }
  };
};

var bind = function (Promise, INTERNAL, tryConvertToPromise, debug) {
  var calledBind = false;

  var rejectThis = function (_, e) {
    this._reject(e);
  };

  var targetRejected = function (e, context) {
    context.promiseRejectionQueued = true;

    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
  };

  var bindingResolved = function (thisArg, context) {
    if ((this._bitField & 50397184) === 0) {
      this._resolveCallback(context.target);
    }
  };

  var bindingRejected = function (e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
  };

  Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
      calledBind = true;
      Promise.prototype._propagateFrom = debug.propagateFromFunction();
      Promise.prototype._boundValue = debug.boundValueFunction();
    }

    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);

    ret._propagateFrom(this, 1);

    var target = this._target();

    ret._setBoundTo(maybePromise);

    if (maybePromise instanceof Promise) {
      var context = {
        promiseRejectionQueued: false,
        promise: ret,
        target: target,
        bindingPromise: maybePromise
      };

      target._then(INTERNAL, targetRejected, undefined, ret, context);

      maybePromise._then(bindingResolved, bindingRejected, undefined, ret, context);

      ret._setOnCancel(maybePromise);
    } else {
      ret._resolveCallback(target);
    }

    return ret;
  };

  Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
      this._bitField = this._bitField | 2097152;
      this._boundTo = obj;
    } else {
      this._bitField = this._bitField & ~2097152;
    }
  };

  Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
  };

  Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
  };
};

var cancel = function (Promise, PromiseArray, apiRejection, debug) {
  var util$1 = util;

  var tryCatch = util$1.tryCatch;
  var errorObj = util$1.errorObj;
  var async = Promise._async;

  Promise.prototype["break"] = Promise.prototype.cancel = function () {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");
    var promise = this;
    var child = promise;

    while (promise._isCancellable()) {
      if (!promise._cancelBy(child)) {
        if (child._isFollowing()) {
          child._followee().cancel();
        } else {
          child._cancelBranched();
        }

        break;
      }

      var parent = promise._cancellationParent;

      if (parent == null || !parent._isCancellable()) {
        if (promise._isFollowing()) {
          promise._followee().cancel();
        } else {
          promise._cancelBranched();
        }

        break;
      } else {
        if (promise._isFollowing()) promise._followee().cancel();

        promise._setWillBeCancelled();

        child = promise;
        promise = parent;
      }
    }
  };

  Promise.prototype._branchHasCancelled = function () {
    this._branchesRemainingToCancel--;
  };

  Promise.prototype._enoughBranchesHaveCancelled = function () {
    return this._branchesRemainingToCancel === undefined || this._branchesRemainingToCancel <= 0;
  };

  Promise.prototype._cancelBy = function (canceller) {
    if (canceller === this) {
      this._branchesRemainingToCancel = 0;

      this._invokeOnCancel();

      return true;
    } else {
      this._branchHasCancelled();

      if (this._enoughBranchesHaveCancelled()) {
        this._invokeOnCancel();

        return true;
      }
    }

    return false;
  };

  Promise.prototype._cancelBranched = function () {
    if (this._enoughBranchesHaveCancelled()) {
      this._cancel();
    }
  };

  Promise.prototype._cancel = function () {
    if (!this._isCancellable()) return;

    this._setCancelled();

    async.invoke(this._cancelPromises, this, undefined);
  };

  Promise.prototype._cancelPromises = function () {
    if (this._length() > 0) this._settlePromises();
  };

  Promise.prototype._unsetOnCancel = function () {
    this._onCancelField = undefined;
  };

  Promise.prototype._isCancellable = function () {
    return this.isPending() && !this._isCancelled();
  };

  Promise.prototype.isCancellable = function () {
    return this.isPending() && !this.isCancelled();
  };

  Promise.prototype._doInvokeOnCancel = function (onCancelCallback, internalOnly) {
    if (util$1.isArray(onCancelCallback)) {
      for (var i = 0; i < onCancelCallback.length; ++i) {
        this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
      }
    } else if (onCancelCallback !== undefined) {
      if (typeof onCancelCallback === "function") {
        if (!internalOnly) {
          var e = tryCatch(onCancelCallback).call(this._boundValue());

          if (e === errorObj) {
            this._attachExtraTrace(e.e);

            async.throwLater(e.e);
          }
        }
      } else {
        onCancelCallback._resultCancelled(this);
      }
    }
  };

  Promise.prototype._invokeOnCancel = function () {
    var onCancelCallback = this._onCancel();

    this._unsetOnCancel();

    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
  };

  Promise.prototype._invokeInternalOnCancel = function () {
    if (this._isCancellable()) {
      this._doInvokeOnCancel(this._onCancel(), true);

      this._unsetOnCancel();
    }
  };

  Promise.prototype._resultCancelled = function () {
    this.cancel();
  };
};

var direct_resolve = function (Promise) {
  function returner() {
    return this.value;
  }

  function thrower() {
    throw this.reason;
  }

  Promise.prototype["return"] = Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(returner, undefined, undefined, {
      value: value
    }, undefined);
  };

  Promise.prototype["throw"] = Promise.prototype.thenThrow = function (reason) {
    return this._then(thrower, undefined, undefined, {
      reason: reason
    }, undefined);
  };

  Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
      return this._then(undefined, thrower, undefined, {
        reason: reason
      }, undefined);
    } else {
      var _reason = arguments[1];

      var handler = function () {
        throw _reason;
      };

      return this.caught(reason, handler);
    }
  };

  Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
      if (value instanceof Promise) value.suppressUnhandledRejections();
      return this._then(undefined, returner, undefined, {
        value: value
      }, undefined);
    } else {
      var _value = arguments[1];
      if (_value instanceof Promise) _value.suppressUnhandledRejections();

      var handler = function () {
        return _value;
      };

      return this.caught(value, handler);
    }
  };
};

var synchronous_inspection = function (Promise) {
  function PromiseInspection(promise) {
    if (promise !== undefined) {
      promise = promise._target();
      this._bitField = promise._bitField;
      this._settledValueField = promise._isFateSealed() ? promise._settledValue() : undefined;
    } else {
      this._bitField = 0;
      this._settledValueField = undefined;
    }
  }

  PromiseInspection.prototype._settledValue = function () {
    return this._settledValueField;
  };

  var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
      throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    return this._settledValue();
  };

  var reason = PromiseInspection.prototype.error = PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
      throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    return this._settledValue();
  };

  var isFulfilled = PromiseInspection.prototype.isFulfilled = function () {
    return (this._bitField & 33554432) !== 0;
  };

  var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
  };

  var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
  };

  var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
  };

  PromiseInspection.prototype.isCancelled = function () {
    return (this._bitField & 8454144) !== 0;
  };

  Promise.prototype.__isCancelled = function () {
    return (this._bitField & 65536) === 65536;
  };

  Promise.prototype._isCancelled = function () {
    return this._target().__isCancelled();
  };

  Promise.prototype.isCancelled = function () {
    return (this._target()._bitField & 8454144) !== 0;
  };

  Promise.prototype.isPending = function () {
    return isPending.call(this._target());
  };

  Promise.prototype.isRejected = function () {
    return isRejected.call(this._target());
  };

  Promise.prototype.isFulfilled = function () {
    return isFulfilled.call(this._target());
  };

  Promise.prototype.isResolved = function () {
    return isResolved.call(this._target());
  };

  Promise.prototype.value = function () {
    return value.call(this._target());
  };

  Promise.prototype.reason = function () {
    var target = this._target();

    target._unsetRejectionIsUnhandled();

    return reason.call(target);
  };

  Promise.prototype._value = function () {
    return this._settledValue();
  };

  Promise.prototype._reason = function () {
    this._unsetRejectionIsUnhandled();

    return this._settledValue();
  };

  Promise.PromiseInspection = PromiseInspection;
};

var join = function (Promise, PromiseArray, tryConvertToPromise, INTERNAL, async, getDomain) {
  var util$1 = util;

  var canEvaluate = util$1.canEvaluate;
  var tryCatch = util$1.tryCatch;
  var errorObj = util$1.errorObj;
  var reject;

  {
    if (canEvaluate) {
      var thenCallback = function (i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
      };

      var promiseSetter = function (i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
      };

      var generateHolderClass = function (total) {
        var props = new Array(total);

        for (var i = 0; i < props.length; ++i) {
          props[i] = "this.p" + (i + 1);
        }

        var assignment = props.join(" = ") + " = null;";
        var cancellationCode = "var promise;\n" + props.map(function (prop) {
          return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;
        var code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                var ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";
        code = code.replace(/\[TheName\]/g, name).replace(/\[TheTotal\]/g, total).replace(/\[ThePassedArguments\]/g, passedArguments).replace(/\[TheProperties\]/g, assignment).replace(/\[CancellationCode\]/g, cancellationCode);
        return new Function("tryCatch", "errorObj", "Promise", "async", code)(tryCatch, errorObj, Promise, async);
      };

      var holderClasses = [];
      var thenCallbacks = [];
      var promiseSetters = [];

      for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
      }

      reject = function (reason) {
        this._reject(reason);
      };
    }
  }

  Promise.join = function () {
    var last = arguments.length - 1;
    var fn;

    if (last > 0 && typeof arguments[last] === "function") {
      fn = arguments[last];

      {
        if (last <= 8 && canEvaluate) {
          var ret = new Promise(INTERNAL);

          ret._captureStackTrace();

          var HolderClass = holderClasses[last - 1];
          var holder = new HolderClass(fn);
          var callbacks = thenCallbacks;

          for (var i = 0; i < last; ++i) {
            var maybePromise = tryConvertToPromise(arguments[i], ret);

            if (maybePromise instanceof Promise) {
              maybePromise = maybePromise._target();
              var bitField = maybePromise._bitField;

              if ((bitField & 50397184) === 0) {
                maybePromise._then(callbacks[i], reject, undefined, ret, holder);

                promiseSetters[i](maybePromise, holder);
                holder.asyncNeeded = false;
              } else if ((bitField & 33554432) !== 0) {
                callbacks[i].call(ret, maybePromise._value(), holder);
              } else if ((bitField & 16777216) !== 0) {
                ret._reject(maybePromise._reason());
              } else {
                ret._cancel();
              }
            } else {
              callbacks[i].call(ret, maybePromise, holder);
            }
          }

          if (!ret._isFateSealed()) {
            if (holder.asyncNeeded) {
              var domain = getDomain();

              if (domain !== null) {
                holder.fn = util$1.domainBind(domain, holder.fn);
              }
            }

            ret._setAsyncGuaranteed();

            ret._setOnCancel(holder);
          }

          return ret;
        }
      }
    }

    var $_len = arguments.length;
    var args = new Array($_len);

    for (var $_i = 0; $_i < $_len; ++$_i) {
      args[$_i] = arguments[$_i];
    }
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
  };
};

var cr = Object.create;

if (cr) {
  var callerCache = cr(null);
  var getterCache = cr(null);
  callerCache[" size"] = getterCache[" size"] = 0;
}

var call_get = function (Promise) {
  var util$1 = util;

  var canEvaluate = util$1.canEvaluate;
  var isIdentifier = util$1.isIdentifier;
  var getMethodCaller;
  var getGetter;

  {
    var makeMethodCaller = function (methodName) {
      return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
    };

    var makeGetter = function (propertyName) {
      return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
    };

    var getCompiled = function (name, compiler, cache) {
      var ret = cache[name];

      if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
          return null;
        }

        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;

        if (cache[" size"] > 512) {
          var keys = Object.keys(cache);

          for (var i = 0; i < 256; ++i) delete cache[keys[i]];

          cache[" size"] = keys.length - 256;
        }
      }

      return ret;
    };

    getMethodCaller = function (name) {
      return getCompiled(name, makeMethodCaller, callerCache);
    };

    getGetter = function (name) {
      return getCompiled(name, makeGetter, getterCache);
    };
  }

  function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];

    if (typeof fn !== "function") {
      var message = "Object " + util$1.classString(obj) + " has no method '" + util$1.toString(methodName) + "'";
      throw new Promise.TypeError(message);
    }

    return fn;
  }

  function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
  }

  Promise.prototype.call = function (methodName) {
    var $_len = arguments.length;
    var args = new Array(Math.max($_len - 1, 0));

    for (var $_i = 1; $_i < $_len; ++$_i) {
      args[$_i - 1] = arguments[$_i];
    }

    {
      if (canEvaluate) {
        var maybeCaller = getMethodCaller(methodName);

        if (maybeCaller !== null) {
          return this._then(maybeCaller, undefined, undefined, args, undefined);
        }
      }
    }

    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
  };

  function namedGetter(obj) {
    return obj[this];
  }

  function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
  }

  Promise.prototype.get = function (propertyName) {
    var isIndex = typeof propertyName === "number";
    var getter;

    if (!isIndex) {
      if (canEvaluate) {
        var maybeGetter = getGetter(propertyName);
        getter = maybeGetter !== null ? maybeGetter : namedGetter;
      } else {
        getter = namedGetter;
      }
    } else {
      getter = indexedGetter;
    }

    return this._then(getter, undefined, undefined, propertyName, undefined);
  };
};

var generators = function (Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug) {
  var errors$1 = errors;

  var TypeError = errors$1.TypeError;

  var util$1 = util;

  var errorObj = util$1.errorObj;
  var tryCatch = util$1.tryCatch;
  var yieldHandlers = [];

  function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
      traceParent._pushContext();

      var result = tryCatch(yieldHandlers[i])(value);

      traceParent._popContext();

      if (result === errorObj) {
        traceParent._pushContext();

        var ret = Promise.reject(errorObj.e);

        traceParent._popContext();

        return ret;
      }

      var maybePromise = tryConvertToPromise(result, traceParent);
      if (maybePromise instanceof Promise) return maybePromise;
    }

    return null;
  }

  function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    if (debug.cancellation()) {
      var internal = new Promise(INTERNAL);

      var _finallyPromise = this._finallyPromise = new Promise(INTERNAL);

      this._promise = internal.lastly(function () {
        return _finallyPromise;
      });

      internal._captureStackTrace();

      internal._setOnCancel(this);
    } else {
      var promise = this._promise = new Promise(INTERNAL);

      promise._captureStackTrace();
    }

    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function" ? [yieldHandler].concat(yieldHandlers) : yieldHandlers;
    this._yieldedPromise = null;
    this._cancellationPhase = false;
  }

  util$1.inherits(PromiseSpawn, Proxyable);

  PromiseSpawn.prototype._isResolved = function () {
    return this._promise === null;
  };

  PromiseSpawn.prototype._cleanup = function () {
    this._promise = this._generator = null;

    if (debug.cancellation() && this._finallyPromise !== null) {
      this._finallyPromise._fulfill();

      this._finallyPromise = null;
    }
  };

  PromiseSpawn.prototype._promiseCancelled = function () {
    if (this._isResolved()) return;
    var implementsReturn = typeof this._generator["return"] !== "undefined";
    var result;

    if (!implementsReturn) {
      var reason = new Promise.CancellationError("generator .return() sentinel");
      Promise.coroutine.returnSentinel = reason;

      this._promise._attachExtraTrace(reason);

      this._promise._pushContext();

      result = tryCatch(this._generator["throw"]).call(this._generator, reason);

      this._promise._popContext();
    } else {
      this._promise._pushContext();

      result = tryCatch(this._generator["return"]).call(this._generator, undefined);

      this._promise._popContext();
    }

    this._cancellationPhase = true;
    this._yieldedPromise = null;

    this._continue(result);
  };

  PromiseSpawn.prototype._promiseFulfilled = function (value) {
    this._yieldedPromise = null;

    this._promise._pushContext();

    var result = tryCatch(this._generator.next).call(this._generator, value);

    this._promise._popContext();

    this._continue(result);
  };

  PromiseSpawn.prototype._promiseRejected = function (reason) {
    this._yieldedPromise = null;

    this._promise._attachExtraTrace(reason);

    this._promise._pushContext();

    var result = tryCatch(this._generator["throw"]).call(this._generator, reason);

    this._promise._popContext();

    this._continue(result);
  };

  PromiseSpawn.prototype._resultCancelled = function () {
    if (this._yieldedPromise instanceof Promise) {
      var promise = this._yieldedPromise;
      this._yieldedPromise = null;
      promise.cancel();
    }
  };

  PromiseSpawn.prototype.promise = function () {
    return this._promise;
  };

  PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver = this._generatorFunction = undefined;

    this._promiseFulfilled(undefined);
  };

  PromiseSpawn.prototype._continue = function (result) {
    var promise = this._promise;

    if (result === errorObj) {
      this._cleanup();

      if (this._cancellationPhase) {
        return promise.cancel();
      } else {
        return promise._rejectCallback(result.e, false);
      }
    }

    var value = result.value;

    if (result.done === true) {
      this._cleanup();

      if (this._cancellationPhase) {
        return promise.cancel();
      } else {
        return promise._resolveCallback(value);
      }
    } else {
      var maybePromise = tryConvertToPromise(value, this._promise);

      if (!(maybePromise instanceof Promise)) {
        maybePromise = promiseFromYieldHandler(maybePromise, this._yieldHandlers, this._promise);

        if (maybePromise === null) {
          this._promiseRejected(new TypeError("A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a\u000a".replace("%s", String(value)) + "From coroutine:\u000a" + this._stack.split("\n").slice(1, -7).join("\n")));

          return;
        }
      }

      maybePromise = maybePromise._target();
      var bitField = maybePromise._bitField;

      if ((bitField & 50397184) === 0) {
        this._yieldedPromise = maybePromise;

        maybePromise._proxy(this, null);
      } else if ((bitField & 33554432) !== 0) {
        Promise._async.invoke(this._promiseFulfilled, this, maybePromise._value());
      } else if ((bitField & 16777216) !== 0) {
        Promise._async.invoke(this._promiseRejected, this, maybePromise._reason());
      } else {
        this._promiseCancelled();
      }
    }
  };

  Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
      throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
      var generator = generatorFunction.apply(this, arguments);
      var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler, stack);
      var ret = spawn.promise();
      spawn._generator = generator;

      spawn._promiseFulfilled(undefined);

      return ret;
    };
  };

  Promise.coroutine.addYieldHandler = function (fn) {
    if (typeof fn !== "function") {
      throw new TypeError("expecting a function but got " + util$1.classString(fn));
    }

    yieldHandlers.push(fn);
  };

  Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");

    if (typeof generatorFunction !== "function") {
      return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();

    spawn._run(Promise.spawn);

    return ret;
  };
};

var map = function (Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug) {
  var getDomain = Promise._getDomain;

  var util$1 = util;

  var tryCatch = util$1.tryCatch;
  var errorObj = util$1.errorObj;
  var async = Promise._async;

  function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);

    this._promise._captureStackTrace();

    var domain = getDomain();
    this._callback = domain === null ? fn : util$1.domainBind(domain, fn);
    this._preservedValues = _filter === INTERNAL ? new Array(this.length()) : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = [];
    async.invoke(this._asyncInit, this, undefined);
  }

  util$1.inherits(MappingPromiseArray, PromiseArray);

  MappingPromiseArray.prototype._asyncInit = function () {
    this._init$(undefined, -2);
  };

  MappingPromiseArray.prototype._init = function () {};

  MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;

    if (index < 0) {
      index = index * -1 - 1;
      values[index] = value;

      if (limit >= 1) {
        this._inFlight--;

        this._drainQueue();

        if (this._isResolved()) return true;
      }
    } else {
      if (limit >= 1 && this._inFlight >= limit) {
        values[index] = value;

        this._queue.push(index);

        return false;
      }

      if (preservedValues !== null) preservedValues[index] = value;
      var promise = this._promise;
      var callback = this._callback;

      var receiver = promise._boundValue();

      promise._pushContext();

      var ret = tryCatch(callback).call(receiver, value, index, length);

      var promiseCreated = promise._popContext();

      debug.checkForgottenReturns(ret, promiseCreated, preservedValues !== null ? "Promise.filter" : "Promise.map", promise);

      if (ret === errorObj) {
        this._reject(ret.e);

        return true;
      }

      var maybePromise = tryConvertToPromise(ret, this._promise);

      if (maybePromise instanceof Promise) {
        maybePromise = maybePromise._target();
        var bitField = maybePromise._bitField;

        if ((bitField & 50397184) === 0) {
          if (limit >= 1) this._inFlight++;
          values[index] = maybePromise;

          maybePromise._proxy(this, (index + 1) * -1);

          return false;
        } else if ((bitField & 33554432) !== 0) {
          ret = maybePromise._value();
        } else if ((bitField & 16777216) !== 0) {
          this._reject(maybePromise._reason());

          return true;
        } else {
          this._cancel();

          return true;
        }
      }

      values[index] = ret;
    }

    var totalResolved = ++this._totalResolved;

    if (totalResolved >= length) {
      if (preservedValues !== null) {
        this._filter(values, preservedValues);
      } else {
        this._resolve(values);
      }

      return true;
    }

    return false;
  };

  MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;

    while (queue.length > 0 && this._inFlight < limit) {
      if (this._isResolved()) return;
      var index = queue.pop();

      this._promiseFulfilled(values[index], index);
    }
  };

  MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;

    for (var i = 0; i < len; ++i) {
      if (booleans[i]) ret[j++] = values[i];
    }

    ret.length = j;

    this._resolve(ret);
  };

  MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
  };

  function map(promises, fn, options, _filter) {
    if (typeof fn !== "function") {
      return apiRejection("expecting a function but got " + util$1.classString(fn));
    }

    var limit = 0;

    if (options !== undefined) {
      if (typeof options === "object" && options !== null) {
        if (typeof options.concurrency !== "number") {
          return Promise.reject(new TypeError("'concurrency' must be a number but it is " + util$1.classString(options.concurrency)));
        }

        limit = options.concurrency;
      } else {
        return Promise.reject(new TypeError("options argument must be an object but it is " + util$1.classString(options)));
      }
    }

    limit = typeof limit === "number" && isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
  }

  Promise.prototype.map = function (fn, options) {
    return map(this, fn, options, null);
  };

  Promise.map = function (promises, fn, options, _filter) {
    return map(promises, fn, options, _filter);
  };
};

var nodeify = function (Promise) {
  var util$1 = util;

  var async = Promise._async;
  var tryCatch = util$1.tryCatch;
  var errorObj = util$1.errorObj;

  function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util$1.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret = tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));

    if (ret === errorObj) {
      async.throwLater(ret.e);
    }
  }

  function successAdapter(val, nodeback) {
    var promise = this;

    var receiver = promise._boundValue();

    var ret = val === undefined ? tryCatch(nodeback).call(receiver, null) : tryCatch(nodeback).call(receiver, null, val);

    if (ret === errorObj) {
      async.throwLater(ret.e);
    }
  }

  function errorAdapter(reason, nodeback) {
    var promise = this;

    if (!reason) {
      var newReason = new Error(reason + "");
      newReason.cause = reason;
      reason = newReason;
    }

    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);

    if (ret === errorObj) {
      async.throwLater(ret.e);
    }
  }

  Promise.prototype.asCallback = Promise.prototype.nodeify = function (nodeback, options) {
    if (typeof nodeback == "function") {
      var adapter = successAdapter;

      if (options !== undefined && Object(options).spread) {
        adapter = spreadAdapter;
      }

      this._then(adapter, errorAdapter, undefined, this, nodeback);
    }

    return this;
  };
};

var promisify = function (Promise, INTERNAL) {
  var THIS = {};

  var util$1 = util;

  var nodebackForPromise = nodeback;

  var withAppended = util$1.withAppended;
  var maybeWrapAsError = util$1.maybeWrapAsError;
  var canEvaluate = util$1.canEvaluate;

  var TypeError = errors.TypeError;

  var defaultSuffix = "Async";
  var defaultPromisified = {
    __isPromisified__: true
  };
  var noCopyProps = ["arity", "length", "name", "arguments", "caller", "callee", "prototype", "__isPromisified__"];
  var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

  var defaultFilter = function (name) {
    return util$1.isIdentifier(name) && name.charAt(0) !== "_" && name !== "constructor";
  };

  function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
  }

  function isPromisified(fn) {
    try {
      return fn.__isPromisified__ === true;
    } catch (e) {
      return false;
    }
  }

  function hasPromisified(obj, key, suffix) {
    var val = util$1.getDataPropertyOrDefault(obj, key + suffix, defaultPromisified);
    return val ? isPromisified(val) : false;
  }

  function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
      var key = ret[i];

      if (suffixRegexp.test(key)) {
        var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");

        for (var j = 0; j < ret.length; j += 2) {
          if (ret[j] === keyWithoutAsyncSuffix) {
            throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a".replace("%s", suffix));
          }
        }
      }
    }
  }

  function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util$1.inheritedDataKeys(obj);
    var ret = [];

    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i];
      var value = obj[key];
      var passesDefaultFilter = filter === defaultFilter ? true : defaultFilter(key);

      if (typeof value === "function" && !isPromisified(value) && !hasPromisified(obj, key, suffix) && filter(key, value, obj, passesDefaultFilter)) {
        ret.push(key, value);
      }
    }

    checkValid(ret, suffix, suffixRegexp);
    return ret;
  }

  var escapeIdentRegex = function (str) {
    return str.replace(/([$])/, "\\$");
  };

  var makeNodePromisifiedEval;

  {
    var switchCaseArgumentOrder = function (likelyArgumentCount) {
      var ret = [likelyArgumentCount];
      var min = Math.max(0, likelyArgumentCount - 1 - 3);

      for (var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
      }

      for (var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
      }

      return ret;
    };

    var argumentSequence = function (argumentCount) {
      return util$1.filledRange(argumentCount, "_arg", "");
    };

    var parameterDeclaration = function (parameterCount) {
      return util$1.filledRange(Math.max(parameterCount, 3), "_arg", "");
    };

    var parameterCount = function (fn) {
      if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
      }

      return 0;
    };

    makeNodePromisifiedEval = function (callback, receiver, originalName, fn, _, multiArgs) {
      var newParameterCount = Math.max(0, parameterCount(fn) - 1);
      var argumentOrder = switchCaseArgumentOrder(newParameterCount);
      var shouldProxyThis = typeof callback === "string" || receiver === THIS;

      function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;

        if (shouldProxyThis) {
          ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
          ret = receiver === undefined ? "ret = callback({{args}}, nodeback); break;\n" : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }

        return ret.replace("{{args}}", args).replace(", ", comma);
      }

      function generateArgumentSwitchCase() {
        var ret = "";

        for (var i = 0; i < argumentOrder.length; ++i) {
          ret += "case " + argumentOrder[i] + ":" + generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", shouldProxyThis ? "ret = callback.apply(this, args);\n" : "ret = callback.apply(receiver, args);\n");
        return ret;
      }

      var getFunctionCode = typeof callback === "string" ? "this != null ? this['" + callback + "'] : fn" : "fn";
      var body = "'use strict';                                                \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise, " + multiArgs + ");   \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase()).replace("[GetFunctionCode]", getFunctionCode);
      body = body.replace("Parameters", parameterDeclaration(newParameterCount));
      return new Function("Promise", "fn", "receiver", "withAppended", "maybeWrapAsError", "nodebackForPromise", "tryCatch", "errorObj", "notEnumerableProp", "INTERNAL", body)(Promise, fn, receiver, withAppended, maybeWrapAsError, nodebackForPromise, util$1.tryCatch, util$1.errorObj, util$1.notEnumerableProp, INTERNAL);
    };
  }

  function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
    var defaultThis = function () {
      return this;
    }();

    var method = callback;

    if (typeof method === "string") {
      callback = fn;
    }

    function promisified() {
      var _receiver = receiver;
      if (receiver === THIS) _receiver = this;
      var promise = new Promise(INTERNAL);

      promise._captureStackTrace();

      var cb = typeof method === "string" && this !== defaultThis ? this[method] : callback;
      var fn = nodebackForPromise(promise, multiArgs);

      try {
        cb.apply(_receiver, withAppended(arguments, fn));
      } catch (e) {
        promise._rejectCallback(maybeWrapAsError(e), true, true);
      }

      if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
      return promise;
    }

    util$1.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
  }

  var makeNodePromisified = canEvaluate ? makeNodePromisifiedEval : makeNodePromisifiedClosure;

  function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods = promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i += 2) {
      var key = methods[i];
      var fn = methods[i + 1];
      var promisifiedKey = key + suffix;

      if (promisifier === makeNodePromisified) {
        obj[promisifiedKey] = makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
      } else {
        var promisified = promisifier(fn, function () {
          return makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
        });
        util$1.notEnumerableProp(promisified, "__isPromisified__", true);
        obj[promisifiedKey] = promisified;
      }
    }

    util$1.toFastProperties(obj);
    return obj;
  }

  function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined, callback, null, multiArgs);
  }

  Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
      throw new TypeError("expecting a function but got " + util$1.classString(fn));
    }

    if (isPromisified(fn)) {
      return fn;
    }

    options = Object(options);
    var receiver = options.context === undefined ? THIS : options.context;
    var multiArgs = !!options.multiArgs;
    var ret = promisify(fn, receiver, multiArgs);
    util$1.copyDescriptors(fn, ret, propsFilter);
    return ret;
  };

  Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
      throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    options = Object(options);
    var multiArgs = !!options.multiArgs;
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util$1.isIdentifier(suffix)) {
      throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var keys = util$1.inheritedDataKeys(target);

    for (var i = 0; i < keys.length; ++i) {
      var value = target[keys[i]];

      if (keys[i] !== "constructor" && util$1.isClass(value)) {
        promisifyAll(value.prototype, suffix, filter, promisifier, multiArgs);
        promisifyAll(value, suffix, filter, promisifier, multiArgs);
      }
    }

    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
  };
};

var props = function (Promise, PromiseArray, tryConvertToPromise, apiRejection) {
  var util$1 = util;

  var isObject = util$1.isObject;

  var es5$1 = es5;

  var Es6Map;
  if (typeof Map === "function") Es6Map = Map;

  var mapToEntries = function () {
    var index = 0;
    var size = 0;

    function extractEntry(value, key) {
      this[index] = value;
      this[index + size] = key;
      index++;
    }

    return function mapToEntries(map) {
      size = map.size;
      index = 0;
      var ret = new Array(map.size * 2);
      map.forEach(extractEntry, ret);
      return ret;
    };
  }();

  var entriesToMap = function (entries) {
    var ret = new Es6Map();
    var length = entries.length / 2 | 0;

    for (var i = 0; i < length; ++i) {
      var key = entries[length + i];
      var value = entries[i];
      ret.set(key, value);
    }

    return ret;
  };

  function PropertiesPromiseArray(obj) {
    var isMap = false;
    var entries;

    if (Es6Map !== undefined && obj instanceof Es6Map) {
      entries = mapToEntries(obj);
      isMap = true;
    } else {
      var keys = es5$1.keys(obj);
      var len = keys.length;
      entries = new Array(len * 2);

      for (var i = 0; i < len; ++i) {
        var key = keys[i];
        entries[i] = obj[key];
        entries[i + len] = key;
      }
    }

    this.constructor$(entries);
    this._isMap = isMap;

    this._init$(undefined, isMap ? -6 : -3);
  }

  util$1.inherits(PropertiesPromiseArray, PromiseArray);

  PropertiesPromiseArray.prototype._init = function () {};

  PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;

    if (totalResolved >= this._length) {
      var val;

      if (this._isMap) {
        val = entriesToMap(this._values);
      } else {
        val = {};
        var keyOffset = this.length();

        for (var i = 0, len = this.length(); i < len; ++i) {
          val[this._values[i + keyOffset]] = this._values[i];
        }
      }

      this._resolve(val);

      return true;
    }

    return false;
  };

  PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
  };

  PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
  };

  function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
      return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    } else if (castValue instanceof Promise) {
      ret = castValue._then(Promise.props, undefined, undefined, undefined, undefined);
    } else {
      ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
      ret._propagateFrom(castValue, 2);
    }

    return ret;
  }

  Promise.prototype.props = function () {
    return props(this);
  };

  Promise.props = function (promises) {
    return props(promises);
  };
};

var race = function (Promise, INTERNAL, tryConvertToPromise, apiRejection) {
  var util$1 = util;

  var raceLater = function (promise) {
    return promise.then(function (array) {
      return race(array, promise);
    });
  };

  function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
      return raceLater(maybePromise);
    } else {
      promises = util$1.asArray(promises);
      if (promises === null) return apiRejection("expecting an array or an iterable object but got " + util$1.classString(promises));
    }

    var ret = new Promise(INTERNAL);

    if (parent !== undefined) {
      ret._propagateFrom(parent, 3);
    }

    var fulfill = ret._fulfill;
    var reject = ret._reject;

    for (var i = 0, len = promises.length; i < len; ++i) {
      var val = promises[i];

      if (val === undefined && !(i in promises)) {
        continue;
      }

      Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }

    return ret;
  }

  Promise.race = function (promises) {
    return race(promises, undefined);
  };

  Promise.prototype.race = function () {
    return race(this, undefined);
  };
};

var reduce = function (Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug) {
  var getDomain = Promise._getDomain;

  var util$1 = util;

  var tryCatch = util$1.tryCatch;

  function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    var domain = getDomain();
    this._fn = domain === null ? fn : util$1.domainBind(domain, fn);

    if (initialValue !== undefined) {
      initialValue = Promise.resolve(initialValue);

      initialValue._attachCancellationCallback(this);
    }

    this._initialValue = initialValue;
    this._currentCancellable = null;

    if (_each === INTERNAL) {
      this._eachValues = Array(this._length);
    } else if (_each === 0) {
      this._eachValues = null;
    } else {
      this._eachValues = undefined;
    }

    this._promise._captureStackTrace();

    this._init$(undefined, -5);
  }

  util$1.inherits(ReductionPromiseArray, PromiseArray);

  ReductionPromiseArray.prototype._gotAccum = function (accum) {
    if (this._eachValues !== undefined && this._eachValues !== null && accum !== INTERNAL) {
      this._eachValues.push(accum);
    }
  };

  ReductionPromiseArray.prototype._eachComplete = function (value) {
    if (this._eachValues !== null) {
      this._eachValues.push(value);
    }

    return this._eachValues;
  };

  ReductionPromiseArray.prototype._init = function () {};

  ReductionPromiseArray.prototype._resolveEmptyArray = function () {
    this._resolve(this._eachValues !== undefined ? this._eachValues : this._initialValue);
  };

  ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
  };

  ReductionPromiseArray.prototype._resolve = function (value) {
    this._promise._resolveCallback(value);

    this._values = null;
  };

  ReductionPromiseArray.prototype._resultCancelled = function (sender) {
    if (sender === this._initialValue) return this._cancel();
    if (this._isResolved()) return;

    this._resultCancelled$();

    if (this._currentCancellable instanceof Promise) {
      this._currentCancellable.cancel();
    }

    if (this._initialValue instanceof Promise) {
      this._initialValue.cancel();
    }
  };

  ReductionPromiseArray.prototype._iterate = function (values) {
    this._values = values;
    var value;
    var i;
    var length = values.length;

    if (this._initialValue !== undefined) {
      value = this._initialValue;
      i = 0;
    } else {
      value = Promise.resolve(values[0]);
      i = 1;
    }

    this._currentCancellable = value;

    if (!value.isRejected()) {
      for (; i < length; ++i) {
        var ctx = {
          accum: null,
          value: values[i],
          index: i,
          length: length,
          array: this
        };
        value = value._then(gotAccum, undefined, undefined, ctx, undefined);
      }
    }

    if (this._eachValues !== undefined) {
      value = value._then(this._eachComplete, undefined, undefined, this, undefined);
    }

    value._then(completed, completed, undefined, value, this);
  };

  Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
  };

  Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
  };

  function completed(valueOrReason, array) {
    if (this.isFulfilled()) {
      array._resolve(valueOrReason);
    } else {
      array._reject(valueOrReason);
    }
  }

  function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") {
      return apiRejection("expecting a function but got " + util$1.classString(fn));
    }

    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
  }

  function gotAccum(accum) {
    this.accum = accum;

    this.array._gotAccum(accum);

    var value = tryConvertToPromise(this.value, this.array._promise);

    if (value instanceof Promise) {
      this.array._currentCancellable = value;
      return value._then(gotValue, undefined, undefined, this, undefined);
    } else {
      return gotValue.call(this, value);
    }
  }

  function gotValue(value) {
    var array = this.array;
    var promise = array._promise;
    var fn = tryCatch(array._fn);

    promise._pushContext();

    var ret;

    if (array._eachValues !== undefined) {
      ret = fn.call(promise._boundValue(), value, this.index, this.length);
    } else {
      ret = fn.call(promise._boundValue(), this.accum, value, this.index, this.length);
    }

    if (ret instanceof Promise) {
      array._currentCancellable = ret;
    }

    var promiseCreated = promise._popContext();

    debug.checkForgottenReturns(ret, promiseCreated, array._eachValues !== undefined ? "Promise.each" : "Promise.reduce", promise);
    return ret;
  }
};

var settle = function (Promise, PromiseArray, debug) {
  var PromiseInspection = Promise.PromiseInspection;

  var util$1 = util;

  function SettledPromiseArray(values) {
    this.constructor$(values);
  }

  util$1.inherits(SettledPromiseArray, PromiseArray);

  SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;

    if (totalResolved >= this._length) {
      this._resolve(this._values);

      return true;
    }

    return false;
  };

  SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 33554432;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
  };

  SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 16777216;
    ret._settledValueField = reason;
    return this._promiseResolved(index, ret);
  };

  Promise.settle = function (promises) {
    debug.deprecated(".settle()", ".reflect()");
    return new SettledPromiseArray(promises).promise();
  };

  Promise.prototype.settle = function () {
    return Promise.settle(this);
  };
};

var some = function (Promise, PromiseArray, apiRejection) {
  var util$1 = util;

  var RangeError = errors.RangeError;

  var AggregateError = errors.AggregateError;

  var isArray = util$1.isArray;
  var CANCELLATION = {};

  function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
  }

  util$1.inherits(SomePromiseArray, PromiseArray);

  SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
      return;
    }

    if (this._howMany === 0) {
      this._resolve([]);

      return;
    }

    this._init$(undefined, -5);

    var isArrayResolved = isArray(this._values);

    if (!this._isResolved() && isArrayResolved && this._howMany > this._canPossiblyFulfill()) {
      this._reject(this._getRangeError(this.length()));
    }
  };

  SomePromiseArray.prototype.init = function () {
    this._initialized = true;

    this._init();
  };

  SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
  };

  SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
  };

  SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
  };

  SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);

    if (this._fulfilled() === this.howMany()) {
      this._values.length = this.howMany();

      if (this.howMany() === 1 && this._unwrap) {
        this._resolve(this._values[0]);
      } else {
        this._resolve(this._values);
      }

      return true;
    }

    return false;
  };

  SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);

    return this._checkOutcome();
  };

  SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
      return this._cancel();
    }

    this._addRejected(CANCELLATION);

    return this._checkOutcome();
  };

  SomePromiseArray.prototype._checkOutcome = function () {
    if (this.howMany() > this._canPossiblyFulfill()) {
      var e = new AggregateError();

      for (var i = this.length(); i < this._values.length; ++i) {
        if (this._values[i] !== CANCELLATION) {
          e.push(this._values[i]);
        }
      }

      if (e.length > 0) {
        this._reject(e);
      } else {
        this._cancel();
      }

      return true;
    }

    return false;
  };

  SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
  };

  SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
  };

  SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
  };

  SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
  };

  SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
  };

  SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " + this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
  };

  SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
  };

  function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
      return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
  }

  Promise.some = function (promises, howMany) {
    return some(promises, howMany);
  };

  Promise.prototype.some = function (howMany) {
    return some(this, howMany);
  };

  Promise._SomePromiseArray = SomePromiseArray;
};

var timers = function (Promise, INTERNAL, debug) {
  var util$1 = util;

  var TimeoutError = Promise.TimeoutError;

  function HandleWrapper(handle) {
    this.handle = handle;
  }

  HandleWrapper.prototype._resultCancelled = function () {
    clearTimeout(this.handle);
  };

  var afterValue = function (value) {
    return delay(+this).thenReturn(value);
  };

  var delay = Promise.delay = function (ms, value) {
    var ret;
    var handle;

    if (value !== undefined) {
      ret = Promise.resolve(value)._then(afterValue, null, null, ms, undefined);

      if (debug.cancellation() && value instanceof Promise) {
        ret._setOnCancel(value);
      }
    } else {
      ret = new Promise(INTERNAL);
      handle = setTimeout(function () {
        ret._fulfill();
      }, +ms);

      if (debug.cancellation()) {
        ret._setOnCancel(new HandleWrapper(handle));
      }

      ret._captureStackTrace();
    }

    ret._setAsyncGuaranteed();

    return ret;
  };

  Promise.prototype.delay = function (ms) {
    return delay(ms, this);
  };

  var afterTimeout = function (promise, message, parent) {
    var err;

    if (typeof message !== "string") {
      if (message instanceof Error) {
        err = message;
      } else {
        err = new TimeoutError("operation timed out");
      }
    } else {
      err = new TimeoutError(message);
    }

    util$1.markAsOriginatingFromRejection(err);

    promise._attachExtraTrace(err);

    promise._reject(err);

    if (parent != null) {
      parent.cancel();
    }
  };

  function successClear(value) {
    clearTimeout(this.handle);
    return value;
  }

  function failureClear(reason) {
    clearTimeout(this.handle);
    throw reason;
  }

  Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret, parent;
    var handleWrapper = new HandleWrapper(setTimeout(function timeoutTimeout() {
      if (ret.isPending()) {
        afterTimeout(ret, message, parent);
      }
    }, ms));

    if (debug.cancellation()) {
      parent = this.then();
      ret = parent._then(successClear, failureClear, undefined, handleWrapper, undefined);

      ret._setOnCancel(handleWrapper);
    } else {
      ret = this._then(successClear, failureClear, undefined, handleWrapper, undefined);
    }

    return ret;
  };
};

var using = function (Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug) {
  var util$1 = util;

  var TypeError = errors.TypeError;

  var inherits = util.inherits;

  var errorObj = util$1.errorObj;
  var tryCatch = util$1.tryCatch;
  var NULL = {};

  function thrower(e) {
    setTimeout(function () {
      throw e;
    }, 0);
  }

  function castPreservingDisposable(thenable) {
    var maybePromise = tryConvertToPromise(thenable);

    if (maybePromise !== thenable && typeof thenable._isDisposable === "function" && typeof thenable._getDisposer === "function" && thenable._isDisposable()) {
      maybePromise._setDisposable(thenable._getDisposer());
    }

    return maybePromise;
  }

  function dispose(resources, inspection) {
    var i = 0;
    var len = resources.length;
    var ret = new Promise(INTERNAL);

    function iterator() {
      if (i >= len) return ret._fulfill();
      var maybePromise = castPreservingDisposable(resources[i++]);

      if (maybePromise instanceof Promise && maybePromise._isDisposable()) {
        try {
          maybePromise = tryConvertToPromise(maybePromise._getDisposer().tryDispose(inspection), resources.promise);
        } catch (e) {
          return thrower(e);
        }

        if (maybePromise instanceof Promise) {
          return maybePromise._then(iterator, thrower, null, null, null);
        }
      }

      iterator();
    }

    iterator();
    return ret;
  }

  function Disposer(data, promise, context) {
    this._data = data;
    this._promise = promise;
    this._context = context;
  }

  Disposer.prototype.data = function () {
    return this._data;
  };

  Disposer.prototype.promise = function () {
    return this._promise;
  };

  Disposer.prototype.resource = function () {
    if (this.promise().isFulfilled()) {
      return this.promise().value();
    }

    return NULL;
  };

  Disposer.prototype.tryDispose = function (inspection) {
    var resource = this.resource();
    var context = this._context;
    if (context !== undefined) context._pushContext();
    var ret = resource !== NULL ? this.doDispose(resource, inspection) : null;
    if (context !== undefined) context._popContext();

    this._promise._unsetDisposable();

    this._data = null;
    return ret;
  };

  Disposer.isDisposer = function (d) {
    return d != null && typeof d.resource === "function" && typeof d.tryDispose === "function";
  };

  function FunctionDisposer(fn, promise, context) {
    this.constructor$(fn, promise, context);
  }

  inherits(FunctionDisposer, Disposer);

  FunctionDisposer.prototype.doDispose = function (resource, inspection) {
    var fn = this.data();
    return fn.call(resource, resource, inspection);
  };

  function maybeUnwrapDisposer(value) {
    if (Disposer.isDisposer(value)) {
      this.resources[this.index]._setDisposable(value);

      return value.promise();
    }

    return value;
  }

  function ResourceList(length) {
    this.length = length;
    this.promise = null;
    this[length - 1] = null;
  }

  ResourceList.prototype._resultCancelled = function () {
    var len = this.length;

    for (var i = 0; i < len; ++i) {
      var item = this[i];

      if (item instanceof Promise) {
        item.cancel();
      }
    }
  };

  Promise.using = function () {
    var len = arguments.length;
    if (len < 2) return apiRejection("you must pass at least 2 arguments to Promise.using");
    var fn = arguments[len - 1];

    if (typeof fn !== "function") {
      return apiRejection("expecting a function but got " + util$1.classString(fn));
    }

    var input;
    var spreadArgs = true;

    if (len === 2 && Array.isArray(arguments[0])) {
      input = arguments[0];
      len = input.length;
      spreadArgs = false;
    } else {
      input = arguments;
      len--;
    }

    var resources = new ResourceList(len);

    for (var i = 0; i < len; ++i) {
      var resource = input[i];

      if (Disposer.isDisposer(resource)) {
        var disposer = resource;
        resource = resource.promise();

        resource._setDisposable(disposer);
      } else {
        var maybePromise = tryConvertToPromise(resource);

        if (maybePromise instanceof Promise) {
          resource = maybePromise._then(maybeUnwrapDisposer, null, null, {
            resources: resources,
            index: i
          }, undefined);
        }
      }

      resources[i] = resource;
    }

    var reflectedResources = new Array(resources.length);

    for (var i = 0; i < reflectedResources.length; ++i) {
      reflectedResources[i] = Promise.resolve(resources[i]).reflect();
    }

    var resultPromise = Promise.all(reflectedResources).then(function (inspections) {
      for (var i = 0; i < inspections.length; ++i) {
        var inspection = inspections[i];

        if (inspection.isRejected()) {
          errorObj.e = inspection.error();
          return errorObj;
        } else if (!inspection.isFulfilled()) {
          resultPromise.cancel();
          return;
        }

        inspections[i] = inspection.value();
      }

      promise._pushContext();

      fn = tryCatch(fn);
      var ret = spreadArgs ? fn.apply(undefined, inspections) : fn(inspections);

      var promiseCreated = promise._popContext();

      debug.checkForgottenReturns(ret, promiseCreated, "Promise.using", promise);
      return ret;
    });
    var promise = resultPromise.lastly(function () {
      var inspection = new Promise.PromiseInspection(resultPromise);
      return dispose(resources, inspection);
    });
    resources.promise = promise;

    promise._setOnCancel(resources);

    return promise;
  };

  Promise.prototype._setDisposable = function (disposer) {
    this._bitField = this._bitField | 131072;
    this._disposer = disposer;
  };

  Promise.prototype._isDisposable = function () {
    return (this._bitField & 131072) > 0;
  };

  Promise.prototype._getDisposer = function () {
    return this._disposer;
  };

  Promise.prototype._unsetDisposable = function () {
    this._bitField = this._bitField & ~131072;
    this._disposer = undefined;
  };

  Promise.prototype.disposer = function (fn) {
    if (typeof fn === "function") {
      return new FunctionDisposer(fn, this, createContext());
    }

    throw new TypeError();
  };
};

var any = function (Promise) {
  var SomePromiseArray = Promise._SomePromiseArray;

  function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
  }

  Promise.any = function (promises) {
    return any(promises);
  };

  Promise.prototype.any = function () {
    return any(this);
  };
};

var each = function (Promise, INTERNAL) {
  var PromiseReduce = Promise.reduce;
  var PromiseAll = Promise.all;

  function promiseAllThis() {
    return PromiseAll(this);
  }

  function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
  }

  Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, 0)._then(promiseAllThis, undefined, undefined, this, undefined);
  };

  Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
  };

  Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, 0)._then(promiseAllThis, undefined, undefined, promises, undefined);
  };

  Promise.mapSeries = PromiseMapSeries;
};

var filter = function (Promise, INTERNAL) {
  var PromiseMap = Promise.map;

  Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
  };

  Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
  };
};

var promise = createCommonjsModule(function (module) {

module.exports = function () {
  var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
  };

  var reflectHandler = function () {
    return new Promise.PromiseInspection(this._target());
  };

  var apiRejection = function (msg) {
    return Promise.reject(new TypeError(msg));
  };

  function Proxyable() {}

  var UNDEFINED_BINDING = {};

  var util$1 = util;

  var getDomain;

  if (util$1.isNode) {
    getDomain = function () {
      var ret = process.domain;
      if (ret === undefined) ret = null;
      return ret;
    };
  } else {
    getDomain = function () {
      return null;
    };
  }

  util$1.notEnumerableProp(Promise, "_getDomain", getDomain);

  var es5$1 = es5;

  var Async = async;

  var async$1 = new Async();
  es5$1.defineProperty(Promise, "_async", {
    value: async$1
  });

  var errors$1 = errors;

  var TypeError = Promise.TypeError = errors$1.TypeError;
  Promise.RangeError = errors$1.RangeError;
  var CancellationError = Promise.CancellationError = errors$1.CancellationError;
  Promise.TimeoutError = errors$1.TimeoutError;
  Promise.OperationalError = errors$1.OperationalError;
  Promise.RejectionError = errors$1.OperationalError;
  Promise.AggregateError = errors$1.AggregateError;

  var INTERNAL = function () {};

  var APPLY = {};
  var NEXT_FILTER = {};

  var tryConvertToPromise = thenables(Promise, INTERNAL);

  var PromiseArray = promise_array(Promise, INTERNAL, tryConvertToPromise, apiRejection, Proxyable);

  var Context = context(Promise);
  /*jshint unused:false*/


  var createContext = Context.create;

  var debug = debuggability(Promise, Context);

  var PassThroughHandlerContext = _finally(Promise, tryConvertToPromise, NEXT_FILTER);

  var catchFilter = catch_filter(NEXT_FILTER);

  var nodebackForPromise = nodeback;

  var errorObj = util$1.errorObj;
  var tryCatch = util$1.tryCatch;

  function check(self, executor) {
    if (self == null || self.constructor !== Promise) {
      throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    if (typeof executor !== "function") {
      throw new TypeError("expecting a function but got " + util$1.classString(executor));
    }
  }

  function Promise(executor) {
    if (executor !== INTERNAL) {
      check(this, executor);
    }

    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;

    this._resolveFromExecutor(executor);

    this._promiseCreated();

    this._fireEvent("promiseCreated", this);
  }

  Promise.prototype.toString = function () {
    return "[object Promise]";
  };

  Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;

    if (len > 1) {
      var catchInstances = new Array(len - 1),
          j = 0,
          i;

      for (i = 0; i < len - 1; ++i) {
        var item = arguments[i];

        if (util$1.isObject(item)) {
          catchInstances[j++] = item;
        } else {
          return apiRejection("Catch statement predicate: " + "expecting an object but got " + util$1.classString(item));
        }
      }

      catchInstances.length = j;
      fn = arguments[i];

      if (typeof fn !== "function") {
        throw new TypeError("The last argument to .catch() " + "must be a function, got " + util$1.toString(fn));
      }

      return this.then(undefined, catchFilter(catchInstances, fn, this));
    }

    return this.then(undefined, fn);
  };

  Promise.prototype.reflect = function () {
    return this._then(reflectHandler, reflectHandler, undefined, this, undefined);
  };

  Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 && typeof didFulfill !== "function" && typeof didReject !== "function") {
      var msg = ".then() only accepts functions but was passed: " + util$1.classString(didFulfill);

      if (arguments.length > 1) {
        msg += ", " + util$1.classString(didReject);
      }

      this._warn(msg);
    }

    return this._then(didFulfill, didReject, undefined, undefined, undefined);
  };

  Promise.prototype.done = function (didFulfill, didReject) {
    var promise = this._then(didFulfill, didReject, undefined, undefined, undefined);

    promise._setIsFinal();
  };

  Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
      return apiRejection("expecting a function but got " + util$1.classString(fn));
    }

    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
  };

  Promise.prototype.toJSON = function () {
    var ret = {
      isFulfilled: false,
      isRejected: false,
      fulfillmentValue: undefined,
      rejectionReason: undefined
    };

    if (this.isFulfilled()) {
      ret.fulfillmentValue = this.value();
      ret.isFulfilled = true;
    } else if (this.isRejected()) {
      ret.rejectionReason = this.reason();
      ret.isRejected = true;
    }

    return ret;
  };

  Promise.prototype.all = function () {
    if (arguments.length > 0) {
      this._warn(".all() was passed arguments but it does not take any");
    }

    return new PromiseArray(this).promise();
  };

  Promise.prototype.error = function (fn) {
    return this.caught(util$1.originatesFromRejection, fn);
  };

  Promise.getNewLibraryCopy = module.exports;

  Promise.is = function (val) {
    return val instanceof Promise;
  };

  Promise.fromNode = Promise.fromCallback = function (fn) {
    var ret = new Promise(INTERNAL);

    ret._captureStackTrace();

    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));

    if (result === errorObj) {
      ret._rejectCallback(result.e, true);
    }

    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
  };

  Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
  };

  Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);

    if (!(ret instanceof Promise)) {
      ret = new Promise(INTERNAL);

      ret._captureStackTrace();

      ret._setFulfilled();

      ret._rejectionHandler0 = obj;
    }

    return ret;
  };

  Promise.resolve = Promise.fulfilled = Promise.cast;

  Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);

    ret._captureStackTrace();

    ret._rejectCallback(reason, true);

    return ret;
  };

  Promise.setScheduler = function (fn) {
    if (typeof fn !== "function") {
      throw new TypeError("expecting a function but got " + util$1.classString(fn));
    }

    return async$1.setScheduler(fn);
  };

  Promise.prototype._then = function (didFulfill, didReject, _, receiver, internalData) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);

    var target = this._target();

    var bitField = target._bitField;

    if (!haveInternalData) {
      promise._propagateFrom(this, 3);

      promise._captureStackTrace();

      if (receiver === undefined && (this._bitField & 2097152) !== 0) {
        if (!((bitField & 50397184) === 0)) {
          receiver = this._boundValue();
        } else {
          receiver = target === this ? undefined : this._boundTo;
        }
      }

      this._fireEvent("promiseChained", this, promise);
    }

    var domain = getDomain();

    if (!((bitField & 50397184) === 0)) {
      var handler,
          value,
          settler = target._settlePromiseCtx;

      if ((bitField & 33554432) !== 0) {
        value = target._rejectionHandler0;
        handler = didFulfill;
      } else if ((bitField & 16777216) !== 0) {
        value = target._fulfillmentHandler0;
        handler = didReject;

        target._unsetRejectionIsUnhandled();
      } else {
        settler = target._settlePromiseLateCancellationObserver;
        value = new CancellationError("late cancellation observer");

        target._attachExtraTrace(value);

        handler = didReject;
      }

      async$1.invoke(settler, target, {
        handler: domain === null ? handler : typeof handler === "function" && util$1.domainBind(domain, handler),
        promise: promise,
        receiver: receiver,
        value: value
      });
    } else {
      target._addCallbacks(didFulfill, didReject, promise, receiver, domain);
    }

    return promise;
  };

  Promise.prototype._length = function () {
    return this._bitField & 65535;
  };

  Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
  };

  Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
  };

  Promise.prototype._setLength = function (len) {
    this._bitField = this._bitField & -65536 | len & 65535;
  };

  Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;

    this._fireEvent("promiseFulfilled", this);
  };

  Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;

    this._fireEvent("promiseRejected", this);
  };

  Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;

    this._fireEvent("promiseResolved", this);
  };

  Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
  };

  Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
  };

  Promise.prototype._unsetCancelled = function () {
    this._bitField = this._bitField & ~65536;
  };

  Promise.prototype._setCancelled = function () {
    this._bitField = this._bitField | 65536;

    this._fireEvent("promiseCancelled", this);
  };

  Promise.prototype._setWillBeCancelled = function () {
    this._bitField = this._bitField | 8388608;
  };

  Promise.prototype._setAsyncGuaranteed = function () {
    if (async$1.hasCustomScheduler()) return;
    this._bitField = this._bitField | 134217728;
  };

  Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[index * 4 - 4 + 3];

    if (ret === UNDEFINED_BINDING) {
      return undefined;
    } else if (ret === undefined && this._isBound()) {
      return this._boundValue();
    }

    return ret;
  };

  Promise.prototype._promiseAt = function (index) {
    return this[index * 4 - 4 + 2];
  };

  Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[index * 4 - 4 + 0];
  };

  Promise.prototype._rejectionHandlerAt = function (index) {
    return this[index * 4 - 4 + 1];
  };

  Promise.prototype._boundValue = function () {};

  Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;

    var receiver = follower._receiverAt(0);

    if (receiver === undefined) receiver = UNDEFINED_BINDING;

    this._addCallbacks(fulfill, reject, promise, receiver, null);
  };

  Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);

    var reject = follower._rejectionHandlerAt(index);

    var promise = follower._promiseAt(index);

    var receiver = follower._receiverAt(index);

    if (receiver === undefined) receiver = UNDEFINED_BINDING;

    this._addCallbacks(fulfill, reject, promise, receiver, null);
  };

  Promise.prototype._addCallbacks = function (fulfill, reject, promise, receiver, domain) {
    var index = this._length();

    if (index >= 65535 - 4) {
      index = 0;

      this._setLength(0);
    }

    if (index === 0) {
      this._promise0 = promise;
      this._receiver0 = receiver;

      if (typeof fulfill === "function") {
        this._fulfillmentHandler0 = domain === null ? fulfill : util$1.domainBind(domain, fulfill);
      }

      if (typeof reject === "function") {
        this._rejectionHandler0 = domain === null ? reject : util$1.domainBind(domain, reject);
      }
    } else {
      var base = index * 4 - 4;
      this[base + 2] = promise;
      this[base + 3] = receiver;

      if (typeof fulfill === "function") {
        this[base + 0] = domain === null ? fulfill : util$1.domainBind(domain, fulfill);
      }

      if (typeof reject === "function") {
        this[base + 1] = domain === null ? reject : util$1.domainBind(domain, reject);
      }
    }

    this._setLength(index + 1);

    return index;
  };

  Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
  };

  Promise.prototype._resolveCallback = function (value, shouldBind) {
    if ((this._bitField & 117506048) !== 0) return;
    if (value === this) return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);
    if (shouldBind) this._propagateFrom(maybePromise, 2);

    var promise = maybePromise._target();

    if (promise === this) {
      this._reject(makeSelfResolutionError());

      return;
    }

    var bitField = promise._bitField;

    if ((bitField & 50397184) === 0) {
      var len = this._length();

      if (len > 0) promise._migrateCallback0(this);

      for (var i = 1; i < len; ++i) {
        promise._migrateCallbackAt(this, i);
      }

      this._setFollowing();

      this._setLength(0);

      this._setFollowee(promise);
    } else if ((bitField & 33554432) !== 0) {
      this._fulfill(promise._value());
    } else if ((bitField & 16777216) !== 0) {
      this._reject(promise._reason());
    } else {
      var reason = new CancellationError("late cancellation observer");

      promise._attachExtraTrace(reason);

      this._reject(reason);
    }
  };

  Promise.prototype._rejectCallback = function (reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util$1.ensureErrorObject(reason);
    var hasStack = trace === reason;

    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
      var message = "a promise was rejected with a non-error: " + util$1.classString(reason);

      this._warn(message, true);
    }

    this._attachExtraTrace(trace, synchronous ? hasStack : false);

    this._reject(reason);
  };

  Promise.prototype._resolveFromExecutor = function (executor) {
    if (executor === INTERNAL) return;
    var promise = this;

    this._captureStackTrace();

    this._pushContext();

    var synchronous = true;

    var r = this._execute(executor, function (value) {
      promise._resolveCallback(value);
    }, function (reason) {
      promise._rejectCallback(reason, synchronous);
    });

    synchronous = false;

    this._popContext();

    if (r !== undefined) {
      promise._rejectCallback(r, true);
    }
  };

  Promise.prototype._settlePromiseFromHandler = function (handler, receiver, value, promise) {
    var bitField = promise._bitField;
    if ((bitField & 65536) !== 0) return;

    promise._pushContext();

    var x;

    if (receiver === APPLY) {
      if (!value || typeof value.length !== "number") {
        x = errorObj;
        x.e = new TypeError("cannot .spread() a non-array: " + util$1.classString(value));
      } else {
        x = tryCatch(handler).apply(this._boundValue(), value);
      }
    } else {
      x = tryCatch(handler).call(receiver, value);
    }

    var promiseCreated = promise._popContext();

    bitField = promise._bitField;
    if ((bitField & 65536) !== 0) return;

    if (x === NEXT_FILTER) {
      promise._reject(value);
    } else if (x === errorObj) {
      promise._rejectCallback(x.e, false);
    } else {
      debug.checkForgottenReturns(x, promiseCreated, "", promise, this);

      promise._resolveCallback(x);
    }
  };

  Promise.prototype._target = function () {
    var ret = this;

    while (ret._isFollowing()) ret = ret._followee();

    return ret;
  };

  Promise.prototype._followee = function () {
    return this._rejectionHandler0;
  };

  Promise.prototype._setFollowee = function (promise) {
    this._rejectionHandler0 = promise;
  };

  Promise.prototype._settlePromise = function (promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = (bitField & 134217728) !== 0;

    if ((bitField & 65536) !== 0) {
      if (isPromise) promise._invokeInternalOnCancel();

      if (receiver instanceof PassThroughHandlerContext && receiver.isFinallyHandler()) {
        receiver.cancelPromise = promise;

        if (tryCatch(handler).call(receiver, value) === errorObj) {
          promise._reject(errorObj.e);
        }
      } else if (handler === reflectHandler) {
        promise._fulfill(reflectHandler.call(receiver));
      } else if (receiver instanceof Proxyable) {
        receiver._promiseCancelled(promise);
      } else if (isPromise || promise instanceof PromiseArray) {
        promise._cancel();
      } else {
        receiver.cancel();
      }
    } else if (typeof handler === "function") {
      if (!isPromise) {
        handler.call(receiver, value, promise);
      } else {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();

        this._settlePromiseFromHandler(handler, receiver, value, promise);
      }
    } else if (receiver instanceof Proxyable) {
      if (!receiver._isResolved()) {
        if ((bitField & 33554432) !== 0) {
          receiver._promiseFulfilled(value, promise);
        } else {
          receiver._promiseRejected(value, promise);
        }
      }
    } else if (isPromise) {
      if (asyncGuaranteed) promise._setAsyncGuaranteed();

      if ((bitField & 33554432) !== 0) {
        promise._fulfill(value);
      } else {
        promise._reject(value);
      }
    }
  };

  Promise.prototype._settlePromiseLateCancellationObserver = function (ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;

    if (typeof handler === "function") {
      if (!(promise instanceof Promise)) {
        handler.call(receiver, value, promise);
      } else {
        this._settlePromiseFromHandler(handler, receiver, value, promise);
      }
    } else if (promise instanceof Promise) {
      promise._reject(value);
    }
  };

  Promise.prototype._settlePromiseCtx = function (ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
  };

  Promise.prototype._settlePromise0 = function (handler, value, bitField) {
    var promise = this._promise0;

    var receiver = this._receiverAt(0);

    this._promise0 = undefined;
    this._receiver0 = undefined;

    this._settlePromise(promise, handler, receiver, value);
  };

  Promise.prototype._clearCallbackDataAtIndex = function (index) {
    var base = index * 4 - 4;
    this[base + 2] = this[base + 3] = this[base + 0] = this[base + 1] = undefined;
  };

  Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if ((bitField & 117506048) >>> 16) return;

    if (value === this) {
      var err = makeSelfResolutionError();

      this._attachExtraTrace(err);

      return this._reject(err);
    }

    this._setFulfilled();

    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
      if ((bitField & 134217728) !== 0) {
        this._settlePromises();
      } else {
        async$1.settlePromises(this);
      }

      this._dereferenceTrace();
    }
  };

  Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if ((bitField & 117506048) >>> 16) return;

    this._setRejected();

    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
      return async$1.fatalError(reason, util$1.isNode);
    }

    if ((bitField & 65535) > 0) {
      async$1.settlePromises(this);
    } else {
      this._ensurePossibleRejectionHandled();
    }
  };

  Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
      var handler = this._fulfillmentHandlerAt(i);

      var promise = this._promiseAt(i);

      var receiver = this._receiverAt(i);

      this._clearCallbackDataAtIndex(i);

      this._settlePromise(promise, handler, receiver, value);
    }
  };

  Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
      var handler = this._rejectionHandlerAt(i);

      var promise = this._promiseAt(i);

      var receiver = this._receiverAt(i);

      this._clearCallbackDataAtIndex(i);

      this._settlePromise(promise, handler, receiver, reason);
    }
  };

  Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = bitField & 65535;

    if (len > 0) {
      if ((bitField & 16842752) !== 0) {
        var reason = this._fulfillmentHandler0;

        this._settlePromise0(this._rejectionHandler0, reason, bitField);

        this._rejectPromises(len, reason);
      } else {
        var value = this._rejectionHandler0;

        this._settlePromise0(this._fulfillmentHandler0, value, bitField);

        this._fulfillPromises(len, value);
      }

      this._setLength(0);
    }

    this._clearCancellationData();
  };

  Promise.prototype._settledValue = function () {
    var bitField = this._bitField;

    if ((bitField & 33554432) !== 0) {
      return this._rejectionHandler0;
    } else if ((bitField & 16777216) !== 0) {
      return this._fulfillmentHandler0;
    }
  };

  if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
    es5$1.defineProperty(Promise.prototype, Symbol.toStringTag, {
      get: function () {
        return "Object";
      }
    });
  }

  function deferResolve(v) {
    this.promise._resolveCallback(v);
  }

  function deferReject(v) {
    this.promise._rejectCallback(v, false);
  }

  Promise.defer = Promise.pending = function () {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
      promise: promise,
      resolve: deferResolve,
      reject: deferReject
    };
  };

  util$1.notEnumerableProp(Promise, "_makeSelfResolutionError", makeSelfResolutionError);

  method(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug);

  bind(Promise, INTERNAL, tryConvertToPromise, debug);

  cancel(Promise, PromiseArray, apiRejection, debug);

  direct_resolve(Promise);

  synchronous_inspection(Promise);

  join(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async$1, getDomain);

  Promise.Promise = Promise;
  Promise.version = "3.5.5";

  call_get(Promise);

  generators(Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);

  map(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);

  nodeify(Promise);

  promisify(Promise, INTERNAL);

  props(Promise, PromiseArray, tryConvertToPromise, apiRejection);

  race(Promise, INTERNAL, tryConvertToPromise, apiRejection);

  reduce(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);

  settle(Promise, PromiseArray, debug);

  some(Promise, PromiseArray, apiRejection);

  timers(Promise, INTERNAL, debug);

  using(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);

  any(Promise);

  each(Promise, INTERNAL);

  filter(Promise, INTERNAL);

  util$1.toFastProperties(Promise);
  util$1.toFastProperties(Promise.prototype);

  function fillTypes(value) {
    var p = new Promise(INTERNAL);
    p._fulfillmentHandler0 = value;
    p._rejectionHandler0 = value;
    p._promise0 = value;
    p._receiver0 = value;
  } // Complete slack tracking, opt out of field-type tracking and           
  // stabilize map                                                         


  fillTypes({
    a: 1
  });
  fillTypes({
    b: 2
  });
  fillTypes({
    c: 3
  });
  fillTypes(1);
  fillTypes(function () {});
  fillTypes(undefined);
  fillTypes(false);
  fillTypes(new Promise(INTERNAL));
  debug.setBounds(Async.firstLineError, util$1.lastLineError);
  return Promise;
};
});

var old;
if (typeof Promise !== "undefined") old = Promise;

function noConflict() {
  try {
    if (Promise === bluebird) Promise = old;
  } catch (e) {}

  return bluebird;
}

var bluebird = promise();

bluebird.noConflict = noConflict;
var bluebird_1 = bluebird;

/* Node.js 6.4.0 and up has full support */
var hasFullSupport = function () {
  try {
    if (!Buffer.isEncoding('latin1')) {
      return false;
    }

    var buf = Buffer.alloc ? Buffer.alloc(4) : new Buffer(4);
    buf.fill('ab', 'ucs2');
    return buf.toString('hex') === '61006200';
  } catch (_) {
    return false;
  }
}();

function isSingleByte(val) {
  return val.length === 1 && val.charCodeAt(0) < 256;
}

function fillWithNumber(buffer, val, start, end) {
  if (start < 0 || end > buffer.length) {
    throw new RangeError('Out of range index');
  }

  start = start >>> 0;
  end = end === undefined ? buffer.length : end >>> 0;

  if (end > start) {
    buffer.fill(val, start, end);
  }

  return buffer;
}

function fillWithBuffer(buffer, val, start, end) {
  if (start < 0 || end > buffer.length) {
    throw new RangeError('Out of range index');
  }

  if (end <= start) {
    return buffer;
  }

  start = start >>> 0;
  end = end === undefined ? buffer.length : end >>> 0;
  var pos = start;
  var len = val.length;

  while (pos <= end - len) {
    val.copy(buffer, pos);
    pos += len;
  }

  if (pos !== end) {
    val.copy(buffer, pos, 0, end - pos);
  }

  return buffer;
}

function fill(buffer, val, start, end, encoding) {
  if (hasFullSupport) {
    return buffer.fill(val, start, end, encoding);
  }

  if (typeof val === 'number') {
    return fillWithNumber(buffer, val, start, end);
  }

  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = buffer.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = buffer.length;
    }

    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string');
    }

    if (encoding === 'latin1') {
      encoding = 'binary';
    }

    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding);
    }

    if (val === '') {
      return fillWithNumber(buffer, 0, start, end);
    }

    if (isSingleByte(val)) {
      return fillWithNumber(buffer, val.charCodeAt(0), start, end);
    }

    val = new Buffer(val, encoding);
  }

  if (Buffer.isBuffer(val)) {
    return fillWithBuffer(buffer, val, start, end);
  } // Other values (e.g. undefined, boolean, object) results in zero-fill


  return fillWithNumber(buffer, 0, start, end);
}

var bufferFill = fill;

function allocUnsafe(size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number');
  }

  if (size < 0) {
    throw new RangeError('"size" argument must not be negative');
  }

  if (Buffer.allocUnsafe) {
    return Buffer.allocUnsafe(size);
  } else {
    return new Buffer(size);
  }
}

var bufferAllocUnsafe = allocUnsafe;

var bufferAlloc = function alloc(size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number');
  }

  if (size < 0) {
    throw new RangeError('"size" argument must not be negative');
  }

  if (Buffer.alloc) {
    return Buffer.alloc(size, fill, encoding);
  }

  var buffer = bufferAllocUnsafe(size);

  if (size === 0) {
    return buffer;
  }

  if (fill === undefined) {
    return bufferFill(buffer, 0);
  }

  if (typeof encoding !== 'string') {
    encoding = undefined;
  }

  return bufferFill(buffer, fill, encoding);
};

var BUFFER_SIZE = 8192;

function md5FileSync(filename) {
  var fd = fs$1.openSync(filename, 'r');
  var hash = crypto.createHash('md5');
  var buffer = bufferAlloc(BUFFER_SIZE);

  try {
    var bytesRead;

    do {
      bytesRead = fs$1.readSync(fd, buffer, 0, BUFFER_SIZE);
      hash.update(buffer.slice(0, bytesRead));
    } while (bytesRead === BUFFER_SIZE);
  } finally {
    fs$1.closeSync(fd);
  }

  return hash.digest('hex');
}

function md5File(filename, cb) {
  if (typeof cb !== 'function') throw new TypeError('Argument cb must be a function');
  var output = crypto.createHash('md5');
  var input = fs$1.createReadStream(filename);
  input.on('error', function (err) {
    cb(err);
  });
  output.once('readable', function () {
    cb(null, output.read().toString('hex'));
  });
  input.pipe(output);
}

var md5File_1 = md5File;
var sync$2 = md5FileSync;
md5File_1.sync = sync$2;

const {
  slash: slash$1
} = utils;









const md5File$1 = bluebird_1.promisify(md5File_1);

const {
  createContentDigest: createContentDigest$3
} = fallback;

var createFileNode_1 = async (pathToFile, createNodeId, pluginOptions = {}) => {
  const slashed = slash$1(pathToFile);
  const parsedSlashed = path.parse(slashed);
  const slashedFile = Object.assign({}, parsedSlashed, {
    absolutePath: slashed,
    // Useful for limiting graphql query with certain parent directory
    relativeDirectory: path.relative(pluginOptions.path || process.cwd(), parsedSlashed.dir)
  });
  const stats = await lib$1.stat(slashedFile.absolutePath);
  let internal;

  if (stats.isDirectory()) {
    const contentDigest = createContentDigest$3({
      stats: stats,
      absolutePath: slashedFile.absolutePath
    });
    internal = {
      contentDigest,
      type: `Directory`,
      description: `Directory "${path.relative(process.cwd(), slashed)}"`
    };
  } else {
    const contentDigest = await md5File$1(slashedFile.absolutePath);
    const mediaType = mime.getType(slashedFile.ext);
    internal = {
      contentDigest,
      type: `File`,
      mediaType: mediaType ? mediaType : `application/octet-stream`,
      description: `File "${path.relative(process.cwd(), slashed)}"`
    };
  } // Stringify date objects.


  return JSON.parse(JSON.stringify(Object.assign({
    // Don't actually make the File id the absolute path as otherwise
    // people will use the id for that and ids shouldn't be treated as
    // useful information.
    id: createNodeId(pathToFile),
    children: [],
    parent: null,
    internal,
    sourceInstanceName: pluginOptions.name || `__PROGRAMMATIC__`,
    absolutePath: slashedFile.absolutePath,
    relativePath: slash$1(path.relative(pluginOptions.path || process.cwd(), slashedFile.absolutePath)),
    extension: slashedFile.ext.slice(1).toLowerCase(),
    size: stats.size,
    prettySize: prettyBytes(stats.size),
    modifiedTime: stats.mtime,
    accessTime: stats.atime,
    changeTime: stats.ctime,
    birthTime: stats.birthtime
  }, slashedFile, stats)));
};

var createFileNode = {
	createFileNode: createFileNode_1
};

const {
  createContentDigest: createContentDigest$4
} = fallback;



const {
  isWebUri
} = validUrl;







const {
  createProgress
} = utils;

const {
  createFileNode: createFileNode$1
} = createFileNode;

const {
  getRemoteFileExtension,
  getRemoteFileName,
  createFilePath: createFilePath$1
} = utils;

const cacheId = url => `create-remote-file-node-${url}`;

let bar; // Keep track of the total number of jobs we push in the queue

let totalJobs = 0;
/********************
 * Type Definitions *
 ********************/

/**
 * @typedef {Redux}
 * @see [Redux Docs]{@link https://redux.js.org/api-reference}
 */

/**
 * @typedef {GatsbyCache}
 * @see gatsby/packages/gatsby/utils/cache.js
 */

/**
 * @typedef {Reporter}
 * @see gatsby/packages/gatsby-cli/lib/reporter.js
 */

/**
 * @typedef {Auth}
 * @type {Object}
 * @property {String} htaccess_pass
 * @property {String} htaccess_user
 */

/**
 * @typedef {CreateRemoteFileNodePayload}
 * @typedef {Object}
 * @description Create Remote File Node Payload
 *
 * @param  {String} options.url
 * @param  {Redux} options.store
 * @param  {GatsbyCache} options.cache
 * @param  {Function} options.createNode
 * @param  {Auth} [options.auth]
 * @param  {Reporter} [options.reporter]
 */

const CACHE_DIR = `.cache`;
const FS_PLUGIN_DIR = `gatsby-source-filesystem`;
/********************
 * Queue Management *
 ********************/

/**
 * Queue
 * Use the task's url as the id
 * When pushing a task with a similar id, prefer the original task
 * as it's already in the processing cache
 */

const queue$2 = new queue(pushToQueue, {
  id: `url`,
  merge: (old, _, cb) => cb(old),
  concurrent: process.env.GATSBY_CONCURRENT_DOWNLOAD || 200
}); // when the queue is empty we stop the progressbar

queue$2.on(`drain`, () => {
  if (bar) {
    bar.done();
  }

  totalJobs = 0;
});
/**
 * @callback {Queue~queueCallback}
 * @param {*} error
 * @param {*} result
 */

/**
 * pushToQueue
 * --
 * Handle tasks that are pushed in to the Queue
 *
 *
 * @param  {CreateRemoteFileNodePayload}          task
 * @param  {Queue~queueCallback}  cb
 * @return {Promise<null>}
 */

async function pushToQueue(task, cb) {
  try {
    const node = await processRemoteNode(task);
    return cb(null, node);
  } catch (e) {
    return cb(e);
  }
}
/******************
 * Core Functions *
 ******************/

/**
 * requestRemoteNode
 * --
 * Download the requested file
 *
 * @param  {String}   url
 * @param  {Headers}  headers
 * @param  {String}   tmpFilename
 * @param  {Object}   httpOpts
 * @return {Promise<Object>}  Resolves with the [http Result Object]{@link https://nodejs.org/api/http.html#http_class_http_serverresponse}
 */


const requestRemoteNode = (url, headers, tmpFilename, httpOpts) => new Promise((resolve, reject) => {
  const opts = Object.assign({}, {
    timeout: 30000,
    retries: 5
  }, httpOpts);
  const responseStream = got_1.stream(url, Object.assign({
    headers
  }, opts));
  const fsWriteStream = lib$1.createWriteStream(tmpFilename);
  responseStream.pipe(fsWriteStream);
  responseStream.on(`downloadProgress`, pro => console.log(pro)); // If there's a 400/500 response or other error.

  responseStream.on(`error`, (error, body, response) => {
    lib$1.removeSync(tmpFilename);
    reject(error);
  });
  fsWriteStream.on(`error`, error => {
    reject(error);
  });
  responseStream.on(`response`, response => {
    fsWriteStream.on(`finish`, () => {
      resolve(response);
    });
  });
});
/**
 * processRemoteNode
 * --
 * Request the remote file and return the fileNode
 *
 * @param {CreateRemoteFileNodePayload} options
 * @return {Promise<Object>} Resolves with the fileNode
 */


async function processRemoteNode({
  url,
  store,
  cache,
  createNode,
  parentNodeId,
  auth = {},
  httpHeaders = {},
  createNodeId,
  ext,
  name
}) {
  // Ensure our cache directory exists.
  const pluginCacheDir = path.join(store.getState().program.directory, CACHE_DIR, FS_PLUGIN_DIR);
  await lib$1.ensureDir(pluginCacheDir); // See if there's response headers for this url
  // from a previous request.

  const cachedHeaders = await cache.get(cacheId(url));
  const headers = Object.assign({}, httpHeaders);

  if (cachedHeaders && cachedHeaders.etag) {
    headers[`If-None-Match`] = cachedHeaders.etag;
  } // Add htaccess authentication if passed in. This isn't particularly
  // extensible. We should define a proper API that we validate.


  const httpOpts = {};

  if (auth && (auth.htaccess_pass || auth.htaccess_user)) {
    httpOpts.auth = `${auth.htaccess_user}:${auth.htaccess_pass}`;
  } // Create the temp and permanent file names for the url.


  const digest = createContentDigest$4(url);

  if (!name) {
    name = getRemoteFileName(url);
  }

  if (!ext) {
    ext = getRemoteFileExtension(url);
  }

  const tmpFilename = createFilePath$1(pluginCacheDir, `tmp-${digest}`, ext); // Fetch the file.

  const response = await requestRemoteNode(url, headers, tmpFilename, httpOpts);

  if (response.statusCode == 200) {
    // Save the response headers for future requests.
    await cache.set(cacheId(url), response.headers);
  } // If the user did not provide an extension and we couldn't get one from remote file, try and guess one


  if (ext === ``) {
    const buffer = readChunk_1.sync(tmpFilename, 0, fileType_1.minimumBytes);
    const filetype = fileType_1(buffer);

    if (filetype) {
      ext = `.${filetype.ext}`;
    }
  }

  const filename = createFilePath$1(path.join(pluginCacheDir, digest), name, ext); // If the status code is 200, move the piped temp file to the real name.

  if (response.statusCode === 200) {
    await lib$1.move(tmpFilename, filename, {
      overwrite: true
    }); // Else if 304, remove the empty response.
  } else {
    await lib$1.remove(tmpFilename);
  } // Create the file node.


  const fileNode = await createFileNode$1(filename, createNodeId, {});
  fileNode.internal.description = `File "${url}"`;
  fileNode.url = url;
  fileNode.parent = parentNodeId; // Override the default plugin as gatsby-source-filesystem needs to
  // be the owner of File nodes or there'll be conflicts if any other
  // File nodes are created through normal usages of
  // gatsby-source-filesystem.

  await createNode(fileNode, {
    name: `gatsby-source-filesystem`
  });
  return fileNode;
}
/**
 * Index of promises resolving to File node from remote url
 */


const processingCache = {};
/**
 * pushTask
 * --
 * pushes a task in to the Queue and the processing cache
 *
 * Promisfy a task in queue
 * @param {CreateRemoteFileNodePayload} task
 * @return {Promise<Object>}
 */

const pushTask = task => new Promise((resolve, reject) => {
  queue$2.push(task).on(`finish`, task => {
    resolve(task);
  }).on(`failed`, err => {
    reject(`failed to process ${task.url}\n${err}`);
  });
});
/***************
 * Entry Point *
 ***************/

/**
 * createRemoteFileNode
 * --
 *
 * Download a remote file
 * First checks cache to ensure duplicate requests aren't processed
 * Then pushes to a queue
 *
 * @param {CreateRemoteFileNodePayload} options
 * @return {Promise<Object>}                  Returns the created node
 */


var createRemoteFileNode = ({
  url,
  store,
  cache,
  createNode,
  parentNodeId = null,
  auth = {},
  httpHeaders = {},
  createNodeId,
  ext = null,
  name = null,
  reporter
}) => {
  // validation of the input
  // without this it's notoriously easy to pass in the wrong `createNodeId`
  // see gatsbyjs/gatsby#6643
  if (typeof createNodeId !== `function`) {
    throw new Error(`createNodeId must be a function, was ${typeof createNodeId}`);
  }

  if (typeof createNode !== `function`) {
    throw new Error(`createNode must be a function, was ${typeof createNode}`);
  }

  if (typeof store !== `object`) {
    throw new Error(`store must be the redux store, was ${typeof store}`);
  }

  if (typeof cache !== `object`) {
    throw new Error(`cache must be the Gatsby cache, was ${typeof cache}`);
  } // Check if we already requested node for this remote file
  // and return stored promise if we did.


  if (processingCache[url]) {
    return processingCache[url];
  }

  if (!url || isWebUri(url) === undefined) {
    return Promise.reject(`wrong url: ${url}`);
  }

  if (totalJobs === 0) {
    bar = createProgress(`Downloading remote files`, reporter);
    bar.start();
  }

  totalJobs += 1;
  bar.total = totalJobs;
  const fileDownloadPromise = pushTask({
    url,
    store,
    cache,
    createNode,
    parentNodeId,
    createNodeId,
    auth,
    httpHeaders,
    ext,
    name
  });
  processingCache[url] = fileDownloadPromise.then(node => {
    bar.tick();
    return node;
  });
  return processingCache[url];
};

const {
  createFileNode: createFileNode$2
} = createFileNode;

const {
  createFilePath: createFilePath$2
} = utils;

const {
  createContentDigest: createContentDigest$5
} = utils$1;

const cacheId$1 = hash => `create-file-node-from-buffer-${hash}`;
/********************
 * Type Definitions *
 ********************/

/**
 * @typedef {Redux}
 * @see [Redux Docs]{@link https://redux.js.org/api-reference}
 */

/**
 * @typedef {GatsbyCache}
 * @see gatsby/packages/gatsby/utils/cache.js
 */

/**
 * @typedef {CreateFileNodeFromBufferPayload}
 * @typedef {Object}
 * @description Create File Node From Buffer Payload
 *
 * @param  {Buffer} options.buffer
 * @param  {String} options.hash
 * @param  {Redux} options.store
 * @param  {GatsbyCache} options.cache
 * @param  {Function} options.createNode
 */


const CACHE_DIR$1 = `.cache`;
const FS_PLUGIN_DIR$1 = `gatsby-source-filesystem`;
/**
 * writeBuffer
 * --
 * Write the contents of `buffer` to `filename`
 *
 *
 * @param {String} filename
 * @param {Buffer} buffer
 * @returns {Promise<void>}
 */

const writeBuffer = (filename, buffer) => new Promise((resolve, reject) => {
  lib$1.writeFile(filename, buffer, err => err ? reject(err) : resolve());
});
/**
 * processBufferNode
 * --
 * Write the buffer contents out to disk and return the fileNode
 *
 * @param {CreateFileNodeFromBufferPayload} options
 * @return {Promise<Object>} Resolves with the fileNode
 */


async function processBufferNode({
  buffer,
  hash,
  store,
  cache,
  createNode,
  parentNodeId,
  createNodeId,
  ext,
  name
}) {
  // Ensure our cache directory exists.
  const pluginCacheDir = path.join(store.getState().program.directory, CACHE_DIR$1, FS_PLUGIN_DIR$1);
  await lib$1.ensureDir(pluginCacheDir); // See if there's a cache file for this buffer's contents from
  // a previous run

  let filename = await cache.get(cacheId$1(hash));

  if (!filename) {
    // If the user did not provide an extension and we couldn't get
    // one from remote file, try and guess one
    if (typeof ext === `undefined`) {
      const filetype = fileType_1(buffer);
      ext = filetype ? `.${filetype.ext}` : `.bin`;
    }

    await lib$1.ensureDir(path.join(pluginCacheDir, hash));
    filename = createFilePath$2(path.join(pluginCacheDir, hash), name, ext); // Cache the buffer contents

    await writeBuffer(filename, buffer); // Save the cache file path for future use

    await cache.set(cacheId$1(hash), filename);
  } // Create the file node.


  const fileNode = await createFileNode$2(filename, createNodeId, {});
  fileNode.internal.description = `File "Buffer<${hash}>"`;
  fileNode.hash = hash;
  fileNode.parent = parentNodeId; // Override the default plugin as gatsby-source-filesystem needs to
  // be the owner of File nodes or there'll be conflicts if any other
  // File nodes are created through normal usages of
  // gatsby-source-filesystem.

  await createNode(fileNode, {
    name: `gatsby-source-filesystem`
  });
  return fileNode;
}
/**
 * Index of promises resolving to File node from buffer cache
 */


const processingCache$1 = {};
/***************
 * Entry Point *
 ***************/

/**
 * createFileNodeFromBuffer
 * --
 *
 * Cache a buffer's contents to disk
 * First checks cache to ensure duplicate buffers aren't processed
 *
 * @param {CreateFileNodeFromBufferPayload} options
 * @return {Promise<Object>}                  Returns the created node
 */

var createFileNodeFromBuffer = ({
  buffer,
  hash,
  store,
  cache,
  createNode,
  parentNodeId = null,
  createNodeId,
  ext,
  name = hash
}) => {
  // validation of the input
  // without this it's notoriously easy to pass in the wrong `createNodeId`
  // see gatsbyjs/gatsby#6643
  if (typeof createNodeId !== `function`) {
    throw new Error(`createNodeId must be a function, was ${typeof createNodeId}`);
  }

  if (typeof createNode !== `function`) {
    throw new Error(`createNode must be a function, was ${typeof createNode}`);
  }

  if (typeof store !== `object`) {
    throw new Error(`store must be the redux store, was ${typeof store}`);
  }

  if (typeof cache !== `object`) {
    throw new Error(`cache must be the Gatsby cache, was ${typeof cache}`);
  }

  if (!buffer) {
    return Promise.reject(`bad buffer: ${buffer}`);
  }

  if (!hash) {
    hash = createContentDigest$5(buffer);
  } // Check if we already requested node for this remote file
  // and return stored promise if we did.


  if (processingCache$1[hash]) {
    return processingCache$1[hash];
  }

  const bufferCachePromise = processBufferNode({
    buffer,
    hash,
    store,
    cache,
    createNode,
    parentNodeId,
    createNodeId,
    ext,
    name
  });
  processingCache$1[hash] = bufferCachePromise;
  return processingCache$1[hash];
};

function loadNodeContent(fileNode) {
  return lib$1.readFile(fileNode.absolutePath, `utf-8`);
}

var createFilePath$3 = createFilePath;
var createRemoteFileNode$1 = createRemoteFileNode;
var createFileNodeFromBuffer$1 = createFileNodeFromBuffer;
var loadNodeContent_1 = loadNodeContent;

var gatsbySourceFilesystem = {
	createFilePath: createFilePath$3,
	createRemoteFileNode: createRemoteFileNode$1,
	createFileNodeFromBuffer: createFileNodeFromBuffer$1,
	loadNodeContent: loadNodeContent_1
};

const {
  createRemoteFileNode: createRemoteFileNode$2
} = gatsbySourceFilesystem;

function isImageKey(key, imageKeys) {
  return imageKeys.includes(key);
}

async function createImageNodes({
  entity,
  createNode,
  createNodeId,
  store,
  cache,
  imageName,
  imageCacheKey
}) {
  let fileNode;

  try {
    fileNode = await createRemoteFileNode$2({
      url: entity.data.url,
      store,
      cache,
      createNode,
      createNodeId
    });
  } catch (e) {
    console.log(e);
  }

  if (fileNode) {
    await cache.set(imageCacheKey, {
      fileNodeID: fileNode.id,
      modified: entity.data.modified
    });
    console.log('Image downloaded: ' + imageName);
    return { ...entity,
      links: { ...entity.links,
        local___NODE: fileNode.id
      }
    };
  }

  return entity;
}

function extensionIsValid(url) {
  const ext = url.split('.').pop().split('/')[0];

  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
      return true;

    default:
      return false;
  }
}

async function loadImages({
  entities,
  imageKeys,
  createNode,
  createNodeId,
  store,
  cache,
  touchNode
}) {
  return Promise.all(entities.map(async entity => {
    if (!isImageKey(entity.name, imageKeys) || !entity.data.url) {
      return Promise.resolve(entity);
    }

    if (!extensionIsValid(entity.data.url)) {
      console.log(`Image-Extension not valid: ${entity.data.url}`);
      return Promise.resolve(entity);
    }

    const imageName = entity.data.url.match(/([^/]*)\/*$/)[1];
    const imageCacheKey = `local-image-${imageName}`;
    const cachedImage = await cache.get(imageCacheKey); // If we have cached image and it wasn't modified, reuse
    // previously created file node to not try to redownload

    if (cachedImage && entity.data.modified && entity.data.modified === cachedImage.modified) {
      const {
        fileNodeID
      } = cachedImage;
      touchNode({
        nodeId: fileNodeID
      });
      console.log('Image from Cache: ' + imageName);
      return Promise.resolve({ ...entity,
        links: { ...entity.links,
          local___NODE: fileNodeID
        }
      });
    }

    return createImageNodes({
      entity,
      createNode,
      createNodeId,
      store,
      cache,
      imageName,
      imageCacheKey
    });
  }));
}

var loadImages_1 = loadImages;

const urlErrorMessage = 'Url-Error. Please require a valid Url.';

var getUrl = (env, url) => {
  if (!url) {
    console.log(urlErrorMessage);
    return;
  }

  if (typeof url === 'string') return url;
  const URL = env === 'production' ? url.production : url.development;
  if (URL) return URL;
  console.log(urlErrorMessage);
};

const getTypeDef = (name, schema, imageKeys) => {
  const local = imageKeys.includes(name) ? 'local: File' : '';
  return `
    type ${name} implements Node {
      ${schema}
      ${local}
    }
  `;
};

var getTypeDefs = (schemas, imageKeys) => {
  return Object.keys(schemas).map(key => getTypeDef(key, schemas[key], imageKeys));
};

var buildNode = ({
  entity: {
    id,
    name,
    data,
    links,
    childEntities
  },
  createContentDigest
}) => {
  return { ...data,
    ...links,
    id,
    childEntities,
    // childentities get flattened at the end!
    parent: null,
    children: [],
    internal: {
      type: name,
      url: data && data.url,
      content: JSON.stringify(data),
      contentDigest: createContentDigest(data)
    }
  };
};

var fetch$1 = getCjsExportFromNamespace(lib);

var sourceNodes = async ({
  actions,
  createNodeId,
  createContentDigest,
  store,
  cache
}, configOptions) => {
  const {
    createNode,
    createTypes,
    touchNode
  } = actions;
  const {
    url,
    rootKey = 'customAPI',
    imageKeys = ['image'],
    schemas = {}
  } = configOptions;
  const URL = getUrl(process.env.NODE_ENV, url);
  const data = await fetch$1(URL).then(res => res.json());
  const typeDefs = getTypeDefs(schemas, imageKeys);
  createTypes(typeDefs); // build entities and correct schemas, where necessary

  let entities = flattenEntities_1(createNodeEntities_1({
    name: rootKey,
    data,
    schemas,
    createNodeId
  })); // check for problematic keys

  entities = entities.map(entity => ({ ...entity,
    data: normalizeKeys(entity.data)
  })); // load images or default-dummy-image

  entities = await loadImages_1({
    entities,
    imageKeys,
    createNode,
    createNodeId,
    touchNode,
    store,
    cache,
    createContentDigest
  }); // build gatsby-node-object

  entities = entities.map(entity => buildNode({
    entity,
    createContentDigest
  })); // render nodes

  entities.forEach(entity => {
    createNode(entity);
  });
};

var gatsbyNode = {
	sourceNodes: sourceNodes
};

exports.default = gatsbyNode;
exports.sourceNodes = sourceNodes;
//# sourceMappingURL=index.js.map
