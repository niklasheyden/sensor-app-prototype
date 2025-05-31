/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


#import <Foundation/Foundation.h>

#import "RCTThirdPartyComponentsProvider.h"
#import <React/RCTComponentViewProtocol.h>

@implementation RCTThirdPartyComponentsProvider

+ (NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *)thirdPartyFabricComponents
{
  static NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *thirdPartyComponents = nil;
  static dispatch_once_t nativeComponentsToken;

  dispatch_once(&nativeComponentsToken, ^{
    thirdPartyComponents = @{
			@"RNMapsGoogleMapView": NSClassFromString(@"RNMapsGoogleMapView"), // react-native-maps
			@"RNMapsGooglePolygon": NSClassFromString(@"RNMapsGooglePolygonView"), // react-native-maps
			@"RNMapsGoogleMapView": NSClassFromString(@"RNMapsGoogleMapView"), // react-native-maps
			@"RNMapsGooglePolygon": NSClassFromString(@"RNMapsGooglePolygonView"), // react-native-maps
			@"RNMapsMapView": NSClassFromString(@"RNMapsMapView"), // react-native-maps
			@"RNMapsMarker": NSClassFromString(@"RNMapsMarkerView"), // react-native-maps
			@"RNCSafeAreaProvider": NSClassFromString(@"RNCSafeAreaProviderComponentView"), // react-native-safe-area-context
			@"RNCSafeAreaView": NSClassFromString(@"RNCSafeAreaViewComponentView"), // react-native-safe-area-context
			@"RNSFullWindowOverlay": NSClassFromString(@"RNSFullWindowOverlay"), // react-native-screens
			@"RNSModalScreen": NSClassFromString(@"RNSModalScreen"), // react-native-screens
			@"RNSScreenContainer": NSClassFromString(@"RNSScreenContainerView"), // react-native-screens
			@"RNSScreen": NSClassFromString(@"RNSScreenView"), // react-native-screens
			@"RNSScreenNavigationContainer": NSClassFromString(@"RNSScreenNavigationContainerView"), // react-native-screens
			@"RNSScreenStackHeaderConfig": NSClassFromString(@"RNSScreenStackHeaderConfig"), // react-native-screens
			@"RNSScreenStackHeaderSubview": NSClassFromString(@"RNSScreenStackHeaderSubview"), // react-native-screens
			@"RNSScreenStack": NSClassFromString(@"RNSScreenStackView"), // react-native-screens
			@"RNSSearchBar": NSClassFromString(@"RNSSearchBar"), // react-native-screens
			@"RNSVGClipPath": NSClassFromString(@"RNSVGClipPath"), // react-native-svg
			@"RNSVGDefs": NSClassFromString(@"RNSVGDefs"), // react-native-svg
			@"RNSVGForeignObject": NSClassFromString(@"RNSVGForeignObject"), // react-native-svg
			@"RNSVGGroup": NSClassFromString(@"RNSVGGroup"), // react-native-svg
			@"RNSVGImage": NSClassFromString(@"RNSVGImage"), // react-native-svg
			@"RNSVGLinearGradient": NSClassFromString(@"RNSVGLinearGradient"), // react-native-svg
			@"RNSVGMarker": NSClassFromString(@"RNSVGMarker"), // react-native-svg
			@"RNSVGMask": NSClassFromString(@"RNSVGMask"), // react-native-svg
			@"RNSVGPath": NSClassFromString(@"RNSVGPath"), // react-native-svg
			@"RNSVGPattern": NSClassFromString(@"RNSVGPattern"), // react-native-svg
			@"RNSVGRadialGradient": NSClassFromString(@"RNSVGRadialGradient"), // react-native-svg
			@"RNSVGSvgView": NSClassFromString(@"RNSVGSvgView"), // react-native-svg
			@"RNSVGSymbol": NSClassFromString(@"RNSVGSymbol"), // react-native-svg
			@"RNSVGUse": NSClassFromString(@"RNSVGUse"), // react-native-svg
			@"RNSVGCircle": NSClassFromString(@"RNSVGCircle"), // react-native-svg
			@"RNSVGEllipse": NSClassFromString(@"RNSVGEllipse"), // react-native-svg
			@"RNSVGLine": NSClassFromString(@"RNSVGLine"), // react-native-svg
			@"RNSVGRect": NSClassFromString(@"RNSVGRect"), // react-native-svg
			@"RNSVGTSpan": NSClassFromString(@"RNSVGTSpan"), // react-native-svg
			@"RNSVGText": NSClassFromString(@"RNSVGText"), // react-native-svg
			@"RNSVGTextPath": NSClassFromString(@"RNSVGTextPath"), // react-native-svg
    };
  });

  return thirdPartyComponents;
}

@end
