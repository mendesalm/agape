import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../services/api';
import {
  QrCode,
  LogOut,
  User,
  Wallet,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
} from 'lucide-react-native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Wallet'>;
};

interface PerfilResumo {
  id?: number;
  nome?: string;
  cim?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
}

export function WalletScreen({ navigation }: Props) {
  const [saldo, setSaldo] = useState<number>(0);
  const [cliente, setCliente] = useState<PerfilResumo | null>(null);
  const [qrValor, setQrValor] = useState<string>('BIPFY:CLIENTE:DEMO');
  const [loading, setLoading] = useState(true);

  const [cartaoAberto, setCartaoAberto] = useState<'dados' | 'carteira' | null>(null);
  const [subAbaDados, setSubAbaDados] = useState<'cadastro' | 'dependentes' | 'identificacao'>('cadastro');
  const [subAbaCarteira, setSubAbaCarteira] = useState<'status' | 'saldo' | 'deposito' | 'pagamento'>('status');
  const [modalQrAberto, setModalQrAberto] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resSaldo, resId] = await Promise.all([
        api.get('/checkout/saldo').catch(() => null),
        api.get('/cartoes/meu-identificador-digital').catch(() => null),
      ]);
      if (resSaldo?.data) {
        setSaldo(Number(resSaldo.data.saldo || 0));
      }
      if (resId?.data) {
        setQrValor(resId.data.identificador_qr || resId.data.token_identificacao || 'BIPFY:CLIENTE:DEMO');
        setCliente({
          id: resId.data.cliente_id,
          nome: resId.data.nome || resSaldo?.data?.cliente_nome || 'Membro',
          cim: resId.data.cim || null,
          cpf: resId.data.cpf_mascarado || resId.data.cpf || null,
        });
      } else if (resSaldo?.data?.cliente_nome) {
        setCliente({ nome: resSaldo.data.cliente_nome });
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('bipfy_token');
    await AsyncStorage.removeItem('barix_token');
    navigation.replace('Login');
  };

  const toggleCartao = (tipo: 'dados' | 'carteira') => {
    setCartaoAberto((prev) => (prev === tipo ? null : tipo));
  };

  const identificadorTexto = cliente?.cim
    ? `CIM ${cliente.cim}`
    : cliente?.id
    ? `ID #${cliente.id}`
    : 'Credencial Digital';

  return (
    <SafeAreaView style={styles.container}>
      {/* CABEÇALHO COMPACTO */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(cliente?.nome || 'M').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting} numberOfLines={1}>
              {cliente?.nome || 'Membro Taverna'}
            </Text>
            <Text style={styles.subGreeting}>{identificadorTexto}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut color="#f87171" size={18} />
        </TouchableOpacity>
      </View>

      {/* CARTÃO 1: DADOS PESSOAIS */}
      <View style={[styles.accordionCard, cartaoAberto === 'dados' && styles.accordionCardOpen]}>
        <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCartao('dados')}>
          <View style={styles.accordionTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <User color="#4cd7f6" size={18} />
            </View>
            <View>
              <Text style={styles.accordionTitle}>Dados Pessoais</Text>
              <Text style={styles.accordionSub}>Cadastro • Dependentes • Identificação</Text>
            </View>
          </View>
          {cartaoAberto === 'dados' ? (
            <ChevronUp color="#10b981" size={18} />
          ) : (
            <ChevronDown color="#94a3b8" size={18} />
          )}
        </TouchableOpacity>

        {cartaoAberto === 'dados' && (
          <View style={styles.accordionBody}>
            <View style={styles.subTabsRow}>
              {(['cadastro', 'dependentes', 'identificacao'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setSubAbaDados(tab)}
                  style={[styles.subTab, subAbaDados === tab && styles.subTabActive]}
                >
                  <Text style={[styles.subTabText, subAbaDados === tab && styles.subTabTextActive]}>
                    {tab === 'cadastro' ? 'Cadastro' : tab === 'dependentes' ? 'Dependentes' : 'Identificação'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.subBodyScroll} showsVerticalScrollIndicator={false}>
              {subAbaDados === 'cadastro' && (
                <View style={styles.sectionStack}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>NOME COMPLETO</Text>
                    <Text style={styles.infoValue}>{cliente?.nome || 'Não informado'}</Text>
                  </View>
                  <View style={styles.rowTwoCols}>
                    <View style={[styles.infoBox, { flex: 1 }]}>
                      <Text style={styles.infoLabel}>CIM (OBREIRO)</Text>
                      <Text style={[styles.infoValue, { color: '#4edea3' }]}>
                        {cliente?.cim || 'Não informado'}
                      </Text>
                    </View>
                    <View style={[styles.infoBox, { flex: 1 }]}>
                      <Text style={styles.infoLabel}>CPF</Text>
                      <Text style={styles.infoValue}>{cliente?.cpf || 'Não informado'}</Text>
                    </View>
                  </View>
                  <Text style={styles.helperNote}>
                    Pelo menos um dos documentos (CIM ou CPF) é obrigatório.
                  </Text>
                </View>
              )}

              {subAbaDados === 'dependentes' && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>DEPENDENTES AUTORIZADOS</Text>
                  <Text style={styles.helperNote}>
                    Gerencie limites e autorizações de dependentes pelo Portal Web ou com o operador do bar.
                  </Text>
                </View>
              )}

              {subAbaDados === 'identificacao' && (
                <View style={styles.sectionStack}>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => setModalQrAberto(true)}
                  >
                    <QrCode color="#022c22" size={16} />
                    <Text style={styles.primaryBtnText}>Gerar / Expandir QR Pessoal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => navigation.navigate('ClientQr')}
                  >
                    <Text style={styles.secondaryBtnText}>Abrir Cartão Digital Completo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* CARTÃO 2: CARTEIRA */}
      <View style={[styles.accordionCard, cartaoAberto === 'carteira' && styles.accordionCardOpen]}>
        <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCartao('carteira')}>
          <View style={styles.accordionTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Wallet color="#10b981" size={18} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.accordionTitle}>Carteira</Text>
                <View style={styles.saldoPill}>
                  <Text style={styles.saldoPillText}>
                    {loading ? '...' : `R$ ${saldo.toFixed(2).replace('.', ',')} • Ativa`}
                  </Text>
                </View>
              </View>
              <Text style={styles.accordionSub}>Status • Saldo • Depósito • Pagamento</Text>
            </View>
          </View>
          {cartaoAberto === 'carteira' ? (
            <ChevronUp color="#10b981" size={18} />
          ) : (
            <ChevronDown color="#94a3b8" size={18} />
          )}
        </TouchableOpacity>

        {cartaoAberto === 'carteira' && (
          <View style={styles.accordionBody}>
            <View style={styles.subTabsRow}>
              {(['status', 'saldo', 'deposito', 'pagamento'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setSubAbaCarteira(tab)}
                  style={[styles.subTab, subAbaCarteira === tab && styles.subTabActive]}
                >
                  <Text style={[styles.subTabText, subAbaCarteira === tab && styles.subTabTextActive]}>
                    {tab === 'status'
                      ? 'Status'
                      : tab === 'saldo'
                      ? 'Saldo'
                      : tab === 'deposito'
                      ? 'Depósito'
                      : 'Pagamento'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.subBodyScroll} showsVerticalScrollIndicator={false}>
              {subAbaCarteira === 'status' && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>STATUS DA CONTA</Text>
                  <Text style={[styles.infoValue, { color: '#4edea3' }]}>Consumo Ativo</Text>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { marginTop: 10 }]}
                    onPress={() => navigation.navigate('Scanner')}
                  >
                    <Text style={styles.secondaryBtnText}>Escanear Comanda / Mesa</Text>
                  </TouchableOpacity>
                </View>
              )}
              {subAbaCarteira === 'saldo' && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>SALDO DISPONÍVEL</Text>
                  <Text style={styles.saldoBig}>R$ {saldo.toFixed(2).replace('.', ',')}</Text>
                </View>
              )}
              {subAbaCarteira === 'deposito' && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>DEPÓSITO VIA PIX</Text>
                  <Text style={styles.helperNote}>
                    Solicite recarga rápida via PIX no Portal Web ou diretamente no balcão da Taverna.
                  </Text>
                </View>
              )}
              {subAbaCarteira === 'pagamento' && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>PAGAMENTO DE COMANDA</Text>
                  <Text style={styles.helperNote}>
                    Apresente seu QR Code ao operador do bar ou escaneie o QR da mesa para quitar.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ÁREA RESTANTE DA TELA: QR CODE DO CLIENTE OU BARRA COMPACTA */}
      {cartaoAberto === null ? (
        <View style={styles.qrAreaExpanded}>
          <Text style={styles.qrTag}>CREDENCIAL DIGITAL • BALCÃO</Text>
          <View style={styles.qrWhiteBox}>
            {loading ? (
              <ActivityIndicator color="#10b981" size="large" />
            ) : (
              <QRCode value={qrValor} size={170} color="#070f1e" backgroundColor="#ffffff" />
            )}
            <Text style={styles.qrCodeLabel}>{identificadorTexto}</Text>
          </View>
          <TouchableOpacity style={styles.expandBtn} onPress={() => setModalQrAberto(true)}>
            <Maximize2 color="#022c22" size={18} />
            <Text style={styles.expandBtnText}>Expandir QR Code para Leitura</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.qrCompactBar}>
          <View>
            <Text style={styles.qrCompactTitle}>Credencial Digital</Text>
            <Text style={styles.qrCompactSub}>{identificadorTexto}</Text>
          </View>
          <TouchableOpacity style={styles.qrCompactBtn} onPress={() => setModalQrAberto(true)}>
            <Maximize2 color="#022c22" size={16} />
            <Text style={styles.qrCompactBtnText}>Expandir QR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL TELA CHEIA DO QR CODE */}
      <Modal visible={modalQrAberto} transparent animationType="fade" onRequestClose={() => setModalQrAberto(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalQrAberto(false)}>
              <X color="#94a3b8" size={20} />
            </TouchableOpacity>
            <Text style={styles.qrTag}>LEITURA ÓPTICA NO BALCÃO</Text>
            <Text style={styles.modalName}>{cliente?.nome || 'Membro'}</Text>
            <View style={[styles.qrWhiteBox, { marginVertical: 16 }]}>
              <QRCode value={qrValor} size={220} color="#070f1e" backgroundColor="#ffffff" />
              <Text style={styles.qrCodeLabel}>{identificadorTexto}</Text>
            </View>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setModalQrAberto(false)}>
              <Text style={styles.secondaryBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', padding: 14, gap: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f131c',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#4edea3', fontWeight: '800', fontSize: 14 },
  greeting: { fontSize: 15, fontWeight: '800', color: '#fff' },
  subGreeting: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(248,113,113,0.1)' },

  accordionCard: {
    backgroundColor: '#0f131c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  accordionCardOpen: { flex: 1, borderColor: 'rgba(16,185,129,0.4)' },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  accordionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  accordionTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
  accordionSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  saldoPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  saldoPillText: { fontSize: 10, fontWeight: '700', color: '#4edea3' },

  accordionBody: { flex: 1, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  subTabsRow: { flexDirection: 'row', gap: 6, padding: 10, backgroundColor: '#0a0e17' },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#181b25',
    alignItems: 'center',
  },
  subTabActive: { backgroundColor: '#10b981' },
  subTabText: { fontSize: 11, fontWeight: '700', color: '#cbd5e1' },
  subTabTextActive: { color: '#022c22', fontWeight: '800' },
  subBodyScroll: { flex: 1, padding: 12 },

  sectionStack: { gap: 10 },
  rowTwoCols: { flexDirection: 'row', gap: 8 },
  infoBox: {
    backgroundColor: '#181b25',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#fff' },
  saldoBig: { fontSize: 24, fontWeight: '800', color: '#4edea3' },
  helperNote: { fontSize: 11, color: '#94a3b8', lineHeight: 16 },

  primaryBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#022c22', fontWeight: '800', fontSize: 12 },
  secondaryBtn: {
    backgroundColor: '#181b25',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryBtnText: { color: '#e2e8f0', fontWeight: '700', fontSize: 12 },

  qrAreaExpanded: {
    flex: 1,
    backgroundColor: '#0f131c',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qrTag: { fontSize: 10, fontWeight: '800', color: '#4edea3', letterSpacing: 1.5 },
  qrWhiteBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  qrCodeLabel: { marginTop: 10, fontSize: 11, fontWeight: '800', color: '#070f1e' },
  expandBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  expandBtnText: { color: '#022c22', fontWeight: '800', fontSize: 12 },

  qrCompactBar: {
    backgroundColor: '#0f131c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qrCompactTitle: { fontSize: 12, fontWeight: '800', color: '#fff' },
  qrCompactSub: { fontSize: 11, color: '#4edea3', marginTop: 2 },
  qrCompactBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrCompactBtnText: { color: '#022c22', fontWeight: '800', fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0f131c',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.5)',
  },
  modalClose: { alignSelf: 'flex-end', padding: 4 },
  modalName: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 6 },
});
