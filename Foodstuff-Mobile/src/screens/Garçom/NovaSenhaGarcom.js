import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function NovaSenha({ navigation, route }) {
  const { email, resetToken } = route?.params || {};
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  const senhaValida = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(senha);

  async function redefinirSenha() {
    if (!email || !resetToken) {
      Alert.alert('Atenção', 'Não foi possível continuar a redefinição. Volte e tente novamente.');
      navigation.goBack();
      return;
    }

    if (!senha || !confirmar) {
      Alert.alert('Atenção', 'Preencha os dois campos.');
      return;
    }

    if (!senhaValida) {
      Alert.alert(
        'Atenção',
        'A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, minúscula e caractere especial.'
      );
      return;
    }

    if (senha !== confirmar) {
      Alert.alert('Atenção', 'As senhas não conferem.');
      return;
    }

    try {
      setLoading(true);
      await api.confirmPasswordReset({
        resetToken,
        new_password: senha,
        confirm_password: confirmar,
      });

      Alert.alert('Pronto!', 'Senha redefinida com sucesso.', [
        {
          text: 'Ir para o login',
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            }),
        },
      ]);
    } catch (err) {
      Alert.alert(
        'Erro',
        err?.response?.data?.message || 'Não foi possível redefinir a senha.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Ionicons name="restaurant" size={14} color="#EA5C2B" />
          <Text style={styles.logoText}>Foodstuff</Text>
        </View>

        <Text style={styles.title}>Redefinir a Senha</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Digite sua senha nova</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={16} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="Digite sua nova senha"
              placeholderTextColor="#A8B0BD"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Confirme sua senha</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={16} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="Confirme sua senha"
              placeholderTextColor="#A8B0BD"
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={redefinirSenha}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={redefinirSenha}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Redefinir senha</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 16 },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1B2F',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  title: { fontSize: 20, fontWeight: '800', color: '#1B1B2F', marginTop: 14, marginBottom: 28 },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: { fontSize: 11, fontWeight: '700', color: '#1B1B2F', marginBottom: 8 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: '#FCFCFD',
  },
  input: { flex: 1, fontSize: 12, color: '#1B1B2F' },
  button: {
    width: '100%',
    height: 40,
    backgroundColor: '#EA5C2B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#EA5C2B',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});