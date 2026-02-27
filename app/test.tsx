import { Text, View } from 'react-native';

export default function TestPage() {
    console.log("[TestPage] Rendered");
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6C63FF' }}>
            <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold' }}>¡Routing OK!</Text>
            <Text style={{ fontSize: 16, color: 'white', marginTop: 10 }}>Si ves esto, las rutas funcionan.</Text>
        </View>
    );
}
