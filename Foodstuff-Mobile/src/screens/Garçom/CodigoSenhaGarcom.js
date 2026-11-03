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

function mascaraCodigo(texto) {
  const n = texto.replace(/\D/g, '').slice(0, 6);
  return n.replace(/(\d{2})(?=\d)/g, '$1.');
}

export default function CodigoSenha({ navigation, route }) {
  const email = route?.params?.email;
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);

  const codigoLimpo = codigo.replace(/\D/g, '');

  async function conferirCodigo() {
    if (!email) {
      Alert.alert('Atenção', 'Não foi possível identificar o e-mail. Volte e tente novamente.');
      return;
    }

    if (codigoLimpo.length !== 6) {
      Alert.alert('Atenção', 'Digite o código de 6 dígitos.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.verifyPasswordReset({ email, otp: codigoLimpo });
      const resetToken = response?.data?.resetToken;

      if (!resetToken) {
        Alert.alert('Atenção', 'Resposta inválida da API. Tente novamente.');
        return;
      }

      navigation.navigate('NovaSenha', { email, resetToken });
    } catch (err) {
      Alert.alert(
        'Código inválido',
        err?.response?.data?.message || 'Confira o código e tente novamente.'
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

        <Text style={styles.title}>Redefinir senha</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Digite o código</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={16} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="00.00.00"
              placeholderTextColor="#A8B0BD"
              value={codigo}
              onChangeText={(t) => setCodigo(mascaraCodigo(t))}
              keyboardType="number-pad"
              maxLength={8}
              returnKeyType="done"
              onSubmitEditing={conferirCodigo}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={conferirCodigo}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Conferir Código</Text>
            )}
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
  input: { flex: 1, fontSize: 12, color: '#1B1B2F', letterSpacing: 1 },
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
});