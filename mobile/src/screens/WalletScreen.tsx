import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { QrCode, LogOut, ArrowUpRight, Smartphone } from 'lucide-react-native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Wallet'>;
};

export function WalletScreen({ navigation }: Props) {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState<string>('Membro');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarSaldo();
  }, []);

  const carregarSaldo = async () => {
    try {
      setLoading(true);
      const res = await api.get('/checkout/saldo');
      setSaldo(res.data.saldo);
      if (res.data.cliente_nome) {
        setClienteNome(res.data.cliente_nome);
      }
    } catch {
      // Fallback para protótipo se rota estiver inacessível
      setSaldo(0.00);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('bipfy_token');
    await AsyncStorage.removeItem('barix_token');
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {clienteNome}!</Text>
        <TouchableOpacity onPress={logout}>
          <LogOut color="#ff4444" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Seu Saldo e-Sigma Ágape</Text>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" style={{ marginVertical: 20 }} />
        ) : (
          <Text style={styles.cardValue}>R$ {saldo?.toFixed(2) || '0.00'}</Text>
        )}
        
        <View style={styles.cardBtnRow}>
          <TouchableOpacity style={styles.pixBtn}>
            <ArrowUpRight color="#fff" size={18} />
            <Text style={styles.pixBtnText}>PIX</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.qrPassBtn}
            onPress={() => navigation.navigate('ClientQr')}
          >
            <Smartphone color="#fff" size={18} />
            <Text style={styles.qrPassBtnText}>Meu QR Code</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.scanBtn}
          onPress={() => navigation.navigate('Scanner')}
        >
          <QrCode color="#fff" size={40} />
          <Text style={styles.scanBtnText}>Acessar Comanda</Text>
        </TouchableOpacity>
        <Text style={styles.helper}>Aponte para o QR Code da Mesa ou Cartão para pedir ao bar</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, marginTop: 16 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  card: { backgroundColor: '#1a1a24', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#333' },
  cardLabel: { color: '#888', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 },
  cardValue: { color: '#fff', fontSize: 48, fontWeight: 'bold', marginVertical: 16 },
  cardBtnRow: { flexDirection: 'row', gap: 12 },
  pixBtn: { flex: 1, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pixBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  qrPassBtn: { flex: 1.2, backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  qrPassBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  actions: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanBtn: { backgroundColor: '#3b82f6', width: 200, height: 200, borderRadius: 100, justifyContent: 'center', alignItems: 'center', shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  scanBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  helper: { color: '#666', marginTop: 32, textAlign: 'center', fontSize: 14 }
});
