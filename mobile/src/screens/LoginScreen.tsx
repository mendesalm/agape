import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { api } from '../services/api';
import { Wine, LogIn } from 'lucide-react-native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export function LoginScreen({ navigation }: Props) {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState(''); // Ou usar apenas OTP no futuro
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!cpf) return Alert.alert("Erro", "Digite seu CPF/E-mail");
    
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', cpf); 
      formData.append('password', senha || 'senha123'); // Para protótipo

      const res = await api.post('/auth/login', formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      await AsyncStorage.setItem('bipfy_token', res.data.access_token);
      navigation.replace('Wallet');
    } catch (err) {
      Alert.alert("Erro de Acesso", "Credenciais inválidas ou sem conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Wine color="#3b82f6" size={48} />
        <Text style={styles.title}>BipFy App</Text>
        <Text style={styles.subtitle}>BipFy Sistema de Gerenciamento de Comércios</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>CPF ou E-mail</Text>
        <TextInput 
          style={styles.input}
          placeholder="Digite seu acesso..."
          placeholderTextColor="#666"
          value={cpf}
          onChangeText={setCpf}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Senha (Provisória)</Text>
        <TextInput 
          style={styles.input}
          placeholder="••••••"
          placeholderTextColor="#666"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <LogIn color="#fff" size={20} />
              <Text style={styles.buttonText}>Acessar Conta</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#888', marginTop: 8 },
  form: { width: '100%' },
  label: { color: '#bbb', fontSize: 14, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#1a1a24', borderRadius: 12, padding: 16, color: '#fff', marginBottom: 24, borderWidth: 1, borderColor: '#333' },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
