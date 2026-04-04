import { useAuth } from "../features/auth/AuthContext";
import { PatientNavigator } from "../features/patient/PatientNavigator";
import { HomeScreen } from "../screens/HomeScreen";
import { LoadingScreen } from "../screens/LoadingScreen";
import { LoginScreen } from "../screens/LoginScreen";

export function RootNavigator() {
  const { bootstrapping, user } = useAuth();

  if (bootstrapping) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (user.role === "patient") {
    return <PatientNavigator />;
  }

  return <HomeScreen />;
}
