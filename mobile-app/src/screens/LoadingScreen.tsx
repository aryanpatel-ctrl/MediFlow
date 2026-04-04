import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppContainer } from "../components/AppContainer";
import { colors, typography } from "../theme/tokens";

export function LoadingScreen() {
  return (
    <AppContainer>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MF</Text>
        </View>
        <ActivityIndicator size="large" color={colors.accentStrong} />
        <Text style={styles.text}>Loading MediFlow...</Text>
      </View>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: colors.bg,
  },
  badge: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    backgroundColor: colors.accentSoft,
  },
  badgeText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  text: {
    ...typography.body,
    color: colors.textSoft,
  },
});
