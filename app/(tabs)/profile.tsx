import { signOut } from "@/lib/appwrite";
import React from "react";
import { Button, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Profile = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Text>Profile</Text>
      <Button title="Logout" onPress={signOut}></Button>
    </SafeAreaView>
  );
};

export default Profile;
