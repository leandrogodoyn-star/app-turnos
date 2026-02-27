import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../constants/colors";

interface PaywallProps {
    title: string;
    description: string;
}

export default function Paywall({ title, description }: PaywallProps) {
    const payWithPayPal = () => {
        const payPalLink = "https://www.paypal.com/paypalme/slotly";
        Linking.openURL(payPalLink);
    };

    const payWithMercadoPago = () => {
        const mpLink = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=15021025ff074ead820a946e80e59d92";
        Linking.openURL(mpLink);
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.icon}>⭐</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>

                <View style={styles.features}>
                    <Text style={styles.featureItem}>✓ Sin Anuncios (Ads)</Text>
                    <Text style={styles.featureItem}>✓ Múltiples Profesionales</Text>
                    <Text style={styles.featureItem}>✓ Turnos Ilimitados</Text>
                </View>

                <TouchableOpacity style={styles.button} onPress={payWithPayPal}>
                    <Text style={styles.buttonText}>Pagar con PayPal</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.altButton} onPress={payWithMercadoPago}>
                    <Text style={styles.altButtonText}>Pagar con Mercado Pago</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 30,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.accent,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
        width: "100%",
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 12,
    },
    description: {
        color: COLORS.textSecondary,
        fontSize: 15,
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 22,
    },
    features: {
        width: "100%",
        backgroundColor: COLORS.bg,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    featureItem: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    button: {
        backgroundColor: "#003087", // PayPal Blue
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        width: "100%",
        alignItems: "center",
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    altButton: {
        backgroundColor: "transparent",
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        width: "100%",
        alignItems: "center",
        marginTop: 12,
        borderWidth: 1.5,
        borderColor: COLORS.accent,
    },
    altButtonText: {
        color: COLORS.accentLight,
        fontSize: 15,
        fontWeight: "700",
    },
});
