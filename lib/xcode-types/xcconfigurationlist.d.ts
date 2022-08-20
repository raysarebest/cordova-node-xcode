import type { XcodeProjectObject, XcodeCommentedValue, XcodeProjectObjectReference } from "./xcode";
import type { XCBuildConfiguration } from "./xcbuildconfiguration";

/**
 * A group of distinct sets of settings used to describe how a target or project should be compiled
 */
export declare interface XCConfigurationList extends XcodeProjectObject {
    /**
     * The name of the type this object represents
     */
    readonly isa: "XCConfigurationList";
    /**
     * Indicates if the default configuration (used by things like the `xcodebuild` command line tool) specified by this list is shown in Xcode's user interface. Seemingly never used by Xcode
     */
    defaultConfigurationIsVisible: 0;
    /**
     * The name of the default configuration in this list. `Release` by default
     */
    defaultConfigurationName: string;
    /**
     * A list of references to the build configurations specified by this list object. Concrete data for each can be accessed through the project's `XCBuildConfiguration` object archive
     */
    buildConfigurations: XcodeCommentedValue<XcodeProjectObjectReference<XCBuildConfiguration>>[];
}