import { Stack } from "expo-router";
import { ReactNode } from "react";
import Toast from "react-native-toast-message";

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {children}
      <Toast />
    </>
  );
}
