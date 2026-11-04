import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../services/api';
import { ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react-native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ClientQr'>;
};

interface IdentificadorData {
  identificador_qr?: string;
  token_identificacao?: string;
  cliente_id: number;
  nome: string;
  cpf_mascarado?: string;
  cpf?: string;
  modo?: string;
  instrucoes?: string;
}

export function ClientQrScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IdentificadorData | null>(null);

  useEffect(() => {
    carregarIdentificador();
  }, []);

  const carregarIdentificador = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cartoes/meu-identificador-digital');
      setData(res.data);
    } catch {
      // Fallback para demonstração se não autenticado
      setData({
        identificador_qr: 'BIPFY:CLIENTE:DEMO',
        token_identificacao: 'BIPFY:CLIENTE:DEMO',
        cliente_id: 1,
        nome: 'Cliente e-Sigma Ágape',
        cpf: '000.000.000-00',
        modo: 'CLIENT_SIDE_DYNAMIC_QR',
        instrucoes: 'Apresente este QR Code para leitura no balcão ou na geladeira'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Cartão Digital</Text>
        <TouchableOpacity onPress={carregarIdentificador} style={styles.backBtn}>
          <RefreshCw color="#3b82f6" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardBrand}>BIPFY PASS</Text>
              <Text style={styles.cardSub}>Identificador Pessoal Seguro</Text>
            </View>
            <ShieldCheck color="#10b981" size={28} />
          </View>

          <View style={styles.qrContainer}>
            {loading ? (
              <ActivityIndicator color="#3b82f6" size="large" />
            ) : (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={data?.identificador_qr || data?.token_identificacao || 'BIPFY:CLIENTE'}
                  size={200}
                  color="#000000"
                  backgroundColor="#ffffff"
                />
              </View>
            )}
          </View>

          <View style={styles.clientDetails}>
            <Text style={styles.clientName}>{data?.nome || 'Carregando...'}</Text>
            <Text style={styles.clientCpf}>CPF: {data?.cpf_mascarado || data?.cpf || '---'}</Text>
          </View>

          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>VÁLIDO EM TODAS AS UNIDADES BIPFY</Text>
          </View>
        </View>

        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>Como utilizar?</Text>
          <Text style={styles.instructionsText}>
            • <Text style={styles.bold}>No Balcão:</Text> Mostre esta tela ao operador para identificar sua comanda e lançar produtos sem pagar na hora.{'\n'}
            • <Text style={styles.bold}>Na Geladeira Inteligente:</Text> Aponte o QR Code para a câmera de leitura antes de abrir a porta.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 20 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24, 
    marginTop: 8 
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardContainer: {
    backgroundColor: '#161622',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#26263a',
    paddingBottom: 12,
  },
  cardBrand: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  cardSub: { color: '#888', fontSize: 11, marginTop: 2 },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrWrapper: { padding: 4 },
  clientDetails: { alignItems: 'center', marginTop: 12, marginBottom: 8 },
  clientName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  clientCpf: { color: '#9ca3af', fontSize: 13, marginTop: 2, letterSpacing: 1 },
  tagBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagText: { color: '#38bdf8', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  instructionsBox: {
    marginTop: 24,
    backgroundColor: '#12121c',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#20202e',
  },
  instructionsTitle: { color: '#e2e8f0', fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  instructionsText: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  bold: { color: '#f1f5f9', fontWeight: 'bold' }
});