import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { useApp } from '@/context/store';
import { replace } from '@/lib/nav';
import { resendConfirmation } from '@/services/cloud';

type Gate = 'start' | 'choose' | 'login' | 'register' | 'confirm' | 'therapist' | 'therapist-register' | 'admin' | 'admin-register';

export default function WelcomeScreen() {
  const { role, setRole, registerCustomer, signInCustomer, registerTherapist, signInTherapist, registerAdmin, signInAdmin } = useApp();
  const [gate, setGate] = useState<Gate>('start');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingRole, setPendingRole] = useState<'customer' | 'therapist' | 'admin'>('customer');

  useEffect(() => {
    if (role === 'customer') replace('/customer');
    if (role === 'therapist') replace('/therapist');
    if (role === 'admin') replace('/admin');
  }, [role]);

  const enter = (next: 'customer' | 'therapist' | 'admin') => {
    setRole(next);
    replace(next === 'customer' ? '/customer' : next === 'therapist' ? '/therapist' : '/admin');
  };

  const signIn = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      Alert.alert('Check the form', 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Check the form', 'Password must be at least 6 characters.');
      return;
    }
    const result = await signInCustomer(cleanEmail, password);
    if (!result.ok) {
      if (result.message.includes('confirmation email')) {
        setPendingEmail(cleanEmail);
        setPendingRole('customer');
        setGate('confirm');
        void resendConfirmation(cleanEmail);
        return;
      }
      Alert.alert(result.message.includes('verification email') ? 'Email not sent' : 'Check the form', result.message);
      return;
    }
    enter('customer');
  };

  const signInTherapistAccount = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      Alert.alert('Check the form', 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Check the form', 'Password must be at least 6 characters.');
      return;
    }
    const result = await signInTherapist(cleanEmail, password);
    if (!result.ok) {
      if (result.message.includes('confirmation email')) {
        setPendingEmail(cleanEmail);
        setPendingRole('therapist');
        setGate('confirm');
        void resendConfirmation(cleanEmail);
        return;
      }
      Alert.alert(result.message.includes('verification email') ? 'Email not sent' : 'Check the form', result.message);
      return;
    }
    enter('therapist');
  };

  const signInAdminAccount = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      Alert.alert('Check the form', 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Check the form', 'Password must be at least 6 characters.');
      return;
    }
    const result = await signInAdmin(cleanEmail, password);
    if (!result.ok) {
      if (result.message.includes('confirmation email')) {
        setPendingEmail(cleanEmail);
        setPendingRole('admin');
        setGate('confirm');
        void resendConfirmation(cleanEmail);
        return;
      }
      Alert.alert(result.message.includes('verification email') ? 'Email not sent' : 'Check the form', result.message);
      return;
    }
    enter('admin');
  };

  const createAdmin = async () => {
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
    const result = await registerAdmin({ name: cleanName, email: cleanEmail, password });
    if (!result.ok) {
      Alert.alert(result.message.includes('verification email') ? 'Email not sent' : 'Check the form', result.message);
      return;
    }
    if (result.pendingEmail) {
      setPendingEmail(result.pendingEmail);
      setPendingRole('admin');
      setGate('confirm');
      return;
    }
    enter('admin');
  };

  const createTherapist = async () => {
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
    const result = await registerTherapist({ name: cleanName, email: cleanEmail, password });
    if (!result.ok) {
      Alert.alert(result.message.includes('verification email') ? 'Email not sent' : 'Check the form', result.message);
      return;
    }
    if (result.pendingEmail) {
      setPendingEmail(result.pendingEmail);
      setPendingRole('therapist');
      setGate('confirm');
      return;
    }
    enter('therapist');
  };

  const createAccount = async () => {
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
    const result = await registerCustomer({ name: cleanName, mobile: digits, email: cleanEmail, password });
    if (!result.ok) {
      Alert.alert(result.message.includes('verification email') ? 'Email not sent' : 'Check the form', result.message);
      return;
    }
    if (result.pendingEmail) {
      setPendingEmail(result.pendingEmail);
      setPendingRole('customer');
      setGate('confirm');
      return;
    }
    enter('customer');
  };

  const resendFromLogin = async (next: 'customer' | 'therapist' | 'admin') => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      Alert.alert('Check the form', 'Enter the email address you used to create the account.');
      return;
    }
    const result = await resendConfirmation(cleanEmail);
    if (!result.ok) {
      Alert.alert('Email not sent', result.message);
      return;
    }
    setPendingEmail(cleanEmail);
    setPendingRole(next);
    setGate('confirm');
  };

  const finishVerification = async () => {
    if (password.length < 6) {
      Alert.alert('Check the form', 'Go back and enter the password you created, then tap I verified my email.');
      return;
    }
    const result =
      pendingRole === 'customer'
        ? await signInCustomer(pendingEmail, password)
        : pendingRole === 'therapist'
          ? await signInTherapist(pendingEmail, password)
          : await signInAdmin(pendingEmail, password);
    if (!result.ok) {
      if (result.message.includes('confirmation email')) {
        Alert.alert('Not verified yet', 'Open the email, tap the verification link, then try again.');
        return;
      }
      Alert.alert(result.message.includes('verification email') ? 'Email not sent' : 'Check the form', result.message);
      return;
    }
    enter(pendingRole);
  };

  const resendEmail = async () => {
    const result = await resendConfirmation(pendingEmail);
    Alert.alert(
      result.ok ? 'Email sent' : 'Email not sent',
      result.ok ? `Another confirmation link was sent to ${pendingEmail}.` : result.message,
    );
  };

  if (role) return null;

  if (gate === 'confirm') {
    return (
      <Screen
        onBack={() =>
          setGate(pendingRole === 'customer' ? 'register' : pendingRole === 'admin' ? 'admin-register' : 'therapist-register')
        }
        footer={
          <>
            <Button label="I verified my email" onPress={() => void finishVerification()} />
            <Button label="Resend email" variant="secondary" onPress={() => void resendEmail()} />
          </>
        }>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.sub}>
          A verification link was sent to {pendingEmail}. On this phone, open the Mail app, tap the Hilotcare link, come back here, and tap I verified my email. No one else has to approve the account.
        </Text>
      </Screen>
    );
  }

  if (gate === 'start') {
    return (
      <Screen footer={<Button label="Get Started" onPress={() => setGate('choose')} />}>
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

  if (gate === 'choose') {
    return (
      <Screen
        onBack={() => setGate('start')}
        footer={
          <>
            <Button label="Customer sign in" onPress={() => setGate('login')} />
            <Button label="Therapist sign in" variant="secondary" onPress={() => setGate('therapist')} />
            <Button label="Admin sign in" variant="ghost" onPress={() => setGate('admin')} />
          </>
        }>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.sub}>Choose customer, therapist, or admin.</Text>
      </Screen>
    );
  }

  if (gate === 'login') {
    return (
      <Screen onBack={() => setGate('choose')} avoidKeyboard footer={<Button label="Login" onPress={signIn} />}>
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
              'Sign in with the email and password you chose when you created the account.',
            )
          }>
          <Text style={styles.centeredLink}>Forgot password?</Text>
        </Pressable>
        <Text style={styles.centeredLink} onPress={() => void resendFromLogin('customer')}>
          Resend confirmation email
        </Text>
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
      <Screen onBack={() => setGate('choose')} avoidKeyboard footer={<Button label="Login" onPress={signInTherapistAccount} />}>
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
        <Text style={styles.centeredLink} onPress={() => void resendFromLogin('therapist')}>
          Resend confirmation email
        </Text>
        <Text style={styles.switchLine}>
          New therapist?{' '}
          <Text style={styles.link} onPress={() => setGate('therapist-register')}>
            Create Account
          </Text>
        </Text>
      </Screen>
    );
  }

  if (gate === 'admin') {
    return (
      <Screen onBack={() => setGate('choose')} avoidKeyboard footer={<Button label="Login" onPress={signInAdminAccount} />}>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.sub}>Only an admin account can open the clinic panel.</Text>
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
        <Text style={styles.centeredLink} onPress={() => void resendFromLogin('admin')}>
          Resend confirmation email
        </Text>
        <Text style={styles.switchLine}>
          First admin?{' '}
          <Text style={styles.link} onPress={() => setGate('admin-register')}>
            Create Account
          </Text>
        </Text>
      </Screen>
    );
  }

  if (gate === 'admin-register') {
    return (
      <Screen onBack={() => setGate('admin')} avoidKeyboard footer={<Button label="Create Account" onPress={createAdmin} />}>
        <Text style={styles.title}>Admin account</Text>
        <Text style={styles.sub}>This login is separate from customers and therapists.</Text>
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
        <Text style={styles.sub}>Clinic staff can open an account right away and manage visits from the desk.</Text>
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
  centeredLink: { color: palette.orange, fontWeight: '700', textAlign: 'center' },
  switchLine: { color: palette.muted, textAlign: 'center', marginTop: 8 },
});
