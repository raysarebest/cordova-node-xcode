export = pbxProject;
declare function pbxProject(filename: any): pbxProject;
declare class pbxProject {
    constructor(filename: any);
    filepath: string;
    parse(cb: any): pbxProject;
    parseSync(): pbxProject;
    hash: any;
    writeSync(options: any): string;
    writer: pbxWriter;
    allUuids(): any[];
    generateUuid(): any;
    addPluginFile(path: any, opt: any): pbxFile;
    removePluginFile(path: any, opt: any): pbxFile;
    addProductFile(targetPath: any, opt: any): pbxFile;
    removeProductFile(path: any, opt: any): pbxFile;
    /**
     *
     * @param path {String}
     * @param opt {Object} see pbxFile for avail options
     * @param group {String} group key
     * @returns {Object} file; see pbxFile
     */
    addSourceFile(path: string, opt: any, group: string): any;
    /**
     *
     * @param path {String}
     * @param opt {Object} see pbxFile for avail options
     * @param group {String} group key
     * @returns {Object} file; see pbxFile
     */
    removeSourceFile(path: string, opt: any, group: string): any;
    /**
     *
     * @param path {String}
     * @param opt {Object} see pbxFile for avail options
     * @param group {String} group key
     * @returns {Object} file; see pbxFile
     */
    addHeaderFile(path: string, opt: any, group: string): any;
    /**
     *
     * @param path {String}
     * @param opt {Object} see pbxFile for avail options
     * @param group {String} group key
     * @returns {Object} file; see pbxFile
     */
    removeHeaderFile(path: string, opt: any, group: string): any;
    /**
     *
     * @param path {String}
     * @param opt {Object} see pbxFile for avail options
     * @param group {String} group key
     * @returns {Object} file; see pbxFile
     */
    addResourceFile(path: string, opt: any, group: string): any;
    /**
     *
     * @param path {String}
     * @param opt {Object} see pbxFile for avail options
     * @param group {String} group key
     * @returns {Object} file; see pbxFile
     */
    removeResourceFile(path: string, opt: any, group: string): any;
    addFramework(fpath: any, opt: any): false | pbxFile;
    removeFramework(fpath: any, opt: any): pbxFile;
    addCopyfile(fpath: any, opt: any): pbxFile;
    pbxCopyfilesBuildPhaseObj(target: any): any;
    addToPbxCopyfilesBuildPhase(file: any): void;
    removeCopyfile(fpath: any, opt: any): pbxFile;
    removeFromPbxCopyfilesBuildPhase(file: any): void;
    addStaticLibrary(path: any, opt: any): false | pbxFile;
    addToPbxBuildFileSection(file: any): void;
    removeFromPbxBuildFileSection(file: any): void;
    addPbxGroup(filePathsArray: any, name: any, path: any, sourceTree: any): {
        uuid: any;
        pbxGroup: {
            isa: string;
            children: any[];
            name: any;
            path: any;
            sourceTree: any;
        };
    };
    removePbxGroup(groupName: any): void;
    addToPbxProjectSection(target: any): void;
    addToPbxNativeTargetSection(target: any): void;
    addToPbxFileReferenceSection(file: any): void;
    removeFromPbxFileReferenceSection(file: any): any;
    addToXcVersionGroupSection(file: any): void;
    addToPluginsPbxGroup(file: any): void;
    removeFromPluginsPbxGroup(file: any): any;
    addToResourcesPbxGroup(file: any): void;
    removeFromResourcesPbxGroup(file: any): any;
    addToFrameworksPbxGroup(file: any): void;
    removeFromFrameworksPbxGroup(file: any): any;
    addToPbxEmbedFrameworksBuildPhase(file: any): void;
    removeFromPbxEmbedFrameworksBuildPhase(file: any): void;
    addToProductsPbxGroup(file: any): void;
    removeFromProductsPbxGroup(file: any): any;
    addToPbxSourcesBuildPhase(file: any): void;
    removeFromPbxSourcesBuildPhase(file: any): void;
    addToPbxResourcesBuildPhase(file: any): void;
    removeFromPbxResourcesBuildPhase(file: any): void;
    addToPbxFrameworksBuildPhase(file: any): void;
    removeFromPbxFrameworksBuildPhase(file: any): void;
    addXCConfigurationList(configurationObjectsArray: any, defaultConfigurationName: any, comment: any): {
        uuid: any;
        xcConfigurationList: {
            isa: string;
            buildConfigurations: any[];
            defaultConfigurationIsVisible: number;
            defaultConfigurationName: any;
        };
    };
    addTargetDependency(target: any, dependencyTargets: any): {
        uuid: any;
        target: any;
    };
    addBuildPhase(filePathsArray: any, buildPhaseType: any, comment: any, target: any, optionsOrFolderType: any, subfolderPath: any): {
        uuid: any;
        buildPhase: {
            isa: any;
            buildActionMask: number;
            files: any[];
            runOnlyForDeploymentPostprocessing: number;
        };
    };
    pbxProjectSection(): any;
    pbxBuildFileSection(): any;
    pbxXCBuildConfigurationSection(): any;
    pbxFileReferenceSection(): any;
    pbxNativeTargetSection(): any;
    xcVersionGroupSection(): any;
    pbxXCConfigurationList(): any;
    pbxGroupByName(name: any): any;
    pbxTargetByName(name: any): any;
    findTargetKey(name: any): string;
    pbxItemByComment(name: any, pbxSectionName: any): any;
    pbxSourcesBuildPhaseObj(target: any): any;
    pbxResourcesBuildPhaseObj(target: any): any;
    pbxFrameworksBuildPhaseObj(target: any): any;
    pbxEmbedFrameworksBuildPhaseObj(target: any): any;
    buildPhase(group: any, target: any): string;
    buildPhaseObject(name: any, group: any, target: any): any;
    addBuildProperty(prop: any, value: any, build_name: any): void;
    removeBuildProperty(prop: any, build_name: any): void;
    /**
     *
     * @param prop {String}
     * @param value {String|Array|Object|Number|Boolean}
     * @param build {String} Release or Debug
     * @param targetName {String} the target which will be updated
     */
    updateBuildProperty(prop: string, value: string | any[] | any | number | boolean, build: string, targetName: string): void;
    updateProductName(name: any): void;
    removeFromFrameworkSearchPaths(file: any): void;
    addToFrameworkSearchPaths(file: any): void;
    removeFromLibrarySearchPaths(file: any): void;
    addToLibrarySearchPaths(file: any): void;
    removeFromHeaderSearchPaths(file: any): void;
    addToHeaderSearchPaths(file: any): void;
    addToOtherLinkerFlags(flag: any): void;
    removeFromOtherLinkerFlags(flag: any): void;
    addToBuildSettings(buildSetting: any, value: any): void;
    removeFromBuildSettings(buildSetting: any): void;
    hasFile(filePath: any): any;
    addTarget(name: any, type: any, subfolder: any, bundleId: any): {
        uuid: any;
        pbxNativeTarget: {
            isa: string;
            name: string;
            productName: string;
            productReference: any;
            productType: string;
            buildConfigurationList: any;
            buildPhases: any[];
            buildRules: any[];
            dependencies: any[];
        };
    };
    getFirstProject(): {
        uuid: string;
        firstProject: any;
    };
    getFirstTarget(): {
        uuid: any;
        firstTarget: any;
    };
    getTarget(productType: any): {
        uuid: any;
        target: any;
    };
    /*** NEW ***/
    addToPbxGroupType(file: any, groupKey: any, groupType: any): void;
    addToPbxVariantGroup(file: any, groupKey: any): void;
    addToPbxGroup(file: any, groupKey: any): void;
    pbxCreateGroupWithType(name: any, pathName: any, groupType: any): any;
    pbxCreateVariantGroup(name: any): any;
    pbxCreateGroup(name: any, pathName: any): any;
    removeFromPbxGroupAndType(file: any, groupKey: any, groupType: any): void;
    removeFromPbxGroup(file: any, groupKey: any): void;
    removeFromPbxVariantGroup(file: any, groupKey: any): void;
    getPBXGroupByKeyAndType(key: any, groupType: any): any;
    getPBXGroupByKey(key: any): any;
    getPBXVariantGroupByKey(key: any): any;
    findPBXGroupKeyAndType(criteria: any, groupType: any): string;
    findPBXGroupKey(criteria: any): string;
    findPBXVariantGroupKey(criteria: any): string;
    addLocalizationVariantGroup(name: any): {
        uuid: any;
        fileRef: any;
        basename: any;
    };
    addKnownRegion(name: any): void;
    removeKnownRegion(name: any): void;
    hasKnownRegion(name: any): boolean;
    getPBXObject(name: any): any;
    addFile(path: any, group: any, opt: any): pbxFile;
    removeFile(path: any, group: any, opt: any): pbxFile;
    getBuildProperty(prop: any, build: any, targetName: any): any;
    getBuildConfigByName(name: any): {};
    addDataModelDocument(filePath: any, group: any, opt: any): false | pbxFile;
    addTargetAttribute(prop: any, value: any, target: any): void;
    removeTargetAttribute(prop: any, target: any): void;
}
import pbxWriter = require("./pbxWriter");
import pbxFile = require("./pbxFile");
//# sourceMappingURL=pbxProject.d.ts.map