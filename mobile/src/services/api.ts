import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Endpoint oficial da API do e-Sigma Ágape em produção
const API_URL = 'https://agape.e-sigma.app/api';

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = (await AsyncStorage.getItem('bipfy_token')) || (await AsyncStorage.getItem('barix_token'));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
