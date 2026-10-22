import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Cadastro from "./src/screens/Cadastro";
import Login from "./src/screens/Login";
import Dashboard from "./src/screens/Dashboard";
import PedidosAtivosGarcom from "./src/screens/PedidosAtivosGarcom";
import MesasGarcom from "./src/screens/MesasGarcom";
import DetalhesPedidoGarcom from "./src/screens/DetalhesPedidoGarcom";
import AnotarPedidoGarcom from "./src/screens/AnotarPedidoGarcom";
import PerfilGarcom from "./src/screens/PerfilGarcom";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Cadastro" component={Cadastro} />
          <Stack.Screen name="Dashboard" component={Dashboard} />

          <Stack.Screen name="Garcom" component={PedidosAtivosGarcom} />
          <Stack.Screen name="Mesas" component={MesasGarcom} />
          <Stack.Screen name="DetalhesPedido" component={DetalhesPedidoGarcom} />
          <Stack.Screen name="AnotarPedido" component={AnotarPedidoGarcom} />

          <Stack.Screen name="Perfil" component={PerfilGarcom} />
          <Stack.Screen name="PerfilGarcom" component={PerfilGarcom} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}