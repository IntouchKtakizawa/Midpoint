import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import NewMeetupScreen from "./src/screens/NewMeetupScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import { MeetupResult, ParticipantInput } from "./src/types";

export type RootStackParamList = {
  NewMeetup: undefined;
  Results: { result: MeetupResult; participants: ParticipantInput[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="NewMeetup">
        <Stack.Screen name="NewMeetup" component={NewMeetupScreen} options={{ title: "New Meetup" }} />
        <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "Best Meeting Spots" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
