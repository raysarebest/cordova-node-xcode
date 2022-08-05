import type { XcodeProjectObject, XcodeProjectObjectReference, XcodePlatformFilter } from "./xcode";
import type { XCSwiftPackageProductDependency } from "./xcswiftpackageproductdependency";

/**
 * Describes the core information of a target that another target depends on to be built, such as a framework, Swift package, or executable tested by a test target, whether or not that target exists in the same project as the target that depends upon it. You probably want to use a subtype of this, like {@link PBXInternalTargetDependency} or {@link PBXExternalSwiftPackageTargetDependency}
 */
export interface PBXBaseTargetDependency extends XcodeProjectObject {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXBaseTargetDependency";
    /**
     * Present in the context of targets that can be compiled for Mac Catalyst, defines which platforms the target can be built for. If the target supports Mac Catalyst but this property is missing, the target can be built for all platforms
     */
    platformFilter?: XcodePlatformFilter;
    /**
     * The name of the target being depended upon
     */
    name?: string;
}

/**
 * Describes a target dependency that's included and used locally in the project, as opposed to a dependency integrated by the Swift Package Manager in a multi-project configuration
 */
export interface PBXInternalTargetDependency extends PBXBaseTargetDependency {
    /**
     * A reference to the target that's depended upon. Concrete data can be accessed through one of the project's `PBXTarget`-based object archives, such as those for `PBXNativeTarget`, `PBXLegacyTarget`, or `PBXAggregateTarget`
     */
    target: XcodeProjectObjectReference<PBXTarget>;
    /**
     * Information describing the target that's depended upon, ignored by Xcode when parsing
     */
    target_comment?: string;
    /**
     * A reference to the object that contains the target being depended upon. This is a proxy object that would need to be followed to get the container. Concrete data can be accessed through the project's `PBXContainerItemProxy` object archive
     */
    targetProxy: XcodeProjectObjectReference<PBXContainerItemProxy>;
    /**
     * Information describing the target that's depended upon's parent's proxy, ignored by Xcode when parsing
     */
    targetProxy_comment?: string;
}

/**
 * Describes a target dependency that's managed by the Swift Package Manager in some cases where a project has at least one or more sub- or sibling-projects
 */
export interface PBXExternalSwiftPackageTargetDependency extends PBXBaseTargetDependency {
    /**
     * A reference to the Swift package product that's being depended upon. Concrete data can be accessed through the project's `XCSwiftPackageProductDependency` object archive
     */
    productRef: XcodeProjectObjectReference<XCSwiftPackageProductDependency>;
}

/**
 * Describes a target that another target depends on to be built, such as a framework, Swift package, or executable tested by a test target, whether or not that target exists in the same project as the target that depends upon it
 */
export type PBXTargetDependency = PBXInternalTargetDependency | PBXExternalSwiftPackageTargetDependency;