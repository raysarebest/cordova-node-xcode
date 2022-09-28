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

var util = require('util'),
    f = util.format,
    EventEmitter = require('events').EventEmitter,
    path = require('path'),
    uuid = require('uuid'),
    fork = require('child_process').fork,
    pbxWriter = require('./pbxWriter'),
    pbxFile = require('./pbxFile'),
    fs = require('fs'),
    parser = require('./parser/pbxproj'),
    plist = require('simple-plist'),
    COMMENT_KEY = /_comment$/

/**
 * An in-memory representation of an Xcode project on disk
 * 
 * @constructor
 * @param {string} filename The path to an Xcode project's `project.pbxproj` file
 * 
 * @property {string} filepath The normalized path to the Xcode project's `project.pbxproj` file
 */
function pbxProject(filename) {
    if (!(this instanceof pbxProject))
        return new pbxProject(filename);

    /** @type {string} */
    this.filepath = path.resolve(filename)
}

util.inherits(pbxProject, EventEmitter)

/**
 * A syntactic expectation for an Xcode project file that represents a literal character sequence
 * 
 * @typedef {Object} XcodeProjectFileSyntaxLiteralExpectation
 * @property {"literal"} type The type of expectation this object represents
 * @property {string} text The character sequence that was expected
 * @property {boolean} ignoreCase Indicates if the expectation should be case-insensitive. `true` for case-insensitivity, `false` to enforce a matching case
 */

/**
 * A syntatcitc expectation for an Xcode project file that represents a regular expression-like variable character sequence
 * 
 * @typedef {Object} XcodeProjectFileSyntaxClassExpectation
 * @property {"class"} type The type of expectation this object represents
 * @property {(string | string[])[]} parts An array representation of each part of the expected regular expression. A top-level string matches a literal character, whereas a nested string array is guaranteed to have 2 elements, where the first element represents the beginning of a range and the 2nd element represents the end of the range inclusive
 * @property {boolean} inverted Indicates if the expectation is meant to cover the exclusion or inclusion of the characters it matches. `true` to represent the exclusion of its matching characters, `false` to represent the inclusion
 * @property {boolean} ignoreCase Indicates if the expectation should be case-insensitive. `true` for case-insensitivity, `false` to enforce a matching case
 */

/**
 * A syntactic expectation for an Xcode project file that represents any arbitrary character
 * 
 * @typedef {Object} XcodeProjectFileSyntaxAnyExpectation
 * @property {"any"} type The type of expectation this object represents
 */

/**
 * A syntactic expectation for an Xcode project file that represents the end of the file's contents
 * 
 * @typedef {Object} XcodeProjectFileSyntaxEndExpectation
 * @property {"end"} type The type of expectation this object represents
 */

/**
 * A syntactic expectation for an Xcode project file that represents an unknown expectation with a human-readable description
 * 
 * @typedef {Object} XcodeProjectFileSyntaxOtherExpectation
 * @property {"other"} type The type of expectation this object represents
 * @property {string} description Human-readable information about the expectation
 */

/**
 * A syntatctic expectation for an Xcode project file
 * 
 * @typedef {XcodeProjectFileSyntaxLiteralExpectation | XcodeProjectFileSyntaxClassExpectation | XcodeProjectFileSyntaxAnyExpectation | XcodeProjectFileSyntaxEndExpectation | XcodeProjectFileSyntaxOtherExpectation} XcodeProjectFileSyntaxExpectation
 */

/**
 * A unique identifier of a specific character at a specific point in an Xcode project file
 * 
 * @typedef {Object} XcodeProjectFileCharacterLocation
 * @property {number} offset The 0-based index of the character if the Xcode project file is treated as a string of characters
 * @property {number} line The 1-based index of the horizontal line in the Xcode project file where the character is located
 * @property {number} column The 1-based index of the vertical column in the Xcode project file where the character is located
 */

/**
 * A unique identifier of a sequence of characters at a specific beginning and end point (exclusive) in an Xcode project file
 * 
 * @typedef {Object} XcodeProjectFileCharacterLocationRange
 * @property {XcodeProjectFileCharacterLocation} start The unique identifier of the position in the Xcode project file where the character range begins
 * @property {XcodeProjectFileCharacterLocation} end The unique identifier of the position in the Xcode project file immediately after where the character range ends
 */

/**
 * An error generated when an Xcode project file has invalid or unrecognized syntax that causes it to not be parseable
 * 
 * @typedef {Object} XcodeProjectFileSyntaxError
 * @property {string} message A human-readable description of the error that occurred
 * @property {XcodeProjectFileSyntaxExpectation[] | null} expected A list of the possible expected character sequences at the place the error occurred
 * @property {string | null} found The unexpected text at the point the error occurred
 * @property {XcodeProjectFileCharacterLocationRange} location The range of locations within the Xcode project file where the problematic syntax was found
 * @property {"SyntaxError"} name The name of the error that occurred
 * @property {string} stack A trace of the JavaScript call stack at the instant the error occurred
 */

/**
 * A handler function that's called when an Xcode project file has completed parsing asynchronously (or there was an error in doing so)
 * 
 * @callback AsyncParseCallback
 * @param {(XcodeProjectFileSyntaxError & Error) | null} error An error describing the issue if the Xcode project file could not be parsed, or `null` if the file was parsed successfully
 * @param {import("./xcode-types/xcode").XcodeProjectDescriptor} [project] - The parsed contents of the Xcode project file
 * @returns {void}
 */

/**
 * Asynchronously parses the Xcode project file. This or `parseSync` (but not both) must be called and complete before the project is ready for manipulation
 * 
 * @param {AsyncParseCallback} [cb] A function to handle the parsed data or parsing error if one occurred. If not provided, you should subscribe to the event-based interface that provides the same information 
 * @returns {pbxProject & EventEmitter} The internal project object, before the actual project data is done parsing
 * @this {pbxProject & EventEmitter}
 * @fires pbxProject#ParseError
 * @fires pbxProject#ParseEnd
 */
pbxProject.prototype.parse = function(cb) {
    var worker = fork(__dirname + '/parseJob.js', [this.filepath])

    worker.on('message', function(/** @type {(XcodeProjectFileSyntaxError & Error) | import("./xcode-types/xcode").XcodeProjectDescriptor} */ msg) {
        if ("name" in msg && msg.name == 'SyntaxError' || "code" in msg) {
            /**
             * An event emitted when an Xcode project file could not be parsed. This indicates that parsing is finished, and an {@link pbxProject#ParseEnd} event will not be fired
             * 
             * @event pbxProject#ParseError
             * @param {Error} error The error that caused parsing to fail
             */
            // this inherits from EventEmitter, so `emit` definitely exists, but util.inherits is unsupported by TypeScript, so it will generate an error that needs to be ignored
            // @ts-ignore
            this.emit('error', msg);
        } else {
            /**
             * The authoritative JavaScript representation of the Xcode project file
             * 
             * @type {import("./xcode-types/xcode").XcodeProjectDescriptor}
             */
            // TypeScript doesn't understand that this path is definitely not the error path
            // @ts-ignore
            this.hash = msg;

            /**
             * An event emitted when an Xcode project file is successfully parsed
             * 
             * @event pbxProject#ParseEnd
             * @param {null} error Always `null`, since it's meant to represent an error, but this event only fires if no error occurs
             * @param {import("./xcode-types/xcode").XcodeProjectDescriptor} project The parsed Xcode project data
             */
            // this inherits from EventEmitter, so `emit` definitely exists, but util.inherits is unsupported by TypeScript, so it will generate an error that needs to be ignored
            // @ts-ignore
            this.emit('end', null, msg)
        }
    }.bind(this));

    if (cb) {
        this.on('error', cb);
        this.on('end', cb);
    }

    return this;
}

/**
 * Synchronously parses the Xcode project file this project object was created with. This or `parse` (but not both) must be called and complete before the project is ready for manipulation
 * 
 * @returns {pbxProject & EventEmitter} The internal project object, with the `hash` property set to the parsed Xcode project data
 */
pbxProject.prototype.parseSync = function() {
    var file_contents = fs.readFileSync(this.filepath, 'utf-8');

    /**
     * The authoritative JavaScript representation of the Xcode project file
     * 
     * @type {import("./xcode-types/xcode").XcodeProjectDescriptor}
     */
    this.hash = parser.parse(file_contents);

    // this inherits from EventEmitter, so `emit` definitely exists, but util.inherits is unsupported by TypeScript, so it will generate an error that needs to be ignored
    // @ts-ignore
    return this;
}

/**
 * Serializes the data managed by this project object into a formatted Xcode project file
 * 
 * @param {import('./pbxWriter').pbxWriterOptions} [options] Optional settings to configure the writing process
 * @returns {string} The formatted Xcode project file data, which must be separately written to disk via Node's filesystem APIs
 */
pbxProject.prototype.writeSync = function(options) {
    /**
     * The object responsible for transforming the project metadata into the formatted contents of an Xcode project file
     */
    // Possible bug here if none of the `parse` methods have been called, silencing for now
    // @ts-ignore
    this.writer = new pbxWriter(this.hash, options);
    return this.writer.writeSync();
}

/**
 * Finds all the object reference identifiers currently used within the Xcode project
 * 
 * @returns {import("./xcode-types/xcode").XcodeProjectObjectReference<any>[]} A list of all the object reference identifiers in the project
 */
pbxProject.prototype.allUuids = function() {
    // Possible bug here if none of the `parse` methods have been called, silencing for now
    // @ts-ignore
    var sections = this.hash.project.objects,
        /** @type {import("./xcode-types/xcode").XcodeProjectObjectReference<any>[]} */
        uuids = [],
        section;

    /** @type {keyof typeof sections} */
    let key;
    for (key in sections) {
        section = sections[key]
        uuids = uuids.concat(Object.keys(/** @type {import("./xcode-types/xcode").XcodeObjectArchive<any>} */ (section)))
    }

    uuids = uuids.filter(function(str) {
        return !COMMENT_KEY.test(str) && str.length == 24;
    });

    return uuids;
}

/**
 * Generates a new object reference identifier that's guaranteed to be unique within the Xcode project
 * 
 * @returns {import("./xcode-types/xcode").XcodeProjectObjectReference<any>} A new unique object reference identifier
 */
pbxProject.prototype.generateUuid = function() {
    var id = uuid.v4()
        .replace(/-/g, '')
        .substr(0, 24)
        .toUpperCase()

    if (this.allUuids().indexOf(id) >= 0) {
        return this.generateUuid();
    } else {
        return id;
    }
}

/**
 * A library-internal representation of a file in an Xcode project that either represents or is involved in a Cordova plugin
 * 
 * @typedef {Object} pbxPluginFile
 * @property {true} plugin Indicates whether the file is or is involved in a Cordova plugin
 */

/**
 * Adds a file to an Xcode project to be used by a target as/in a Cordova plugin
 * 
 * @param {string} path The path to a file tracked by Xcode on-disk, potentially relative to the default location files of its type are stored depending on file extension
 * @param {import('./pbxFile').PBXFileOptions} [opt={}] Optional settings to configure the file
 * @returns {(import("./pbxFile").pbxFile & pbxPluginFile) | null} Metadata about the file, or `null` if the file is already included in the Xcode project
 * 
 * @type {((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXExplicitFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: import('./pbxFile').PBXInferredFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxPluginFile) | null)) &
 *        ((path: string, opt: {}) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxPluginFile) | null)) &
 *        ((path: string) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxPluginFile) | null))}
 */
pbxProject.prototype.addPluginFile = function(path, opt = {}) {
    var file = /** @type {import("./pbxFile").pbxFile & pbxPluginFile} */ (new pbxFile(path, opt));

    file.plugin = true; // durr
    correctForPluginsPath(file, this);

    // null is better for early errors
    if ("path" in file && this.hasFile(file.path)) return null; // Potential bug here if `opt` has an `explicitFileType`, because `path` will be `undefined`

    file.fileRef = this.generateUuid();

    this.addToPbxFileReferenceSection(file);    // PBXFileReference
    this.addToPluginsPbxGroup(file);            // PBXGroup

    return file;
}

/**
 * Removes a file used by a target as/in a Cordova plugin from Xcode's tracking. Note that this doesn't delete the file on-disk
 * 
 * @param {string} path The on-disk path to a file to be tracked by Xcode, potentially relative to the default location files of its type are stored depending on file extension
 * @param {import('./pbxFile').PBXFileOptions} [opt={}] Optional settings to configure the file
 * @returns {import("./pbxFile").pbxFile} Metadata about the file that was removed
 * 
 * @type {((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile)) &
 *        ((path: string, opt: {}) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile)) &
 *        ((path: string) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile))}
 */
pbxProject.prototype.removePluginFile = function(path, opt = {}) {
    var file = new pbxFile(path, opt);
    correctForPluginsPath(file, this);

    this.removeFromPbxFileReferenceSection(file);    // PBXFileReference
    this.removeFromPluginsPbxGroup(file);            // PBXGroup

    return file;
}

/**
 * A file that keeps track of the identifier that Xcode uses internally to reference it
 * 
 * @typedef {Object} pbxIdentifiedFile
 * @property {import("./xcode-types/xcode").XcodeProjectObjectReference<unknown>} uuid The identifier that Xcode uses internally to reference the file
 */

/**
 * An internal representation of a file used by an Xcode project that represents a file that's the compiled output of a target
 * 
 * @typedef {Object} pbxProductFile
 * @property {string} group The name of the group in Xcode that the file should be included within
 */

/**
 * Optional settings to configure a new file that represents the compiled output of a target
 * 
 * @typedef {Object} PBXProductFileOptions
 * @property {string} group The name of the group that the file belongs to within Xcode
 * @property {import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/pbxtarget").PBXTarget>} [target] The Xcode-internal identifier of the target that the file is a product of
 */

/**
 * Adds a file to an Xcode project to be used as the compiled output of a target
 * 
 * @param {string} targetPath The on-disk path to a file to be tracked by Xcode, potentially relative to the default location files of its type are stored depending on file extension
 * @param {import('./pbxFile').PBXFileOptions | PBXProductFileOptions | (import('./pbxFile').PBXFileOptions & PBXProductFileOptions)} [opt={}] Optional settings to configure the file
 * @returns {import("./pbxFile").pbxFile & Partial<pbxProductFile> & pbxIdentifiedFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">} Metadata about the added product file
 * 
 * @type {((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxProductFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxProductFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxProductFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & pbxProductFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & pbxProductFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & pbxProductFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxProductFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxProductFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxProductFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXExplicitFileTypeOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & pbxIdentifiedFile & pbxProductFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">)) &
 *        ((path: string, opt: import('./pbxFile').PBXInferredFileTypeOptions & PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile & pbxProductFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & pbxIdentifiedFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">)) &
 *        ((path: string, opt: import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile)) &
 *        ((path: string, opt: PBXProductFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile & pbxProductFile)) &
 *        ((path: string, opt: {}) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile)) &
 *        ((path: string) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile))}
 */
pbxProject.prototype.addProductFile = function(targetPath, opt = {}) {
    var file = /** @type {import("./pbxFile").pbxFile & pbxIdentifiedFile & pbxProductFile & Pick<import('./pbxFile').pbxInferredTypeFile, "path">}} */ (new pbxFile(targetPath, opt));

    file.includeInIndex = 0;
    file.fileRef = this.generateUuid();
    file.target = "target" in opt ? opt.target : undefined;
    // This is explicitly defined in its own type for external convenience, but only gets conditionally assigned based on the parameters. The overloads handle this, but TypeScript doesn't understand that
    // @ts-ignore
    file.group = "group" in opt ? opt.group : undefined;
    file.uuid = this.generateUuid();
    file.path = file.basename;

    this.addToPbxFileReferenceSection(file);
    this.addToProductsPbxGroup(file);                // PBXGroup

    return file;
}

/**
 * Removes a file used as the compiled output of a target from Xcode's tracking. Note that this doesn't delete the file on-disk
 * 
 * @param {string} path The on-disk path to a file to be tracked by Xcode, potentially relative to the default location files of its type are stored depending on file extension
 * @param {import('./pbxFile').PBXFileOptions} [opt={}] Optional settings to configure the file
 * @returns {import("./pbxFile").pbxFile} Metadata about the file that was removed
 * 
 * @type {((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXExplicitFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile)) &
 *        ((path: string, opt: import('./pbxFile').PBXInferredFileTypeOptions) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile)) &
 *        ((path: string, opt: {}) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile)) &
 *        ((path: string) => (import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile))}
 */
pbxProject.prototype.removeProductFile = function(path, opt = {}) {
    var file = new pbxFile(path, opt);

    this.removeFromProductsPbxGroup(file);           // PBXGroup

    return file;
}

/**
 * A configuration option available (but not required) for a {@link pbxFile} that defines what native (not aggregate or legacy) target that the file should belong to
 * 
 * @typedef {Object} PBXFileTargetOptions
 * @property {import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/pbxtarget").PBXNativeTarget>} target An Xcode-internal identifier that corresponds to a `PBXNativeTarget` that the file should belong to
 */

/**
 * Adds a file to an Xcode project to be used as source code that's fed into a compiler
 * 
 * @param {string} path The on-disk path to a file to be tracked by Xcode, potentially relative to the default location files of its type are stored depending on file extension
 * @param {import('./pbxFile').PBXFileOptions | (import("./pbxFile").PBXFileOptions & PBXFileTargetOptions)} [opt={}] Optional settings to configure the file
 * @param {import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>} [group] An Xcode-internal identifier of a file group to add the source file to. If none is provided, it will be treated as a Cordova plugin
 * @returns {(import("./pbxFile").pbxFile & pbxIdentifiedFile) | false} Metadata about the added source file, or `false` if the file already exists
 * 
 * @type {((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXExplicitFileTypeOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXInferredFileTypeOptions & PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXExplicitFileTypeOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxExplicitTypeFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXInferredFileTypeOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: PBXFileTargetOptions, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">>) | false)) &
 *        ((path: string, opt: {}, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXCompiledFileOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXExplicitFileTypeOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXInferredFileTypeOptions & PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXFrameworkFileOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXExplicitFileTypeOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxExplicitTypeFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: import('./pbxFile').PBXInferredFileTypeOptions) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string, opt: PBXFileTargetOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile & Required<Pick<import("./pbxFile").pbxCoreFile, "target">> & pbxPluginFile) | false)) &
 *        ((path: string, opt: {}) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile & pbxPluginFile) | false)) &
 *        ((path: string) => ((Omit<import('./pbxFile').pbxCoreFile, "target"> & import('./pbxFile').pbxInferredTypeFile & pbxIdentifiedFile & pbxPluginFile) | false))}
 */
pbxProject.prototype.addSourceFile = function (path, opt = {}, group) {
    /** @type {import("./pbxFile").pbxFile & pbxIdentifiedFile} */
    var file;
    if (group) {
        file = /** @type {import("./pbxFile").pbxFile & pbxIdentifiedFile} */ (this.addFile(path, group, opt));
    }
    else {
        file = /** @type {import("./pbxFile").pbxFile & pbxIdentifiedFile} */ (this.addPluginFile(path, opt));
    }

    if (!file) return false;

    file.target = "target" in opt ? opt.target : undefined;
    file.uuid = this.generateUuid();

    this.addToPbxBuildFileSection(file);        // PBXBuildFile
    this.addToPbxSourcesBuildPhase(file);       // PBXSourcesBuildPhase

    return file;
}

/**
 * Removes a file used as source code that's fed into a compiler from Xcode's tracking. Note that this doesn't delete the file on-disk
 * 
 * @param {string} path The on-disk path to a file to be tracked by Xcode, potentially relative to the default location files of its type are stored depending on file extension
 * @param {import('./pbxFile').PBXFileOptions | (import("./pbxFile").PBXFileOptions & PBXFileTargetOptions)} [opt={}] Optional settings to configure the file
 * @param {import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>} [group] An Xcode-internal identifier of a file group to remove the source file from. If none is provided, it will be treated as a Cordova plugin
 * @returns {(import("./pbxFile").pbxFile)} Metadata about the added source file, or `false` if the file already exists
 */
pbxProject.prototype.removeSourceFile = function (path, opt = {}, group) {
    var file;
    if (group) {
        file = this.removeFile(path, group, opt);
    }
    else {
        file = this.removePluginFile(path, opt);
    }
    file.target = "target" in opt ? opt.target : undefined;
    this.removeFromPbxBuildFileSection(file);        // PBXBuildFile
    this.removeFromPbxSourcesBuildPhase(file);       // PBXSourcesBuildPhase

    return file;
}

/**
 * Adds a file to an Xcode project to be used as a C/Objective-C/C++ interface file
 * 
 * @param {string} path The on-disk path to a file to be tracked by Xcode, potentially relative to the default location files of its type are stored depending on file extension
 * @param {import('./pbxFile').PBXFileOptions} [opt={}] Optional settings to configure the file
 * @param {import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>} [group] An Xcode-internal identifier of a file group to add the header file to. If none is provided, it will be treated as a Cordova plugin
 * @type {typeof pbxProject.prototype.addFile}
 */
pbxProject.prototype.addHeaderFile = function (path, opt = {}, group) {
    if (group) {
        return this.addFile(path, group, opt);
    }
    else {
        return this.addPluginFile(path, opt);
    }
}

/**
 *
 * @param path {String}
 * @param opt {Object} see pbxFile for avail options
 * @param group {String} group key
 * @returns {Object} file; see pbxFile
 */
pbxProject.prototype.removeHeaderFile = function (path, opt, group) {
    if (group) {
        return this.removeFile(path, group, opt);
    }
    else {
        return this.removePluginFile(path, opt);
    }
}

/**
 *
 * @param path {String}
 * @param opt {Object} see pbxFile for avail options
 * @param group {String} group key
 * @returns {Object} file; see pbxFile
 */
pbxProject.prototype.addResourceFile = function(path, opt, group) {
    opt = opt || {};

    var file;

    if (opt.plugin) {
        file = this.addPluginFile(path, opt);
        if (!file) return false;
    } else {
        file = new pbxFile(path, opt);
        if (this.hasFile(file.path)) return false;
    }

    file.uuid = this.generateUuid();
    file.target = opt ? opt.target : undefined;

    if (!opt.plugin) {
        correctForResourcesPath(file, this);
        file.fileRef = this.generateUuid();
    }

    if (!opt.variantGroup) {
        this.addToPbxBuildFileSection(file);        // PBXBuildFile
        this.addToPbxResourcesBuildPhase(file);     // PBXResourcesBuildPhase
    }

    if (!opt.plugin) {
        this.addToPbxFileReferenceSection(file);    // PBXFileReference
        if (group) {
            if (this.getPBXGroupByKey(group)) {
                this.addToPbxGroup(file, group);        //Group other than Resources (i.e. 'splash')
            }
            else if (this.getPBXVariantGroupByKey(group)) {
                this.addToPbxVariantGroup(file, group);  // PBXVariantGroup
            }
        }
        else {
            this.addToResourcesPbxGroup(file);          // PBXGroup
        }

    }

    return file;
}

/**
 *
 * @param path {String}
 * @param opt {Object} see pbxFile for avail options
 * @param group {String} group key
 * @returns {Object} file; see pbxFile
 */
pbxProject.prototype.removeResourceFile = function(path, opt, group) {
    var file = new pbxFile(path, opt);
    file.target = opt ? opt.target : undefined;

    correctForResourcesPath(file, this);

    this.removeFromPbxBuildFileSection(file);        // PBXBuildFile
    this.removeFromPbxFileReferenceSection(file);    // PBXFileReference
    if (group) {
        if (this.getPBXGroupByKey(group)) {
            this.removeFromPbxGroup(file, group);        //Group other than Resources (i.e. 'splash')
        }
        else if (this.getPBXVariantGroupByKey(group)) {
            this.removeFromPbxVariantGroup(file, group);  // PBXVariantGroup
        }
    }
    else {
        this.removeFromResourcesPbxGroup(file);          // PBXGroup
    }
    this.removeFromPbxResourcesBuildPhase(file);     // PBXResourcesBuildPhase

    return file;
}

pbxProject.prototype.addFramework = function(fpath, opt) {
    var customFramework = opt && opt.customFramework == true;
    var link = !opt || (opt.link == undefined || opt.link);    //defaults to true if not specified
    var embed = opt && opt.embed;                              //defaults to false if not specified

    if (opt) {
      delete opt.embed;
    }

    var file = new pbxFile(fpath, opt);

    file.uuid = this.generateUuid();
    file.fileRef = this.generateUuid();
    file.target = opt ? opt.target : undefined;

    if (this.hasFile(file.path)) return false;

    this.addToPbxBuildFileSection(file);        // PBXBuildFile
    this.addToPbxFileReferenceSection(file);    // PBXFileReference
    this.addToFrameworksPbxGroup(file);         // PBXGroup

    if (link) {
      this.addToPbxFrameworksBuildPhase(file);    // PBXFrameworksBuildPhase
    }

    if (customFramework) {
        this.addToFrameworkSearchPaths(file);

        if (embed) {
          opt.embed = embed;
          var embeddedFile = new pbxFile(fpath, opt);

          embeddedFile.uuid = this.generateUuid();
          embeddedFile.fileRef = file.fileRef;

          //keeping a separate PBXBuildFile entry for Embed Frameworks
          this.addToPbxBuildFileSection(embeddedFile);        // PBXBuildFile

          this.addToPbxEmbedFrameworksBuildPhase(embeddedFile); // PBXCopyFilesBuildPhase

          return embeddedFile;
        }
    }

    return file;
}

pbxProject.prototype.removeFramework = function(fpath, opt) {
    var embed = opt && opt.embed;

    if (opt) {
      delete opt.embed;
    }

    var file = new pbxFile(fpath, opt);
    file.target = opt ? opt.target : undefined;

    this.removeFromPbxBuildFileSection(file);          // PBXBuildFile
    this.removeFromPbxFileReferenceSection(file);      // PBXFileReference
    this.removeFromFrameworksPbxGroup(file);           // PBXGroup
    this.removeFromPbxFrameworksBuildPhase(file);      // PBXFrameworksBuildPhase

    if (opt && opt.customFramework) {
        this.removeFromFrameworkSearchPaths(file);
    }

    opt = opt || {};
    opt.embed = true;
    var embeddedFile = new pbxFile(fpath, opt);

    embeddedFile.fileRef = file.fileRef;

    this.removeFromPbxBuildFileSection(embeddedFile);          // PBXBuildFile
    this.removeFromPbxEmbedFrameworksBuildPhase(embeddedFile); // PBXCopyFilesBuildPhase

    return file;
}


pbxProject.prototype.addCopyfile = function(fpath, opt) {
    var file = new pbxFile(fpath, opt);

    // catch duplicates
    if (this.hasFile(file.path)) {
        file = this.hasFile(file.path);
    }

    file.fileRef = file.uuid = this.generateUuid();
    file.target = opt ? opt.target : undefined;

    this.addToPbxBuildFileSection(file);        // PBXBuildFile
    this.addToPbxFileReferenceSection(file);    // PBXFileReference
    this.addToPbxCopyfilesBuildPhase(file);     // PBXCopyFilesBuildPhase

    return file;
}

pbxProject.prototype.pbxCopyfilesBuildPhaseObj = function(target) {
    return this.buildPhaseObject('PBXCopyFilesBuildPhase', 'Copy Files', target);
}

pbxProject.prototype.addToPbxCopyfilesBuildPhase = function(file) {
    var sources = this.buildPhaseObject('PBXCopyFilesBuildPhase', 'Copy Files', file.target);
    sources.files.push(pbxBuildPhaseObj(file));
}

pbxProject.prototype.removeCopyfile = function(fpath, opt) {
    var file = new pbxFile(fpath, opt);
    file.target = opt ? opt.target : undefined;

    this.removeFromPbxBuildFileSection(file);        // PBXBuildFile
    this.removeFromPbxFileReferenceSection(file);    // PBXFileReference
    this.removeFromPbxCopyfilesBuildPhase(file);    // PBXFrameworksBuildPhase

    return file;
}

pbxProject.prototype.removeFromPbxCopyfilesBuildPhase = function(file) {
    var sources = this.pbxCopyfilesBuildPhaseObj(file.target);
    for (i in sources.files) {
        if (sources.files[i].comment == longComment(file)) {
            sources.files.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addStaticLibrary = function(path, opt) {
    opt = opt || {};

    var file;

    if (opt.plugin) {
        file = this.addPluginFile(path, opt);
        if (!file) return false;
    } else {
        file = new pbxFile(path, opt);
        if (this.hasFile(file.path)) return false;
    }

    file.uuid = this.generateUuid();
    file.target = opt ? opt.target : undefined;

    if (!opt.plugin) {
        file.fileRef = this.generateUuid();
        this.addToPbxFileReferenceSection(file);    // PBXFileReference
    }

    this.addToPbxBuildFileSection(file);        // PBXBuildFile
    this.addToPbxFrameworksBuildPhase(file);    // PBXFrameworksBuildPhase
    this.addToLibrarySearchPaths(file);        // make sure it gets built!

    return file;
}

// helper addition functions
pbxProject.prototype.addToPbxBuildFileSection = function(file) {
    var commentKey = f("%s_comment", file.uuid);

    this.pbxBuildFileSection()[file.uuid] = pbxBuildFileObj(file);
    this.pbxBuildFileSection()[commentKey] = pbxBuildFileComment(file);
}

pbxProject.prototype.removeFromPbxBuildFileSection = function(file) {
    var uuid;

    for (uuid in this.pbxBuildFileSection()) {
        if (this.pbxBuildFileSection()[uuid].fileRef_comment == file.basename) {
            file.uuid = uuid;
            delete this.pbxBuildFileSection()[uuid];

            var commentKey = f("%s_comment", uuid);
            delete this.pbxBuildFileSection()[commentKey];
        }
    }
}

pbxProject.prototype.addPbxGroup = function(filePathsArray, name, path, sourceTree) {
    var groups = this.hash.project.objects['PBXGroup'],
        pbxGroupUuid = this.generateUuid(),
        commentKey = f("%s_comment", pbxGroupUuid),
        pbxGroup = {
            isa: 'PBXGroup',
            children: [],
            name: name,
            path: path,
            sourceTree: sourceTree ? sourceTree : '"<group>"'
        },
        fileReferenceSection = this.pbxFileReferenceSection(),
        filePathToReference = {};

    for (var key in fileReferenceSection) {
        // only look for comments
        if (!COMMENT_KEY.test(key)) continue;

        var fileReferenceKey = key.split(COMMENT_KEY)[0],
            fileReference = fileReferenceSection[fileReferenceKey];

        filePathToReference[fileReference.path] = { fileRef: fileReferenceKey, basename: fileReferenceSection[key] };
    }

    for (var index = 0; index < filePathsArray.length; index++) {
        var filePath = filePathsArray[index],
            filePathQuoted = "\"" + filePath + "\"";
        if (filePathToReference[filePath]) {
            pbxGroup.children.push(pbxGroupChild(filePathToReference[filePath]));
            continue;
        } else if (filePathToReference[filePathQuoted]) {
            pbxGroup.children.push(pbxGroupChild(filePathToReference[filePathQuoted]));
            continue;
        }

        var file = new pbxFile(filePath);
        file.uuid = this.generateUuid();
        file.fileRef = this.generateUuid();
        this.addToPbxFileReferenceSection(file);    // PBXFileReference
        this.addToPbxBuildFileSection(file);        // PBXBuildFile
        pbxGroup.children.push(pbxGroupChild(file));
    }

    if (groups) {
        groups[pbxGroupUuid] = pbxGroup;
        groups[commentKey] = name;
    }

    return { uuid: pbxGroupUuid, pbxGroup: pbxGroup };
}

pbxProject.prototype.removePbxGroup = function (groupName) {
    var section = this.hash.project.objects['PBXGroup'],
        key, itemKey;

    for (key in section) {
        // only look for comments
        if (!COMMENT_KEY.test(key)) continue;

        if (section[key] == groupName) {
            itemKey = key.split(COMMENT_KEY)[0];
            delete section[itemKey];
        }
    }
}

pbxProject.prototype.addToPbxProjectSection = function(target) {

    var newTarget = {
            value: target.uuid,
            comment: pbxNativeTargetComment(target.pbxNativeTarget)
        };

    this.pbxProjectSection()[this.getFirstProject()['uuid']]['targets'].push(newTarget);
}

pbxProject.prototype.addToPbxNativeTargetSection = function(target) {
    var commentKey = f("%s_comment", target.uuid);

    this.pbxNativeTargetSection()[target.uuid] = target.pbxNativeTarget;
    this.pbxNativeTargetSection()[commentKey] = target.pbxNativeTarget.name;
}

pbxProject.prototype.addToPbxFileReferenceSection = function(file) {
    var commentKey = f("%s_comment", file.fileRef);

    this.pbxFileReferenceSection()[file.fileRef] = pbxFileReferenceObj(file);
    this.pbxFileReferenceSection()[commentKey] = pbxFileReferenceComment(file);
}

pbxProject.prototype.removeFromPbxFileReferenceSection = function(file) {

    var i;
    var refObj = pbxFileReferenceObj(file);
    for (i in this.pbxFileReferenceSection()) {
        if (this.pbxFileReferenceSection()[i].name == refObj.name ||
            ('"' + this.pbxFileReferenceSection()[i].name + '"') == refObj.name ||
            this.pbxFileReferenceSection()[i].path == refObj.path ||
            ('"' + this.pbxFileReferenceSection()[i].path + '"') == refObj.path) {
            file.fileRef = file.uuid = i;
            delete this.pbxFileReferenceSection()[i];
            break;
        }
    }
    var commentKey = f("%s_comment", file.fileRef);
    if (this.pbxFileReferenceSection()[commentKey] != undefined) {
        delete this.pbxFileReferenceSection()[commentKey];
    }

    return file;
}

pbxProject.prototype.addToXcVersionGroupSection = function(file) {
    if (!file.models || !file.currentModel) {
        throw new Error("Cannot create a XCVersionGroup section from not a data model document file");
    }

    var commentKey = f("%s_comment", file.fileRef);

    if (!this.xcVersionGroupSection()[file.fileRef]) {
        this.xcVersionGroupSection()[file.fileRef] = {
            isa: 'XCVersionGroup',
            children: file.models.map(function (el) { return el.fileRef; }),
            currentVersion: file.currentModel.fileRef,
            name: path.basename(file.path),
            path: file.path,
            sourceTree: '"<group>"',
            versionGroupType: 'wrapper.xcdatamodel'
        };
        this.xcVersionGroupSection()[commentKey] = path.basename(file.path);
    }
}

pbxProject.prototype.addToPluginsPbxGroup = function(file) {
    var pluginsGroup = this.pbxGroupByName('Plugins');
    if (!pluginsGroup) {
        this.addPbxGroup([file.path], 'Plugins');
    } else {
        pluginsGroup.children.push(pbxGroupChild(file));
    }
}

pbxProject.prototype.removeFromPluginsPbxGroup = function(file) {
    if (!this.pbxGroupByName('Plugins')) {
        return null;
    }
    var pluginsGroupChildren = this.pbxGroupByName('Plugins').children, i;
    for (i in pluginsGroupChildren) {
        if (pbxGroupChild(file).value == pluginsGroupChildren[i].value &&
            pbxGroupChild(file).comment == pluginsGroupChildren[i].comment) {
            pluginsGroupChildren.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToResourcesPbxGroup = function(file) {
    var pluginsGroup = this.pbxGroupByName('Resources');
    if (!pluginsGroup) {
        this.addPbxGroup([file.path], 'Resources');
    } else {
        pluginsGroup.children.push(pbxGroupChild(file));
    }
}

pbxProject.prototype.removeFromResourcesPbxGroup = function(file) {
    if (!this.pbxGroupByName('Resources')) {
        return null;
    }
    var pluginsGroupChildren = this.pbxGroupByName('Resources').children, i;
    for (i in pluginsGroupChildren) {
        if (pbxGroupChild(file).value == pluginsGroupChildren[i].value &&
            pbxGroupChild(file).comment == pluginsGroupChildren[i].comment) {
            pluginsGroupChildren.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToFrameworksPbxGroup = function(file) {
    var pluginsGroup = this.pbxGroupByName('Frameworks');
    if (!pluginsGroup) {
        this.addPbxGroup([file.path], 'Frameworks');
    } else {
        pluginsGroup.children.push(pbxGroupChild(file));
    }
}

pbxProject.prototype.removeFromFrameworksPbxGroup = function(file) {
    if (!this.pbxGroupByName('Frameworks')) {
        return null;
    }
    var pluginsGroupChildren = this.pbxGroupByName('Frameworks').children;

    for (i in pluginsGroupChildren) {
        if (pbxGroupChild(file).value == pluginsGroupChildren[i].value &&
            pbxGroupChild(file).comment == pluginsGroupChildren[i].comment) {
            pluginsGroupChildren.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToPbxEmbedFrameworksBuildPhase = function (file) {
    var sources = this.pbxEmbedFrameworksBuildPhaseObj(file.target);
    if (sources) {
        sources.files.push(pbxBuildPhaseObj(file));
    }
}

pbxProject.prototype.removeFromPbxEmbedFrameworksBuildPhase = function (file) {
    var sources = this.pbxEmbedFrameworksBuildPhaseObj(file.target);
    if (sources) {
        var files = [];
        for (i in sources.files) {
            if (sources.files[i].comment != longComment(file)) {
                files.push(sources.files[i]);
            }
        }
        sources.files = files;
    }
}

pbxProject.prototype.addToProductsPbxGroup = function(file) {
    var productsGroup = this.pbxGroupByName('Products');
    if (!productsGroup) {
        this.addPbxGroup([file.path], 'Products');
    } else {
        productsGroup.children.push(pbxGroupChild(file));
    }
}

pbxProject.prototype.removeFromProductsPbxGroup = function(file) {
    if (!this.pbxGroupByName('Products')) {
        return null;
    }
    var productsGroupChildren = this.pbxGroupByName('Products').children, i;
    for (i in productsGroupChildren) {
        if (pbxGroupChild(file).value == productsGroupChildren[i].value &&
            pbxGroupChild(file).comment == productsGroupChildren[i].comment) {
            productsGroupChildren.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToPbxSourcesBuildPhase = function(file) {
    var sources = this.pbxSourcesBuildPhaseObj(file.target);
    sources.files.push(pbxBuildPhaseObj(file));
}

pbxProject.prototype.removeFromPbxSourcesBuildPhase = function(file) {

    var sources = this.pbxSourcesBuildPhaseObj(file.target), i;
    for (i in sources.files) {
        if (sources.files[i].comment == longComment(file)) {
            sources.files.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToPbxResourcesBuildPhase = function(file) {
    var sources = this.pbxResourcesBuildPhaseObj(file.target);
    sources.files.push(pbxBuildPhaseObj(file));
}

pbxProject.prototype.removeFromPbxResourcesBuildPhase = function(file) {
    var sources = this.pbxResourcesBuildPhaseObj(file.target), i;

    for (i in sources.files) {
        if (sources.files[i].comment == longComment(file)) {
            sources.files.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToPbxFrameworksBuildPhase = function(file) {
    var sources = this.pbxFrameworksBuildPhaseObj(file.target);
    sources.files.push(pbxBuildPhaseObj(file));
}

pbxProject.prototype.removeFromPbxFrameworksBuildPhase = function(file) {
    var sources = this.pbxFrameworksBuildPhaseObj(file.target);
    for (i in sources.files) {
        if (sources.files[i].comment == longComment(file)) {
            sources.files.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addXCConfigurationList = function(configurationObjectsArray, defaultConfigurationName, comment) {
    var pbxBuildConfigurationSection = this.pbxXCBuildConfigurationSection(),
        pbxXCConfigurationListSection = this.pbxXCConfigurationList(),
        xcConfigurationListUuid = this.generateUuid(),
        commentKey = f("%s_comment", xcConfigurationListUuid),
        xcConfigurationList = {
            isa: 'XCConfigurationList',
            buildConfigurations: [],
            defaultConfigurationIsVisible: 0,
            defaultConfigurationName: defaultConfigurationName
        };

    for (var index = 0; index < configurationObjectsArray.length; index++) {
        var configuration = configurationObjectsArray[index],
            configurationUuid = this.generateUuid(),
            configurationCommentKey = f("%s_comment", configurationUuid);

        pbxBuildConfigurationSection[configurationUuid] = configuration;
        pbxBuildConfigurationSection[configurationCommentKey] = configuration.name;
        xcConfigurationList.buildConfigurations.push({ value: configurationUuid, comment: configuration.name });
    }

    if (pbxXCConfigurationListSection) {
        pbxXCConfigurationListSection[xcConfigurationListUuid] = xcConfigurationList;
        pbxXCConfigurationListSection[commentKey] = comment;
    }

    return { uuid: xcConfigurationListUuid, xcConfigurationList: xcConfigurationList };
}

pbxProject.prototype.addTargetDependency = function(target, dependencyTargets) {
    if (!target)
        return undefined;

    var nativeTargets = this.pbxNativeTargetSection();

    if (typeof nativeTargets[target] == "undefined")
        throw new Error("Invalid target: " + target);

    for (var index = 0; index < dependencyTargets.length; index++) {
        var dependencyTarget = dependencyTargets[index];
        if (typeof nativeTargets[dependencyTarget] == "undefined")
            throw new Error("Invalid target: " + dependencyTarget);
        }

    var pbxTargetDependency = 'PBXTargetDependency',
        pbxContainerItemProxy = 'PBXContainerItemProxy',
        pbxTargetDependencySection = this.hash.project.objects[pbxTargetDependency],
        pbxContainerItemProxySection = this.hash.project.objects[pbxContainerItemProxy];

    for (var index = 0; index < dependencyTargets.length; index++) {
        var dependencyTargetUuid = dependencyTargets[index],
            dependencyTargetCommentKey = f("%s_comment", dependencyTargetUuid),
            targetDependencyUuid = this.generateUuid(),
            targetDependencyCommentKey = f("%s_comment", targetDependencyUuid),
            itemProxyUuid = this.generateUuid(),
            itemProxyCommentKey = f("%s_comment", itemProxyUuid),
            itemProxy = {
                isa: pbxContainerItemProxy,
                containerPortal: this.hash.project['rootObject'],
                containerPortal_comment: this.hash.project['rootObject_comment'],
                proxyType: 1,
                remoteGlobalIDString: dependencyTargetUuid,
                remoteInfo: nativeTargets[dependencyTargetUuid].name
            },
            targetDependency = {
                isa: pbxTargetDependency,
                target: dependencyTargetUuid,
                target_comment: nativeTargets[dependencyTargetCommentKey],
                targetProxy: itemProxyUuid,
                targetProxy_comment: pbxContainerItemProxy
            };

        if (pbxContainerItemProxySection && pbxTargetDependencySection) {
            pbxContainerItemProxySection[itemProxyUuid] = itemProxy;
            pbxContainerItemProxySection[itemProxyCommentKey] = pbxContainerItemProxy;
            pbxTargetDependencySection[targetDependencyUuid] = targetDependency;
            pbxTargetDependencySection[targetDependencyCommentKey] = pbxTargetDependency;
            nativeTargets[target].dependencies.push({ value: targetDependencyUuid, comment: pbxTargetDependency })
        }
    }

    return { uuid: target, target: nativeTargets[target] };
}

pbxProject.prototype.addBuildPhase = function(filePathsArray, buildPhaseType, comment, target, optionsOrFolderType, subfolderPath) {
    var buildPhaseSection,
        fileReferenceSection = this.pbxFileReferenceSection(),
        buildFileSection = this.pbxBuildFileSection(),
        buildPhaseUuid = this.generateUuid(),
        buildPhaseTargetUuid = target || this.getFirstTarget().uuid,
        commentKey = f("%s_comment", buildPhaseUuid),
        buildPhase = {
            isa: buildPhaseType,
            buildActionMask: 2147483647,
            files: [],
            runOnlyForDeploymentPostprocessing: 0
        },
        filePathToBuildFile = {};

    if (buildPhaseType === 'PBXCopyFilesBuildPhase') {
        buildPhase = pbxCopyFilesBuildPhaseObj(buildPhase, optionsOrFolderType, subfolderPath, comment);
    } else if (buildPhaseType === 'PBXShellScriptBuildPhase') {
        buildPhase = pbxShellScriptBuildPhaseObj(buildPhase, optionsOrFolderType, comment)
    }

    if (!this.hash.project.objects[buildPhaseType]) {
        this.hash.project.objects[buildPhaseType] = new Object();
    }

    if (!this.hash.project.objects[buildPhaseType][buildPhaseUuid]) {
        this.hash.project.objects[buildPhaseType][buildPhaseUuid] = buildPhase;
        this.hash.project.objects[buildPhaseType][commentKey] = comment;
    }

    if (this.hash.project.objects['PBXNativeTarget'][buildPhaseTargetUuid]['buildPhases']) {
        this.hash.project.objects['PBXNativeTarget'][buildPhaseTargetUuid]['buildPhases'].push({
            value: buildPhaseUuid,
            comment: comment
        })

    }


    for (var key in buildFileSection) {
        // only look for comments
        if (!COMMENT_KEY.test(key)) continue;

        var buildFileKey = key.split(COMMENT_KEY)[0],
            buildFile = buildFileSection[buildFileKey];
        fileReference = fileReferenceSection[buildFile.fileRef];

        if (!fileReference) continue;

        var pbxFileObj = new pbxFile(fileReference.path);

        filePathToBuildFile[fileReference.path] = { uuid: buildFileKey, basename: pbxFileObj.basename, group: pbxFileObj.group };
    }

    for (var index = 0; index < filePathsArray.length; index++) {
        var filePath = filePathsArray[index],
            filePathQuoted = "\"" + filePath + "\"",
            file = new pbxFile(filePath);

        if (filePathToBuildFile[filePath]) {
            buildPhase.files.push(pbxBuildPhaseObj(filePathToBuildFile[filePath]));
            continue;
        } else if (filePathToBuildFile[filePathQuoted]) {
            buildPhase.files.push(pbxBuildPhaseObj(filePathToBuildFile[filePathQuoted]));
            continue;
        }

        file.uuid = this.generateUuid();
        file.fileRef = this.generateUuid();
        this.addToPbxFileReferenceSection(file);    // PBXFileReference
        this.addToPbxBuildFileSection(file);        // PBXBuildFile
        buildPhase.files.push(pbxBuildPhaseObj(file));
    }

    if (buildPhaseSection) {
        buildPhaseSection[buildPhaseUuid] = buildPhase;
        buildPhaseSection[commentKey] = comment;
    }

    return { uuid: buildPhaseUuid, buildPhase: buildPhase };
}

// helper access functions
pbxProject.prototype.pbxProjectSection = function() {
    return this.hash.project.objects['PBXProject'];
}
pbxProject.prototype.pbxBuildFileSection = function() {
    return this.hash.project.objects['PBXBuildFile'];
}

pbxProject.prototype.pbxXCBuildConfigurationSection = function() {
    return this.hash.project.objects['XCBuildConfiguration'];
}

pbxProject.prototype.pbxFileReferenceSection = function() {
    return this.hash.project.objects['PBXFileReference'];
}

pbxProject.prototype.pbxNativeTargetSection = function() {
    return this.hash.project.objects['PBXNativeTarget'];
}

pbxProject.prototype.xcVersionGroupSection = function () {
    if (typeof this.hash.project.objects['XCVersionGroup'] !== 'object') {
        this.hash.project.objects['XCVersionGroup'] = {};
    }

    return this.hash.project.objects['XCVersionGroup'];
}

pbxProject.prototype.pbxXCConfigurationList = function() {
    return this.hash.project.objects['XCConfigurationList'];
}

pbxProject.prototype.pbxGroupByName = function(name) {
    var groups = this.hash.project.objects['PBXGroup'],
        key, groupKey;

    for (key in groups) {
        // only look for comments
        if (!COMMENT_KEY.test(key)) continue;

        if (groups[key] == name) {
            groupKey = key.split(COMMENT_KEY)[0];
            return groups[groupKey];
        }
    }

    return null;
}

pbxProject.prototype.pbxTargetByName = function(name) {
    return this.pbxItemByComment(name, 'PBXNativeTarget');
}

pbxProject.prototype.findTargetKey = function(name) {
    var targets = this.hash.project.objects['PBXNativeTarget'];

    for (var key in targets) {
        // only look for comments
        if (COMMENT_KEY.test(key)) continue;

        var target = targets[key];
        if (target.name === name) {
            return key;
        }
    }

    return null;
}

pbxProject.prototype.pbxItemByComment = function(name, pbxSectionName) {
    var section = this.hash.project.objects[pbxSectionName],
        key, itemKey;

    for (key in section) {
        // only look for comments
        if (!COMMENT_KEY.test(key)) continue;

        if (section[key] == name) {
            itemKey = key.split(COMMENT_KEY)[0];
            return section[itemKey];
        }
    }

    return null;
}

pbxProject.prototype.pbxSourcesBuildPhaseObj = function(target) {
    return this.buildPhaseObject('PBXSourcesBuildPhase', 'Sources', target);
}

pbxProject.prototype.pbxResourcesBuildPhaseObj = function(target) {
    return this.buildPhaseObject('PBXResourcesBuildPhase', 'Resources', target);
}

pbxProject.prototype.pbxFrameworksBuildPhaseObj = function(target) {
    return this.buildPhaseObject('PBXFrameworksBuildPhase', 'Frameworks', target);
}

pbxProject.prototype.pbxEmbedFrameworksBuildPhaseObj = function (target) {
    return this.buildPhaseObject('PBXCopyFilesBuildPhase', 'Embed Frameworks', target);
};

// Find Build Phase from group/target
pbxProject.prototype.buildPhase = function(group, target) {

    if (!target)
        return undefined;

    var nativeTargets = this.pbxNativeTargetSection();
     if (typeof nativeTargets[target] == "undefined")
        throw new Error("Invalid target: " + target);

    var nativeTarget = nativeTargets[target];
    var buildPhases = nativeTarget.buildPhases;
     for(var i in buildPhases)
     {
        var buildPhase = buildPhases[i];
        if (buildPhase.comment==group)
            return buildPhase.value + "_comment";
        }
    }

pbxProject.prototype.buildPhaseObject = function(name, group, target) {
    var section = this.hash.project.objects[name],
        obj, sectionKey, key;
    var buildPhase = this.buildPhase(group, target);

    for (key in section) {

        // only look for comments
        if (!COMMENT_KEY.test(key)) continue;

        // select the proper buildPhase
        if (buildPhase && buildPhase!=key)
            continue;
        if (section[key] == group) {
            sectionKey = key.split(COMMENT_KEY)[0];
            return section[sectionKey];
        }
    }
    return null;
}

pbxProject.prototype.addBuildProperty = function(prop, value, build_name) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        key, configuration;

    for (key in configurations){
        configuration = configurations[key];
        if (!build_name || configuration.name === build_name){
            configuration.buildSettings[prop] = value;
        }
    }
}

pbxProject.prototype.removeBuildProperty = function(prop, build_name) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        key, configuration;

    for (key in configurations){
        configuration = configurations[key];
        if (configuration.buildSettings[prop] &&
            !build_name || configuration.name === build_name){
            delete configuration.buildSettings[prop];
        }
    }
}

/**
 *
 * @param prop {String}
 * @param value {String|Array|Object|Number|Boolean}
 * @param build {String} Release or Debug
 * @param targetName {String} the target which will be updated
 */
pbxProject.prototype.updateBuildProperty = function(prop, value, build, targetName) {
    let validConfigs = [];

    if(targetName) {
        const target = this.pbxTargetByName(targetName);
        const targetBuildConfigs = target && target.buildConfigurationList;

        const xcConfigList = this.pbxXCConfigurationList();

        // Collect the UUID's from the configuration of our target
        for (const configName in xcConfigList) {
            if (!COMMENT_KEY.test(configName) && targetBuildConfigs === configName) {
                const buildVariants = xcConfigList[configName].buildConfigurations;

                for (const item of buildVariants) {
                    validConfigs.push(item.value);
                }

                break;
            }
        }
    }
    
    var configs = this.pbxXCBuildConfigurationSection();
    for (var configName in configs) {
        if (!COMMENT_KEY.test(configName)) {
            if (targetName && !validConfigs.includes(configName)) continue;

            var config = configs[configName];
            if ( (build && config.name === build) || (!build) ) {
                config.buildSettings[prop] = value;
            }
        }
    }
}

pbxProject.prototype.updateProductName = function(name) {
    this.updateBuildProperty('PRODUCT_NAME', '"' + name + '"');
}

pbxProject.prototype.removeFromFrameworkSearchPaths = function(file) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        INHERITED = '"$(inherited)"',
        SEARCH_PATHS = 'FRAMEWORK_SEARCH_PATHS',
        config, buildSettings, searchPaths;
    var new_path = searchPathForFile(file, this);

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName)
            continue;

        searchPaths = buildSettings[SEARCH_PATHS];

        if (searchPaths && Array.isArray(searchPaths)) {
            var matches = searchPaths.filter(function(p) {
                return p.indexOf(new_path) > -1;
            });
            matches.forEach(function(m) {
                var idx = searchPaths.indexOf(m);
                searchPaths.splice(idx, 1);
            });
        }
    }
}

pbxProject.prototype.addToFrameworkSearchPaths = function(file) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        INHERITED = '"$(inherited)"',
        config, buildSettings, searchPaths;

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName)
            continue;

        if (!buildSettings['FRAMEWORK_SEARCH_PATHS']
            || buildSettings['FRAMEWORK_SEARCH_PATHS'] === INHERITED) {
            buildSettings['FRAMEWORK_SEARCH_PATHS'] = [INHERITED];
        }

        buildSettings['FRAMEWORK_SEARCH_PATHS'].push(searchPathForFile(file, this));
    }
}

pbxProject.prototype.removeFromLibrarySearchPaths = function(file) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        INHERITED = '"$(inherited)"',
        SEARCH_PATHS = 'LIBRARY_SEARCH_PATHS',
        config, buildSettings, searchPaths;
    var new_path = searchPathForFile(file, this);

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName)
            continue;

        searchPaths = buildSettings[SEARCH_PATHS];

        if (searchPaths && Array.isArray(searchPaths)) {
            var matches = searchPaths.filter(function(p) {
                return p.indexOf(new_path) > -1;
            });
            matches.forEach(function(m) {
                var idx = searchPaths.indexOf(m);
                searchPaths.splice(idx, 1);
            });
        }

    }
}

pbxProject.prototype.addToLibrarySearchPaths = function(file) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        INHERITED = '"$(inherited)"',
        config, buildSettings, searchPaths;

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName)
            continue;

        if (!buildSettings['LIBRARY_SEARCH_PATHS']
            || buildSettings['LIBRARY_SEARCH_PATHS'] === INHERITED) {
            buildSettings['LIBRARY_SEARCH_PATHS'] = [INHERITED];
        }

        if (typeof file === 'string') {
            buildSettings['LIBRARY_SEARCH_PATHS'].push(file);
        } else {
            buildSettings['LIBRARY_SEARCH_PATHS'].push(searchPathForFile(file, this));
        }
    }
}

pbxProject.prototype.removeFromHeaderSearchPaths = function(file) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        INHERITED = '"$(inherited)"',
        SEARCH_PATHS = 'HEADER_SEARCH_PATHS',
        config, buildSettings, searchPaths;
    var new_path = searchPathForFile(file, this);

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName)
            continue;

        if (buildSettings[SEARCH_PATHS]) {
            var matches = buildSettings[SEARCH_PATHS].filter(function(p) {
                return p.indexOf(new_path) > -1;
            });
            matches.forEach(function(m) {
                var idx = buildSettings[SEARCH_PATHS].indexOf(m);
                buildSettings[SEARCH_PATHS].splice(idx, 1);
            });
        }

    }
}
pbxProject.prototype.addToHeaderSearchPaths = function(file) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        INHERITED = '"$(inherited)"',
        config, buildSettings, searchPaths;

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName)
            continue;

        if (!buildSettings['HEADER_SEARCH_PATHS']) {
            buildSettings['HEADER_SEARCH_PATHS'] = [INHERITED];
        }

        if (typeof file === 'string') {
            buildSettings['HEADER_SEARCH_PATHS'].push(file);
        } else {
            buildSettings['HEADER_SEARCH_PATHS'].push(searchPathForFile(file, this));
        }
    }
}

pbxProject.prototype.addToOtherLinkerFlags = function (flag) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        INHERITED = '"$(inherited)"',
        OTHER_LDFLAGS = 'OTHER_LDFLAGS',
        config, buildSettings;

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName)
            continue;

        if (!buildSettings[OTHER_LDFLAGS]
                || buildSettings[OTHER_LDFLAGS] === INHERITED) {
            buildSettings[OTHER_LDFLAGS] = [INHERITED];
        }

        buildSettings[OTHER_LDFLAGS].push(flag);
    }
}

pbxProject.prototype.removeFromOtherLinkerFlags = function (flag) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        OTHER_LDFLAGS = 'OTHER_LDFLAGS',
        config, buildSettings;

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName) {
            continue;
        }

        if (buildSettings[OTHER_LDFLAGS]) {
            var matches = buildSettings[OTHER_LDFLAGS].filter(function (p) {
                return p.indexOf(flag) > -1;
            });
            matches.forEach(function (m) {
                var idx = buildSettings[OTHER_LDFLAGS].indexOf(m);
                buildSettings[OTHER_LDFLAGS].splice(idx, 1);
            });
        }
    }
}

pbxProject.prototype.addToBuildSettings = function (buildSetting, value) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        config, buildSettings;

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        buildSettings[buildSetting] = value;
    }
}

pbxProject.prototype.removeFromBuildSettings = function (buildSetting) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        config, buildSettings;

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (buildSettings[buildSetting]) {
            delete buildSettings[buildSetting];
        }
    }
}

// a JS getter. hmmm
pbxProject.prototype.__defineGetter__("productName", function() {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        config, productName;

    for (config in configurations) {
        productName = configurations[config].buildSettings['PRODUCT_NAME'];

        if (productName) {
            return unquote(productName);
        }
    }
});

// check if file is present
pbxProject.prototype.hasFile = function(filePath) {
    var files = nonComments(this.pbxFileReferenceSection()),
        file, id;
    for (id in files) {
        file = files[id];
        if (file.path == filePath || file.path == ('"' + filePath + '"')) {
            return file;
        }
    }

    return false;
}

pbxProject.prototype.addTarget = function(name, type, subfolder, bundleId) {

    // Setup uuid and name of new target
    var targetUuid = this.generateUuid(),
        targetType = type,
        targetSubfolder = subfolder || name,
        targetName = name.trim(),
        targetBundleId = bundleId;

    // Check type against list of allowed target types
    if (!targetName) {
        throw new Error("Target name missing.");
    }

    // Check type against list of allowed target types
    if (!targetType) {
        throw new Error("Target type missing.");
    }

    // Check type against list of allowed target types
    if (!producttypeForTargettype(targetType)) {
        throw new Error("Target type invalid: " + targetType);
    }

    // Build Configuration: Create
    var buildConfigurationsList = [
        {
            name: 'Debug',
            isa: 'XCBuildConfiguration',
            buildSettings: {
                GCC_PREPROCESSOR_DEFINITIONS: ['"DEBUG=1"', '"$(inherited)"'],
                INFOPLIST_FILE: '"' + path.join(targetSubfolder, targetSubfolder + '-Info.plist' + '"'),
                LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
                PRODUCT_NAME: '"' + targetName + '"',
                SKIP_INSTALL: 'YES'
            }
        },
        {
            name: 'Release',
            isa: 'XCBuildConfiguration',
            buildSettings: {
                INFOPLIST_FILE: '"' + path.join(targetSubfolder, targetSubfolder + '-Info.plist' + '"'),
                LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
                PRODUCT_NAME: '"' + targetName + '"',
                SKIP_INSTALL: 'YES'
            }
        }
    ];

    // Add optional bundleId to build configuration
    if (targetBundleId) {
        buildConfigurationsList = buildConfigurationsList.map((elem) => {
            elem.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = '"' + targetBundleId + '"';
            return elem;
        });
    }

    // Build Configuration: Add
    var buildConfigurations = this.addXCConfigurationList(buildConfigurationsList, 'Release', 'Build configuration list for PBXNativeTarget "' + targetName +'"');

    // Product: Create
    var productName = targetName,
        productType = producttypeForTargettype(targetType),
        productFileType = filetypeForProducttype(productType),
        productFile = this.addProductFile(productName, { group: 'Copy Files', 'target': targetUuid, 'explicitFileType': productFileType}),
        productFileName = productFile.basename;


    // Product: Add to build file list
    this.addToPbxBuildFileSection(productFile);

    // Target: Create
    var target = {
            uuid: targetUuid,
            pbxNativeTarget: {
                isa: 'PBXNativeTarget',
                name: '"' + targetName + '"',
                productName: '"' + targetName + '"',
                productReference: productFile.fileRef,
                productType: '"' + producttypeForTargettype(targetType) + '"',
                buildConfigurationList: buildConfigurations.uuid,
                buildPhases: [],
                buildRules: [],
                dependencies: []
            }
    };

    // Target: Add to PBXNativeTarget section
    this.addToPbxNativeTargetSection(target)

    // Product: Embed (only for "extension"-type targets)
    if (targetType === 'app_extension') {

        // Create CopyFiles phase in first target
        this.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Copy Files', this.getFirstTarget().uuid,  targetType)

        // Add product to CopyFiles phase
        this.addToPbxCopyfilesBuildPhase(productFile)

       // this.addBuildPhaseToTarget(newPhase.buildPhase, this.getFirstTarget().uuid)
    } else if (targetType === 'watch2_app') {
        // Create CopyFiles phase in first target
        this.addBuildPhase(
            [targetName + '.app'],
            'PBXCopyFilesBuildPhase',
            'Embed Watch Content',
            this.getFirstTarget().uuid,
            targetType,
            '"$(CONTENTS_FOLDER_PATH)/Watch"'
        );
    } else if (targetType === 'watch2_extension') {
        // Create CopyFiles phase in watch target (if exists)
        var watch2Target = this.getTarget(producttypeForTargettype('watch2_app'));
        if (watch2Target) {
            this.addBuildPhase(
                [targetName + '.appex'],
                'PBXCopyFilesBuildPhase',
                'Embed App Extensions',
                watch2Target.uuid,
                targetType
            );
        }
    }

    // Target: Add uuid to root project
    this.addToPbxProjectSection(target);

    // Target: Add dependency for this target to other targets
    if (targetType === 'watch2_extension') {
        var watch2Target = this.getTarget(producttypeForTargettype('watch2_app'));
        if (watch2Target) {
            this.addTargetDependency(watch2Target.uuid, [target.uuid]);
        }
    } else {
        this.addTargetDependency(this.getFirstTarget().uuid, [target.uuid]);
    }


    // Return target on success
    return target;

};

// helper object creation functions
function pbxBuildFileObj(file) {
    var obj = Object.create(null);

    obj.isa = 'PBXBuildFile';
    obj.fileRef = file.fileRef;
    obj.fileRef_comment = file.basename;
    if (file.settings) obj.settings = file.settings;

    return obj;
}

function pbxFileReferenceObj(file) {
    var fileObject = {
        isa: "PBXFileReference",
        name: "\"" + file.basename + "\"",
        path: "\"" + file.path.replace(/\\/g, '/') + "\"",
        sourceTree: file.sourceTree,
        fileEncoding: file.fileEncoding,
        lastKnownFileType: file.lastKnownFileType,
        explicitFileType: file.explicitFileType,
        includeInIndex: file.includeInIndex
    };

    return fileObject;
}

function pbxGroupChild(file) {
    var obj = Object.create(null);

    obj.value = file.fileRef;
    obj.comment = file.basename;

    return obj;
}

function pbxBuildPhaseObj(file) {
    var obj = Object.create(null);

    obj.value = file.uuid;
    obj.comment = longComment(file);

    return obj;
}

function pbxCopyFilesBuildPhaseObj(obj, folderType, subfolderPath, phaseName) {

     // Add additional properties for 'CopyFiles' build phase
    var DESTINATION_BY_TARGETTYPE = {
        application: 'wrapper',
        app_extension: 'plugins',
        bundle: 'wrapper',
        command_line_tool: 'wrapper',
        dynamic_library: 'products_directory',
        framework: 'shared_frameworks',
        frameworks: 'frameworks',
        static_library: 'products_directory',
        unit_test_bundle: 'wrapper',
        watch_app: 'wrapper',
        watch2_app: 'products_directory',
        watch_extension: 'plugins',
        watch2_extension: 'plugins'
    }
    var SUBFOLDERSPEC_BY_DESTINATION = {
        absolute_path: 0,
        executables: 6,
        frameworks: 10,
        java_resources: 15,
        plugins: 13,
        products_directory: 16,
        resources: 7,
        shared_frameworks: 11,
        shared_support: 12,
        wrapper: 1,
        xpc_services: 0
    }

    obj.name = '"' + phaseName + '"';
    obj.dstPath = subfolderPath || '""';
    obj.dstSubfolderSpec = SUBFOLDERSPEC_BY_DESTINATION[DESTINATION_BY_TARGETTYPE[folderType]];

    return obj;
}

function pbxShellScriptBuildPhaseObj(obj, options, phaseName) {
    obj.name = '"' + phaseName + '"';
    obj.inputPaths = options.inputPaths || [];
    obj.outputPaths = options.outputPaths || [];
    obj.shellPath = options.shellPath;
    obj.shellScript = '"' + options.shellScript.replace(/"/g, '\\"') + '"';

    return obj;
}

function pbxBuildFileComment(file) {
    return longComment(file);
}

function pbxFileReferenceComment(file) {
    return file.basename || path.basename(file.path);
}

function pbxNativeTargetComment(target) {
    return target.name;
}

function longComment(file) {
    return f("%s in %s", file.basename, file.group);
}

// respect <group> path
function correctForPluginsPath(file, project) {
    return correctForPath(file, project, 'Plugins');
}

function correctForResourcesPath(file, project) {
    return correctForPath(file, project, 'Resources');
}

function correctForFrameworksPath(file, project) {
    return correctForPath(file, project, 'Frameworks');
}

function correctForPath(file, project, group) {
    var r_group_dir = new RegExp('^' + group + '[\\\\/]');

    if (project.pbxGroupByName(group) && project.pbxGroupByName(group).path)
        file.path = file.path.replace(r_group_dir, '');

    return file;
}

function searchPathForFile(file, proj) {
    var plugins = proj.pbxGroupByName('Plugins'),
        pluginsPath = plugins ? plugins.path : null,
        fileDir = path.dirname(file.path);

    if (fileDir == '.') {
        fileDir = '';
    } else {
        fileDir = '/' + fileDir;
    }

    if (file.plugin && pluginsPath) {
        return '"\\"$(SRCROOT)/' + unquote(pluginsPath) + '\\""';
    } else if (file.customFramework && file.dirname) {
        return '"\\"' + file.dirname + '\\""';
    } else {
        return '"\\"$(SRCROOT)/' + proj.productName + fileDir + '\\""';
    }
}

function nonComments(obj) {
    var keys = Object.keys(obj),
        newObj = {}, i = 0;

    for (i; i < keys.length; i++) {
        if (!COMMENT_KEY.test(keys[i])) {
            newObj[keys[i]] = obj[keys[i]];
        }
    }

    return newObj;
}

function unquote(str) {
    if (str) return str.replace(/^"(.*)"$/, "$1");
}


function buildPhaseNameForIsa (isa) {

    BUILDPHASENAME_BY_ISA = {
        PBXCopyFilesBuildPhase: 'Copy Files',
        PBXResourcesBuildPhase: 'Resources',
        PBXSourcesBuildPhase: 'Sources',
        PBXFrameworksBuildPhase: 'Frameworks'
    }

    return BUILDPHASENAME_BY_ISA[isa]
}

function producttypeForTargettype (targetType) {

    PRODUCTTYPE_BY_TARGETTYPE = {
            application: 'com.apple.product-type.application',
            app_extension: 'com.apple.product-type.app-extension',
            bundle: 'com.apple.product-type.bundle',
            command_line_tool: 'com.apple.product-type.tool',
            dynamic_library: 'com.apple.product-type.library.dynamic',
            framework: 'com.apple.product-type.framework',
            static_library: 'com.apple.product-type.library.static',
            unit_test_bundle: 'com.apple.product-type.bundle.unit-test',
            watch_app: 'com.apple.product-type.application.watchapp',
            watch2_app: 'com.apple.product-type.application.watchapp2',
            watch_extension: 'com.apple.product-type.watchkit-extension',
            watch2_extension: 'com.apple.product-type.watchkit2-extension'
        };

    return PRODUCTTYPE_BY_TARGETTYPE[targetType]
}

function filetypeForProducttype (productType) {

    FILETYPE_BY_PRODUCTTYPE = {
            'com.apple.product-type.application': '"wrapper.application"',
            'com.apple.product-type.app-extension': '"wrapper.app-extension"',
            'com.apple.product-type.bundle': '"wrapper.plug-in"',
            'com.apple.product-type.tool': '"compiled.mach-o.dylib"',
            'com.apple.product-type.library.dynamic': '"compiled.mach-o.dylib"',
            'com.apple.product-type.framework': '"wrapper.framework"',
            'com.apple.product-type.library.static': '"archive.ar"',
            'com.apple.product-type.bundle.unit-test': '"wrapper.cfbundle"',
            'com.apple.product-type.application.watchapp': '"wrapper.application"',
            'com.apple.product-type.application.watchapp2': '"wrapper.application"',
            'com.apple.product-type.watchkit-extension': '"wrapper.app-extension"',
            'com.apple.product-type.watchkit2-extension': '"wrapper.app-extension"'
        };

    return FILETYPE_BY_PRODUCTTYPE[productType]
}

pbxProject.prototype.getFirstProject = function() {

    // Get pbxProject container
    var pbxProjectContainer = this.pbxProjectSection();

    // Get first pbxProject UUID
    var firstProjectUuid = Object.keys(pbxProjectContainer)[0];

    // Get first pbxProject
    var firstProject = pbxProjectContainer[firstProjectUuid];

     return {
        uuid: firstProjectUuid,
        firstProject: firstProject
    }
}

pbxProject.prototype.getFirstTarget = function() {
    // Get first target's UUID
    var firstTargetUuid = this.getFirstProject()['firstProject']['targets'][0].value;

    // Get first pbxNativeTarget
    var firstTarget = this.pbxNativeTargetSection()[firstTargetUuid];

    return {
        uuid: firstTargetUuid,
        firstTarget: firstTarget
    }
}

pbxProject.prototype.getTarget = function(productType) {
    // Find target by product type
    var targets = this.getFirstProject()['firstProject']['targets'];
    var nativeTargets = this.pbxNativeTargetSection();
    for (var i = 0; i < targets.length; i++) {
        var target = targets[i];
        var targetUuid = target.value;
        if (nativeTargets[targetUuid]['productType'] === '"' + productType + '"') {
            // Get pbxNativeTarget
            var nativeTarget = this.pbxNativeTargetSection()[targetUuid];
            return {
                uuid: targetUuid,
                target: nativeTarget
            };
        }
    }

    return null;
}

/*** NEW ***/

pbxProject.prototype.addToPbxGroupType = function (file, groupKey, groupType) {
    var group = this.getPBXGroupByKeyAndType(groupKey, groupType);
    if (group && group.children !== undefined) {
        if (typeof file === 'string') {
            //Group Key
            var childGroup = {
                value:file,
            };
            if (this.getPBXGroupByKey(file)) {
                childGroup.comment = this.getPBXGroupByKey(file).name;
            }
            else if (this.getPBXVariantGroupByKey(file)) {
                childGroup.comment = this.getPBXVariantGroupByKey(file).name;
            }

            group.children.push(childGroup);
        }
        else {
            //File Object
            group.children.push(pbxGroupChild(file));
        }
    }
}

pbxProject.prototype.addToPbxVariantGroup = function (file, groupKey) {
    this.addToPbxGroupType(file, groupKey, 'PBXVariantGroup');
}

pbxProject.prototype.addToPbxGroup = function (file, groupKey) {
    this.addToPbxGroupType(file, groupKey, 'PBXGroup');
}



pbxProject.prototype.pbxCreateGroupWithType = function(name, pathName, groupType) {
    //Create object
    var model = {
        isa: '"' + groupType + '"',
        children: [],
        name: name,
        sourceTree: '"<group>"'
    };
    if (pathName) model.path = pathName;
    var key = this.generateUuid();

    //Create comment
    var commendId = key + '_comment';

    //add obj and commentObj to groups;
    var groups = this.hash.project.objects[groupType];
    if (!groups) {
        groups = this.hash.project.objects[groupType] = new Object();
    }
    groups[commendId] = name;
    groups[key] = model;

    return key;
}

pbxProject.prototype.pbxCreateVariantGroup = function(name) {
    return this.pbxCreateGroupWithType(name, undefined, 'PBXVariantGroup')
}

pbxProject.prototype.pbxCreateGroup = function(name, pathName) {
    return this.pbxCreateGroupWithType(name, pathName, 'PBXGroup');
}



pbxProject.prototype.removeFromPbxGroupAndType = function (file, groupKey, groupType) {
    var group = this.getPBXGroupByKeyAndType(groupKey, groupType);
    if (group) {
        var groupChildren = group.children, i;
        for(i in groupChildren) {
            if(pbxGroupChild(file).value == groupChildren[i].value &&
                pbxGroupChild(file).comment == groupChildren[i].comment) {
                groupChildren.splice(i, 1);
                break;
            }
        }
    }
}

pbxProject.prototype.removeFromPbxGroup = function (file, groupKey) {
    this.removeFromPbxGroupAndType(file, groupKey, 'PBXGroup');
}

pbxProject.prototype.removeFromPbxVariantGroup = function (file, groupKey) {
    this.removeFromPbxGroupAndType(file, groupKey, 'PBXVariantGroup');
}



pbxProject.prototype.getPBXGroupByKeyAndType = function(key, groupType) {
    return this.hash.project.objects[groupType][key];
};

pbxProject.prototype.getPBXGroupByKey = function(key) {
    return this.hash.project.objects['PBXGroup'][key];
};

pbxProject.prototype.getPBXVariantGroupByKey = function(key) {
    return this.hash.project.objects['PBXVariantGroup'][key];
};



pbxProject.prototype.findPBXGroupKeyAndType = function(criteria, groupType) {
    var groups = this.hash.project.objects[groupType];
    var target;

    for (var key in groups) {
        // only look for comments
        if (COMMENT_KEY.test(key)) continue;

        var group = groups[key];
        if (criteria && criteria.path && criteria.name) {
            if (criteria.path === group.path && criteria.name === group.name) {
                target = key;
                break
            }
        }
        else if (criteria && criteria.path) {
            if (criteria.path === group.path) {
                target = key;
                break
            }
        }
        else if (criteria && criteria.name) {
            if (criteria.name === group.name) {
                target = key;
                break
            }
        }
    }

    return target;
}

pbxProject.prototype.findPBXGroupKey = function(criteria) {
    return this.findPBXGroupKeyAndType(criteria, 'PBXGroup');
}

pbxProject.prototype.findPBXVariantGroupKey = function(criteria) {
    return this.findPBXGroupKeyAndType(criteria, 'PBXVariantGroup');
}

pbxProject.prototype.addLocalizationVariantGroup = function(name) {
    var groupKey = this.pbxCreateVariantGroup(name);

    var resourceGroupKey = this.findPBXGroupKey({name: 'Resources'});
    this.addToPbxGroup(groupKey, resourceGroupKey);

    var localizationVariantGroup = {
        uuid: this.generateUuid(),
        fileRef: groupKey,
        basename: name
    }
    this.addToPbxBuildFileSection(localizationVariantGroup);        // PBXBuildFile
    this.addToPbxResourcesBuildPhase(localizationVariantGroup);     //PBXResourcesBuildPhase

    return localizationVariantGroup;
};

pbxProject.prototype.addKnownRegion = function (name) {
  if (!this.pbxProjectSection()[this.getFirstProject()['uuid']]['knownRegions']) {
    this.pbxProjectSection()[this.getFirstProject()['uuid']]['knownRegions'] = [];
  }
  if (!this.hasKnownRegion(name)) {
    this.pbxProjectSection()[this.getFirstProject()['uuid']]['knownRegions'].push(name);
  }
}

pbxProject.prototype.removeKnownRegion = function (name) {
  var regions = this.pbxProjectSection()[this.getFirstProject()['uuid']]['knownRegions'];
  if (regions) {
    for (var i = 0; i < regions.length; i++) {
      if (regions[i] === name) {
        regions.splice(i, 1);
        break;
      }
    }
    this.pbxProjectSection()[this.getFirstProject()['uuid']]['knownRegions'] = regions;
  }
}

pbxProject.prototype.hasKnownRegion = function (name) {
  var regions = this.pbxProjectSection()[this.getFirstProject()['uuid']]['knownRegions'];
  if (regions) {
    for (var i in regions) {
      if (regions[i] === name) {
        return true;
      }
    }
  }
  return false;
}

pbxProject.prototype.getPBXObject = function(name) {
    return this.hash.project.objects[name];
}

/**
 * Adds a file to the Xcode project to be tracked by Xcode
 * 
 * @param {string} path The on-disk path to a file to be tracked by Xcode, potentially relative to the default location files of its type are stored depending on file extension
 * @param {import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>} group An Xcode-internal identifier of a file group to add the header file to
 * @param {import('./pbxFile').PBXFileOptions} [opt={}] Optional settings to configure the file
 * @type {((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXFrameworkFileOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile & import('./pbxFile').pbxFrameworkFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxCustomCompiledFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXCompiledFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXCompiledFileOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxCustomCompiledFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXExplicitFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile & import('./pbxFile').pbxFrameworkFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXFrameworkFileOptions & import('./pbxFile').PBXInferredFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXFrameworkFileOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile & import('./pbxFile').pbxFrameworkFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXExplicitFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxExplicitTypeFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: import('./pbxFile').PBXInferredFileTypeOptions) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>, opt: {}) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile) | null)) &
 *        ((path: string, group: import("./xcode-types/xcode").XcodeProjectObjectReference<import("./xcode-types/xcfiletreeobject").PBXGroup | import("./xcode-types/xcfiletreeobject").PBXVariantGroup>) => ((import('./pbxFile').pbxCoreFile & import('./pbxFile').pbxInferredTypeFile) | null))}
 */
pbxProject.prototype.addFile = function (path, group, opt = {}) {
    var file = new pbxFile(path, opt);

    // null is better for early errors
    if (this.hasFile(file.path)) return null;

    file.fileRef = this.generateUuid();

    this.addToPbxFileReferenceSection(file);    // PBXFileReference

    if (this.getPBXGroupByKey(group)) {
        this.addToPbxGroup(file, group);        // PBXGroup
    }
    else if (this.getPBXVariantGroupByKey(group)) {
        this.addToPbxVariantGroup(file, group);            // PBXVariantGroup
    }

    return file;
}

pbxProject.prototype.removeFile = function (path, group, opt) {
    var file = new pbxFile(path, opt);

    this.removeFromPbxFileReferenceSection(file);    // PBXFileReference

    if (this.getPBXGroupByKey(group)) {
        this.removeFromPbxGroup(file, group);            // PBXGroup
    }
    else if (this.getPBXVariantGroupByKey(group)) {
        this.removeFromPbxVariantGroup(file, group);     // PBXVariantGroup
    }

    return file;
}



pbxProject.prototype.getBuildProperty = function(prop, build, targetName) {
    var target;
    let validConfigs = [];

    if (targetName) {
        const target = this.pbxTargetByName(targetName);
        const targetBuildConfigs = target && target.buildConfigurationList;

        const xcConfigList = this.pbxXCConfigurationList();

        // Collect the UUID's from the configuration of our target
        for (const configName in xcConfigList) {
            if (!COMMENT_KEY.test(configName) && targetBuildConfigs === configName) {
                const buildVariants = xcConfigList[configName].buildConfigurations;

                for (const item of buildVariants) {
                    validConfigs.push(item.value);
                }

                break;
            }
        }
    }
    
    var configs = this.pbxXCBuildConfigurationSection();
    for (var configName in configs) {
        if (!COMMENT_KEY.test(configName)) {
            if (targetName && !validConfigs.includes(configName)) continue;
            var config = configs[configName];
            if ( (build && config.name === build) || (build === undefined) ) {
                if (config.buildSettings[prop] !== undefined) {
                    target = config.buildSettings[prop];
                }
            }
        }
    }
    return target;
}

pbxProject.prototype.getBuildConfigByName = function(name) {
    var target = {};
    var configs = this.pbxXCBuildConfigurationSection();
    for (var configName in configs) {
        if (!COMMENT_KEY.test(configName)) {
            var config = configs[configName];
            if (config.name === name)  {
                target[configName] = config;
            }
        }
    }
    return target;
}

pbxProject.prototype.addDataModelDocument = function(filePath, group, opt) {
    if (!group) {
        group = 'Resources';
    }
    if (!this.getPBXGroupByKey(group)) {
        group = this.findPBXGroupKey({ name: group });
    }

    var file = new pbxFile(filePath, opt);

    if (!file || this.hasFile(file.path)) return null;

    file.fileRef = this.generateUuid();
    this.addToPbxGroup(file, group);

    if (!file) return false;

    file.target = opt ? opt.target : undefined;
    file.uuid = this.generateUuid();

    this.addToPbxBuildFileSection(file);
    this.addToPbxSourcesBuildPhase(file);

    file.models = [];
    var currentVersionName;
    var modelFiles = fs.readdirSync(file.path);
    for (var index in modelFiles) {
        var modelFileName = modelFiles[index];
        var modelFilePath = path.join(filePath, modelFileName);

        if (modelFileName == '.xccurrentversion') {
            currentVersionName = plist.readFileSync(modelFilePath)._XCCurrentVersionName;
            continue;
        }

        var modelFile = new pbxFile(modelFilePath);
        modelFile.fileRef = this.generateUuid();

        this.addToPbxFileReferenceSection(modelFile);

        file.models.push(modelFile);

        if (currentVersionName && currentVersionName === modelFileName) {
            file.currentModel = modelFile;
        }
    }

    if (!file.currentModel) {
        file.currentModel = file.models[0];
    }

    this.addToXcVersionGroupSection(file);

    return file;
}

pbxProject.prototype.addTargetAttribute = function(prop, value, target) {
    var attributes = this.getFirstProject()['firstProject']['attributes'];
    if (attributes['TargetAttributes'] === undefined) {
        attributes['TargetAttributes'] = {};
    }
    target = target || this.getFirstTarget();
    if (attributes['TargetAttributes'][target.uuid] === undefined) {
      attributes['TargetAttributes'][target.uuid] = {};
    }
    attributes['TargetAttributes'][target.uuid][prop] = value;
}

pbxProject.prototype.removeTargetAttribute = function(prop, target) {
    var attributes = this.getFirstProject()['firstProject']['attributes'];
    target = target || this.getFirstTarget();
    if (attributes['TargetAttributes'] &&
        attributes['TargetAttributes'][target.uuid]) {
        delete attributes['TargetAttributes'][target.uuid][prop];
    }
}

module.exports = pbxProject;
