import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Cadastro from "./src/screens/Cadastro";
import Login from "./src/screens/Login";
import Dashboard from "./src/screens/Dashboard";
import Mesas from "./src/screens/Mesas";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Mesas"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Cadastro" component={Cadastro} />
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="Mesas" component={Mesas}/>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}