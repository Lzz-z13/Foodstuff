import React from "react";
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { CustomerProvider, useCustomer } from "./src/contexts/CustomerContext";
import CarrinhoCliente from "./src/screens/Cliente/CarrinhoCliente";

// ADMIN
import Cadastro from "./src/screens/Adm/Cadastro";
import Login from "./src/screens/Login";
import Mesas from "./src/screens/Mesas";
import Dashboard from "./src/screens/Adm/Dashboard";
import contaAdmin from "./src/screens/Adm/contaAdmin";
import Cardapio from "./src/screens/Adm/Cardapio";
import PedidosAdmin from "./src/screens/Adm/Pedidos";

// CLIENTE
import CardapioCliente from "./src/screens/Cliente/CardapioCliente";
import DetalheProduto from "./src/screens/Cliente/DetalheProduto";

// GARÇOM
import PedidosAtivosGarcom from "./src/screens/Garçom/PedidosAtivosGarcom";
import MesasGarcom from "./src/screens/Garçom/MesasGarcom";
import DetalhesMesaGarcom from "./src/screens/Garçom/DetalhesMesaGarcom";
import DetalhesPedidoGarcom from "./src/screens/Garçom/DetalhesPedidoGarcom";
import AnotarPedidoGarcom from "./src/screens/Garçom/AnotarPedidoGarcom";
import PerfilGarcom from "./src/screens/Garçom/PerfilGarcom";
import RecuperarSenha from "./src/screens/RecuperarSenha";
import VerificarCodigo from "./src/screens/VerificarCodigo";
import NovaSenha from "./src/screens/NovaSenha";


const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// O React Navigation interpreta o link e entrega o token à tela Cliente.
const linking = {
  prefixes: ["foodstuff://", "exp://10.89.240.3:8081/--/"],
  config: { screens: { Cliente: "mesa/:token", Equipe: "equipe" } },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) return url;
    const token = await SecureStore.getItemAsync("foodstuff.customer.lastQr");
    return token ? `foodstuff://mesa/${token}` : null;
  },
};

function EmployeeNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          {/* ADMIN */}
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Cadastro" component={Cadastro} />
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="contaAdmin" component={contaAdmin} />
          <Stack.Screen name="Mesas" component={Mesas}/>
          
          <Stack.Screen name="Cardapio" component={Cardapio} />
          <Stack.Screen name="PedidosAdmin" component={PedidosAdmin} />
          <Stack.Screen name="RecuperarSenha" component={RecuperarSenha} />
          <Stack.Screen name="VerificarCodigo" component={VerificarCodigo} />
          <Stack.Screen name="NovaSenha" component={NovaSenha} />

          {/* GARÇOM */}
          <Stack.Screen name="Garcom" component={PedidosAtivosGarcom} />
          <Stack.Screen name="MesasGarcom" component={MesasGarcom} />
          <Stack.Screen
            name="DetalhesMesa"
            component={DetalhesMesaGarcom}
          />
          <Stack.Screen
            name="DetalhesPedido"
            component={DetalhesPedidoGarcom}
          />
          <Stack.Screen
            name="AnotarPedido"
            component={AnotarPedidoGarcom}
          />
          <Stack.Screen name="PerfilGarcom" component={PerfilGarcom} />
    </Stack.Navigator>
  );
}

function CustomerNavigator() {
  const customer = useCustomer();
  if (customer.loading) {
    return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator size="large" color="#FF6B2C" /></View>;
  }
  if (customer.error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 28, gap: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Não foi possível abrir esta mesa</Text>
        <Text>{customer.error}</Text>
        <TouchableOpacity onPress={customer.retry}><Text>Tentar novamente</Text></TouchableOpacity>
        <TouchableOpacity onPress={customer.openStaffLogin}><Text>Acesso de funcionários</Text></TouchableOpacity>
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CardapioCliente" component={CardapioCliente} />
      <Stack.Screen name="DetalheProduto" component={DetalheProduto} />
      <Stack.Screen name="CarrinhoCliente" component={CarrinhoCliente} />
    </Stack.Navigator>
  );
}

function CustomerFlow({ route, navigation }) {
  return (
    <CustomerProvider
      key={route.params?.token}
      qrToken={route.params?.token}
      onStaffLogin={() => navigation.reset({ index: 0, routes: [{ name: "Equipe" }] })}
    >
      <CustomerNavigator />
    </CustomerProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking} fallback={<ActivityIndicator size="large" color="#FF6B2C" />}>
        <RootStack.Navigator initialRouteName="Equipe" screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Equipe" component={EmployeeNavigator} />
          <RootStack.Screen name="Cliente" component={CustomerFlow} />
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
