/**
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 'License'); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

var pbxProj = require('./pbxProject'),
    util = require('util'),
    f = util.format,
    INDENT = '\t',
    COMMENT_KEY = /_comment$/,
    QUOTED = /^"(.*)"$/,
    EventEmitter = require('events').EventEmitter

/**
 * Generates a string of whitespace characters as long as requested for the purpose of padding other strings
 * 
 * @param {number} x The number of indentation levels to generate
 * @returns {string} The requested number of whitespace characters 
 */
function i(x) {
    if (x <=0)
        return '';
    else
        return INDENT + i(x-1);
}

/**
 * Finds the comment associated with a particular key/value pair. This comment is written into the Xcode project file, but is ignored by Xcode when parsing it
 * 
 * @param {string} key The key into the `parent` to look up a corresponding comment for
 * @param {Object.<string, any>} parent An object that contains key/value pairs that might have corresponding comments
 * @returns {string | null} The comment associated with the `key` if one exists, or `null` if one doesn't
 */
function comment(key, parent) {
    var text = parent[key + '_comment'];

    if (text)
        return text;
    else
        return null;
}

// copied from underscore

/**
 * Determines if the given parameter is an object
 * 
 * @param {*} obj The thing to check for object-ness
 * @returns {obj is Object} `true` if the `obj` is an instance of an object, `false` if it is not
 */
function isObject(obj) {
    return obj === Object(obj)
}

/**
 * Determines if the given parameter is an array
 * 
 * @param {*} obj The thing to check for array-ness
 * @returns {obj is Array<any>} `true` if the `obj` is an array, `false` if it is not
 */
function isArray(obj) {
    return Array.isArray(obj)
}

/**
 * Available optional settings to configure a {@link pbxWriter}
 * 
 * @typedef {Object} pbxWriterOptions
 * @property {boolean} [omitEmptyValues] Indicates if a key/value pair should be written into the project file (containing the value `null` or `undefined`) if its value is `null` or `undefined`
 */

/**
 * Generates an Xcode project file from the contents of a project descriptor
 * 
 * @constructor
 * @param {import("./xcode-types/xcode").XcodeProjectDescriptor} contents The Xcode project descriptor to be serialized into a project file
 * @param {pbxWriterOptions} [options={omitEmptyValues: false}] Optional settings to configure the new writer instance
 * 
 * @property {import("./xcode-types/xcode").XcodeProjectDescriptor} contents The Xcode project descriptor to be serialized into a project file
 * @property {boolean} sync Indicates if serialization should occur synchronously or asynchronously. `true` for synchronous serialization, `false` for asynchronous
 * @property {number} indentLevel The current level of indentation that should be written out to the next line of the Xcode project file
 * @property {boolean} omitEmptyValues Indicates if a key/value pair should be written into the project file (containing the value `null` or `undefined`) if its value is `null` or `undefined`
 */
function pbxWriter(contents, options) {
    if (!options) {
        options = {}
    }
    if (options.omitEmptyValues === undefined) {
        options.omitEmptyValues = false
    }

    /**
     * The project descriptor being serialized into an Xcode project file
     * 
     * @type {typeof contents}
     */
    this.contents = contents;
    /**
     * Indicates if serialization should occur synchronously or asynchronously. `true` for synchronous serialization, `false` for asynchronous
     * 
     * @type {boolean}
     */
    this.sync = false;
    /**
     * The current level of indentation that should be written out to the next line of the Xcode project file
     * 
     * @type {number}
     */
    this.indentLevel = 0;
    /**
     * Indicates if a key/value pair should be written into the project file (containing the value `null` or `undefined`) if its value is `null` or `undefined`
     * 
     * @type {boolean}
     */
    this.omitEmptyValues = options.omitEmptyValues
}

util.inherits(pbxWriter, EventEmitter);

/**
 * Serializes the data passed to this function into a line in an Xcode project file, honoring the current indentation level. After running, the `buffer` property will contain a string that has been appended with the data passed to this function, and can be separately written to disk. This only works if `sync` is `true`, as asynchronous serialization is unimplemented
 * 
 * @param {string} format A C `printf`-like format string identical to one you might pass [util.format](https://nodejs.org/api/util.html#utilformatformat-args)
 * @param {...*} data Information to be substituted into the `format`. Required if the `format` contains format specifiers, ignored otherwise
 */
pbxWriter.prototype.write = function (format, ...data) {
    var fmt = f.apply(null, Array.from(arguments));

    if (this.sync) {
        this.buffer += f("%s%s", i(this.indentLevel), fmt);
    } else {
        // do stream write
    }
}

/**
 * Serializes the data passed to this function into a line in an Xcode project file, honoring without any indentation. After running, the `buffer` property will contain a string that has been appended with the data passed to this function, and can be separately written to disk. This only works if `sync` is `true`, as asynchronous serialization is unimplemented
 * 
 * @param {string} format A C `printf`-like format string identical to one you might pass [util.format](https://nodejs.org/api/util.html#utilformatformat-args)
 * @param {...*} data Information to be substituted into the `format`. Required if the `format` contains format specifiers, ignored otherwise
 */
pbxWriter.prototype.writeFlush = function (format, ...data) {
    var oldIndent = this.indentLevel;

    this.indentLevel = 0;

    this.write.apply(this, [format, ...data])

    this.indentLevel = oldIndent;
}

/**
 * Synchronously serializes the object this writer was initialized with into an Xcode project file. After running this function, the `buffer` property will contain a string representing the entire formatted contents of an Xcode project file, which can be separately written to disk
 * 
 * @returns {string} The contents of the formatted Xcode project file representing the data this writer was created with
 */
pbxWriter.prototype.writeSync = function () {
    this.sync = true;
    this.buffer = "";

    this.writeHeadComment();
    this.writeProject();

    return this.buffer;
}

/**
 * Adds a formatted header comment to the serialized project file, if data exists for one. It will be appended to the end of the `buffer`, so calling this doesn't automatically insert it at the beginning
 */
pbxWriter.prototype.writeHeadComment = function () {
    if (this.contents.headComment) {
        this.write("// %s\n", this.contents.headComment)
    }
}

/**
 * Formats and serializes the project data and adds it to the `buffer`
 */
pbxWriter.prototype.writeProject = function () {
    var proj = this.contents.project,
        /** @type {keyof typeof proj} */
        key,
        cmt, obj;

    this.write("{\n")

    if (proj) {
        this.indentLevel++;

        for (key in proj) {
            // skip comments
            if (COMMENT_KEY.test(key)) continue;

            cmt = comment(key, proj);
            obj = proj[key];

            if (isArray(obj)) {
                this.writeArray(obj, key)
            } else if (isObject(obj)) {
                this.write("%s = {\n", key);
                this.indentLevel++;

                if (key === 'objects') {
                    // obj gets continually reassigned to different types. In this branch, it's guaranteed to be an XcodeObjectArchiveList like writeObjectsSections expects, but there isn't a great way to express that to TypeScript
                    // @ts-ignore
                    this.writeObjectsSections(obj)
                } else {
                    this.writeObject(obj)
                }

                this.indentLevel--;
                this.write("};\n");
            } else if (this.omitEmptyValues && (obj === undefined || obj === null)) {
                continue;
            } else if (cmt) {
                this.write("%s = %s /* %s */;\n", key, obj, cmt)
            } else {
                this.write("%s = %s;\n", key, obj)
            }
        }

        this.indentLevel--;
    }

    this.write("}\n")
}

/**
 * Formats and serializes the given data into the `buffer`
 * 
 * @param {*} object Arbitrary data to be included in the Xcode project file
 */
pbxWriter.prototype.writeObject = function (object) {
    var key, obj, cmt;

    for (key in object) {
        if (COMMENT_KEY.test(key)) continue;

        cmt = comment(key, object);
        obj = object[key];

        if (isArray(obj)) {
            this.writeArray(obj, key)
        } else if (isObject(obj)) {
            this.write("%s = {\n", key);
            this.indentLevel++;

            this.writeObject(obj)

            this.indentLevel--;
            this.write("};\n");
        } else {
            if (this.omitEmptyValues && (obj === undefined || obj === null)) {
                continue;
            } else if (cmt) {
                this.write("%s = %s /* %s */;\n", key, obj, cmt)
            } else {
                this.write("%s = %s;\n", key, obj)
            }
        }
    }
}

/**
 * Formats and serializes the list of all object archives in the project into the `buffer`
 * 
 * @param {import("./xcode-types/xcode").XcodeObjectArchiveList} objects A list of Xcode object archives
 */
pbxWriter.prototype.writeObjectsSections = function (objects) {
    /** @type {keyof typeof objects} */
    var key,
    obj;

    for (key in objects) {
        this.writeFlush("\n")

        obj = objects[key];

        if (isObject(obj)) {
            this.writeSectionComment(key, true);

            this.writeSection(obj);

            this.writeSectionComment(key, false);
        }
    }
}

/**
 * Formats and serializes an array of arbitrary content into the `buffer`, assigning it to a specific key
 * 
 * @param {*[]} arr The array to serialize into the `buffer`
 * @param {string} name The key at which the array will be stored in the Xcode project file
 */
pbxWriter.prototype.writeArray = function (arr, name) {
    var i, entry;

    this.write("%s = (\n", name);
    this.indentLevel++;

    for (i=0; i < arr.length; i++) {
        entry = arr[i]

        if (entry.value && entry.comment) {
            this.write('%s /* %s */,\n', entry.value, entry.comment);
        } else if (isObject(entry)) {
            this.write('{\n');
            this.indentLevel++;

            this.writeObject(entry);

            this.indentLevel--;
            this.write('},\n');
        } else {
            this.write('%s,\n', entry);
        }
    }

    this.indentLevel--;
    this.write(");\n");
}

/**
 * Adds a comment marking the beginning or ending of a section in an Xcode object archive list to the `buffer`
 * 
 * @param {string} name The title of the section that's beginning or ending, usually corresponding to the `isa` property of an Xcode project object
 * @param {boolean} begin Indicates if a beginning or ending comment should be written. `true` for a beginning comment, `false` for an ending comment
 */
pbxWriter.prototype.writeSectionComment = function (name, begin) {
    if (begin) {
        this.writeFlush("/* Begin %s section */\n", name)
    } else { // end
        this.writeFlush("/* End %s section */\n", name)
    }
}

/**
 * Formats and serializes a list of all related Xcode project objects into the `buffer`
 * 
 * @param {import("./xcode-types/xcode").XcodeObjectArchive<import('./xcode-types/xcode').XcodeProjectObject>} section The list of related Xcode project objects to be serialized
 */
pbxWriter.prototype.writeSection = function (section) {
    var key, obj, cmt;

    // section should only contain objects
    for (key in section) {
        if (COMMENT_KEY.test(key)) continue;

        cmt = comment(key, section);
        obj = section[key]

        if (obj && obj.isa == 'PBXBuildFile' || obj && obj.isa == 'PBXFileReference') {
            this.writeInlineObject(key, cmt, obj);
        } else {
            if (cmt) {
                this.write("%s /* %s */ = {\n", key, cmt);
            } else {
                this.write("%s = {\n", key);
            }

            this.indentLevel++

            this.writeObject(obj)

            this.indentLevel--
            this.write("};\n");
        }
    }
}

/**
 * Formats and serializes arbitrary data at a specific key into the `buffer` without any new lines
 * 
 * @param {string} key The key at which the serialized object will be stored in the Xcode project file
 * @param {string | null} commentText An optional comment to describe the purpose of the data in the Xcode project file, ignored by Xcode when parsing
 * @param {*} data The object to be serialized into the Xcode project file
 */
pbxWriter.prototype.writeInlineObject = function (key, commentText, data) {
    /** @type {string[]} */
    var output = [];
    var self = this

    /**
     * Generates individual string parts of the completed Xcode project file, ready to be joined into one string to represent the contents of the file. After this function runs, `output` will be populated with the generated string parts
     * 
     * @param {string} name The key at which the serialized object will be stored in the Xcode project file
     * @param {string | null} desc An optional comment to describe the purpose of the data in the Xcode project file, ignored by Xcode when parsing
     * @param {*} ref The object to be serialized into the Xcode project file
     */
    var inlineObjectHelper = function (name, desc, ref) {
        var key, cmt, obj;

        if (desc) {
            output.push(f("%s /* %s */ = {", name, desc));
        } else {
            output.push(f("%s = {", name));
        }

        for (key in ref) {
            if (COMMENT_KEY.test(key)) continue;

            cmt = comment(key, ref);
            obj = ref[key];

            if (isArray(obj)) {
                output.push(f("%s = (", key));

                for (var i=0; i < obj.length; i++) {
                    output.push(f("%s, ", obj[i]))
                }

                output.push("); ");
            } else if (isObject(obj)) {
                inlineObjectHelper(key, cmt, obj)
            } else if (self.omitEmptyValues && (obj === undefined || obj === null)) {
                continue;
            } else if (cmt) {
                output.push(f("%s = %s /* %s */; ", key, obj, cmt))
            } else {
                output.push(f("%s = %s; ", key, obj))
            }
        }

        output.push("}; ");
    }

    inlineObjectHelper(key, commentText, data);

    this.write("%s\n", output.join('').trim());
}

module.exports = pbxWriter;
