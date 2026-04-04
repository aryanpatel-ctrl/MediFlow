import { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleProp, ViewStyle } from "react-native";
import { appStyles } from "../theme/styles";

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function AppContainer({ children, scroll = false, contentStyle }: Props) {
  if (scroll) {
    return (
      <SafeAreaView style={appStyles.screen}>
        <ScrollView contentContainerStyle={[appStyles.screenContent, contentStyle]}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={[appStyles.screen, contentStyle]}>{children}</SafeAreaView>;
}
