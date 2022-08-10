import type { XcodeProjectObject, XcodeProjectObjectReference } from "./xcode";
import type { XCRemoteSwiftPackageReference } from "./xcremoteswiftpackagereference";

/**
 * A Swift package product dependency that strictly names the product that the dependency produces
 */
export declare interface XCBaseSwiftPackageProductDependency extends XcodeProjectObject {
    /**
     * The name of the type this object represents
     */
    readonly isa: "XCSwiftPackageProductDependency";
    /**
     * The name of the compiled module this package produces, which can be included by other targets in the Xcode project
     */
    productName: string;
}

/**
 * A Swift package product dependency that has a direct reference to the package's source repository's Xcode metadata object
 */
export declare interface XCReferencedSwiftPackageProductDependency extends XCBaseSwiftPackageProductDependency {
    /**
     * The identifier of the source repository of the Swift package in Xcode. Concrete data can be accessed through the project's `XCRemoteSwiftPackageReference` object archive
     */
    package: XcodeProjectObjectReference<XCRemoteSwiftPackageReference>;
    /**
     * Information describing the Swift package's source repository, ignored by Xcode when parsing
     */
    package_comment?: string;
}

/**
 * A description of how a remote (not local) package included by the Swift Package Manager should be compiled into a product for use in an Xcode project
 */
export declare type XCSwiftPackageProductDependency = XCBaseSwiftPackageProductDependency | XCReferencedSwiftPackageProductDependency;