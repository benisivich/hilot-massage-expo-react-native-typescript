import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { useApp } from '@/context/store';
import { replace } from '@/lib/nav';

type Gate = 'start' | 'login' | 'register' | 'therapist' | 'therapist-register';

export default function WelcomeScreen() {
  const { role, customer, setRole, updateCustomer, registerTherapist, signInTherapist } = useApp();
  const [gate, setGate] = useState<Gate>('start');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (role === 'customer') replace('/customer');
    if (role === 'therapist') replace('/therapist');
  }, [role]);

  const enter = (next: 'customer' | 'therapist') => {
    setRole(next);
    replace(next === 'customer' ? '/customer' : '/therapist');
  };

  const signIn = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      Alert.alert('Check the form', 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Check the form', 'Password must be at least 6 characters.');
      return;
    }
    if (!customer.email) {
      Alert.alert('Create an account', 'Register on this device first, then sign in with that email.');
      return;
    }
    if (cleanEmail !== customer.email) {
      Alert.alert('Check the form', 'That email does not match the account on this device.');
      return;
    }
    enter('customer');
  };

  const signInTherapistAccount = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      Alert.alert('Check the form', 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Check the form', 'Password must be at least 6 characters.');
      return;
    }
    const result = signInTherapist(cleanEmail);
    if (!result.ok) {
      Alert.alert('Check the form', result.message);
      return;
    }
    enter('therapist');
  };

  const createTherapist = () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) {
      Alert.alert('Check the form', 'Enter your full name.');
      return;
    }
    if (!cleanEmail.includes('@')) {
      Alert.alert('Check the form', 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Check the form', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Check the form', 'Passwords do not match.');
      return;
    }
    const result = registerTherapist({ name: cleanName, email: cleanEmail });
    if (!result.ok) {
      Alert.alert('Check the form', result.message);
      return;
    }
    enter('therapist');
  };

  const createAccount = () => {
    const cleanName = name.trim();
    const digits = mobile.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) {
      Alert.alert('Check the form', 'Enter your full name.');
      return;
    }
    if (!/^09\d{9}$/.test(digits)) {
      Alert.alert('Check the form', 'Mobile number should be 11 digits and start with 09.');
      return;
    }
    if (!cleanEmail.includes('@')) {
      Alert.alert('Check the form', 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Check the form', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Check the form', 'Passwords do not match.');
      return;
    }
    updateCustomer({ name: cleanName, mobile: digits, email: cleanEmail });
    enter('customer');
  };

  if (role) return null;

  if (gate === 'start') {
    return (
      <Screen
        footer={
          <>
            <Button label="Get Started" onPress={() => setGate('login')} />
            <Button label="Therapist sign in" variant="secondary" onPress={() => setGate('therapist')} />
          </>
        }>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <View style={styles.head} />
            <View style={styles.torso} />
            <View style={styles.legs} />
          </View>
          <Text style={styles.brand}>HILOTCARE</Text>
          <Text style={styles.tag}>Massage & Hilot Services</Text>
        </View>
      </Screen>
    );
  }

  if (gate === 'login') {
    return (
      <Screen onBack={() => setGate('start')} avoidKeyboard footer={<Button label="Login" onPress={signIn} />}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to book your next session</Text>
        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secure
        />
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert(
              'Password help',
              'Passwords are not saved on this device. Sign in with the email you used when you created the account.',
            )
          }>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
        <Text style={styles.switchLine}>
          New to Hilotcare?{' '}
          <Text style={styles.link} onPress={() => setGate('register')}>
            Create Account
          </Text>
        </Text>
      </Screen>
    );
  }

  if (gate === 'therapist') {
    return (
      <Screen onBack={() => setGate('start')} avoidKeyboard footer={<Button label="Login" onPress={signInTherapistAccount} />}>
        <Text style={styles.title}>Therapist desk</Text>
        <Text style={styles.sub}>Sign in with the email you registered</Text>
        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secure
        />
        <Text style={styles.switchLine}>
          New therapist?{' '}
          <Text style={styles.link} onPress={() => setGate('therapist-register')}>
            Create Account
          </Text>
        </Text>
      </Screen>
    );
  }

  if (gate === 'therapist-register') {
    return (
      <Screen
        onBack={() => setGate('therapist')}
        avoidKeyboard
        footer={<Button label="Create Account" onPress={createTherapist} />}>
        <Text style={styles.title}>Therapist account</Text>
        <Text style={styles.sub}>You will add your license and services next</Text>
        <Field label="Full name" value={name} onChangeText={setName} placeholder="Full name" />
        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="Email Address"
          keyboardType="email-address"
        />
        <Field label="Create Password" value={password} onChangeText={setPassword} placeholder="Create Password" secure />
        <Field label="Confirm Password" value={confirm} onChangeText={setConfirm} placeholder="Confirm Password" secure />
        <Text style={styles.switchLine}>
          Already registered?{' '}
          <Text style={styles.link} onPress={() => setGate('therapist')}>
            Sign In
          </Text>
        </Text>
      </Screen>
    );
  }

  return (
    <Screen
      onBack={() => setGate('login')}
      avoidKeyboard
      footer={<Button label="Create Account" onPress={createAccount} />}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.sub}>Take less than a minute</Text>
      <Field label="Full name" value={name} onChangeText={setName} placeholder="Full name" />
      <Field
        label="Mobile Number"
        value={mobile}
        onChangeText={setMobile}
        placeholder="09XXXXXXXXX"
        keyboardType="phone-pad"
        maxLength={11}
      />
      <Field
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        placeholder="Email Address"
        keyboardType="email-address"
      />
      <Field label="Create Password" value={password} onChangeText={setPassword} placeholder="Create Password" secure />
      <Field label="Confirm Password" value={confirm} onChangeText={setConfirm} placeholder="Confirm Password" secure />
      <Text style={styles.switchLine}>
        Already registered?{' '}
        <Text style={styles.link} onPress={() => setGate('login')}>
          Sign In
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 420 },
  logo: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 2,
    borderColor: palette.palm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  head: {
    position: 'absolute',
    top: 28,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: palette.palm,
  },
  torso: {
    position: 'absolute',
    top: 48,
    width: 2,
    height: 26,
    backgroundColor: palette.palm,
  },
  legs: {
    position: 'absolute',
    top: 70,
    width: 62,
    height: 26,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: palette.palm,
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
  },
  brand: {
    fontFamily: font.serif,
    color: palette.palm,
    fontSize: 28,
    letterSpacing: 1.4,
  },
  tag: { color: palette.muted, fontSize: 16 },
  title: { fontFamily: font.serif, color: palette.palm, fontSize: 34, lineHeight: 38 },
  sub: { color: palette.muted, fontSize: 15, marginTop: -6 },
  link: { color: palette.orange, fontWeight: '700', textAlign: 'right' },
  switchLine: { color: palette.muted, textAlign: 'center', marginTop: 8 },
});
