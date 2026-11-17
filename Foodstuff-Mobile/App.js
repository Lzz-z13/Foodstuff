import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

// ADMIN
import Cadastro from "./src/screens/Adm/Cadastro";
import Login from "./src/screens/Login";
import Mesas from "./src/screens/Mesas";
import Dashboard from "./src/screens/Adm/Dashboard";
import contaAdmin from "./src/screens/Adm/contaAdmin";
import Cardapio from "./src/screens/Adm/Cardapio";
import PedidosAdmin from "./src/screens/Adm/Pedidos";

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

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <EmployeeNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
