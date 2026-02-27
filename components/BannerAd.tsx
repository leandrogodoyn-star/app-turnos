import React from 'react';
import { Platform, View } from 'react-native';

// Intentar cargar la librería de anuncios de forma segura para no romper Expo Go
let AdModule: any = null;
try {
    AdModule = require('react-native-google-mobile-ads');
} catch (e) {
    console.warn("react-native-google-mobile-ads no disponible en este entorno.");
}

const BannerAd = AdModule?.BannerAd;
const BannerAdSize = AdModule?.BannerAdSize;
const TestIds = AdModule?.TestIds;

const adUnitId = (__DEV__ && TestIds)
    ? TestIds.BANNER
    : Platform.select({
        ios: 'ca-app-pub-3940256099942544/2934735716',
        android: 'ca-app-pub-3940256099942544/6300978111',
    }) || (TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111');

interface BannerAdProps {
    isPremium: boolean;
}

const AdBanner: React.FC<BannerAdProps> = ({ isPremium }) => {
    // Si es premium, no hay módulo, o no hay BannerAd component, no renderizar nada
    if (isPremium || !BannerAd || !BannerAdSize) {
        return null;
    }

    return (
        <View style={{ alignItems: 'center', marginVertical: 10, minHeight: 50 }}>
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
