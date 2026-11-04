import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Como o Expo Go roda no celular físico, precisamos do IP da máquina na rede local
const API_URL = 'http://192.168.77.41:8000';

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
