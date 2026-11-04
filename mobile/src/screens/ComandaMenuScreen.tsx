import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { api } from '../services/api';
import { ArrowLeft, ShoppingCart, Send, CheckCircle2, Package } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'ComandaMenu'>;

interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  categoria: string;
  subcategoria?: string;
  tipo?: string;
  marca?: string;
  preco_venda: number;
  quantidade_gondola: number;
  foto_url?: string;
}

export function ComandaMenuScreen({ route, navigation }: Props) {
  const { comandaId, identificador } = route.params;
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<{ [produtoId: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');

  useEffect(() => {
    carregarCardapio();
  }, []);

  const carregarCardapio = async () => {
    try {
      setLoading(true);
      const res = await api.get('/produtos/');
      // Apenas produtos disponíveis na gôndola/geladeira
      const disponiveis = res.data.filter((p: any) => p.ativo && p.quantidade_gondola > 0);
      setProdutos(disponiveis);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o cardápio do bar.");
    } finally {
      setLoading(false);
    }
  };

  const alterarQtd = (produtoId: number, delta: number) => {
    setCarrinho(prev => {
      const atual = prev[produtoId] || 0;
      const novo = Math.max(0, atual + delta);
      if (novo === 0) {
        const copy = { ...prev };
        delete copy[produtoId];
        return copy;
      }
      return { ...prev, [produtoId]: novo };
    });
  };

  const totalItens = Object.values(carrinho).reduce((acc, q) => acc + q, 0);
  const totalValor = Object.entries(carrinho).reduce((acc, [pId, q]) => {
    const prod = produtos.find(p => p.id === parseInt(pId));
    return acc + (prod ? prod.preco_venda * q : 0);
  }, 0);

  const enviarPedidoAoBar = async () => {
    if (totalItens === 0) {
      return Alert.alert("Atenção", "Selecione pelo menos um item para pedir.");
    }

    setEnviando(true);
    try {
      // Envia cada item selecionado para a comanda do cliente
      for (const [prodIdStr, qtd] of Object.entries(carrinho)) {
        await api.post(`/comandas/${comandaId}/itens`, {
          produto_id: parseInt(prodIdStr),
          quantidade: qtd
        });
      }

      Alert.alert(
        "Pedido Enviado com Sucesso! 🍻",
        `Seu pedido foi encaminhado para a fila do barman.\n\nDirija-se ao balcão para retirar seus itens.`,
        [
          { text: "Ver Minha Carteira", onPress: () => navigation.replace('Wallet') }
        ]
      );
      setCarrinho({});
    } catch (err: any) {
      Alert.alert("Erro", err.response?.data?.detail || "Falha ao enviar pedido ao bar.");
    } finally {
      setEnviando(false);
    }
  };

  const produtosFiltrados = filtroCategoria === 'todos' 
    ? produtos 
    : produtos.filter(p => p.categoria.toLowerCase() === filtroCategoria.toLowerCase());

  return (
    <SafeAreaView style={styles.container}>
      {/* Topo / Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Cardápio Digital</Text>
          <Text style={styles.subtitle}>Comanda: {identificador}</Text>
        </View>
        <View style={styles.badgeMesa}>
          <Text style={styles.badgeMesaText}>#{comandaId}</Text>
        </View>
      </View>

      {/* Filtros Rápidos */}
      <View style={styles.filtros}>
        {['todos', 'bebidas', 'alimentos'].map(cat => (
          <TouchableOpacity 
            key={cat} 
            onPress={() => setFiltroCategoria(cat)}
            style={[styles.chip, filtroCategoria === cat && styles.chipAtivo]}
          >
            <Text style={[styles.chipText, filtroCategoria === cat && styles.chipTextAtivo]}>
              {cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de Produtos */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <Text style={styles.loadingText}>Carregando produtos disponíveis...</Text>
        </View>
      ) : produtosFiltrados.length === 0 ? (
        <View style={styles.center}>
          <Package color="#555" size={48} />
          <Text style={styles.emptyText}>Nenhum produto disponível no momento.</Text>
        </View>
      ) : (
        <FlatList
          data={produtosFiltrados}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const qtd = carrinho[item.id] || 0;
            return (
              <View style={styles.card}>
                <View style={styles.cardDetails}>
                  <Text style={styles.prodNome}>{item.nome}</Text>
                  {item.marca ? (
                    <Text style={styles.prodMarca}>{item.marca} {item.tipo ? `• ${item.tipo}` : ''}</Text>
                  ) : null}
                  <Text style={styles.prodPreco}>R$ {item.preco_venda.toFixed(2)}</Text>
                  <Text style={styles.prodEstoque}>Disponível no bar: {item.quantidade_gondola} un</Text>
                </View>

                {/* Controles de Quantidade */}
                <View style={styles.qtdContainer}>
                  {qtd > 0 && (
                    <TouchableOpacity 
                      style={styles.qtdBtnMinus} 
                      onPress={() => alterarQtd(item.id, -1)}
                    >
                      <Text style={styles.qtdBtnText}>-</Text>
                    </TouchableOpacity>
                  )}
                  {qtd > 0 && (
                    <Text style={styles.qtdNum}>{qtd}</Text>
                  )}
                  <TouchableOpacity 
                    style={styles.qtdBtnPlus} 
                    onPress={() => alterarQtd(item.id, 1)}
                  >
                    <Text style={styles.qtdBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Barra Inferior com Total e Botão de Enviar ao Bar */}
      {totalItens > 0 && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>{totalItens} {totalItens === 1 ? 'item selecionado' : 'itens selecionados'}</Text>
            <Text style={styles.footerTotal}>R$ {totalValor.toFixed(2)}</Text>
          </View>
          <TouchableOpacity 
            style={styles.enviarBtn} 
            onPress={enviarPedidoAoBar}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Send color="#fff" size={18} />
                <Text style={styles.enviarBtnText}>Pedir ao Bar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1f1f2e' },
  backBtn: { padding: 8, marginRight: 8 },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  badgeMesa: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  badgeMesaText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  filtros: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#161622' },
  chipAtivo: { backgroundColor: '#3b82f6' },
  chipText: { color: '#888', fontSize: 12, fontWeight: '600' },
  chipTextAtivo: { color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#14141e', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  cardDetails: { flex: 1 },
  prodNome: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  prodMarca: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  prodPreco: { color: '#3b82f6', fontSize: 16, fontWeight: 'black', marginTop: 6 },
  prodEstoque: { color: '#64748b', fontSize: 11, marginTop: 2 },
  qtdContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  qtdBtnPlus: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  qtdBtnMinus: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  qtdBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  qtdNum: { color: '#fff', fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { color: '#666', marginTop: 12, fontSize: 13 },
  emptyText: { color: '#666', marginTop: 12, fontSize: 14 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#14141e', padding: 20, borderTopWidth: 1, borderTopColor: '#222', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { color: '#888', fontSize: 12 },
  footerTotal: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  enviarBtn: { backgroundColor: '#10b981', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  enviarBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});
