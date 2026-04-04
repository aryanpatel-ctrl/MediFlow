import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { appStyles } from "../theme/styles";
import { colors, spacing, typography } from "../theme/tokens";

type Props = TextInputProps & {
  label: string;
};

export function TextField({ label, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#6b7280" style={appStyles.input} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.text,
  },
});
