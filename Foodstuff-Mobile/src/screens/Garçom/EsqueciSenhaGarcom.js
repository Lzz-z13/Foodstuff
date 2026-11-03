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

export default function EsqueceuSenha({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const emailValido = /\S+@\S+\.\S+/.test(email.trim());

  async function enviarCodigo() {
    if (!emailValido) {
      Alert.alert('Atenção', 'Digite um e-mail válido.');
      return;
    }

    const emailFormatado = email.trim().toLowerCase();

    try {
      setLoading(true);
      const response = await api.requestPasswordReset({ email: emailFormatado });
      const mensagem =
        response?.data?.message ||
        'Se o e-mail estiver cadastrado, você receberá o código para recuperação.';

      Alert.alert('Código enviado', mensagem, [
        {
          text: 'Continuar',
          onPress: () => navigation.navigate('CodigoSenha', { email: emailFormatado }),
        },
      ]);
    } catch (err) {
      Alert.alert(
        'Erro',
        err?.response?.data?.message || 'Não foi possível enviar o código.'
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
          <Text style={styles.label}>Email do usuário</Text>
          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={16} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="seuemail@foodhub.com"
              placeholderTextColor="#A8B0BD"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="send"
              onSubmitEditing={enviarCodigo}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={enviarCodigo}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar código</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Lembrou a senha? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Login</Text>
          </TouchableOpacity>
        </View>
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
    height: 40,
    backgroundColor: '#EA5C2B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    shadowColor: '#EA5C2B',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 11, color: '#475569' },
  footerLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA5C2B',
    textDecorationLine: 'underline',
  },
});