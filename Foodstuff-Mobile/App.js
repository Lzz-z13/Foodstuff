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
import EsqueciSenhaGarcom from "./src/screens/Garçom/EsqueciSenhaGarcom";
import CodigoSenhaGarcom from "./src/screens/Garçom/CodigoSenhaGarcom";
import NovaSenhaGarcom from "./src/screens/Garçom/NovaSenhaGarcom";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="CardapioCliente"
          screenOptions={{ headerShown: false }}
        >
          {/* ADMIN */}
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Cadastro" component={Cadastro} />
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="contaAdmin" component={contaAdmin} />
          <Stack.Screen name="Mesas" component={Mesas}/>
          
          <Stack.Screen name="Cardapio" component={Cardapio} />

          {/* CLIENTE */}
          <Stack.Screen name="CardapioCliente" component={CardapioCliente} />
          <Stack.Screen name="DetalheProduto" component={DetalheProduto} />

          <Stack.Screen name="EsqueciSenha" component={EsqueciSenhaGarcom} />
          <Stack.Screen name="CodigoSenha" component={CodigoSenhaGarcom} />
          <Stack.Screen name="NovaSenha" component={NovaSenhaGarcom} />

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
      </NavigationContainer>
    </SafeAreaProvider>
  );
}