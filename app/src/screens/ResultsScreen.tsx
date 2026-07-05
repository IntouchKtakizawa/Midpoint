import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { RankedVenue } from "../types";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

const CATEGORY_LABEL: Record<string, string> = {
  train_station: "🚆 Train station",
  subway_station: "🚇 Subway station",
  transit_station: "🚌 Transit hub",
  cafe: "☕ Cafe",
  restaurant: "🍽 Restaurant",
  bar: "🍺 Bar",
  park: "🌳 Park",
  library: "📚 Library",
  shopping_mall: "🛍 Shopping mall",
};

export default function ResultsScreen({ route }: Props) {
  const { result, participants } = route.params;

  const allLats = [...participants.map((p) => p.lat!), ...result.venues.map((v) => v.lat)];
  const allLngs = [...participants.map((p) => p.lng!), ...result.venues.map((v) => v.lng)];
  const minLat = Math.min(...allLats);
  const maxLat = Math.max(...allLats);
  const minLng = Math.min(...allLngs);
  const maxLng = Math.max(...allLngs);

  const region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat, 0.01) * 1.6,
    longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.6,
  };

  function openInMaps(venue: RankedVenue) {
    const url = `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
    Linking.openURL(url);
  }

  if (result.venues.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No venues found nearby. Try different locations.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <MapView style={styles.map} initialRegion={region}>
        {participants.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat!, longitude: p.lng! }}
            title={p.name || "Person"}
            pinColor="#1a73e8"
          />
        ))}
        {result.venues.map((v, i) => (
          <Marker
            key={v.id}
            coordinate={{ latitude: v.lat, longitude: v.lng }}
            title={v.name}
            description={`${Math.round(v.maxMinutes)} min worst-case`}
            pinColor={i === 0 ? "#0f9d58" : "#e37400"}
          />
        ))}
      </MapView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <Text style={styles.heading}>Best places to meet</Text>
        {result.venues.map((venue, i) => (
          <Pressable key={venue.id} style={styles.venueCard} onPress={() => openInMaps(venue)}>
            <View style={styles.venueHeader}>
              <Text style={styles.venueRank}>#{i + 1}</Text>
              <View style={styles.venueTitleBlock}>
                <Text style={styles.venueName}>{venue.name}</Text>
                <Text style={styles.venueCategory}>{CATEGORY_LABEL[venue.category] ?? venue.category}</Text>
              </View>
              {venue.rating && <Text style={styles.venueRating}>★ {venue.rating.toFixed(1)}</Text>}
            </View>
            <Text style={styles.venueAddress}>{venue.address}</Text>

            <View style={styles.legRow}>
              {venue.legs.map((leg) => (
                <View key={leg.participantIndex} style={styles.legChip}>
                  <Text style={styles.legChipText}>
                    {participants[leg.participantIndex]?.name || `Person ${leg.participantIndex + 1}`}:{" "}
                    {leg.durationMinutes} min
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.venueFooter}>
              Worst case {Math.round(venue.maxMinutes)} min · Avg {Math.round(venue.avgMinutes)} min
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  map: { width: "100%", height: "38%" },
  list: { flex: 1, backgroundColor: "#fff" },
  listContent: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  venueCard: {
    backgroundColor: "#f6f7f9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  venueHeader: { flexDirection: "row", alignItems: "flex-start" },
  venueRank: { fontSize: 16, fontWeight: "700", marginRight: 10, color: "#888" },
  venueTitleBlock: { flex: 1 },
  venueName: { fontSize: 16, fontWeight: "700" },
  venueCategory: { fontSize: 13, color: "#555", marginTop: 2 },
  venueRating: { fontSize: 13, color: "#e6a700", fontWeight: "600" },
  venueAddress: { fontSize: 13, color: "#777", marginTop: 6 },
  legRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  legChip: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  legChipText: { fontSize: 12, color: "#333" },
  venueFooter: { fontSize: 12, color: "#999", marginTop: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyText: { fontSize: 15, color: "#666", textAlign: "center" },
});
