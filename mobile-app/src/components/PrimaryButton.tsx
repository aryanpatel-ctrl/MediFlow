import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { appStyles } from "../theme/styles";
import { colors } from "../theme/tokens";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
};

export function PrimaryButton({ label, onPress, loading = false }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [appStyles.button, pressed && styles.pressed, loading && styles.disabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={appStyles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.7,
  },
});
