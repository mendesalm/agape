import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Telas
import { LoginScreen } from './src/screens/LoginScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ComandaMenuScreen } from './src/screens/ComandaMenuScreen';
import { ClientQrScreen } from './src/screens/ClientQrScreen';

export type RootStackParamList = {
  Login: undefined;
  Wallet: undefined;
  Scanner: undefined;
  ComandaMenu: { comandaId: number; identificador: string };
  ClientQr: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false, // UI full-screen customizada
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Scanner" component={ScannerScreen} />
        <Stack.Screen name="ComandaMenu" component={ComandaMenuScreen} />
        <Stack.Screen name="ClientQr" component={ClientQrScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
