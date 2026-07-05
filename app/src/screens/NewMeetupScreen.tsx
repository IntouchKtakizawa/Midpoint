import * as Location from "expo-location";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchMidpoint } from "../api/client";
import { ParticipantInput, TravelMode } from "../types";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "NewMeetup">;

const MODES: TravelMode[] = ["transit", "driving", "walking", "bicycling"];

function emptyParticipant(id: string): ParticipantInput {
  return { id, name: "", address: "", lat: null, lng: null, mode: "transit" };
}

export default function NewMeetupScreen({ navigation }: Props) {
  const [participants, setParticipants] = useState<ParticipantInput[]>([
    emptyParticipant("p1"),
    emptyParticipant("p2"),
  ]);
  const [loading, setLoading] = useState(false);
  const [locatingId, setLocatingId] = useState<string | null>(null);

  function updateParticipant(id: string, patch: Partial<ParticipantInput>) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addParticipant() {
    setParticipants((prev) => [...prev, emptyParticipant(`p${prev.length + 1}-${Date.now()}`)]);
  }

  function removeParticipant(id: string) {
    setParticipants((prev) => (prev.length <= 2 ? prev : prev.filter((p) => p.id !== id)));
  }

  function parseCoordsFromAddressField(address: string): { lat: number; lng: number } | null {
    const parts = address.split(",").map((s) => s.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }

  async function useCurrentLocation(id: string) {
    setLocatingId(id);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission denied", "Enable location access in Settings to use this.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      updateParticipant(id, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        address: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
      });
    } catch (err) {
      Alert.alert("Couldn't get location", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLocatingId(null);
    }
  }

  async function handleFindMidpoint() {
    const resolved = participants.map((p) => {
      const coords = parseCoordsFromAddressField(p.address);
      return coords ? { ...p, lat: coords.lat, lng: coords.lng } : p;
    });

    const missing = resolved.filter((p) => p.lat === null || p.lng === null);
    if (missing.length > 0) {
      Alert.alert(
        "Missing location",
        `Set a location for: ${missing.map((p) => p.name || "someone").join(", ")}.\n\nTap "Use my location" or type "lat, lng" (e.g. 35.6812, 139.7671).`
      );
      return;
    }

    setLoading(true);
    try {
      const result = await fetchMidpoint(resolved);
      navigation.navigate("Results", { result, participants: resolved });
    } catch (err) {
      Alert.alert("Couldn't find a midpoint", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Who's meeting up?</Text>
        <Text style={styles.subtitle}>
          Add each person's location, then we'll find a real, convenient place to meet.
        </Text>

        {participants.map((p, index) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Person {index + 1}</Text>
              {participants.length > 2 && (
                <Pressable onPress={() => removeParticipant(p.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Name (optional)"
              value={p.name}
              onChangeText={(name) => updateParticipant(p.id, { name })}
            />

            <TextInput
              style={styles.input}
              placeholder="Location as lat, lng (e.g. 35.6812, 139.7671)"
              value={p.address}
              onChangeText={(address) => updateParticipant(p.id, { address })}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={styles.locateButton}
              onPress={() => useCurrentLocation(p.id)}
              disabled={locatingId === p.id}
            >
              {locatingId === p.id ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.locateButtonText}>Use my current location</Text>
              )}
            </Pressable>

            <View style={styles.modeRow}>
              {MODES.map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.modeChip, p.mode === mode && styles.modeChipActive]}
                  onPress={() => updateParticipant(p.id, { mode })}
                >
                  <Text style={[styles.modeChipText, p.mode === mode && styles.modeChipTextActive]}>
                    {mode}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable style={styles.addButton} onPress={addParticipant}>
          <Text style={styles.addButtonText}>+ Add another person</Text>
        </Pressable>

        <Pressable style={styles.submitButton} onPress={handleFindMidpoint} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Find Midpoint</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 60, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
  card: {
    backgroundColor: "#f6f7f9",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  removeText: { color: "#c0392b", fontSize: 13 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  locateButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#e8f0fe",
    borderRadius: 8,
    marginBottom: 12,
  },
  locateButtonText: { color: "#1a73e8", fontWeight: "600", fontSize: 13 },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modeChipActive: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  modeChipText: { fontSize: 13, color: "#333", textTransform: "capitalize" },
  modeChipTextActive: { color: "#fff" },
  addButton: { paddingVertical: 12, alignItems: "center", marginBottom: 10 },
  addButtonText: { color: "#1a73e8", fontWeight: "600" },
  submitButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
