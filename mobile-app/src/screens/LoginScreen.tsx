import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppContainer } from "../components/AppContainer";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthContext";
import { appStyles } from "../theme/styles";
import { colors, radius, spacing } from "../theme/tokens";

const demoUsers = [
  { label: "Patient", email: "rahul@example.com", password: "patient123" },
  { label: "Doctor", email: "dr.rajesh@cityhospital.com", password: "doctor123" },
  { label: "Admin", email: "cityhospital@mediflow.ai", password: "hospital123" },
];

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Missing details", "Enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert("Login failed", error?.response?.data?.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppContainer scroll contentStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.brand}>MediFlow Mobile</Text>
        <Text style={appStyles.title}>Welcome Back to MediFlow</Text>
        <Text style={appStyles.subtitle}>Phase 1 matches the web app's visual direction and connects login to the existing backend.</Text>
      </View>

      <View style={[appStyles.panel, styles.card]}>
        <Text style={appStyles.sectionTitle}>Sign In</Text>

        <TextField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
        />

        <TextField
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <PrimaryButton label="Login" onPress={handleLogin} loading={loading} />

        <Text style={styles.hint}>Quick fill demo accounts</Text>
        <View style={styles.demoList}>
          {demoUsers.map((user) => (
            <Pressable
              key={user.label}
              style={styles.demoChip}
              onPress={() => {
                setEmail(user.email);
                setPassword(user.password);
              }}
            >
              <Text style={styles.demoChipText}>{user.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.sm,
  },
  brand: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    gap: spacing.md,
  },
  hint: {
    color: "#6b7280",
    fontSize: 13,
  },
  demoList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  demoChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#dff4f2",
  },
  demoChipText: {
    color: "#115e59",
    fontWeight: "600",
  },
});
