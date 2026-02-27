import React from 'react';
import { Platform, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: 'ca-app-pub-3940256099942544/2934735716', // ID de prueba de Google
        android: 'ca-app-pub-3940256099942544/6300978111', // ID de prueba de Google
    }) || TestIds.BANNER;

interface BannerAdProps {
    isPremium: boolean;
}

const AdBanner: React.FC<BannerAdProps> = ({ isPremium }) => {
    if (isPremium) {
        return null;
    }

    return (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
            />
        </View>
    );
};

export default AdBanner;
