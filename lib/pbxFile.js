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

// @ts-check

var path = require('path'),
    util = require('util');

/** @type {import("./xcode-types/xcfiletreeobject").XcodeSourceTreeBase} */
var DEFAULT_SOURCETREE = '"<group>"',
/** @type {import("./xcode-types/xcfiletreeobject").XcodeSourceTreeBase} */
    DEFAULT_PRODUCT_SOURCETREE = 'BUILT_PRODUCTS_DIR',
    DEFAULT_FILEENCODING = 4,
    DEFAULT_GROUP = 'Resources',
/** @type {import("./xcode-types/xcfiletreeobject").XcodeFileType} */
    DEFAULT_FILETYPE = 'unknown';

/** @type {Object.<string, import("./xcode-types/xcfiletreeobject").XcodeFileType>} */
var FILETYPE_BY_EXTENSION = /** @type {const} */ ({
        a: 'archive.ar',
        app: 'wrapper.application',
        appex: 'wrapper.app-extension',
        bundle: 'wrapper.plug-in',
        dylib: 'compiled.mach-o.dylib',
        framework: 'wrapper.framework',
        h: 'sourcecode.c.h',
        m: 'sourcecode.c.objc',
        markdown: 'text',
        mdimporter: 'wrapper.cfbundle',
        octest: 'wrapper.cfbundle',
        pch: 'sourcecode.c.h',
        plist: 'text.plist.xml',
        sh: 'text.script.sh',
        swift: 'sourcecode.swift',
        tbd: 'sourcecode.text-based-dylib-definition',
        xcassets: 'folder.assetcatalog',
        xcconfig: 'text.xcconfig',
        xcdatamodel: 'wrapper.xcdatamodel',
        xcodeproj: 'wrapper.pb-project',
        xctest: 'wrapper.cfbundle',
        xib: 'file.xib',
        strings: 'text.plist.strings'
    }),
    GROUP_BY_FILETYPE = {
        'archive.ar': 'Frameworks',
        'compiled.mach-o.dylib': 'Frameworks',
        'sourcecode.text-based-dylib-definition': 'Frameworks',
        'wrapper.framework': 'Frameworks',
        'embedded.framework': 'Embed Frameworks',
        'sourcecode.c.h': 'Resources',
        'sourcecode.c.objc': 'Sources',
        'sourcecode.swift': 'Sources'
    },
    PATH_BY_FILETYPE = {
        'compiled.mach-o.dylib': 'usr/lib/',
        'sourcecode.text-based-dylib-definition': 'usr/lib/',
        'wrapper.framework': 'System/Library/Frameworks/'
    },
    SOURCETREE_BY_FILETYPE = {
        'compiled.mach-o.dylib': 'SDKROOT',
        'sourcecode.text-based-dylib-definition': 'SDKROOT',
        'wrapper.framework': 'SDKROOT'
    },
    ENCODING_BY_FILETYPE = {
        'sourcecode.c.h': 4,
        'sourcecode.c.objc': 4,
        'sourcecode.swift': 4,
        'text': 4,
        'text.plist.xml': 4,
        'text.script.sh': 4,
        'text.xcconfig': 4,
        'text.plist.strings': 4
    };

/**
 * Removes all quotation marks (`"`) from a string
 * 
 * @param {string | null} text Some text that may contain quotation marks (`"`)
 * @returns {string} The `text`, without quotation marks (`"`), or an empty string if `text` was `null`
 */
function unquoted(text){
    return text == null ? '' : text.replace (/(^")|("$)/g, '')
}

/**
 * Determines the likely purpose/type of contents of a file based on a path to that file
 * 
 * @param {string} filePath A path to the file that needs its content type determined
 * @returns {import("./xcode-types/xcfiletreeobject").XcodeFileType} An Xcode-internal identifier for the type of contents of the file
 */
function detectType(filePath) {
    var extension = path.extname(filePath).substring(1),
        filetype = FILETYPE_BY_EXTENSION[unquoted(extension)];

    if (!filetype) {
        return DEFAULT_FILETYPE;
    }

    return filetype;
}

// The following is a great example of why the best solution would be to convert to TypeScript rather than rely on JSDoc
// This could return a union of specific strings if FILETYPE_BY_EXTENSION could be delcared as `as const`
// Instead, we need to be ok with having this return a simple string alone

/**
 * Finds the most likely file extension to go with a particular file reference
 * 
 * @param {pbxFile | import("./xcode-types/xcfiletreeobject").PBXFileReference} fileRef The file reference that needs an extension
 * @returns {keyof typeof FILETYPE_BY_EXTENSION | undefined} The file extension (without the leading dot (`.`)) that was found to match the file reference's type
 */
function defaultExtension(fileRef) {
    /** @type {import('./xcode-types/xcfiletreeobject').XcodeFileType | undefined} */
    let filetype;

    if ("lastKnownFileType" in fileRef && fileRef.lastKnownFileType != DEFAULT_FILETYPE) {
        filetype = fileRef.lastKnownFileType;
    }
    else if ("explicitFileType" in fileRef) {
        filetype = fileRef.explicitFileType;
    }

    for(var extension in FILETYPE_BY_EXTENSION) {
        if(FILETYPE_BY_EXTENSION.hasOwnProperty(unquoted(extension)) ) {
             if(FILETYPE_BY_EXTENSION[unquoted(extension)] === unquoted(filetype) )
                 return extension;
        }
    }
}

/**
 * Finds the most likely appropriate text encoding for a particular file reference based on its type
 * 
 * @param {pbxFile | import("./xcode-types/xcfiletreeobject").PBXFileReference} fileRef The file reference that needs an encoding
 * @returns {import("./xcode-types/xcfiletreeobject").XcodeFileEncoding | undefined} The most likely appropriate encoding for the file reference, or `undefined` if one cannot be found
 */
function defaultEncoding(fileRef) {
    var filetype = "lastKnownFileType" in fileRef ? fileRef.lastKnownFileType : fileRef.explicitFileType,
        encoding = ENCODING_BY_FILETYPE[unquoted(filetype)];

    if (encoding) {
        return encoding;
    }
}

/**
 * Core settings available (but not required) to configure a {@link pbxFile}
 * 
 * @typedef {Object} PBXBaseFileOptions
 * @property {import("./xcode-types/xcfiletreeobject").XcodeFileEncoding} [defaultEncoding] The encoding that Xcode should use for the file
 * @property {import("./xcode-types/xcfiletreeobject").XcodeSourceTreeBase} [sourceTree] An Xcode-internal identifier that represents how the base path to the file should be generated
 * @property {string} [compilerFlags] A space-separated list of options to pass to the compiler when building this file
 */

/**
 * A configuration option available (but not required) for a {@link pbxFile} that guide's Xcode's file type inferrence
 * 
 * @typedef {Object} PBXInferredFileTypeOptions
 * @property {import("./xcode-types/xcfiletreeobject").XcodeFileType} [lastKnownFileType] The Xcode-internal content type for Xcode to use as a default if the user doesn't otherwise explicitly set it
 */

/**
 * A configuration option available (but not required) for a {@link pbxFile} that explicitly sets the Xcode-internal content type for a file
 * 
 * @typedef {Object} PBXExplicitFileTypeOptions
 * @property {import("./xcode-types/xcfiletreeobject").XcodeFileType} explicitFileType An Xcode-internal content type explicitly given to a file, regardless of Xcode's inferrence
 */

/**
 * Configuration options available (but not required) for a {@link pbxFile} that inform Xcode how to interpret the contents of a file
 * 
 * @typedef {PBXInferredFileTypeOptions | PBXExplicitFileTypeOptions} PBXFileTypeOptions
 */

/**
 * Configuration options available (but not required) for a {@link pbxFile} that define how a custom or third-party framework should be included in a target
 * 
 * @typedef {Object} PBXFrameworkFileOptions
 * @property {true} customFramework Indicates whether or not the file being referenced is a custom or third-party framework
 * @property {boolean} [embed] Indicates whether or not the framework being referenced should be embedded into the compiled bundle(s) of the target(s) that use it
 * @property {boolean} [weak] Indicates if the framework should be linked to its target optionally, so that the whole executable won't crash if the framework can't be loaded
 * @property {boolean} [sign] Indicates if the framework should be codesigned when it's copied into the target's compiled bundle
 */

/**
 * Configuration options available (but not required) for a {@link pbxFile}
 * 
 * @typedef {PBXBaseFileOptions | (PBXBaseFileOptions & PBXFileTypeOptions) | (PBXBaseFileOptions & PBXFrameworkFileOptions) | (PBXBaseFileOptions & PBXFileTypeOptions & PBXFrameworkFileOptions) | PBXFileTypeOptions | (PBXFileTypeOptions & PBXFrameworkFileOptions) | PBXFrameworkFileOptions} PBXFileOptions
 */

/**
 * Finds the most likely appropriate group that the file is likely to belong in, based on its file type and the options you specify
 * 
 * @param {pbxFile} fileRef 
 * @param {PBXFileOptions} opt 
 * @returns {string} The most likely appropriate group to place the file in based on its file type
 */
function detectGroup(fileRef, opt) {
    var extension = path.extname(fileRef.basename).substring(1),
        filetype = "lastKnownFileType" in fileRef ? fileRef.lastKnownFileType : fileRef.explicitFileType,
        groupName = GROUP_BY_FILETYPE[unquoted(filetype)];

    if (extension === 'xcdatamodeld') {
        return 'Sources';
    }

    if ("customFramework" in opt && opt.customFramework && opt.embed) {
        return GROUP_BY_FILETYPE['embedded.framework'];
    }

    if (!groupName) {
        return DEFAULT_GROUP;
    }

    return groupName;
}

/**
 * Finds the most likely appropriate Xcode-internal base path identifier to the file based on the its file type
 * 
 * @param {pbxFile} fileRef 
 * @returns {import("./xcode-types/xcfiletreeobject").XcodeSourceTreeBase} The most likely appropriate Xcode-internal base path identifier to the file based on the its file type
 */
function detectSourcetree(fileRef) {

    var filetype = "lastKnownFileType" in fileRef ? fileRef.lastKnownFileType : fileRef.explicitFileType,
        sourcetree = SOURCETREE_BY_FILETYPE[unquoted(filetype)];

    if ("explicitFileType" in fileRef && fileRef.explicitFileType) {
        return DEFAULT_PRODUCT_SOURCETREE;
    }

    if ("customFramework" in fileRef && fileRef.customFramework) {
        return DEFAULT_SOURCETREE;
    }

    if (!sourcetree) {
        return DEFAULT_SOURCETREE;
    }

    return sourcetree;
}

/**
 * Finds the most likely path to the file based on the file's type and the explicit sub-path
 * 
 * @param {pbxFile} fileRef The file to choose an on-disk location for
 * @param {string} filePath The path to add to the generated default base path
 * @returns {string} The most likely full path to the file
 */
function defaultPath(fileRef, filePath) {
    var filetype = "lastKnownFileType" in fileRef ? fileRef.lastKnownFileType : fileRef.explicitFileType,
        defaultPath = PATH_BY_FILETYPE[unquoted(filetype)];

    if ("customFramework" in fileRef && fileRef.customFramework) {
        return filePath;
    }

    if (defaultPath) {
        return path.join(defaultPath, path.basename(filePath));
    }

    return filePath;
}

/**
 * Finds the most likely group that a file would belong to in Xcode's file tree based on its file type
 * 
 * @param {pbxInferredTypeFile | import("./xcode-types/xcfiletreeobject").PBXInferredFileReference} fileRef 
 * @returns {string} The most likely group in Xcode's file tree for the `fileRef`
 */
function defaultGroup(fileRef) {
    return GROUP_BY_FILETYPE[fileRef.lastKnownFileType] ?? DEFAULT_GROUP;
}

/**
 * Core information about a file tracked by Xcode and modifiable by this library
 * 
 * @typedef {Object} pbxCoreFile
 * @property {string} basename The last portion of the path to the file. Likely either the file name or the name of the directory that contains it
 * @property {import("./xcode-types/xcfiletreeobject").XcodeFileEncoding} fileEncoding An identifier for the text encoding that the file should use. See {@link XcodeFileEncoding} for all options
 * @property {import("./xcode-types/xcfiletreeobject").XcodeSourceTreeBase} sourceTree An identifier that represents how Xcode should interpret the base path to this file. See {@link XcodeSourceTreeBase} for all options
 * @property {0 | 1} includeInIndex Indicates if the file should be indexed by Xcode's code completion system. `0` means it shouldn't, `1` means it should. Defaults to `0`
 */

/**
 * A file tracked by Xcode and modifiable by this library that represents a file that has had its content type explicitly set by this library
 * 
 * @typedef {Object} pbxExplicitTypeFile
 * @property {import("./xcode-types/xcfiletreeobject").XcodeFileType} explicitFileType An Xcode-internal content type explicitly given to the file, bypassing Xcode's inferrence
 */

/**
 * A file tracked by Xcode and modifiable by this library that represents a file that will have its content type inferred by Xcode
 * 
 * @typedef {Object} pbxInferredTypeFile
 * @property {string} path The UNIX path to the file on-disk, relative to the default location files of its type are stored
 * @property {import("./xcode-types/xcfiletreeobject").XcodeFileType} lastKnownFileType An Xcode-internal identifier of the inferred type of the contents of the file. Can be set either explicitly via `opt.lastKnownFileType` or detected automatically
 * @property {ReturnType<typeof detectGroup>} group The name of the group the file is most likely to appropriately belong in
 */

/**
 * The minimim guaranteed information to exist about a {@link pbxFile}
 * 
 * @typedef {pbxCoreFile & (pbxExplicitTypeFile | pbxInferredTypeFile)} pbxBaseFile
 */

/**
 * Core information about a file tracked by Xcode and modifiable by this library that represents a custom or 3rd-party framework meant for other targets to link against
 * 
 * @typedef {Object} pbxBaseFrameworkFile
 * @property {true} customFramework Indicates that tile file represents a custom or 3rd-party framework
 * @property {string} dirname The name of the parent directory that contains the file. If the directory name contains a backslash (`\`), like a Windows-style path, it'll be replaced with a forward slash (`/`), like a UNIX-style path
 */

/**
 * A file tracked by Xcode and modifiable by this library that represents a custom or 3rd-party framework meant for other targets to link against optionally and/or embed and codesign
 * 
 * @typedef {Object} pbxAttributedFrameworkFile
 * @property {{ATTRIBUTES: import("./xcode-types/pbxbuildfile").XcodeBuildFileSettingAttributes}} settings Information about how to link against the framework
 */

/**
 * A file tracked by Xcode and modifiable by this library that represents a custom or 3rd-party framework meant for other targets to link against
 * 
 * @typedef {pbxBaseFrameworkFile | (pbxBaseFrameworkFile & pbxAttributedFrameworkFile)} pbxFrameworkFile
 */

/**
 * A file tracked by Xcode and modifiable by this library that requires special settings to be compiled
 * 
 * @typedef {Object} pbxCustomCompiledFile
 * @property {{COMPILER_FLAGS: string | number}} settings
 */

/**
 * The constructor function for a file tracked by Xcode and modifiable by this library
 * 
 * @typedef {(new (filepath: string, opt: {}) => pbxCoreFile & pbxInferredTypeFile) |
 *        (new (filepath: string, opt: PBXInferredFileTypeOptions) => (pbxCoreFile & pbxInferredTypeFile)) |
 *        (new (filepath: string, opt: PBXExplicitFileTypeOptions) => (pbxCoreFile & pbxExplicitTypeFile)) |
 *        (new (filepath: string, opt: PBXFrameworkFileOptions) => (pbxCoreFile & pbxInferredTypeFile & pbxFrameworkFile)) |
 *        (new (filepath: string, opt: PBXFrameworkFileOptions & PBXInferredFileTypeOptions) => (pbxCoreFile & pbxInferredTypeFile & pbxFrameworkFile)) |
 *        (new (filepath: string, opt: PBXFrameworkFileOptions & PBXExplicitFileTypeOptions) => (pbxCoreFile & pbxExplicitTypeFile & pbxFrameworkFile)) |
 *        (new (filepath: string, opt: {compilerFlags: string}) => (pbxCoreFile & pbxInferredTypeFile & pbxCustomCompiledFile)) | 
 *        (new (filepath: string, opt: {compilerFlags: string} & PBXInferredFileTypeOptions) => (pbxCoreFile & pbxInferredTypeFile & pbxCustomCompiledFile)) |
 *        (new (filepath: string, opt: {compilerFlags: string} & PBXExplicitFileTypeOptions) => (pbxCoreFile & pbxExplicitTypeFile & pbxCustomCompiledFile)) | 
 *        (new (filepath: string, opt: {compilerFlags: string} & PBXFrameworkFileOptions) => (pbxCoreFile & pbxInferredTypeFile & pbxCustomCompiledFile & pbxFrameworkFile)) |
 *        (new (filepath: string, opt: {compilerFlags: string} & PBXFrameworkFileOptions & PBXInferredFileTypeOptions) => (pbxCoreFile & pbxInferredTypeFile & pbxCustomCompiledFile & pbxFrameworkFile)) |
 *        (new (filepath: string, opt: {compilerFlags: string} & PBXFrameworkFileOptions & PBXExplicitFileTypeOptions) => (pbxCoreFile & pbxExplicitTypeFile & pbxCustomCompiledFile & pbxFrameworkFile))} pbxFileConstructor
 */

/**
 * A file tracked by Xcode and modifiable by this library
 * 
 * @typedef {pbxBaseFile | (pbxBaseFile & pbxFrameworkFile) | (pbxBaseFile & pbxCustomCompiledFile) | (pbxBaseFile & pbxFrameworkFile & pbxCustomCompiledFile)} pbxFile
 */

/**
 * A file tracked by Xcode and modifiable by this library
 * 
 * @constructor
 * @type {pbxFileConstructor}
 * @param {string} filepath The path to a file tracked by Xcode on-disk, relative to the default location files of its type are stored
 * @param {PBXFileOptions} [opt={}] Options to configure the file
 */
const pbxFile = function (filepath, opt = {}) {

    this.basename = path.basename(filepath);
    this.lastKnownFileType = "lastKnownFileType" in opt && opt.lastKnownFileType ? opt.lastKnownFileType : detectType(filepath);
    this.group = detectGroup(this, opt);

    // for custom frameworks
    if ("customFramework" in opt && opt.customFramework == true) {
        /**
         * Indicates that the file is a custom or 3rd-party framework to be linked by another target. Can be set by setting `opt.customFramework` to `true`
         * 
         * @type {true | undefined}
         */
        this.customFramework = true;
        /**
         * The name of the parent directory that contains the file. If the directory name contains a backslash (`\`), like a Windows-style path, it'll be replaced with a forward slash (`/`), like a UNIX-style path
         * 
         * @type {string}
         */
        this.dirname = path.dirname(filepath).replace(/\\/g, '/');
    }

    this.path = defaultPath(this, filepath).replace(/\\/g, '/');
    this.fileEncoding = this.defaultEncoding = "defaultEncoding" in opt && opt.defaultEncoding ? opt.defaultEncoding : defaultEncoding(this);

    // When referencing products / build output files
    if ("explicitFileType" in opt && opt.explicitFileType) {
        this.explicitFileType = opt.explicitFileType;
        this.basename = this.basename + '.' + defaultExtension(this);
        delete this.path;
        delete this.lastKnownFileType;
        delete this.group;
        delete this.defaultEncoding;
    }

    this.sourceTree = "sourceTree" in opt && opt.sourceTree ? opt.sourceTree : detectSourcetree(this);
    /** @type {0 | 1} */
    this.includeInIndex = 0;

    if ("weak" in opt && opt.weak === true)
        this.settings = { ATTRIBUTES: ['Weak'] };

    if ("compilerFlags" in opt && opt.compilerFlags) {
        if (!this.settings)
            this.settings = {};
        this.settings.COMPILER_FLAGS = util.format('"%s"', opt.compilerFlags);
    }

    if ("embed" in opt && "sign" in opt && opt.embed && opt.sign) {
      if (!this.settings)
          this.settings = {};
      if (!this.settings.ATTRIBUTES)
          this.settings.ATTRIBUTES = [];
      this.settings.ATTRIBUTES.push('CodeSignOnCopy');
    }
}

module.exports = /** @type {pbxFileConstructor} */ (pbxFile);
